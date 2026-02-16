"use client";

import { X } from "lucide-react";
import { PAGE_SIZES } from "@/lib/pdf-utils";
import type { PageSize } from "@/hooks/usePeer";

interface PageSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (size: PageSize) => void;
}

export default function PageSizeModal({ isOpen, onClose, onSelect }: PageSizeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add New Page</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PAGE_SIZES).map(([key, size]) => (
              <button
                key={key}
                onClick={() => {
                  onSelect(size);
                  onClose();
                }}
                className="p-4 text-left border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                <div className="font-medium">{size.name}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {Math.round(size.width)} x {Math.round(size.height)} pt
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
