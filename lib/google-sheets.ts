import { google } from "googleapis";

// Initialize Google Sheets client
function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export interface RegistrationData {
  legalName: string;
  nickname: string;
  age: string;
  gender: string;
  orientation: string;
  orientationOther: string;
  school: string;
  schoolOther: string;
  major: string;
  grade: string;
  gradeOther: string;
  wechat: string;
  douyin: string;
  email: string;
  phone: string;
  introduction: string;
  fileUrl: string;
  submittedAt: string;
}

export async function appendToSheet(data: RegistrationData) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID is not configured");
  }

  // Determine the actual school and grade values
  const actualSchool = data.school === "Other" ? data.schoolOther : data.school;
  const actualGrade = data.grade === "Other" ? data.gradeOther : data.grade;
  const actualOrientation = data.orientation === "Other" ? data.orientationOther : data.orientation;

  // Prepare row data
  const rowData = [
    data.submittedAt,
    data.legalName,
    data.nickname,
    data.age,
    data.gender,
    actualOrientation,
    actualSchool,
    data.major,
    actualGrade,
    data.wechat,
    data.douyin,
    data.email,
    data.phone,
    data.fileUrl,
    data.introduction,
  ];

  // Append to the appropriate sheet based on gender
  const sheetName = data.gender === "男" ? "男嘉宾" : "女嘉宾";

  try {
    // First, try to create the sheet if it doesn't exist
    await ensureSheetExists(sheets, spreadsheetId, sheetName);

    // Append the data
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:O`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowData],
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error appending to sheet:", error);
    throw error;
  }
}

async function ensureSheetExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string
) {
  try {
    // Get existing sheets
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingSheets = response.data.sheets?.map((s) => s.properties?.title) || [];

    if (!existingSheets.includes(sheetName)) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      // Add headers
      const headers = [
        "提交时间",
        "姓名",
        "昵称",
        "年龄",
        "性别",
        "取向",
        "学校",
        "专业",
        "年级",
        "微信号",
        "抖音号",
        "邮箱",
        "手机号",
        "照片/视频链接",
        "自我介绍",
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:O1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers],
        },
      });
    }
  } catch (error) {
    console.error("Error ensuring sheet exists:", error);
    // Don't throw here - the sheet might already exist
  }
}
