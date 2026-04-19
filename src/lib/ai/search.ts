/**
 * Google Search Scraper
 * Mengambil hasil pencarian dari Google secara manual
 */

interface SearchResult {
  url: string;
  content: string;
  title: string;
  score: number;
}

export async function searchWeb(query: string, maxResults: number = 3): Promise<SearchResult[]> {
  try {
    // Encode query untuk URL
    const encodedQuery = encodeURIComponent(query);
    const googleUrl = `https://www.google.com/search?q=${encodedQuery}&num=${maxResults}`;

    // Fetch dari Google dengan headers yang mirip browser
    const response = await fetch(googleUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
      },
    });

    if (!response.ok) {
      console.error("Google search failed:", response.status, response.statusText);
      // Fallback: return dummy results jika scraping gagal
      return generateDummyResults(query);
    }

    const html = await response.text();

    // Parse hasil dari HTML Google
    const results = parseGoogleResults(html);

    if (results.length === 0) {
      console.log("No results parsed from Google, using fallback");
      return generateDummyResults(query);
    }

    return results;
  } catch (error) {
    console.error("Web search error:", error);
    return generateDummyResults(query);
  }
}

function parseGoogleResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Regex untuk ekstrak link dan title dari Google search results
  const resultRegex = /<a[^>]*href="([^"]+)"[^>]*>(?:<[^>]*>[^<]*<\/[^>]*>)*([^<]+)<\/a>/g;
  let match;

  while ((match = resultRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2]
      .replace(/<[^>]*>/g, "") // Hapus HTML tags
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&")
      .trim();

    // Filter out non-result links
    if (url && url.startsWith("http") && !url.includes("/search?") && title.length > 3) {
      results.push({
        url: url,
        title: title,
        content: `Informasi dari ${title}`,
        score: 1 - (results.length * 0.1), // Score menurun untuk hasil berikutnya
      });

      if (results.length >= 5) break;
    }
  }

  return results;
}

function generateDummyResults(query: string): SearchResult[] {
  // Fallback results jika scraping gagal
  return [
    {
      url: "https://www.google.com/search?q=" + encodeURIComponent(query),
      title: "Search Results for " + query,
      content: "Silakan cek Google untuk informasi terbaru tentang: " + query,
      score: 1,
    },
  ];
}

/**
 * Format hasil pencarian untuk digunakan sebagai context
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "Tidak ada informasi terbaru yang ditemukan dari web.";
  }

  const formatted = results
    .map((result, index) => {
      return `
**Sumber ${index + 1}:** [${result.title}](${result.url})
**Konten:** ${result.content}
---
`;
    })
    .join("\n");

  return formatted;
}

/**
 * Generate prompt dengan context dari hasil pencarian
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
