import * as XLSX from "xlsx";

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
 * Extract text content from Excel spreadsheet (.xlsx) using xlsx (SheetJS)
 * Extracts all sheets and converts to CSV format
 */
export async function extractExcelContentServer(
  arrayBuffer: ArrayBuffer
): Promise<FileContentResult> {
  try {
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const allContent: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);

      if (csv) {
        allContent.push(`[Sheet: ${sheetName}]\n${csv}`);
      }
    }

    const combinedText = allContent.join("\n\n");
    const normalizedText = normalizeText(combinedText);

    if (!normalizedText) {
      return {
        success: false,
        error: "No data found in Excel spreadsheet (may be empty)",
      };
    }

    return { success: true, content: normalizedText };
  } catch (error) {
    console.error("Excel extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract Excel content",
    };
  }
}
