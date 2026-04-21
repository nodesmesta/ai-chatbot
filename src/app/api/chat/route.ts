import { NextRequest, NextResponse } from "next/server";
import { searchWeb, formatSearchResults } from "@/lib/ai/search-tavily";
import { vectorizeService } from "@/lib/ai/vectorize";

// NVIDIA NIM model configuration
const MODEL = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.2-90b-vision-instruct";

// Tool definition for web search - LLM will decide when to use this
const SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "search_web",
    description: "Search the web for current and up-to-date information. Use this tool when you need to find current events, latest news, real-time data, stock prices, cryptocurrency prices, or information that may have changed since your training.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "The search query to find relevant information from the web"
        }
      },
      required: ["query"]
    }
  }
};

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

SOURCES FORMAT - CRITICAL RULES (MUST FOLLOW EXACTLY):

14. ABSOLUTELY NEVER use markdown links [text](url) anywhere in the main response body
15. ABSOLUTELY NEVER include URLs inline in your answer text
16. When mentioning sources in text, use ONLY plain text names (e.g., "According to CoinMarketCap...", "Bloomberg reports...", "TradingView shows...")
17. NO EXCEPTIONS: Never write [CoinMarketCap](url) or [Bloomberg](url) in the main text - only write "CoinMarketCap" or "Bloomberg"
18. At the VERY END of your response, you MUST add a "Sources:" section with this exact format:

Sources:
- [Source Name 1](https://exact-url-from-search-results)
- [Source Name 2](https://exact-url-from-search-results)
- [Source Name 3](https://exact-url-from-search-results)

19. Each source MUST be on its own line in the Sources section ONLY
20. Use EXACT URLs from the search results above - do not modify them
21. The Sources section MUST come AFTER your complete answer, with a blank line before "Sources:"
22. If you used search results, you MUST list all sources you referenced in the Sources section

EXAMPLE OF CORRECT FORMAT:

Bitcoin price has increased significantly this year. According to CoinMarketCap, the current price is $67,234. TradingView shows similar data.

Sources:
- [CoinMarketCap](https://coinmarketcap.com/currencies/bitcoin)
- [TradingView](https://www.tradingview.com/symbols/BTCUSD/)

WRONG (DO NOT DO THIS):
- "Bitcoin price is $67,234 according to [CoinMarketCap](https://...)"
- "Check [Bloomberg](https://...) for more info"
- Not including a Sources section at all
- Putting URLs inline in the text

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

// Keywords untuk greetings sederhana
const GREETING_KEYWORDS = [
  "halo", "hi", "hello", "pagi", "siang", "sore", "malam",
  "apa kabar", "how are you", "terima kasih", "thanks",
  "nama kamu", "who are you", "apa nama kamu", "what is your name",
];

function isSimpleGreeting(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  return GREETING_KEYWORDS.some(keyword =>
    lowerMessage === keyword.toLowerCase() || lowerMessage.startsWith(keyword.toLowerCase() + " ")
  );
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
        const content: any[] = [];

        for (const attachment of msg.attachments) {
          const fileType = attachment.type;

          if (fileType.startsWith("image/")) {
            content.push({
              type: "image_url",
              image_url: { url: attachment.preview }
            });
          } else if (attachment.content) {
            const fileTypeLabel = getFileTypeLabel(fileType, attachment.name);
            content.push({
              type: "text",
              text: `[File: ${attachment.name} (${fileTypeLabel}, ${formatFileSize(attachment.size)})]\n\n${attachment.content}\n\n[End of file content]`
            });
          } else {
            console.log("[Chat API] Attachment without content:", attachment.name);
            const fileTypeLabel = getFileTypeLabel(fileType, attachment.name);
            content.push({
              type: "text",
              text: `[Attachment: ${attachment.name} (${fileTypeLabel}, ${formatFileSize(attachment.size)}) - User wants analysis of this file]`
            });
          }
        }

        if (msg.content && msg.content.trim()) {
          content.push({ type: "text", text: msg.content });
        } else if (msg.attachments.length > 0) {
          content.push({
            type: "text",
            text: "Please analyze the attached file(s)."
          });
        }

        return { role: msg.role, content };
      }

      return { role: msg.role, content: msg.content };
    };

    function getFileTypeLabel(fileType: string, fileName: string): string {
      if (fileType === "application/pdf" || fileName.endsWith(".pdf")) return "PDF";
      if (fileType === "text/csv" || fileName.endsWith(".csv")) return "CSV";
      if (fileType === "application/json" || fileName.endsWith(".json")) return "JSON";
      if (fileType === "text/plain") return "Text";
      if (fileType.startsWith("image/")) return "Image";
      return "File";
    }

    function formatFileSize(bytes: number): string {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    async function preprocessAttachments(messages: any[]): Promise<any[]> {
      const processedMessages = [];

      for (const msg of messages) {
        if (msg.role === "user" && msg.attachments && msg.attachments.length > 0) {
          const processedAttachments = [];

          for (const attachment of msg.attachments) {
            const fileType = attachment.type;

            if (fileType === "application/pdf" && attachment.content && attachment.content.includes("[OCR_REQUIRED:")) {
              if (!attachment.ocrImages) {
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

    // Track search status for frontend
    const searchStatus = { used: false, skipped: false, searching: false };

    // Check if this is a simple greeting - skip tool calling entirely
    if (isSimpleGreeting(lastUserMessage)) {
      searchStatus.skipped = true;
      console.log("[CHAT] Greeting detected, skipping tool calling:", lastUserMessage);
    } else {
      searchStatus.searching = true;
      console.log("[CHAT] Tool calling enabled for:", lastUserMessage);
    }

    let apiMessages: any[];

    if (searchStatus.searching) {
      // First API call: Let LLM decide if it needs to search using tool calling
      apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...nvidiaMessages.filter((m: any) => m.role === "system" || m.role === "user" || m.role === "assistant"),
      ];

      const firstResponse = await fetch(
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
            tools: [SEARCH_TOOL],
            tool_choice: "auto",
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 0.85,
          }),
        }
      );

      if (!firstResponse.ok) {
        const errorText = await firstResponse.text();
        console.error("NVIDIA NIM API error (first call):", firstResponse.status, errorText);
        return NextResponse.json(
          { error: `AI model error: ${firstResponse.status} - ${errorText}` },
          { status: 500 }
        );
      }

      const firstData = await firstResponse.json();
      const toolCall = firstData.choices?.[0]?.message?.tool_calls?.[0];
      const responseMessage = firstData.choices?.[0]?.message;

      // Check if LLM decided to use the search tool
      if (toolCall && toolCall.function?.name === "search_web") {
        console.log("[CHAT] LLM decided to use search tool");
        searchStatus.used = true;
        searchStatus.skipped = false;

        // Parse the search query from tool arguments
        let searchQuery = "";
        try {
          const args = JSON.parse(toolCall.function.arguments);
          searchQuery = args.query;
          console.log("[CHAT] Search query from LLM:", searchQuery);
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
          searchQuery = lastUserMessage;
        }

        // Perform the search
        const results = await searchWeb(searchQuery, 5);
        console.log("[CHAT] Search returned", results.length, "results");

        if (results.length > 0) {
          const searchContext = formatSearchResults(results);

          if (vectorizeService.isConfigured()) {
            const embedding = await vectorizeService.generateEmbedding(searchQuery);
            if (embedding.length > 0) {
              await vectorizeService.upsertVector(searchQuery, embedding, {
                query: searchQuery,
                results: results.map(r => ({ url: r.url, title: r.title })),
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Add search results as tool response
          const toolResponse = {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            name: "search_web",
            content: searchContext,
          };

          // Second API call: LLM answers with search context
          const secondApiMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...nvidiaMessages.filter((m: any) => m.role === "system" || m.role === "user" || m.role === "assistant"),
            responseMessage,
            toolResponse,
          ];

          return createNvidiaResponse(secondApiMessages, apiKey, true);
        } else {
          console.log("[CHAT] No search results found, proceeding without context");
          searchStatus.used = false;
          return createNvidiaResponse(apiMessages, apiKey, false);
        }
      } else {
        console.log("[CHAT] LLM decided not to use search tool");
        searchStatus.skipped = true;
        searchStatus.used = false;
        return createNvidiaResponse(apiMessages, apiKey, false);
      }
    } else {
      // Greeting - respond without tools
      apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...nvidiaMessages,
      ];
      return createNvidiaResponse(apiMessages, apiKey, false);
    }

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to create NVIDIA Response with search status marker
async function createNvidiaResponse(messages: any[], apiKey: string, hasSearchContext: boolean): Promise<Response> {
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
        messages,
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
    throw new Error(`AI model error: ${nvidiaResponse.status} - ${errorText}`);
  }

  // Transform the stream to add search status marker
  const transformedStream = nvidiaResponse.body!.pipeThrough(
    new TransformStream({
      start(controller) {
        // Send search status marker first
        const marker = hasSearchContext ? '__SEARCH_USED__:true\n' : '__SEARCH_SKIPPED__:true\n';
        controller.enqueue(new TextEncoder().encode(marker));
      },
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        controller.enqueue(chunk);
      },
    })
  );

  return new Response(transformedStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
