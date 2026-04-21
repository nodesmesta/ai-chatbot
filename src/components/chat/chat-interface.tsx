"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { flushSync } from "react-dom";
import { Sidebar } from "./sidebar";
import { MessageBubble } from "./message-bubble";
import { SearchStatus } from "./search-status";
import { extractFileContent } from "@/lib/pdf/extractor-client";
import type { Source } from "../ui/source-card";
import { extractSourcesFromContent, removeSourceSection } from "@/lib/ai/search-utils";
import { SparklesIcon } from "lucide-react";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  preview: string;
  file: File;
  content?: string;
  extractError?: string;
}

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

const SUPPORTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function SearchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}


function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function CloseIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateTitleFromMessage(content: string) {
  const cleaned = content.trim().replace(/\n/g, " ");
  return cleaned.length > 40 ? cleaned.substring(0, 40) + "..." : cleaned;
}

const STORAGE_KEY = "chat-sessions";

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatusState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [sessionToRename, setSessionToRename] = useState<ChatSession | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const assistantMessageRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
};

const ensureTextareaVisible = () => {
  setTimeout(() => {
    textareaRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, 100);
};

  const handleRetryLastResponse = async () => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== "assistant") return;

    const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
    if (lastUserIndex < 0) return;
    const userMessage = messages[lastUserIndex];
    const messagesToSend = messages.slice(0, -1);

    setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: "" }]);
    setIsLoading(true);
    setError(null);
    setSearchStatus({ searching: true, skipped: false });
    const assistantIndex = messages.length - 1;
    assistantMessageRef.current = assistantIndex;
    let assistantContent = "";

    try {
      const requestBody = { messages: [...messagesToSend, userMessage] };
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = typeof errorData === "object" && errorData !== null && "error" in errorData && typeof errorData.error === "string"
          ? errorData.error
          : "Failed to get response";
        throw new Error(errorMessage);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");
      const decoder = new TextDecoder();
      let firstChunk = true;
      let chunkCount = 0;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        buffer += chunk;

        if (firstChunk) {
          firstChunk = false;
          if (chunk.startsWith("__SEARCH_SKIPPED__:")) setSearchStatus((prev) => (prev ? { searching: false, skipped: true } : prev));
          else if (chunk.startsWith("__SEARCH_USED__:")) setSearchStatus((prev) => (prev ? { searching: true, skipped: false } : prev));
        }

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              console.log(`[RETRY] Received [DONE], total chunks: ${chunkCount}, content length: ${assistantContent.length} chars`);
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                chunkCount++;
                assistantContent += content;
                flushSync(() => {
                  setMessages((prev) => {
                    if (assistantMessageRef.current === null) return prev;
                    const updated = [...prev];
                    updated[assistantMessageRef.current] = { role: "assistant", content: assistantContent };
                    return updated;
                  });
                });
                scrollToBottom();
              }
            } catch (err) {
              console.debug("Failed to parse SSE data:", err);
            }
          }
        }
      }

      if (buffer.trim()) {
        console.log(`[RETRY] Remaining buffer: "${buffer}"`);
      }
      console.log(`[RETRY] Stream ended, total chunks: ${chunkCount}, content length: ${assistantContent.length} chars`);
    } catch (err) {
      console.error("Retry error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setMessages(prev => prev.filter((_, i) => i !== assistantMessageRef.current));
    } finally {
      setSearchStatus(prev => (prev && prev.searching ? { searching: false, skipped: prev.skipped } : prev));
      setIsLoading(false);
      if (assistantContent) {
        const processedContent = assistantContent;
        const { sources } = extractSourcesFromContent(processedContent);
        if (sources.length > 0) {
          setMessages(prev => {
            if (assistantMessageRef.current === null) return prev;
            const updated = [...prev];
            updated[assistantMessageRef.current] = { role: "assistant", content: processedContent, sources };
            return updated;
          });
        } else {
          setMessages(prev => {
            if (assistantMessageRef.current === null) return prev;
            const updated = [...prev];
            updated[assistantMessageRef.current] = { role: "assistant", content: processedContent };
            return updated;
          });
        }
      }
      assistantMessageRef.current = null;
    }
  };

  useEffect(() => {
    const stored = loadSessions();
    setSessions(stored);
    if (stored.length > 0) {
      const sorted = [...stored].sort((a, b) => b.updatedAt - a.updatedAt);
      setCurrentSessionId(sorted[0].id);
      setMessages(sorted[0].messages || []);
    } else {
      const newSession: ChatSession = { id: generateId(), title: "", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
      saveSessions([newSession]);
      setCurrentSessionId(newSession.id);
      setSessions([newSession]);
    }
  }, []);

  useEffect(() => {
    if (!currentSessionId) return;
    const currentSessions = loadSessions();
    const sessionIndex = currentSessions.findIndex((s) => s.id === currentSessionId);
    if (sessionIndex === -1) return;
    const session = currentSessions[sessionIndex];
    const newTitle = messages.length > 0 && messages[0]?.content && !session.title ? generateTitleFromMessage(messages[0].content) : session.title;
    if (JSON.stringify(session.messages) !== JSON.stringify(messages) || session.title !== newTitle) {
      currentSessions[sessionIndex] = { ...session, messages, title: newTitle, updatedAt: Date.now() };
      saveSessions(currentSessions);
      setSessions(currentSessions);
    }
  }, [messages, currentSessionId]);

  const createNewSession = () => {
    const newSession: ChatSession = { id: generateId(), title: "", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setSessions((prev) => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setError(null);
    setSearchStatus(null);
    assistantMessageRef.current = null;
    setIsMobileSidebarOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages || []);
      setError(null);
      setSearchStatus(null);
      assistantMessageRef.current = null;
      setIsMobileSidebarOpen(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        const sorted = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt);
        setCurrentSessionId(sorted[0].id);
        setMessages(sorted[0].messages || []);
      } else {
        createNewSession();
      }
    }
  };

  const handleRenameClick = (session: ChatSession) => {
    setSessionToRename(session);
    setEditTitle(session.title || "");
    setIsRenameModalOpen(true);
  };

  const handleRenameSubmit = () => {
    if (!sessionToRename) return;
    const trimmedTitle = editTitle.trim() || "Untitled Chat";
    const updatedSessions = sessions.map((s) => (s.id === sessionToRename.id ? { ...s, title: trimmedTitle, updatedAt: Date.now() } : s));
    saveSessions(updatedSessions);
    setSessions(updatedSessions);
    window.dispatchEvent(new CustomEvent("sessionRenamed", { detail: { sessionId: sessionToRename.id, title: trimmedTitle } }));
    setIsRenameModalOpen(false);
    setSessionToRename(null);
    setEditTitle("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameSubmit();
    else if (e.key === "Escape") {
      setIsRenameModalOpen(false);
      setSessionToRename(null);
      setEditTitle("");
    }
  };

  const handleCloseRenameModal = () => {
    setIsRenameModalOpen(false);
    setSessionToRename(null);
    setEditTitle("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;
    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      attachments: attachedFiles.length > 0 ? attachedFiles.map(f => ({ id: f.id, name: f.name, type: f.type, size: f.size, preview: f.preview, content: f.content })) : undefined
    };
    const messagesToSend = [...messages, userMessage];
    console.log("Sending message with attachments:", userMessage.attachments);
    const newMessages = [...messagesToSend, { role: "assistant", content: "" } as Message];
    setMessages(newMessages);
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);
    setError(null);
    setSearchStatus({ searching: true, skipped: false });
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const assistantIndex = newMessages.length - 1;
    assistantMessageRef.current = assistantIndex;
    let assistantContent = "";
    try {
      const requestBody = { messages: messagesToSend };
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = typeof errorData === "object" && errorData !== null && "error" in errorData && typeof errorData.error === "string"
          ? errorData.error
          : "Failed to get response";
        throw new Error(errorMessage);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");
      const decoder = new TextDecoder();
      let firstChunk = true;
      let chunkCount = 0;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        buffer += chunk;

        if (firstChunk) {
          firstChunk = false;
          if (chunk.startsWith("__SEARCH_SKIPPED__:")) setSearchStatus((prev) => (prev ? { searching: false, skipped: true } : prev));
          else if (chunk.startsWith("__SEARCH_USED__:")) setSearchStatus((prev) => (prev ? { searching: true, skipped: false } : prev));
        }

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let doneReceived = false;
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              doneReceived = true;
              console.log(`[CHAT] Received [DONE], total chunks: ${chunkCount}, content length: ${assistantContent.length} chars`);
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                chunkCount++;
                assistantContent += content;
                flushSync(() => {
                  setMessages((prev) => {
                    if (assistantMessageRef.current === null) return prev;
                    const updated = [...prev];
                    updated[assistantMessageRef.current] = { role: "assistant", content: assistantContent };
                    return updated;
                  });
                });
                scrollToBottom();
              }
            } catch (err) {
              console.debug("Failed to parse SSE data:", err);
            }
          }
        }
        if (doneReceived) break;
      }

// Process any remaining buffer content after stream ends
if (buffer.trim()) {
  console.log(`[CHAT] Processing remaining buffer: "${buffer}"`);
  if (buffer.startsWith("data: ") && buffer !== "data: [DONE]") {
    try {
      const data = buffer.slice(6);
      const parsed = JSON.parse(data);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) {
        assistantContent += content;
        setMessages((prev) => {
          if (assistantMessageRef.current === null) return prev;
          const updated = [...prev];
          updated[assistantMessageRef.current] = { role: "assistant", content: assistantContent };
          return updated;
        });
        console.log(`[CHAT] Processed remaining buffer content: ${content.length} chars`);
      }
    } catch (err) {
      console.debug("Failed to parse remaining buffer:", err);
    }
  }
}

console.log(`[CHAT] Stream ended, total chunks: ${chunkCount}, content length: ${assistantContent.length} chars`);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setMessages((prev) => prev.filter((_, i) => i !== assistantMessageRef.current));
    } finally {
      setSearchStatus((prev) => (prev && prev.searching ? { searching: false, skipped: prev.skipped } : prev));
      setIsLoading(false);
      if (assistantContent) {
        const processedContent = assistantContent;
        const { sources } = extractSourcesFromContent(processedContent);
        if (sources.length > 0) {
          setMessages((prev) => {
            if (assistantMessageRef.current === null) return prev;
            const updated = [...prev];
            updated[assistantMessageRef.current] = {
              role: "assistant",
              content: processedContent,
              sources: sources,
            };
            return updated;
          });
        } else {
          setMessages((prev) => {
            if (assistantMessageRef.current === null) return prev;
            const updated = [...prev];
            updated[assistantMessageRef.current] = {
              role: "assistant",
              content: processedContent,
            };
            return updated;
          });
        }
      }
      assistantMessageRef.current = null;
    }
  };

  const handleClearHistory = () => {
    if (currentSessionId) handleDeleteSession(currentSessionId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
        setError(`File type not supported: ${file.name}. Supported: JPG, PNG, GIF, WebP, PDF, TXT, CSV, JSON`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name}. Maximum size is 10MB`);
        continue;
      }

      const fileId = generateId();

      // For image files, read as DataURL for preview
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = event.target?.result as string;
          const attachedFile: AttachedFile = {
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            preview,
            file,
          };
          setAttachedFiles((prev) => [...prev, attachedFile]);
          setError(null);
        };
        reader.readAsDataURL(file);
        continue;
      }

      // For text-based files (PDF, TXT, CSV, JSON), extract content
      const attachedFile: AttachedFile = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        preview: "",
        file,
      };

      // Add file immediately, then extract content
      setAttachedFiles((prev) => [...prev, attachedFile]);
      setError(null);


      // Extract content asynchronously
      extractFileContent(file).then((result) => {
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  content: result.content,
                  extractError: result.error,
                }
              : f
          )
        );
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-screen bg-[#1a1a1a] text-white font-normal flex overflow-hidden">
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={handleCloseRenameModal} />
          <div className="relative bg-[#1a1a1a] border border-[#1e293b] rounded-lg shadow-2xl w-full max-w-md mx-4 z-10 p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-normal text-white mb-4">Rename Chat</h3>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              autoFocus
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Enter chat name"
              maxLength={50}
            />
            <div className="flex items-center gap-2 mt-4 justify-end">
              <button onClick={handleCloseRenameModal} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#8a9bb8] hover:bg-gray-700 rounded-lg transition-colors">
                <CancelIcon />
                <span className="hidden sm:inline">Cancel</span>
              </button>
              <button onClick={handleRenameSubmit} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-200 text-sm text-black rounded-lg transition-colors font-medium">
                <CheckIcon />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:flex h-full">
        <div className="w-72">
          <Sidebar isOpen={true} onClose={() => {}} currentSessionId={currentSessionId} sessions={sessions} onNewChat={createNewSession} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onRenameClick={handleRenameClick} />
        </div>
      </div>

      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:hidden ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} currentSessionId={currentSessionId} sessions={sessions} onNewChat={createNewSession} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onRenameClick={handleRenameClick} />
      </div>

      {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden p-2 hover:bg-[#121826] rounded-lg transition-colors text-[#8a9bb8]">
              <MenuIcon />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-normal">AI Chatbot</h1>
              <p className="text-xs text-[#8a9bb8]">Powered by Nodesemesta</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-sm font-normal">AI Chat</h1>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto w-full scroll-smooth scroll-pb-40">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center max-w-lg w-full px-4 sm:px-6">
                <h2 className="text-base sm:text-lg font-normal mb-1 sm:mb-2">How can I help you?</h2>
                <p className="text-[#8a9bb8] text-xs mb-3 sm:mb-4">I search the web for the most up-to-date information to answer your questions.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 space-y-4">
              {messages.map((message, index) => (
                <Fragment key={`${message.role}-${index}`}>
                  {message.role === "user" ? (
                    <div className="flex justify-end gap-2">
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end mb-1">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e293b] rounded-lg border border-[#334155]">
                              {attachment.type.startsWith("image/") ? (
                                <img src={attachment.preview} alt="" className="w-5 h-5 object-cover rounded" />
                              ) : attachment.type === "application/pdf" ? (
                                <svg className="w-5 h-5 text-[#ef4444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              ) : attachment.type === "application/json" || attachment.type.includes("json") ? (
                                <svg className="w-5 h-5 text-[#eab308]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                              ) : attachment.type === "text/csv" || attachment.type.includes("csv") ? (
                                <svg className="w-5 h-5 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-[#8a9bb8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              <span className="text-sm text-[#e2e8f0] truncate max-w-[140px]">{attachment.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="px-3 py-2 rounded-lg bg-[#121826] text-[#e2e8f0] border border-[#1e293b] max-w-[80%]">
                        {message.content && <p className="whitespace-pre-wrap text-base leading-7">{message.content}</p>}
                      </div>
                    </div>
                  ) : (
                    <MessageBubble role="assistant" content={message.content} sources={message.sources} onRetry={handleRetryLastResponse} />
                  )}
                </Fragment>
              ))}

              {searchStatus?.searching && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-[#94a3b8] font-medium">Thinking</span>
                  <div className="flex items-center gap-0.5">
                    <span className="w-1 h-1 bg-[#94a3b8] rounded-full animate-[bounce_1.4s_infinite_both]" />
                    <span className="w-1 h-1 bg-[#cbd5e1] rounded-full animate-[bounce_1.4s_infinite_0.2s_both]" />
                    <span className="w-1 h-1 bg-[#94a3b8] rounded-full animate-[bounce_1.4s_infinite_0.4s_both]" />
                  </div>
                </div>
              )}

              {searchStatus?.skipped && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center flex-shrink-0 border border-[#334155]">
                    <svg className="w-5 h-5 text-[#94a3b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e293b] rounded-full text-xs text-[#94a3b8] border border-[#334155]">
                    <span className="font-medium">Answering without web search</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center flex-shrink-0 border border-[#ef4444]/30">
                    <svg className="w-5 h-5 text-[#ef4444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="px-3 py-2 bg-[#1e293b] rounded-lg text-sm text-[#ef4444] border border-[#ef4444]/30 break-words max-w-full">
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <footer className="flex-shrink-0 ">
          <div className="max-w-3xl mx-auto w-full px-3 sm:px-6 py-2 sm:py-6">
            <form onSubmit={handleSubmit}>
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 bg-[#121826] rounded-lg border border-[#1e293b] text-sm">
                      <FileIcon />
                      <span className="max-w-[150px] truncate text-[#e2e8f0]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="p-0.5 hover:bg-[#1e293b] rounded text-[#8a9bb8] hover:text-white transition-colors"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
  <div className="flex items-end gap-2 p-1.5 bg-[#1e293b] rounded-3xl">
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.json,image/*,application/pdf,text/plain,text/csv,application/json"
      onChange={handleFileSelect}
      className="hidden"
    />
    <textarea
      ref={textareaRef}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={() => {
    setIsFocused(true);
    //* ensureTextareaVisible(); */
  // Disabled - causes scroll issues during AI response
  }}
      onBlur={() => setIsFocused(false)}
      placeholder="Ask anything..."
      rows={4}
      disabled={isLoading}
      className="flex-1 px-3 py-1.5 bg-transparent resize-none focus:outline-none max-h-48 text-base"
      style={{ minHeight: "80px" }}
    />
    <button
      type="button"
      onClick={openFilePicker}
      disabled={isLoading}
      className="flex-shrink-0 flex items-center justify-center w-9 h-9 text-[#8a9bb8] hover:text-white hover:bg-[#1e293b] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      title="Attach file"
    >
      <PlusIcon />
    </button>
    <button
      type="submit"
      disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
      className="flex-shrink-0 flex items-center justify-center w-9 h-9 text-white hover:bg-white/20 hover:rounded-full disabled:text-[#334155] disabled:cursor-not-allowed transition-all"
    >
      <SendIcon />
    </button>
  </div>
              <p className="mt-2 sm:mt-3 text-xs text-center text-[#8a9bb8]">AI can make mistakes. Consider checking important information.</p>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
}
