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
    // Fallback: Check if links are at the end of content (typical sources section pattern)
    // Look for links in the last 10 lines that match sources pattern
    const lastLinesStart = Math.max(0, lines.length - 10);
    for (const link of allLinks) {
      if (link.lineIndex >= lastLinesStart) {
        const line = lines[link.lineIndex].trim();
        // Check if this looks like a source entry (bullet point or numbered list with just a link)
        const isSourcePattern = /^(\s*[-*]\s*|\s*\d+\.\s*)\[([^\]]+)\]\(https?:\/\/[^\)]+\)\s*$/.test(line);
        if (isSourcePattern) {
          footnoteLineIndices.add(link.lineIndex);
        }
      }
    }

    // Second fallback: if no sources section found and no obvious source entries,
    // extract ALL unique links from the content as sources (for cases where LLM puts links inline)
    if (footnoteLineIndices.size === 0 && allLinks.length > 0) {
      // Extract unique domains from all links
      const seenDomains = new Set<string>();
      for (const link of allLinks) {
        if (!seenDomains.has(link.domain)) {
          seenDomains.add(link.domain);
          sources.push({
            title: link.title,
            url: link.url,
            domain: link.domain,
          });
        }
      }
      // Remove all markdown links from content since they were used as sources
      let mainContent = content
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]*)/g, '$1')
        .trim();
      return { mainContent, sources };
    }
  }

  // Extract footnote links to sources (deduplicated) - ONLY from footnote section
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

  // Build mainContent by removing footnote lines and source label
  const contentLines = lines.filter((_, index) => {
    if (footnoteLineIndices.has(index)) return false;
    if (sourcesSectionStart > 0 && index === sourcesSectionStart - 1) return false;
    return true;
  });

  // Remove markdown links - handle both complete and potentially truncated links
  // Complete: [text](url) -> text
  // Truncated: [text](url (no closing paren) -> text (and capture partial URL to remove)
  let mainContent = contentLines.join('\n');

  // First pass: remove complete markdown links [text](url)
  mainContent = mainContent.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1');

  // Second pass: remove incomplete/truncated links [text](url (no closing paren)
  // This handles cases where URL was cut off during streaming
  mainContent = mainContent.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]*)/g, '$1');

  // Third pass: clean up any remaining orphaned brackets from incomplete markdown
  mainContent = mainContent.replace(/\[([^\]]+)\]\s*\(\s*$/g, '$1');

  mainContent = mainContent.trim();

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
