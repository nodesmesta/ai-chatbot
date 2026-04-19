import * as pdfParse from "pdf-parse";

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
 * Extract text content from PDF using pdf-parse (server-side, no browser dependencies)
 */
export async function extractPdfContentServer(
  arrayBuffer: ArrayBuffer
): Promise<FileContentResult> {
  try {
    // Convert ArrayBuffer to Buffer for pdf-parse
    const buffer = Buffer.from(arrayBuffer);

    // pdf-parse exports a function as the default export
    // Access it via the module's default property or call directly
    const pdfFunc = (pdfParse as any).default || pdfParse;
    const data = await pdfFunc(buffer);

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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract PDF content",
    };
  }
}
