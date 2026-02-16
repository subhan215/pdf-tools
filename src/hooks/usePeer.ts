"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Peer, { DataConnection } from "peerjs";

export interface SharedImage {
  id: string;
  dataUrl: string;
  name: string;
  uploadedAt: number;
}

export type PeerMessage =
  | { type: "pdf-data"; data: string } // base64 PDF
  | { type: "add-element"; element: PDFElement }
  | { type: "update-element"; id: string; updates: Partial<PDFElement> }
  | { type: "delete-element"; id: string }
  | { type: "add-page"; pageSize: PageSize }
  | { type: "delete-page"; pageIndex: number }
  | { type: "sync-request" }
  | { type: "sync-response"; state: CollabState }
  | { type: "share-image"; image: SharedImage }
  | { type: "delete-shared-image"; id: string };

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right" | "justify";
  lineHeight: number;
  listType?: "none" | "bullet" | "numbered";
  heading?: "none" | "h1" | "h2" | "h3";
}

export interface ShapeStyle {
  shapeType: "rectangle" | "circle" | "line" | "arrow" | "triangle";
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

export interface PDFElement {
  id: string;
  type: "text" | "image" | "signature" | "shape" | "richtext" | "checkbox";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // text content or base64 image
  // Text formatting
  fontSize?: number;
  fontColor?: string;
  textStyle?: TextStyle;
  // Shape properties
  shapeStyle?: ShapeStyle;
  // For document flow mode
  isFlowText?: boolean;
  // Header/Footer
  isHeader?: boolean;
  isFooter?: boolean;
  // Rotation
  rotation?: number;
  // OCR extracted text
  isOCRText?: boolean;
}

export interface PageSize {
  width: number;
  height: number;
  name: string;
}

export interface CollabState {
  pdfBase64: string | null;
  elements: PDFElement[];
  pages: PageSize[];
  sharedImages?: SharedImage[];
}

interface UsePeerOptions {
  onMessage?: (message: PeerMessage, peerId: string) => void;
  onPeerConnect?: (peerId: string) => void;
  onPeerDisconnect?: (peerId: string) => void;
}

export function usePeer(options: UsePeerOptions = {}) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize peer
  const initPeer = useCallback(() => {
    setIsConnecting(true);
    setError(null);

    const newPeer = new Peer({
      debug: 0,
    });

    newPeer.on("open", (id) => {
      setPeerId(id);
      setIsConnecting(false);
      setIsConnected(true);
    });

    newPeer.on("connection", (conn) => {
      setupConnection(conn);
    });

    newPeer.on("error", (err) => {
      setError(err.message);
      setIsConnecting(false);
    });

    newPeer.on("disconnected", () => {
      setIsConnected(false);
    });

    setPeer(newPeer);

    return newPeer;
  }, []);

  // Setup connection handlers
  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on("open", () => {
      connectionsRef.current.set(conn.peer, conn);
      setConnectedPeers(Array.from(connectionsRef.current.keys()));
      optionsRef.current.onPeerConnect?.(conn.peer);
    });

    conn.on("data", (data) => {
      const message = data as PeerMessage;
      optionsRef.current.onMessage?.(message, conn.peer);
    });

    conn.on("close", () => {
      connectionsRef.current.delete(conn.peer);
      setConnectedPeers(Array.from(connectionsRef.current.keys()));
      optionsRef.current.onPeerDisconnect?.(conn.peer);
    });

    conn.on("error", (err) => {
      console.error("Connection error:", err);
    });
  }, []);

  // Connect to another peer
  const connectToPeer = useCallback((remotePeerId: string) => {
    if (!peer) return;

    const conn = peer.connect(remotePeerId, { reliable: true });
    setupConnection(conn);
  }, [peer, setupConnection]);

  // Send message to all connected peers
  const broadcast = useCallback((message: PeerMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }, []);

  // Send message to specific peer
  const sendTo = useCallback((remotePeerId: string, message: PeerMessage) => {
    const conn = connectionsRef.current.get(remotePeerId);
    if (conn?.open) {
      conn.send(message);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      connectionsRef.current.forEach((conn) => conn.close());
      peer?.destroy();
    };
  }, [peer]);

  return {
    peer,
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
