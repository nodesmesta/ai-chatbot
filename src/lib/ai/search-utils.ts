/**
 * Search Utilities
 * Shared utilities for search functionality
 */

export interface SearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  domain: string;
}

export interface Source {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Validate URL format
 */
export function validateUrlFormat(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if URL is accessible via HEAD request
 */
export async function checkUrlAccessibility(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: AbortSignal.timeout(timeoutMs),
    });
    // no-cors mode returns opaque response, we just check if request was made
    return true;
  } catch {
    return false;
  }
}

/**
 * Consolidated source extraction from content
 * Replaces duplicate implementations in chat-interface.tsx, main-content.tsx, and route.ts
 */
export function extractSourcesFromContent(content: string): { mainContent: string; sources: Source[] } {
  const sources: Source[] = [];
  const lines = content.split('\n');

  // Find all valid markdown links in content
  const allLinks: Array<{ lineIndex: number; title: string; url: string; domain: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      const url = match[2];
      const domain = extractDomain(url);
      allLinks.push({
        lineIndex: i,
        title: match[1],
        url,
        domain,
      });
    }
  }

  // Find the "Sumber:" or "References:" section
  let sourcesSectionStart = -1;
  const sourceLabelRegex = /^(Sumber:|Referensi:|Sources:|References:)\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    if (sourceLabelRegex.test(lines[i].trim())) {
      sourcesSectionStart = i + 1;
      break;
    }
  }

  const footnoteLineIndices = new Set<number>();

  // If we found a sources section, all valid links after it are footnotes
  if (sourcesSectionStart !== -1) {
    for (const link of allLinks) {
      if (link.lineIndex >= sourcesSectionStart) {
        footnoteLineIndices.add(link.lineIndex);
      }
    }
  } else {
    // Fallback: links at the end with no content after are footnotes
    for (const link of allLinks) {
      const lineIndex = link.lineIndex;
      const line = lines[lineIndex].trim();

      const isLinkOnlyLine = /^(\s*[-*]\s*|\s*\d+\.\s*)\[([^\]]+)\]\(https?:\/\/[^\)]+\)\)?$/i.test(line);

      if (isLinkOnlyLine) {
        let hasContentAfter = false;
        for (let i = lineIndex + 1; i < lines.length; i++) {
          if (lines[i].trim().length > 0) {
            hasContentAfter = true;
            break;
          }
        }

        if (!hasContentAfter) {
          footnoteLineIndices.add(lineIndex);
        }
      }
    }
  }

  // Extract footnote links to sources (deduplicated)
  for (const link of allLinks) {
    if (footnoteLineIndices.has(link.lineIndex)) {
      if (!sources.some((s) => s.url === link.url)) {
        sources.push({
          title: link.title,
          url: link.url,
          domain: link.domain,
        });
      }
    }
  }

  // Also extract inline links (links not in footnote section)
  for (const link of allLinks) {
    if (!footnoteLineIndices.has(link.lineIndex)) {
      if (!sources.some((s) => s.url === link.url)) {
        sources.push({
          title: link.title,
          url: link.url,
          domain: link.domain,
        });
      }
    }
  }

  // Build mainContent by removing footnote lines and source label
  const contentLines = lines.filter((_, index) => {
    if (footnoteLineIndices.has(index)) return false;
    if (sourcesSectionStart > 0 && index === sourcesSectionStart - 1) return false;
    return true;
  });

  let mainContent = contentLines.join('\n')
    .replace(/(\d+)\.\s*\n+/g, '$1. ')
    .replace(/([-*])\s*\n+/g, '$1 ')
    .replace(/(\d+\.)\s*\n+\s*/g, '$1 ')
    .replace(/([-*])\s*\n+\s*/g, '$1 ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .trim();

  return { mainContent, sources };
}

/**
 * Remove source section and fix formatting from content
 */
export function removeSourceSection(content: string): string {
  const lines = content.split('\n');
  const sourceLabelRegex = /^(Sumber:|Referensi:|Sources:|References:)\s*$/i;

  let sourcesSectionStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (sourceLabelRegex.test(lines[i].trim())) {
      sourcesSectionStart = i;
      break;
    }
  }

  if (sourcesSectionStart === -1) {
    return content.trim();
  }

  // Remove source section and fix formatting
  const mainContent = lines.slice(0, sourcesSectionStart).join('\n');

  return mainContent
    .replace(/(\d+)\.\s*\n+/g, '$1. ')
    .replace(/([-*])\s*\n+/g, '$1 ')
    .replace(/(\d+\.)\s*\n+\s*/g, '$1 ')
    .replace(/([-*])\s*\n+\s*/g, '$1 ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .trim();
}
