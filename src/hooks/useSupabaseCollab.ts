"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { PeerMessage, CollabState } from "./usePeer";

// Re-export types so collaborate page can import from here
export type { PeerMessage, PDFElement, PageSize, TextStyle, ShapeStyle, SharedImage, CollabState } from "./usePeer";

interface UseSupabaseCollabOptions {
  onMessage?: (message: PeerMessage, senderId: string) => void;
  onPeerConnect?: (peerId: string) => void;
  onPeerDisconnect?: (peerId: string) => void;
}

// 800KB chunk size for large messages (Supabase Realtime has ~1MB limit)
const CHUNK_SIZE = 800 * 1024;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateClientId(): string {
  return "u_" + Math.random().toString(36).substring(2, 10);
}

interface ChunkMessage {
  _chunked: true;
  chunkId: string;
  index: number;
  total: number;
  data: string;
}

interface WrappedMessage {
  senderId: string;
  targetId?: string; // for sendTo — client-side filtering
  payload: PeerMessage | ChunkMessage;
}

function isChunkMessage(msg: unknown): msg is ChunkMessage {
  return typeof msg === "object" && msg !== null && "_chunked" in msg && (msg as ChunkMessage)._chunked === true;
}

export function useSupabaseCollab(options: UseSupabaseCollabOptions = {}) {
  const [peerId, setPeerId] = useState<string | null>(null); // room code (host) or room code (joiner)
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientIdRef = useRef<string>(generateClientId());
  const roomCodeRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Chunk reassembly buffer: chunkId -> { total, parts: Map<index, data> }
  const chunkBufferRef = useRef<Map<string, { total: number; parts: Map<number, string>; senderId: string }>>(new Map());

  const handleIncomingMessage = useCallback((senderId: string, payload: PeerMessage | ChunkMessage) => {
    if (isChunkMessage(payload)) {
      // Accumulate chunks
      const buf = chunkBufferRef.current;
      if (!buf.has(payload.chunkId)) {
        buf.set(payload.chunkId, { total: payload.total, parts: new Map(), senderId });
      }
      const entry = buf.get(payload.chunkId)!;
      entry.parts.set(payload.index, payload.data);

      if (entry.parts.size === entry.total) {
        // Reassemble
        let full = "";
        for (let i = 0; i < entry.total; i++) {
          full += entry.parts.get(i)!;
        }
        buf.delete(payload.chunkId);
        try {
          const reassembled = JSON.parse(full) as PeerMessage;
          optionsRef.current.onMessage?.(reassembled, senderId);
        } catch {
          console.error("Failed to parse reassembled message");
        }
      }
    } else {
      optionsRef.current.onMessage?.(payload, senderId);
    }
  }, []);

  const subscribeToChannel = useCallback((roomCode: string, onReady?: () => void) => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnecting(true);
    setError(null);
    setPeerId(roomCode); // Set room code immediately so UI can display it
    roomCodeRef.current = roomCode;

    const channel = supabase.channel(`collab:${roomCode}`, {
      config: { presence: { key: clientIdRef.current } },
    });

    // Listen for broadcast messages
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const wrapped = payload as WrappedMessage;
      // Ignore own messages
      if (wrapped.senderId === clientIdRef.current) return;
      // If targetId is set, only accept if it's for us
      if (wrapped.targetId && wrapped.targetId !== clientIdRef.current) return;

      handleIncomingMessage(wrapped.senderId, wrapped.payload);
    });

    // Track presence for online count
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const peerIds = Object.keys(state).filter((k) => k !== clientIdRef.current);
      setConnectedPeers(peerIds);
    });

    channel.on("presence", { event: "join" }, ({ key }) => {
      if (key !== clientIdRef.current) {
        optionsRef.current.onPeerConnect?.(key);
      }
    });

    channel.on("presence", { event: "leave" }, ({ key }) => {
      if (key !== clientIdRef.current) {
        optionsRef.current.onPeerDisconnect?.(key);
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
        setIsConnecting(false);
        setIsConnected(true);
        onReady?.();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setError(`Channel ${status.toLowerCase().replace("_", " ")}`);
        setIsConnecting(false);
      }
    });

    channelRef.current = channel;
  }, [handleIncomingMessage]);

  // Host: create a new room with a short code
  const initPeer = useCallback(() => {
    const roomCode = generateRoomCode();
    subscribeToChannel(roomCode);
  }, [subscribeToChannel]);

  // Joiner: connect to an existing room
  const connectToPeer = useCallback((roomCode: string, onOpen?: () => void) => {
    subscribeToChannel(roomCode.toUpperCase().trim(), onOpen);
  }, [subscribeToChannel]);

  // Send a message, chunking if necessary
  const sendMessage = useCallback((payload: PeerMessage, targetId?: string) => {
    const channel = channelRef.current;
    if (!channel) return;

    const serialized = JSON.stringify(payload);

    if (serialized.length > CHUNK_SIZE) {
      // Split into chunks
      const chunkId = Math.random().toString(36).substring(2, 10);
      const total = Math.ceil(serialized.length / CHUNK_SIZE);

      for (let i = 0; i < total; i++) {
        const chunkData = serialized.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunk: ChunkMessage = { _chunked: true, chunkId, index: i, total, data: chunkData };
        const wrapped: WrappedMessage = { senderId: clientIdRef.current, targetId, payload: chunk };
        channel.send({ type: "broadcast", event: "message", payload: wrapped });
      }
    } else {
      const wrapped: WrappedMessage = { senderId: clientIdRef.current, targetId, payload };
      channel.send({ type: "broadcast", event: "message", payload: wrapped });
    }
  }, []);

  // Broadcast to all peers
  const broadcast = useCallback((message: PeerMessage) => {
    sendMessage(message);
  }, [sendMessage]);

  // Send to a specific peer (uses broadcast with targetId filter)
  const sendTo = useCallback((remotePeerId: string, message: PeerMessage) => {
    sendMessage(message, remotePeerId);
  }, [sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return {
    peerId,
    isConnecting,
    isConnected,
    error,
    connectedPeers,
    initPeer,
    connectToPeer,
    broadcast,
    sendTo,
  };
}
