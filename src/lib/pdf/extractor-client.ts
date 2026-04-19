"use client";

import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

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
 */
async function extractPdfContent(file: File): Promise<FileContentResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => {
          if ("str" in item && item.str) return item.str;
          if ("contents" in item && item.contents) return item.contents;
          return "";
        })
        .join(" ");

      fullText += pageText + "\n";
    }

    const normalizedText = normalizeText(fullText);

    if (!normalizedText) {
      return {
        success: false,
        error: "No text found in PDF (may be image-based or encrypted)",
      };
    }

    return { success: true, content: normalizedText };
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
