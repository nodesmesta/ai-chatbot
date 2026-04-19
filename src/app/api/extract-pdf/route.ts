import { NextRequest, NextResponse } from "next/server";
import { extractPdfContentServer } from "@/lib/pdf/extractor-server";

export const maxDuration = 60; // Allow longer timeout for PDF processing

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

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "PDF file too large (max 20MB)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await extractPdfContentServer(arrayBuffer);

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
    console.error("PDF extraction API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
