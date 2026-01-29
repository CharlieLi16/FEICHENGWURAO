import { NextRequest, NextResponse } from "next/server";
import { appendToSheet, RegistrationData } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
  try {
    const data: RegistrationData = await request.json();

    // Validate required fields
    const requiredFields = [
      "legalName",
      "age",
      "gender",
      "school",
      "major",
      "grade",
      "wechat",
      "email",
      "phone",
      "introduction",
    ];

    for (const field of requiredFields) {
      if (!data[field as keyof RegistrationData]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate age
    const age = parseInt(data.age);
    if (isNaN(age) || age < 18 || age > 99) {
      return NextResponse.json(
        { error: "Invalid age. Must be between 18 and 99" },
        { status: 400 }
      );
    }

    // Append to Google Sheets
    await appendToSheet(data);

    return NextResponse.json({ success: true, message: "Registration successful" });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Submission failed. Please try again or send materials to amasterzq@gmail.com" },
      { status: 500 }
    );
  }
}
