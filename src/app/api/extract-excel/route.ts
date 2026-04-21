import { NextRequest, NextResponse } from "next/server";
import { extractExcelContentServer } from "@/lib/excel/extractor-server";

export interface FileContentResult {
  success: boolean;
  content?: string;
  error?: string;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
      !file.name.toLowerCase().endsWith(".xlsx")
    ) {
      return NextResponse.json(
        { success: false, error: "File must be an Excel spreadsheet (.xlsx)" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "Excel spreadsheet too large (max 10MB)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await extractExcelContentServer(arrayBuffer);

    if (result.success) {
      return NextResponse.json({
        success: true,
        content: result.content,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Excel extraction API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
