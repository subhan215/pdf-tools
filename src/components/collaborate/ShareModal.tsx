"use client";

import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, X } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerId: string | null;
  sessionUrl: string;
  onCopy: () => void;
  copied: boolean;
}

export default function ShareModal({ isOpen, onClose, peerId, sessionUrl, onCopy, copied }: ShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Share Session</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white rounded-2xl border border-zinc-200">
            <QRCodeSVG value={sessionUrl} size={180} />
          </div>
        </div>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Scan with your phone camera to join
        </p>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-mono text-sm truncate">
            {peerId}
          </div>
          <button onClick={onCopy} className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl font-medium flex items-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className="text-center text-xs text-zinc-500">
          Or share the session URL directly
        </p>
      </div>
    </div>
  );
}
