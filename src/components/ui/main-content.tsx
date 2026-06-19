"use client";

import { extractSourcesFromContent, removeSourceSection } from "@/lib/ai/search-utils";
import { CopyButton } from "../common/copy-button";
import { BookOpen, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
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


interface MainContentProps {
  content: string;
  sources?: Source[];
  onRetry?: () => void;
}

export function MainContent({ content, sources = [], onRetry }: MainContentProps) {
  // Preprocess content to fix numbered list formatting before extraction
  const processedContent = preprocessContent(content);
  const { mainContent, sources: extractedSources } = extractSourcesFromContent(processedContent);
  // Use extracted sources directly
  const allSources = extractedSources;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="max-w-none text-[#e2e8f0]">
      <ReactMarkdown
        // remark-math must come BEFORE remark-gfm to prevent GFM from interfering with LaTeX delimiters
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        // Prevent LaTeX delimiter characters from being escaped
        remarkRehypeOptions={{ allowDangerousHtml: false }}
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
          a: ({ href, children }: any) => {
            // Only render as link if href is valid and children is text
            // If it's a bare URL or looks like an inline citation, just show text
            const isBareUrl = typeof children === 'string' &&
              (children === href || href?.includes(children));
            const looksLikeCitation = typeof children === 'string' &&
              (children.length < 3 || /^\[?\d+\]?$/.test(children));

            if (isBareUrl || looksLikeCitation) {
              return <span className="text-[#e2e8f0]">{children}</span>;
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#cbd5e1] transition-colors underline"
              >
                {children}
              </a>
            );
          },
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
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-all cursor-pointer"
            title="View sources"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="px-1.5 py-0.5 rounded bg-white text-black text-[10px] font-bold border border-white">
              {allSources.length}
            </span>
            <span className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
          {/* Refresh button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded-lg transition-all hover:bg-[#1e293b] text-[#94a3b8] hover:text-white cursor-pointer"
              title="Refresh response"
            >
              <RefreshCw className="w-4 h-4" />
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
