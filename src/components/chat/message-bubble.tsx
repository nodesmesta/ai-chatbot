"use client";

import { MainContent } from "../ui/main-content";
import { type Source } from "../ui/source-list";
import { SparklesIcon } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  onRetry?: () => void;
}

export function MessageBubble({ role, content, sources, onRetry }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end gap-2">
        <div className="px-3 py-2 rounded-lg bg-[#121826] text-[#e2e8f0] border border-[#1e293b] max-w-[80%]">
          <p className="whitespace-pre-wrap text-base leading-7">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="min-w-0">
        <div className="px-4 py-3">
          <MainContent content={content} sources={sources} onRetry={onRetry} />
        </div>
      </div>
    </div>
  );
}
