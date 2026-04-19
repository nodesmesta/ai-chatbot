"use client";

import { useState } from "react";
import { SourceCard } from "./source-card";
import type { Source } from "./source-card";

export type { Source };

interface SourceListProps {
  sources: Source[];
  className?: string;
}

function ChevronDownIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7-7" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25v17.5M4.5 4.5h15a2.5 2.5 0 012.5 2.5v13a2.5 2.5 0 01-2.5 2.5h-15A2.5 2.5 0 012 19.5v-13A2.5 2.5 0 014.5 4.5z" />
    </svg>
  );
}

export { BookIcon, ChevronDownIcon, ChevronUpIcon };

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
        className="flex items-center gap-2 text-xs font-medium text-[#94a3b8] hover:text-white transition-colors group py-1.5"
      >
        <div
          className={`p-1.5 rounded-lg transition-all ${
            isExpanded ? "bg-white text-black" : "bg-[#1e293b] text-[#94a3b8] group-hover:text-white"
          }`}
        >
          <BookIcon />
        </div>
        <span className="text-[#f1f5f9]">Sumber</span>
        <span className="px-1.5 py-0.5 rounded bg-white text-black text-[10px] font-bold border border-white">
          {sources.length}
        </span>
        <span className={`ml-auto transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
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
