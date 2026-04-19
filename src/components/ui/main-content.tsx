"use client";

import { CopyButton } from "../common/copy-button";
import { BookIcon, ChevronDownIcon, ChevronUpIcon } from "./source-list";
import type { Source } from "./source-card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";
interface CodeProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}
import 'katex/dist/katex.css';

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.001 8.001 0 01-15.356-2m0 0V15h4.582" />
    </svg>
  );
}

// Preprocess content to fix numbered list formatting
function preprocessContent(content: string): string {
  const lines = content.split("\n");
  const processedLines: string[] = [];
  let inNumberedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line starts with a numbered list pattern (e.g., "1. ", "2. ", "10. ")
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (numberedMatch) {
      // This is a numbered list item, keep it as is (ReactMarkdown will handle it)
      processedLines.push(trimmed);
      inNumberedList = true;
    } else if (inNumberedList && (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith(" "))) {
      // This is a continuation/bullet under numbered item, add proper indentation
      processedLines.push(" " + trimmed);
    } else {
      // Reset list mode
      if (trimmed.length > 0 && !trimmed.startsWith("*") && !trimmed.startsWith("-")) {
        inNumberedList = false;
      }
      processedLines.push(line);
    }
  }

  return processedLines.join("\n");
}

function extractSources(content: string): { mainContent: string; sources: Source[] } {
  const sources: Source[] = [];
  const lines = content.split("\n");

  // First, find and mark lines with malformed links (links without closing parenthesis)
  const malformedLineIndices = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for malformed link: [text](url without closing )
    // Pattern: has [ but url part doesn't end with ) before end of line or next whitespace
    const malformedLinkPattern = /\[([^\]]+)\]\(https?:\/\/[^\)]*$|^[^\]]*\[([^\]]+)\]\([^)\s]+$/;
    if (malformedLinkPattern.test(line.trim())) {
      malformedLineIndices.add(i);
    }
  }

  // Find ALL valid markdown links in content
  const allLinks: Array<{ lineIndex: number; title: string; url: string; domain: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find all markdown links in this line (must have closing parenthesis)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      const url = match[2];
      const domain = url.replace(/^https?:\/\//, "").split("/")[0];
      allLinks.push({
        lineIndex: i,
        title: match[1],
        url,
        domain,
      });
    }
  }

  // Find the "Sumber:" or "References:" section
  let sourcesSectionStart = -1;
  const sourceLabelRegex = /^(Sumber:|Referensi:|Sources:|References:)\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    if (sourceLabelRegex.test(lines[i].trim())) {
      sourcesSectionStart = i + 1;
      break;
    }
  }

  const footnoteLineIndices = new Set<number>();

  // If we found a sources section, all valid links after it are footnotes
  if (sourcesSectionStart !== -1) {
    for (const link of allLinks) {
      if (link.lineIndex >= sourcesSectionStart) {
        footnoteLineIndices.add(link.lineIndex);
      }
    }
  } else {
    // Fallback: use the original logic for links at the end with no content after
    for (const link of allLinks) {
      const lineIndex = link.lineIndex;
      const line = lines[lineIndex].trim();

      // Check if this line only contains this link (with optional list prefix: -, *, or numbered)
      const isLinkOnlyLine = /^(\s*[-*]\s*|\s*\d+\.\s*)\[([^\]]+)\]\(https?:\/\/[^\)]+\)\)?$/i.test(line);

      if (isLinkOnlyLine) {
        // Check if there's any non-empty content after this line
        let hasContentAfter = false;
        for (let i = lineIndex + 1; i < lines.length; i++) {
          if (lines[i].trim().length > 0) {
            hasContentAfter = true;
            break;
          }
        }

        // If no content after, it's a footnote
        if (!hasContentAfter) {
          footnoteLineIndices.add(lineIndex);
        }
      }
    }
  }

  // Extract footnote links to sources
  for (const link of allLinks) {
    if (footnoteLineIndices.has(link.lineIndex)) {
      if (!sources.some((s) => s.url === link.url)) {
        sources.push({ title: link.title, url: link.url, domain: link.domain });
      }
    }
  }

  // Also extract inline links to sources (links not in footnote section)
  for (const link of allLinks) {
    if (!footnoteLineIndices.has(link.lineIndex)) {
      if (!sources.some((s) => s.url === link.url)) {
        sources.push({ title: link.title, url: link.url, domain: link.domain });
      }
    }
  }

  // Build content: remove footnote lines, malformed lines, and source label line
  const contentLines = lines.filter((_, index) => {
    // Remove footnote lines
    if (footnoteLineIndices.has(index)) return false;
    // Remove malformed link lines
    if (malformedLineIndices.has(index)) return false;
    // Remove source label line
    if (sourcesSectionStart > 0 && index === sourcesSectionStart - 1) return false;
    return true;
  });

  const mainContent = contentLines.join("\n").trim();

  return { mainContent, sources };
}

interface MainContentProps {
  content: string;
  sources?: Source[];
  onRetry?: () => void;
}

export function MainContent({ content, sources = [], onRetry }: MainContentProps) {
  // Preprocess content to fix numbered list formatting before extraction
  const processedContent = preprocessContent(content);
  const { mainContent, sources: extractedSources } = extractSources(processedContent);
  const allSources = sources.length > 0 ? sources : extractedSources;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="max-w-none text-[#e2e8f0]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }: any) => <p className="my-3 text-base leading-7 first:mt-0 last:mb-3">{children}</p>,
          h1: ({ children }: any) => <h1 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h1>,
          h2: ({ children }: any) => <h2 className="text-lg font-semibold text-white mt-5 mb-2.5">{children}</h2>,
          h3: ({ children }: any) => <h3 className="text-base font-medium text-white mt-4 mb-2">{children}</h3>,
          h4: ({ children }: any) => <h4 className="text-base font-medium text-white mt-3 mb-2">{children}</h4>,
          ul: ({ children }: any) => <ul className="list-disc list-inside my-3 pl-5 space-y-1">{children}</ul>,
          ol: ({ children }: any) => <ol className="list-decimal list-inside my-3 pl-5 space-y-1">{children}</ol>,
          li: ({ children }: any) => <li className="text-base">{children}</li>,
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-2 border-[#334155] pl-4 my-3 text-[#94a3b8] italic">{children}</blockquote>
          ),
          a: ({ href, children }: any) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-[#cbd5e1] transition-colors underline"
            >
              {children}
            </a>
          ),
          table: ({ children }: any) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-[#1e293b]">{children}</table>
            </div>
          ),
          th: ({ children }: any) => (
            <th className="bg-[#0f172a] px-3 py-2 text-left text-xs font-medium text-[#8a9bb8] border-b border-[#1e293b]">
              {children}
            </th>
          ),
          td: ({ children }: any) => (
            <td className="px-3 py-2 text-base text-[#e2e8f0] border-b border-[#1e293b]/50">{children}</td>
          ),
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;

            if (isInline) {
              return (
                <code className="bg-[#1e293b] text-white px-1.5 py-0.5 rounded text-sm font-mono border border-[#334155]">
                  {children}
                </code>
              );
            }

            return (
              <div className="my-4 rounded-lg overflow-hidden border border-[#1e293b]">
                <div className="flex items-center justify-between px-4 py-2 bg-[#1e293b] border-b border-[#334155]">
                  <span className="text-xs text-[#94a3b8] font-medium">{match ? match[1] : "code"}</span>
                  <CopyButton text={String(children).replace(/\n$/, "")} className="opacity-100" />
                </div>
                <SyntaxHighlighter language={match ? match[1] : "text"} style={vscDarkPlus} PreTag="div" className="!m-0 !p-4 !bg-[#1e293b]">
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            );
          },
        }}
      >
        {mainContent}
      </ReactMarkdown>
      <div className="mt-4 pt-4 border-t border-[#1e293b]">
        <div className="flex items-center gap-2">
          {/* Toggle button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-all"
            title="View sources"
          >
            <BookIcon />
            <span className="px-1.5 py-0.5 rounded bg-white text-black text-[10px] font-bold border border-white">
              {allSources.length}
            </span>
            <span className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
              {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </span>
          </button>
          {/* Refresh button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded-lg transition-all hover:bg-[#1e293b] text-[#94a3b8] hover:text-white"
              title="Refresh response"
            >
              <RefreshIcon />
            </button>
          )}
        </div>
      </div>
      {/* Expanded sources list */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[500px] opacity-100 mt-2.5" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {allSources.map((source, index) => (
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
