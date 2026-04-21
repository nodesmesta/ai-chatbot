"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyButton } from "../common/copy-button";
import { SourceList } from "./source-list";
import type { Source } from "./source-card";
import 'katex/dist/katex.css';

interface MarkdownContentProps {
  content: string;
  sources?: Source[];
}

export function MarkdownContent({ content, sources = [] }: MarkdownContentProps) {
  return (
    <div className="max-w-none text-[#e2e8f0]">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            if (!inline && match) {
              const codeText = String(children).replace(/\n$/, "");
              return (
                <div className="group my-4 rounded-lg overflow-hidden border border-[#1e293b]">
                  <div className="flex items-center justify-between px-3 py-2 bg-[#0f172a] border-b border-[#1e293b]">
                    <span className="text-xs text-[#8a9bb8] font-medium">{match[1]}</span>
                    <CopyButton text={codeText} />
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="!m-0 !text-xs !leading-relaxed"
                    {...props}
                  >
                    {codeText}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return (
              <code
                className="bg-[#1e293b]/50 px-1.5 py-0.5 rounded text-[13px] text-[#e2e8f0] border border-[#1e293b]/50 font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          p: ({ children }: any) => (
            <p className="my-3 text-sm leading-6 first:mt-0 last:mb-3">{children}</p>
          ),
          h1: ({ children }: any) => (
            <h1 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h1>
          ),
          h2: ({ children }: any) => (
            <h2 className="text-lg font-semibold text-white mt-5 mb-2.5">{children}</h2>
          ),
          h3: ({ children }: any) => (
            <h3 className="text-base font-medium text-white mt-4 mb-2">{children}</h3>
          ),
          h4: ({ children }: any) => (
            <h4 className="text-base font-medium text-white mt-3 mb-2">{children}</h4>
          ),
          ul: ({ children }: any) => (
            <ul className="list-disc list-inside my-3 pl-4">{children}</ul>
          ),
          ol: ({ children }: any) => (
            <ol className="list-decimal list-inside my-3 pl-4">{children}</ol>
          ),
          li: ({ children }: any) => (
            <li className="text-sm leading-relaxed mb-2 last:mb-0"><span className="ml-0">{children}</span></li>
          ),
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-2 border-[#ec4899] pl-4 my-3 text-[#8a9bb8] italic">
              {children}
            </blockquote>
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
            <td className="px-3 py-2 text-sm text-[#e2e8f0] border-b border-[#1e293b]/50">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {sources.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#1e293b]">
          <SourceList sources={sources} />
        </div>
      )}
    </div>
  );
}
