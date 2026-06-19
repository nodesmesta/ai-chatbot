"use client";

import { useState } from "react";
import { Plus, MessageSquare, Trash2, Pencil, MoreVertical, X } from "lucide-react";
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
          bg-[#0a0e17] shadow-2xl 
          z-50 lg:z-0
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-72 lg:w-72
          overflow-hidden
    lg:rounded-none rounded-r-2xl
        `}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between p-3 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src="/nodesemesta.png" alt="Logo" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              <span className="font-semibold text-sm text-[#f1f5f9] truncate">Chats</span>
            </div>
            <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-[#1e293b] rounded-lg text-[#94a3b8] hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 flex-shrink-0">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-gray-200 rounded-lg transition-colors text-xs font-semibold text-black cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0" onClick={handleSessionsListClick}>
            {sessions.length === 0 ? (
              <div className="text-center py-6 text-[#94a3b8]">
                <MessageSquare className="w-4 h-4" />
                <p className="mt-2 text-[10px]">No chats yet</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {sessions.map((session) => (
                  <div key={session.id} className="group relative" onClick={() => handleSelectSession(session.id)}>
                    <div
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                        currentSessionId === session.id
                          ? "bg-[#1e293b]"
                          : "hover:bg-[#1e293b]"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-[#94a3b8]">{session.title || "Untitled Chat"}</p>
                      </div>
                      <button
                        onClick={(e) => handleMenuClick(e, session.id)}
                        className="p-1 hover:bg-[#1e293b] rounded text-[#94a3b8] hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {activeMenuId === session.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-44 bg-[#1e293b] rounded-lg shadow-lg z-10 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleRenameClick(e, session)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#94a3b8] hover:bg-[#334155] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#ef4444] hover:bg-[#334155] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 flex-shrink-0">
            <p className="text-[10px] text-[#94a3b8] text-center">
              {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
