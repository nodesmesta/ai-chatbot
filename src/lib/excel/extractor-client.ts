/**
 * Extract content from Excel spreadsheet using server API
 * Client cannot extract .xlsx directly - must use server API
 */
import type { FileContentResult } from "./extractor-server";

async function extractXlsxContent(file: File): Promise<FileContentResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/extract-excel", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to extract Excel spreadsheet content",
      };
    }

    const result = await response.json();

    if (result.success) {
      return { success: true, content: result.content };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract Excel spreadsheet content",
    };
  }
}

export { extractXlsxContent };
