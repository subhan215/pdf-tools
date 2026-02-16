"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}

export default function TableModal({ isOpen, onClose, onInsert }: TableModalProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  if (!isOpen) return null;

  const handleInsert = () => {
    onInsert(rows, cols);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Insert Table</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rows: {rows}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Columns: {cols}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
          <div className="text-xs text-zinc-500 mb-2">Preview</div>
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <tbody>
                {Array.from({ length: Math.min(rows, 5) }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {Array.from({ length: Math.min(cols, 5) }).map((_, colIdx) => (
                      <td key={colIdx} className="border border-zinc-400 w-6 h-6"></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
