"use client";

import { X, Trash, Clock, Loader2 } from "lucide-react";
import type { SessionMetadata } from "@/lib/session-storage";

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionMetadata[];
  isLoading: boolean;
  onLoad: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export default function SessionsModal({
  isOpen,
  onClose,
  sessions,
  isLoading,
  onLoad,
  onDelete
}: SessionsModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">My Sessions</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No saved sessions yet</p>
              <p className="text-sm mt-2">Sessions you save will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 group"
                >
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => onLoad(session.id)}
                      className="flex-1 text-left"
                    >
                      <h4 className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {session.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(session.lastModified)}</span>
                        <span>·</span>
                        <span>{session.pageCount} page{session.pageCount !== 1 ? 's' : ''}</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this session?')) {
                          onDelete(session.id);
                        }
                      }}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
