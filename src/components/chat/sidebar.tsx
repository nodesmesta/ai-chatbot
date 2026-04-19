"use client";

import { useState } from "react";
import type { ChatSession } from "./chat-interface";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string | null;
  sessions: ChatSession[];
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameClick: (session: ChatSession) => void;
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function RenameIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function DotsVerticalIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function Sidebar({
  isOpen,
  onClose,
  currentSessionId,
  sessions,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameClick,
}: SidebarProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleDeleteSession = (sessionId: string) => {
    onDeleteSession(sessionId);
    setActiveMenuId(null);
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    onClose();
  };

  const handleMenuClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === sessionId ? null : sessionId);
  };

  const handleRenameClick = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setActiveMenuId(null);
    onRenameClick(session);
  };

  const handleSessionsListClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setActiveMenuId(null);
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={`
          fixed lg:static top-0 left-0 h-full
          bg-[#030712] border-r border-[#1e293b]
          z-50 lg:z-0
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-72 lg:w-72
          overflow-hidden
        `}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between p-3 border-b border-[#1e293b] flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src="/nodesemesta.png" alt="Logo" className="w-5 h-5 rounded-full object-cover flex-shrink-0 ring-1 ring-transparent" />
              <span className="font-semibold text-sm text-[#f1f5f9] truncate">Chats</span>
            </div>
            <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-[#1e293b] rounded-lg text-[#94a3b8] hover:text-white">
              <CloseIcon />
            </button>
          </div>

          <div className="p-3 flex-shrink-0">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-gray-200 rounded-lg transition-colors text-xs font-semibold text-black"
            >
              <PlusIcon />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0" onClick={handleSessionsListClick}>
            {sessions.length === 0 ? (
              <div className="text-center py-6 text-[#94a3b8]">
                <ChatIcon />
                <p className="mt-2 text-[10px]">No chats yet</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {sessions.map((session) => (
                  <div key={session.id} className="group relative" onClick={() => handleSelectSession(session.id)}>
                    <div
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                        currentSessionId === session.id
                          ? "bg-[#1e293b] border border-[#334155]"
                          : "hover:bg-[#1e293b] border border-transparent"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-[#94a3b8]">{session.title || "Untitled Chat"}</p>
                      </div>
                      <button
                        onClick={(e) => handleMenuClick(e, session.id)}
                        className="p-1 hover:bg-[#1e293b] rounded text-[#94a3b8] hover:text-white transition-colors flex-shrink-0"
                        title="More options"
                      >
                        <DotsVerticalIcon />
                      </button>
                    </div>

                    {activeMenuId === session.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-44 bg-[#1e293b] border border-[#334155] rounded-lg shadow-lg z-10 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleRenameClick(e, session)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#94a3b8] hover:bg-[#334155] transition-colors"
                        >
                          <RenameIcon />
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#ef4444] hover:bg-[#334155] transition-colors"
                        >
                          <TrashIcon />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#1e293b] flex-shrink-0">
            <p className="text-[10px] text-[#94a3b8] text-center">
              {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
