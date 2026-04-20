import pdfParse from "pdf-parse";

export interface FileContentResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Normalize text by replacing non-breaking spaces and cleaning up whitespace
 */
function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract text content from PDF using pdf-parse v1.1.1
 * Simple, reliable, and works on all platforms (Vercel, Cloudflare, etc.)
 */
export async function extractPdfContentServer(
  arrayBuffer: ArrayBuffer
): Promise<FileContentResult> {
  try {
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdfParse(buffer);

    const normalizedText = normalizeText(data.text);

    if (!normalizedText) {
      return {
        success: false,
        error: "No text content found in PDF (may be image-based or encrypted)",
      };
    }

    return {
      success: true,
      content: normalizedText,
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract PDF content",
    };
  }
}
