import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

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

export interface RegistrationEntry {
  index: number;
  submittedAt: string;
  legalName: string;
  nickname: string;
  age: string;
  gender: string;
  orientation: string;
  school: string;
  major: string;
  grade: string;
  wechat: string;
  douyin: string;
  email: string;
  phone: string;
  fileUrl: string;
  introduction: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender") || "男";
    
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "GOOGLE_SHEET_ID is not configured" },
        { status: 500 }
      );
    }

    const sheetName = gender === "男" ? "男嘉宾" : "女嘉宾";

    let rows: string[][] = [];
    
    try {
      // Get all data from the sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:O`,
      });
      rows = response.data.values || [];
    } catch (sheetError: unknown) {
      // If sheet doesn't exist or is empty, return empty array
      const errorMessage = sheetError instanceof Error ? sheetError.message : String(sheetError);
      if (errorMessage.includes("Unable to parse range") || 
          errorMessage.includes("not found") ||
          errorMessage.includes("400")) {
        console.log(`Sheet "${sheetName}" not found or empty, returning empty array`);
        return NextResponse.json({ 
          entries: [],
          total: 0,
          gender: sheetName
        });
      }
      throw sheetError; // Re-throw if it's a different error
    }
    
    // Skip header row and map data
    const entries: RegistrationEntry[] = rows.slice(1).map((row, index) => ({
      index: index + 1,
      submittedAt: row[0] || "",
      legalName: row[1] || "",
      nickname: row[2] || "",
      age: row[3] || "",
      gender: row[4] || "",
      orientation: row[5] || "",
      school: row[6] || "",
      major: row[7] || "",
      grade: row[8] || "",
      wechat: row[9] || "",
      douyin: row[10] || "",
      email: row[11] || "",
      phone: row[12] || "",
      fileUrl: row[13] || "",
      introduction: row[14] || "",
    }));

    return NextResponse.json({ 
      entries,
      total: entries.length,
      gender: sheetName
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    // Return empty data instead of error for better UX
    return NextResponse.json({ 
      entries: [],
      total: 0,
      gender: "未知"
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender") || "男";
    const rowIndexParam = searchParams.get("rowIndex");

    if (!rowIndexParam) {
      return NextResponse.json(
        { error: "rowIndex is required" },
        { status: 400 }
      );
    }

    const rowIndex = parseInt(rowIndexParam);
    if (isNaN(rowIndex) || rowIndex < 1) {
      return NextResponse.json(
        { error: "Invalid rowIndex" },
        { status: 400 }
      );
    }

    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "GOOGLE_SHEET_ID is not configured" },
        { status: 500 }
      );
    }

    const sheetName = gender === "男" ? "男嘉宾" : "女嘉宾";

    // First, get the sheet ID (not the spreadsheet ID, but the individual sheet's ID)
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!sheet || !sheet.properties?.sheetId) {
      return NextResponse.json(
        { error: `Sheet "${sheetName}" not found` },
        { status: 404 }
      );
    }

    const sheetId = sheet.properties.sheetId;

    // Delete the row using batchUpdate
    // rowIndex is 1-based (entry index), and row 1 is header
    // So entry index 1 = row 2 in sheet = index 1 in 0-based
    // deleteDimension uses 0-based index, so we use rowIndex directly
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex, // 0-based, so rowIndex (1-based entry) + 1 for header - 1 for 0-based = rowIndex
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting entry:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
