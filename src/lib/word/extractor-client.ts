/**
 * Extract content from Word document using server API
 * Client cannot extract .docx directly - must use server API
 */
import type { FileContentResult } from "./extractor-server";

async function extractDocxContent(file: File): Promise<FileContentResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/extract-word", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to extract Word document content",
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
      error: error instanceof Error ? error.message : "Failed to extract Word document content",
    };
  }
}

export { extractDocxContent };
