/**
 * Search Provider
 * DuckDuckGo HTML scraping with Bing fallback
 */

import { extractDomain, type SearchResult } from './search-utils';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Search with retry logic
 */
async function searchWithRetry(
  searchFn: () => Promise<SearchResult[]>,
  maxRetries: number = MAX_RETRIES
): Promise<SearchResult[]> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const results = await searchFn();
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      console.log(`Search attempt ${attempt + 1} failed:`, error);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  return [];
}

/**
 * Search DuckDuckGo HTML
 * Primary search provider
 */
async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'q=' + encodedQuery,
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`);
    }

    const html = await response.text();
    return parseDuckDuckGoResults(html, maxResults);
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

/**
 * Parse DuckDuckGo HTML results
 */
function parseDuckDuckGoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  // DuckDuckGo HTML structure: <a class="result__a" href="...">title</a>
  // Snippet: <a class="result__snippet">content</a>
  const resultRegex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)<\/a>/g;

  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
    const url = match[1].replace('&amp;', '&');
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    const snippet = match[3].replace(/<[^>]*>/g, '').trim();

    if (!url || !title || seenUrls.has(url)) continue;

    // Skip non-http URLs and internal links
    if (!url.startsWith('http') || url.includes('/html/')) continue;

    seenUrls.add(url);
    results.push({
      url,
      title,
      content: snippet || `Informasi dari ${title}`,
      score: 1 - (results.length * 0.1),
      domain: extractDomain(url),
    });
  }

  // Fallback regex for simpler structure
  if (results.length === 0) {
    const simpleRegex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    while ((match = simpleRegex.exec(html)) !== null && results.length < maxResults) {
      const url = match[1].replace('&amp;', '&');
      const title = match[2].replace(/<[^>]*>/g, '').trim();

      if (!url || !title || seenUrls.has(url)) continue;
      if (!url.startsWith('http') || url.includes('/html/')) continue;

      seenUrls.add(url);
      results.push({
        url,
        title,
        content: `Informasi dari ${title}`,
        score: 1 - (results.length * 0.1),
        domain: extractDomain(url),
      });
    }
  }

  return results;
}

/**
 * Search Bing HTML
 * Fallback search provider
 */
async function searchBingHtml(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.bing.com/search?q=${encodedQuery}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Bing search failed: ${response.status}`);
    }

    const html = await response.text();
    return parseBingResults(html, maxResults);
  } catch (error) {
    console.error('Bing search error:', error);
    return [];
  }
}

/**
 * Parse Bing HTML results
 */
function parseBingResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  // Bing structure: <h2><a href="...">title</a></h2> + <p class="b_algoSlug">snippet</p>
  const resultRegex = /<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>[\s\S]*?<p[^>]*class="[^"]*b_algoSlug[^"]*"[^>]*>([^<]+)<\/p>/gi;

  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
    const url = match[1].replace('&amp;', '&');
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    const snippet = match[3].replace(/<[^>]*>/g, '').trim();

    if (!url || !title || seenUrls.has(url)) continue;
    if (!url.startsWith('http') || url.includes('/search')) continue;

    seenUrls.add(url);
    results.push({
      url,
      title,
      content: snippet || `Informasi dari ${title}`,
      score: 1 - (results.length * 0.1),
      domain: extractDomain(url),
    });
  }

  // Fallback: simpler regex
  if (results.length === 0) {
    const simpleRegex = /<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/gi;
    while ((match = simpleRegex.exec(html)) !== null && results.length < maxResults) {
      const url = match[1].replace('&amp;', '&');
      const title = match[2].replace(/<[^>]*>/g, '').trim();

      if (!url || !title || seenUrls.has(url)) continue;
      if (!url.startsWith('http') || url.includes('/search')) continue;

      seenUrls.add(url);
      results.push({
        url,
        title,
        content: `Informasi dari ${title}`,
        score: 1 - (results.length * 0.1),
        domain: extractDomain(url),
      });
    }
  }

  return results;
}

/**
 * Main search function
 * Tries DuckDuckGo first, then Bing as fallback
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  try {
    console.log('Performing web search for:', query);

    // Try DuckDuckGo first with retry
    const ddgResults = await searchWithRetry(
      () => searchDuckDuckGo(query, maxResults),
      MAX_RETRIES
    );

    if (ddgResults.length > 0) {
      console.log(`DuckDuckGo returned ${ddgResults.length} results`);
      return ddgResults;
    }

    // Fallback to Bing
    console.log('DuckDuckGo returned no results, trying Bing...');
    const bingResults = await searchWithRetry(
      () => searchBingHtml(query, maxResults),
      MAX_RETRIES
    );

    if (bingResults.length > 0) {
      console.log(`Bing returned ${bingResults.length} results`);
      return bingResults;
    }

    // Both providers failed - return empty array (not dummy results)
    console.log('All search providers returned no results');
    return [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Format search results for display
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'Tidak ada informasi terbaru yang ditemukan dari web.';
  }

  const formatted = results
    .map((result, index) => {
      return `
**Sumber ${index + 1}:** [${result.title}](${result.url})
**Konten:** ${result.content}
---
`;
    })
    .join('\n');

  return formatted;
}

/**
 * Generate prompt with search context
 */
export function generatePromptWithContext(
  userMessage: string,
  searchResults: SearchResult[]
): string {
  const context = formatSearchResults(searchResults);

  return `Berdasarkan informasi terbaru dari web berikut:

${context}

Pertanyaan pengguna: ${userMessage}

Silakan jawab pertanyaan di atas dengan menggunakan informasi dari sumber di atas.
Jika informasi tidak cukup, katakan dengan jujur bahwa Anda tidak memiliki informasi yang cukup.
Sebutkan sumber informasi jika memungkinkan.`;
}
