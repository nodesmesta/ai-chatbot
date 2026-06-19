"use client";

import { useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import type { Source } from "@/components/ui/source-card";
import { extractSourcesFromContent } from "@/lib/ai/search-utils";

interface AttachmentPreview {
  id: string;
  name: string;
  type: string;
  size: number;
  preview: string;
  content?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  attachments?: AttachmentPreview[];
}

interface SearchStatusState {
  searching: boolean;
  skipped: boolean;
}

interface ChatStreamOptions {
  setMessages: (updater: (prev: Message[]) => Message[]) => void;
  setSearchStatus: (updater: (prev: SearchStatusState | null) => SearchStatusState | null) => void;
  setError: (value: string | null) => void;
  setIsLoading: (value: boolean) => void;
  scrollToBottom?: () => void;
}

interface StreamChatParams {
  messagesToSend: Message[];
  model: string;
  assistantIndex: number;
}

function parseErrorResponse(response: Response): Promise<string> {
  return response.text().then((text) => {
    if (!text) return "Failed to get response";
    try {
      const errorData = JSON.parse(text);
      if (
        typeof errorData === "object" &&
        errorData !== null &&
        "error" in errorData &&
        typeof errorData.error === "string"
      ) {
        return errorData.error;
      }
    } catch { /* ignore parse failure */ }
    return "Failed to get response";
  });
}

async function processSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (content: string) => void,
  onSearchStatus: (skipped: boolean) => void,
  signal: { aborted: boolean },
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantContent = "";
  let firstChunk = true;
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done || signal.aborted) break;

    const chunk = decoder.decode(value);
    buffer += chunk;

    if (firstChunk) {
      firstChunk = false;
      if (chunk.startsWith("__SEARCH_SKIPPED__:")) {
        onSearchStatus(true);
      } else if (chunk.startsWith("__SEARCH_USED__:")) {
        onSearchStatus(false);
      }
    }

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let doneReceived = false;
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        doneReceived = true;
        break;
      }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          chunkCount++;
          assistantContent += content;
          onChunk(assistantContent);
        }
      } catch { /* skip malformed chunks */ }
    }
    if (doneReceived) break;
  }

  // Process remaining buffer
  if (buffer.trim() && buffer.startsWith("data: ") && buffer !== "data: [DONE]") {
    try {
      const data = buffer.slice(6);
      const parsed = JSON.parse(data);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) {
        assistantContent += content;
        onChunk(assistantContent);
      }
    } catch { /* ignore */ }
  }

  return assistantContent;
}

export function useChatStream(options: ChatStreamOptions) {
  const { setMessages, setSearchStatus, setError, setIsLoading, scrollToBottom } = options;
  const assistantMessageRef = useRef<number | null>(null);

  const updateAssistantMessage = useCallback(
    (content: string) => {
      flushSync(() => {
        setMessages((prev) => {
          if (assistantMessageRef.current === null) return prev;
          const updated = [...prev];
          updated[assistantMessageRef.current] = {
            role: "assistant",
            content,
          };
          return updated;
        });
      });
      scrollToBottom?.();
    },
    [setMessages, scrollToBottom],
  );

  const finalizeWithSources = useCallback(
    (content: string) => {
      const { sources } = extractSourcesFromContent(content);
      setMessages((prev) => {
        if (assistantMessageRef.current === null) return prev;
        const updated = [...prev];
        updated[assistantMessageRef.current] = {
          role: "assistant",
          content,
          ...(sources.length > 0 ? { sources } : {}),
        };
        return updated;
      });
    },
    [setMessages],
  );

  const resetAssistantRef = useCallback(() => {
    assistantMessageRef.current = null;
  }, []);

  const streamChat = useCallback(
    async ({ messagesToSend, model, assistantIndex }: StreamChatParams) => {
      assistantMessageRef.current = assistantIndex;
      let assistantContent = "";

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesToSend, model }),
        });

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const signal = { aborted: false };

        assistantContent = await processSSEStream(
          reader,
          (content) => updateAssistantMessage(content),
          (skipped) => {
            setSearchStatus((prev) =>
              prev ? { searching: !skipped, skipped } : prev,
            );
          },
          signal,
        );
      } catch (err) {
        console.error("Stream error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setMessages((prev) =>
          prev.filter((_, i) => i !== assistantMessageRef.current),
        );
      } finally {
        setSearchStatus((prev) =>
          prev && prev.searching ? { searching: false, skipped: prev.skipped } : prev,
        );
        setIsLoading(false);

        if (assistantContent) {
          finalizeWithSources(assistantContent);
        }
        assistantMessageRef.current = null;
      }

      return assistantContent;
    },
    [setMessages, setSearchStatus, setError, setIsLoading, updateAssistantMessage, finalizeWithSources],
  );

  return { streamChat, assistantMessageRef };
}
