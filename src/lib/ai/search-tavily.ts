/**
 * Tavily Search API Provider
 * Optimized for AI agents with real-time search
 */

import { extractDomain, type SearchResult } from './search-utils';

const API_KEY = process.env.TAVILY_API_KEY;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface TavilyResult {
  url: string;
  title: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
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
      console.log(`Tavily search attempt ${attempt + 1} failed:`, error);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  return [];
}

/**
 * Search Tavily API
 */
async function searchTavily(query: string, maxResults: number): Promise<SearchResult[]> {
  if (!API_KEY) {
    console.error('Tavily API Key not configured');
    return [];
  }

  try {
    console.log('[Tavily Search] Fetching for:', query);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: API_KEY,
        query: query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answers: false,
        include_images: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as TavilyResponse;

    if (!data.results || data.results.length === 0) {
      console.log('[Tavily Search] No results found');
      return [];
    }

    console.log(`[Tavily Search] Found ${data.results.length} results`);

    return data.results.map((item: TavilyResult) => ({
      url: item.url,
      title: item.title,
      content: item.content,
      score: item.score,
      domain: extractDomain(item.url),
    }));
  } catch (error) {
    console.error('[Tavily Search] Error:', error);
    return [];
  }
}

/**
 * Main search function using Tavily API
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  try {
    console.log('[Search] Performing Tavily search for:', query);

    const results = await searchWithRetry(
      () => searchTavily(query, maxResults),
      MAX_RETRIES
    );

    if (results.length > 0) {
      console.log(`[Search] Tavily returned ${results.length} results`);
      return results;
    }

    console.log('[Search] Tavily returned no results');
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
      // Remove markdown bold/italic formatting to prevent LaTeX rendering issues
      const cleanContent = result.content
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove **bold**
        .replace(/\*(.+?)\*/g, '$1')     // Remove *italic*
        .replace(/__ (.+?) __/g, '$1')   // Remove __bold__
        .replace(/_ (.+?) _/g, '$1');    // Remove _italic_

      return `[RESULT ${index + 1}]
URL: ${result.url}
Title: ${result.title}
Content: ${cleanContent}
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
