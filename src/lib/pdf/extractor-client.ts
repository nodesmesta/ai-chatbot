"use client";

export interface FileContentResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Extract text content from a text file (TXT, CSV, JSON, etc.)
 */
export async function extractTextContent(file: File): Promise<FileContentResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      resolve({ success: true, content: text });
    };

    reader.onerror = () => {
      resolve({ success: false, error: "Failed to read file" });
    };

    reader.readAsText(file);
  });
}

/**
 * Extract content from PDF using server API
 * Client cannot extract PDF directly - must use server API
 */
async function extractPdfContent(file: File): Promise<FileContentResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/extract-pdf", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to extract PDF content",
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
      error: error instanceof Error ? error.message : "Failed to extract PDF content",
    };
  }
}

/**
 * Extract content from any supported file type
 */
export async function extractFileContent(file: File): Promise<FileContentResult> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === "text/plain" || fileName.endsWith(".txt")) {
    return extractTextContent(file);
  }

  if (fileType === "text/csv" || fileName.endsWith(".csv")) {
    return extractTextContent(file);
  }

  if (fileType === "application/json" || fileName.endsWith(".json")) {
    return extractTextContent(file);
  }

  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return extractPdfContent(file);
  }

  return {
    success: false,
    error: "Text extraction not supported for this file type",
  };
}
