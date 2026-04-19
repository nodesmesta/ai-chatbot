"use client";

import { useState } from "react";

export interface Source {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

interface SourceCardProps {
  source: Source;
  index: number;
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={12} cy={12} r={10} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(source.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy URL");
    }
  };

  const handleOpen = () => {
    window.open(source.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="group relative bg-[#1e293b] hover:bg-[#334155] border border-[#334155] hover:border-[#475569] rounded-xl transition-all duration-200 overflow-hidden"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          {/* Number indicator */}
          <div className="flex-shrink-0">
            <div className="w-6 h-6 rounded bg-[#334155] border border-[#475569] flex items-center justify-center text-[#94a3b8] text-[10px] font-bold">
              {index + 1}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-semibold text-white truncate">{source.title}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
              <GlobeIcon />
              <span className="truncate">{source.domain}</span>
            </div>

            {source.snippet && (
              <p className="mt-1.5 text-[11px] text-[#94a3b8] line-clamp-2">{source.snippet}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-[#475569] text-[#94a3b8] hover:text-white transition-colors" title="Copy URL">
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button onClick={handleOpen} className="p-1.5 rounded-lg hover:bg-[#475569] text-[#94a3b8] hover:text-white transition-colors" title="Open in new tab">
              <ExternalLinkIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Hover accent bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[#475569] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
    </div>
  );
}
