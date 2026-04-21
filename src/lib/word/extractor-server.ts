import mammoth from "mammoth";

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
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract text content from Word document (.docx) using mammoth
 */
export async function extractWordContentServer(
  arrayBuffer: ArrayBuffer
): Promise<FileContentResult> {
  try {
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.extractRawText({ buffer });
    const normalizedText = normalizeText(result.value);

    if (!normalizedText) {
      return {
        success: false,
        error: "No text content found in Word document (may be empty or image-based)",
      };
    }

    return { success: true, content: normalizedText };
  } catch (error) {
    console.error("Word extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract Word content",
    };
  }
}
