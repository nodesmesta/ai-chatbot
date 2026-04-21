import { NextRequest, NextResponse } from "next/server";
import { extractWordContentServer } from "@/lib/word/extractor-server";

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
      file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      !file.name.toLowerCase().endsWith(".docx")
    ) {
      return NextResponse.json(
        { success: false, error: "File must be a Word document (.docx)" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "Word document too large (max 10MB)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await extractWordContentServer(arrayBuffer);

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
    console.error("Word extraction API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
