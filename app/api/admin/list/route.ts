import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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
