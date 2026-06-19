"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { SourceCard } from "./source-card";
import type { Source } from "./source-card";

export type { Source };

interface SourceListProps {
  sources: Source[];
  className?: string;
}

export { BookOpen as BookIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon };

export function SourceList({ sources, className = "" }: SourceListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className={`mt-4 ${className}`}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-[#94a3b8] hover:text-white transition-colors group py-1.5 cursor-pointer"
      >
        <div
          className={`p-1.5 rounded-lg transition-all ${
            isExpanded ? "bg-white text-black" : "bg-[#1e293b] text-[#94a3b8] group-hover:text-white"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <span className="text-[#f1f5f9]">Sumber</span>
        <span className="px-1.5 py-0.5 rounded bg-white text-black text-[10px] font-bold border border-white">
          {sources.length}
        </span>
        <span className={`ml-auto transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Expanded sources list */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[500px] opacity-100 mt-2.5" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {sources.map((source, index) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white hover:text-[#cbd5e1] transition-colors underline"
            >
              {source.domain}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
