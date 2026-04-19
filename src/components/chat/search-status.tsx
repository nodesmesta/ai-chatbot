"use client";

function SearchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

interface SearchStatusProps {
  searching: boolean;
  skipped: boolean;
  error: string | null;
}

export function SearchStatus({ searching, skipped, error }: SearchStatusProps) {
  if (searching) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e293b] rounded-full text-xs text-[#94a3b8] border border-[#334155]">
          <SearchIcon />
          <span className="font-medium">Thinking</span>
          <div className="flex items-center gap-0.5">
            <span className="w-1 h-1 bg-[#94a3b8] rounded-full animate-[bounce_1.4s_infinite_both]" />
            <span className="w-1 h-1 bg-[#cbd5e1] rounded-full animate-[bounce_1.4s_infinite_0.2s_both]" />
            <span className="w-1 h-1 bg-[#94a3b8] rounded-full animate-[bounce_1.4s_infinite_0.4s_both]" />
          </div>
        </div>
      </div>
    );
  }

  if (skipped) {
    return (
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
    );
  }

  if (error) {
    return (
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
    );
  }

  return null;
}
