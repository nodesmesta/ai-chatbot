import { NextRequest, NextResponse } from "next/server";
import { searchWeb, formatSearchResults } from "@/lib/ai/search-tavily";
import { vectorizeService } from "@/lib/ai/vectorize";


// NVIDIA NIM model configuration
// For multimodal (image) support, use llama-3.2-vision model
const MODEL = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.2-90b-vision-instruct";

// System prompt dengan instruksi format yang jelas
const SYSTEM_PROMPT =
  process.env.NVIDIA_NIM_SYSTEM_PROMPT ||
  `You are a helpful AI assistant.

CRITICAL: Always provide COMPLETE and FULL responses. Never cut off mid-sentence or mid-thought.

CONTENT FORMAT RULES (GitHub Flavored Markdown):

1. Use standard GFM syntax for ALL formatting
2. For code blocks: \`\`\`language\ncode\n\`\`\`
3. For inline code: \`code\`
4. For bold: **text**, italic: *text*, strikethrough: ~~text~~
5. For lists:
   - Bullet: - item (space after dash)
   - Numbered: 1. item (space after dot)
   - Nested: indent 2 spaces
6. For tables: Use standard markdown table syntax with | and -
7. For blockquotes: > text
8. For horizontal rules: ---

MATHEMATICAL FORMULAS (LaTeX):

9. ALWAYS use LaTeX for ALL mathematical expressions
10. For inline math: $formula$ (e.g., $E = mc^2$)
11. For display/block math: $$formula$$ (e.g., $$\\sum_{i=1}^{n} x_i$$)
12. NEVER use Unicode math symbols - always use LaTeX
13. Example: Write "The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$" NOT with Unicode

SOURCES FORMAT - CRITICAL RULES:

14. ABSOLUTELY NEVER use markdown links [text](url) anywhere in the main response
15. ABSOLUTELY NEVER include URLs inline in your answer text
16. When mentioning sources in text, use ONLY plain text (e.g., "According to Bloomberg...", "Investing.com reports...", "Ajaib shows...")
17. NO EXCEPTIONS: Never write [Ajaib](url) or [Bloomberg](url) in the main text - only write "Ajaib" or "Bloomberg"
18. At the VERY END, add a "Sources:" section with: - [Source Name](full-url)
19. Each source on its own line in Sources section ONLY
20. Use EXACT URLs from search results - do not modify them

IMPORTANT - FORMAT SEPARATION:

20. Markdown syntax is for STRUCTURE (headings, lists, code, tables)
21. LaTeX syntax ($...$ and $$...$$) is for MATH ONLY
22. NEVER mix: don't put markdown inside $...$ and don't use $...$ for non-math
23. If showing currency: use "USD 100" or "$100" (text), NOT $100$ (LaTeX)

RESPONSE COMPLETENESS:
24. ALWAYS finish thoughts completely - never stop mid-sentence
25. Always end with proper punctuation or complete conclusion
26. If providing a list, include ALL items - never cut off mid-list
27. Before ending, ask: "Is this complete? Did I finish all thoughts?"`;

// Keywords yang MENYEBUTKAN tidak perlu search (greetings, casual chat)
const NO_SEARCH_KEYWORDS = [
  "halo", "hi", "hello", "pagi", "siang", "sore", "malam",
  "apa kabar", "how are you", "terima kasih", "thanks",
  "nama kamu", "who are you", "apa nama kamu", "what is your name",
];

async function shouldSearchWeb(
  messages: any[],
  apiKey: string
): Promise<{ search: boolean; query: string }> {
  const lastMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
  const lowerMessage = lastMessage.toLowerCase();

  // ONLY skip search for clear greetings/casual chat
  const isGreeting = NO_SEARCH_KEYWORDS.some(keyword =>
    lowerMessage === keyword.toLowerCase() || lowerMessage.startsWith(keyword.toLowerCase() + " ")
  );

  // For ALL other queries, ALWAYS search to ensure up-to-date information
  // This ensures the AI can answer questions about current events, news, etc.
  const shouldSearch = !isGreeting;

  console.log(shouldSearch ? "Search enabled for:" : "Search skipped for:", lastMessage);
  return { search: shouldSearch, query: lastMessage };
}

function createEnhancedPromptWithValidation(lastUserMessage: string, searchContext: string): string {
  return `CRITICAL: You HAVE been provided with EXACT search results from the web. You MUST use this information to answer.

SEARCH RESULTS FROM WEB (use this information to answer):
---
${searchContext}
---

YOUR TASK: Answer the user's question using ONLY the information from the search results above.

FORMAT RULES (GitHub Flavored Markdown + LaTeX):

STRUCTURE (Markdown):
- Headings: # H1, ## H2, ### H3
- Lists: - item, 1. item (with space after marker)
- Bold: **text**, Italic: *text*
- Code: inline \`code\`, block \`\`\`language\ncode\n\`\`\`
- Tables: | Col 1 | Col 2 |\n|-------|-------|\n| A | B |

MATHEMATICS (LaTeX):
- Inline math: $formula$ (e.g., $E = mc^2$)
- Block math: $$formula$$ (e.g., $$\\sum_{i=1}^{n} x_i = \\bar{x}$$)
- ALWAYS use LaTeX for math, NEVER Unicode symbols
- Currency like "USD 100" or "$100" - do NOT use $100$ (that's LaTeX)

SOURCES:
- Mention sources naturally: "According to CoinMarketCap..."
- At END, add: Sources:\n- [Source Name](EXACT_URL)
- NEVER put URLs inline in text

EXAMPLE CORRECT:
"According to CoinMarketCap, Bitcoin price is $67,234.

Sources:
- [CoinMarketCap](https://coinmarketcap.com/currencies/bitcoin)"

WRONG (DO NOT DO):
- "I don't have access to real-time data"
- Unicode math: "∑" instead of $\\sum$
- "Check [CoinMarketCap](url) for prices" (inline link)

User Question: ${lastUserMessage}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { messages: any[] };
    const messages = body.messages;
  console.log("Received messages:", JSON.stringify(body.messages, null, 2));

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request: messages array is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NVIDIA_NIM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NVIDIA NIM API key not configured" },
        { status: 500 }
      );
    }

// Process attachments and build messages for NVIDIA NIM
const processMessageContent = async (msg: any): Promise<any> => {
  if (msg.role === "user" && msg.attachments && msg.attachments.length > 0) {
    // Build multimodal content array for vision model
    const content: any[] = [];

    // Add image attachments first
    for (const attachment of msg.attachments) {
      const fileType = attachment.type;

      if (fileType.startsWith("image/")) {
        // Send image as base64 data URL (Llama 3.2 vision format)
        content.push({
          type: "image_url",
          image_url: { url: attachment.preview }
        });
      } else if (attachment.content) {
        // For text files with extracted content, send the actual content
        const fileTypeLabel = getFileTypeLabel(fileType, attachment.name);
        content.push({
          type: "text",
          text: `[File: ${attachment.name} (${fileTypeLabel}, ${formatFileSize(attachment.size)})]\n\n${attachment.content}\n\n[End of file content]`
        });
      } else {
        console.log("[Chat API] Attachment without content:", attachment.name);
        // Fallback: add description for files without extracted content
        const fileTypeLabel = getFileTypeLabel(fileType, attachment.name);
        content.push({
          type: "text",
          text: `[Attachment: ${attachment.name} (${fileTypeLabel}, ${formatFileSize(attachment.size)}) - User wants analysis of this file]`
        });
      }
    }

    // Add text content (question/prompt) after attachments
    if (msg.content && msg.content.trim()) {
      content.push({ type: "text", text: msg.content });
    } else if (msg.attachments.length > 0) {
      // If no text content, add a default prompt for analyzing attachments
      content.push({
        type: "text",
        text: "Please analyze the attached file(s)."
      });
    }

    return { role: msg.role, content };
  }

  // For non-attachment messages, use simple string content
  return { role: msg.role, content: msg.content };
};

// Helper function to get file type label
function getFileTypeLabel(fileType: string, fileName: string): string {
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) return "PDF";
  if (fileType === "text/csv" || fileName.endsWith(".csv")) return "CSV";
  if (fileType === "application/json" || fileName.endsWith(".json")) return "JSON";
  if (fileType === "text/plain") return "Text";
  if (fileType.startsWith("image/")) return "Image";
  return "File";
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Pre-process attachments to handle OCR-based PDFs
async function preprocessAttachments(messages: any[]): Promise<any[]> {
  const processedMessages = [];

  for (const msg of messages) {
    if (msg.role === "user" && msg.attachments && msg.attachments.length > 0) {
      const processedAttachments = [];

      for (const attachment of msg.attachments) {
        const fileType = attachment.type;

        // If this is a PDF with OCR-required marker, fetch OCR images
        if (fileType === "application/pdf" && attachment.content && attachment.content.includes("[OCR_REQUIRED:")) {
          // Check if ocrImages already exists (shouldn't happen, but handle it)
          if (!attachment.ocrImages) {
            // This shouldn't happen in normal flow, but handle gracefully
            console.log("PDF attachment missing OCR images, using text fallback");
          }
        }

        processedAttachments.push(attachment);
      }

      processedMessages.push({
        ...msg,
        attachments: processedAttachments,
      });
    } else {
      processedMessages.push(msg);
    }
  }

  return processedMessages;
}

const processedMessages = await preprocessAttachments(messages);
const nvidiaMessages = await Promise.all(processedMessages.map(processMessageContent));

const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";

const { search: needSearch, query } = await shouldSearchWeb(messages, apiKey);

let searchContext: string | null = null;
let searchResults: Array<{ url: string; title: string; content: string }> = [];

console.log("[CHAT] needSearch:", needSearch, "query:", query);

if (needSearch && query) {
  console.log("[CHAT] Performing web search for:", query);

  const results = await searchWeb(query, 5);
  searchResults = results;

  console.log("[CHAT] Search returned", results.length, "results");

  if (results.length > 0) {
    searchContext = formatSearchResults(results);
    console.log("[CHAT] Search context created, length:", searchContext.length);
    console.log("[CHAT] Search context preview:", searchContext.substring(0, 500));

    if (vectorizeService.isConfigured()) {
      const embedding = await vectorizeService.generateEmbedding(query);
      if (embedding.length > 0) {
        await vectorizeService.upsertVector(query, embedding, {
          query: query,
          results: results.map(r => ({ url: r.url, title: r.title })),
          timestamp: new Date().toISOString(),
        });
      }
    }
  } else {
    console.log("[CHAT] No search results found");
  }
} else {
  console.log("[CHAT] Skipping web search - not needed for this query");
}

let apiMessages: any[];

if (searchContext) {
  console.log("[CHAT] Using ENHANCED prompt with search context");
  const enhancedPrompt = createEnhancedPromptWithValidation(lastUserMessage, searchContext);

  apiMessages = [
    { role: "system", content: enhancedPrompt },
    ...nvidiaMessages.filter((m: any) => m.role === "system" || m.role === "user" || m.role === "assistant"),
  ];
} else {
  console.log("[CHAT] Using STANDARD prompt without search context");
  apiMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...nvidiaMessages,
  ];
}

    const nvidiaResponse = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: apiMessages,
          stream: true,
          max_tokens: 4096,
          temperature: 0.7,
          top_p: 0.85,
        }),
      }
    );

    if (!nvidiaResponse.ok) {
      const errorText = await nvidiaResponse.text();
      console.error("NVIDIA NIM API error:", nvidiaResponse.status, errorText);
      return NextResponse.json(
        { error: `AI model error: ${nvidiaResponse.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = nvidiaResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          if (searchContext) {
            controller.enqueue(new TextEncoder().encode(`__SEARCH_USED__:true\n`));
          } else {
            controller.enqueue(new TextEncoder().encode(`__SEARCH_SKIPPED__:true\n`));
          }

          let buffer = "";
          let totalContentLength = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            buffer += chunk;

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;

              if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                const data = trimmedLine.slice(6);
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    totalContentLength += content.length;
                  }
                } catch {
                  // Not JSON, forward as is
                }
                controller.enqueue(new TextEncoder().encode(`${trimmedLine}\n`));
              } else if (trimmedLine === 'data: [DONE]') {
                console.log(`[STREAM] Received [DONE], total content chars: ${totalContentLength}`);
                if (buffer.trim()) {
                  controller.enqueue(new TextEncoder().encode(buffer));
                  totalContentLength += buffer.length;
                }
                console.log(`[STREAM] Final total content chars: ${totalContentLength}`);
                controller.close();
                return;
              }
            }
          }

          if (buffer.trim()) {
            controller.enqueue(new TextEncoder().encode(buffer));
            totalContentLength += buffer.length;
          }

          console.log(`[STREAM] Stream ended naturally, total content chars: ${totalContentLength}`);
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
