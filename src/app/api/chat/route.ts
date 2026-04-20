import { NextRequest, NextResponse } from "next/server";
import { searchWeb, formatSearchResults } from "@/lib/ai/search";
import { vectorizeService } from "@/lib/ai/vectorize";


// NVIDIA NIM model configuration
// For multimodal (image) support, use llama-3.2-vision model
const MODEL = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.2-90b-vision-instruct";

// System prompt dengan instruksi yang lebih strict untuk mencegah hallucination
const SYSTEM_PROMPT =
  process.env.NVIDIA_NIM_SYSTEM_PROMPT ||
  `You are a helpful AI assistant.

CRITICAL: Always provide COMPLETE and FULL responses. Never cut off mid-sentence or mid-thought.

IMPORTANT FORMATTING RULES:

1. NEVER include markdown links [text](url) in your main response text
2. NEVER include URLs inline in your answer
3. If you reference information from a source, only mention the source name naturally in text
4. At the end of your response, if you used external sources, add a "Sources:" section with the full list of references
5. Sources must be formatted as: - [Source Name](full-url)
6. Each source must be on its own line in the Sources section only
7. ALWAYS include sources when you use information from web search results
8. Use the EXACT URLs from the search results provided - do not modify them
9. If you used search results, you MUST include a Sources section with all referenced sources

LIST FORMATTING RULES:
10. For numbered lists, NEVER put a newline after the number. Use "1. Text" NOT "1.\nText"
11. For bullet lists, NEVER put a newline after the dash. Use "- Text" NOT "-\nText"
12. Always write the list marker followed immediately by a space and the text on the same line

RESPONSE COMPLETENESS RULES:
13. ALWAYS finish your thought completely - never stop mid-sentence
14. Always end with proper punctuation (. ! ?) or a complete conclusion
15. If providing a list, include ALL items - never cut off mid-list
16. Take time to provide a thorough, comprehensive answer
17. Before ending your response, ask yourself: "Is this complete? Did I finish all thoughts?"`;

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
  return `Berdasarkan informasi terbaru yang saya temukan dari web:

SEARCH_CONTEXT_START
${searchContext}
SEARCH_CONTEXT_END

Sekarang jawab pertanyaan pengguna berikut dengan menggunakan informasi di atas.

PENTING - Format Jawaban:

1. Jawab secara natural tanpa menyertakan link URL di dalam teks jawaban
2. Jika Anda menggunakan informasi dari sumber tertentu, hanya sebutkan nama sumbernya dalam teks (contoh: "Menurut Hello Sehat...")
3. Di akhir jawaban, TAMBAHKAN bagian "Sumber:" dengan format WAJIB: - [Nama Sumber](URL_lengkap)
4. Setiap sumber di baris baru dengan format markdown link
5. URL harus SAMA PERSIS dari search results di atas - JANGAN ubah URL
6. CRITICAL: HANYA gunakan sumber yang TERSEDIA di SEARCH_CONTEXT di atas
7. JANGAN buat-buat URL yang tidak ada di search results
8. WAJIB tambahkan bagian Sumber jika Anda menggunakan informasi dari search results

CONTOH FORMAT YANG BENAR:
"Menurut Tradingview, harga Bitcoin adalah $74,736."

Sumber:
- [Tradingview](https://www.tradingview.com)
- [Binance](https://www.binance.com)

JANGAN tulis seperti ini (SALAH):
"Sumber: Tradingview, Binance" (TANPA link markdown!)

FORMAT LIST - PENTING:
1. Untuk numbered list, JANGAN gunakan enter/newline setelah angka. Format yang BENAR: "1. Teks jawaban"
2. Format yang SALAH: "1.\nTeks jawaban" (ada enter setelah titik)
3. Untuk bullet list, JANGAN gunakan enter setelah simbol. Format yang BENAR: "- Teks jawaban"
4. Format yang SALAH: "-\nTeks jawaban" (ada enter setelah dash)
5. Selalu tulis angka/simbol list followed langsung oleh spasi dan teks

Pertanyaan: ${lastUserMessage}

CRITICAL FINAL INSTRUCTIONS - READ CAREFULLY:

1. You MUST provide a COMPLETE response - do NOT stop early or cut off mid-sentence
2. Do NOT truncate any URLs - every URL must be complete with closing parenthesis
3. Do NOT leave any markdown links incomplete - [text](url) must have both brackets and parentheses closed
4. Continue generating until you have provided a full answer with proper conclusion
5. ALWAYS end your response with the Sources section if you used any sources
6. If you feel your response is getting long, SUMMARIZE but DO NOT cut off mid-URL or mid-sentence
7. Your response is ONLY complete when it ends with either a proper period/exclamation/question mark OR the complete Sources section
8. DO NOT stop generating until ALL information is provided AND all sources are listed

Remember: A complete response is better than a truncated one. Generate the full answer.`;
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

    if (needSearch && query) {
      console.log("Performing web search for:", query);

      const results = await searchWeb(query, 5);
      searchResults = results;

      if (results.length > 0) {
        searchContext = formatSearchResults(results);

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
        console.log("No search results found");
      }
    } else {
      console.log("Skipping web search - not needed for this query");
    }

    let apiMessages: any[];

    if (searchContext) {
      const enhancedPrompt = createEnhancedPromptWithValidation(lastUserMessage, searchContext);

      apiMessages = [
        { role: "system", content: enhancedPrompt },
        ...nvidiaMessages.filter((m: any) => m.role === "system" || m.role === "user" || m.role === "assistant"),
      ];
    } else {
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
