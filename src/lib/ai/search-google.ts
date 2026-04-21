/**
 * Google Custom Search API Provider
 * More reliable than HTML scraping
 */

import { extractDomain, type SearchResult } from './search-utils';

const API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const CX = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

if (!API_KEY || !CX) {
  console.warn('[Google Search] API_KEY or CX not configured. Search will be disabled.');
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface GoogleSearchResult {
  link: string;
  title: string;
  snippet: string;
  displayLink: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  error?: {
    message: string;
    code: number;
  };
}

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
 * Search Google Custom Search API
 */
async function searchGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
  if (!API_KEY || !CX) {
    console.error('Google Custom Search API not configured');
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodedQuery}&num=${Math.min(maxResults, 10)}`;

    console.log('[Google Search] Fetching:', url.substring(0, 100) + '...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Search API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as GoogleSearchResponse;

    if (data.error) {
      console.error('Google Search API error:', data.error.message);
      return [];
    }

    if (!data.items || data.items.length === 0) {
      console.log('[Google Search] No results found');
      return [];
    }

    console.log(`[Google Search] Found ${data.items.length} results`);

    return data.items.map((item: GoogleSearchResult) => ({
      url: item.link,
      title: item.title,
      content: item.snippet || `Informasi dari ${item.title}`,
      score: 1 - (data.items!.indexOf(item) * 0.1),
      domain: extractDomain(item.link),
    }));
  } catch (error) {
    console.error('Google Search error:', error);
    return [];
  }
}

/**
 * Main search function using Google Custom Search API
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  try {
    console.log('[Search] Performing Google search for:', query);

    const results = await searchWithRetry(
      () => searchGoogle(query, maxResults),
      MAX_RETRIES
    );

    if (results.length > 0) {
      console.log(`[Search] Google returned ${results.length} results`);
      return results;
    }

    console.log('[Search] Google returned no results');
    return [];
  } catch (error) {
    console.error('[Search] Search error:', error);
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
      return `[RESULT ${index + 1}]
URL: ${result.url}
Title: ${result.title}
Content: ${result.content}
Domain: ${result.domain}
---`;
    })
    .join('\n\n');

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
