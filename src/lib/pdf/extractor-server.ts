import * as pdfjsLib from "pdfjs-dist";

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
 * Extract text content from PDF using pdfjs-dist (server-side)
 */
export async function extractPdfContentServer(
  arrayBuffer: ArrayBuffer
): Promise<FileContentResult> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    const maxPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => {
          if ("str" in item && item.str) return item.str;
          if ("contents" in item && item.contents) return item.contents;
          if ("text" in item && item.text) return item.text;
          return "";
        })
        .join(" ");

      fullText += pageText + "\n";
    }

    const normalizedText = normalizeText(fullText);

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
