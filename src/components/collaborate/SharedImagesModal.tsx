"use client";

import { useRef } from "react";
import { X, Plus, Trash2, Download } from "lucide-react";
import type { SharedImage } from "@/hooks/usePeer";

interface SharedImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: SharedImage[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInsert: (image: SharedImage) => void;
  onDelete: (imageId: string) => void;
}

export default function SharedImagesModal({
  isOpen,
  onClose,
  images,
  onUpload,
  onInsert,
  onDelete
}: SharedImagesModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Shared Images</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Images shared across all devices in this session
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Button */}
        <div className="mb-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full px-4 py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Image</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
          />
        </div>

        {/* Images Grid */}
        <div className="flex-1 overflow-y-auto">
          {images.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No images shared yet</p>
              <p className="text-sm mt-2">Upload images from any device to share with collaborators</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="group relative">
                  <div className="aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      onClick={() => onInsert(image)}
                      className="p-2 bg-white rounded-lg hover:bg-indigo-100 text-zinc-700"
                      title="Insert into document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(image.id)}
                      className="p-2 bg-white rounded-lg hover:bg-red-100 text-zinc-700 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium truncate">{image.name}</p>
                    <p className="text-xs text-zinc-500">{formatTime(image.uploadedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
          <p className="text-xs text-zinc-500">
            {images.length} image{images.length !== 1 ? 's' : ''} shared
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
