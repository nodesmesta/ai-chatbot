"use client";

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
 * Extract content from PDF using client-side PDF.js
 * Note: For client-side PDF extraction, we use a simple fallback since pdfjs-dist is removed
 */
async function extractPdfContent(file: File): Promise<FileContentResult> {
  // Client-side PDF extraction requires pdfjs-dist which is now removed
  // The actual PDF extraction will be done server-side via API
  return {
    success: false,
    error: "PDF extraction is only supported via server API. Please upload via the chat interface.",
  };
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
