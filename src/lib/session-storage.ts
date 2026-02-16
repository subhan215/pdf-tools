import { supabase } from './supabase';

// Session metadata stored in Supabase (no actual content)
export interface SessionMetadata {
  id: string;
  name: string;
  deviceId: string;
  peerId?: string; // For P2P connection discovery
  createdAt: Date;
  lastModified: Date;
  pageCount: number;
  pageDimensions: { width: number; height: number }[];
  // Element positions and types (but not content)
  elements: SessionElement[];
}

export interface SessionElement {
  id: string;
  type: 'image' | 'signature' | 'shape' | 'text' | 'richtext';
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  // Type-specific metadata (no actual content)
  shapeType?: 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle';
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
}

// Content stored locally in IndexedDB
export interface SessionContent {
  sessionId: string;
  pdfBase64: string;
  images: { id: string; dataUrl: string }[];
  signatures: { id: string; dataUrl: string }[];
  textContents: { id: string; html: string }[];
}

const SESSIONS_TABLE = 'collaborate_sessions';

// ============ Device ID Management ============

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem('pdf-tools-device-id');
  if (!deviceId) {
    // Generate a unique device ID
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('pdf-tools-device-id', deviceId);
  }
  return deviceId;
}

// ============ Supabase Operations ============

export async function saveSessionMetadata(session: Omit<SessionMetadata, 'createdAt' | 'lastModified'> & { createdAt?: Date }): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from(SESSIONS_TABLE)
    .upsert({
      id: session.id,
      name: session.name,
      device_id: session.deviceId,
      peer_id: session.peerId || null,
      created_at: session.createdAt?.toISOString() || now,
      last_modified: now,
      page_count: session.pageCount,
      page_dimensions: session.pageDimensions,
      elements: session.elements,
    }, { onConflict: 'id' });

  if (error) throw error;
}

export async function getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    deviceId: data.device_id,
    peerId: data.peer_id,
    createdAt: new Date(data.created_at),
    lastModified: new Date(data.last_modified),
    pageCount: data.page_count,
    pageDimensions: data.page_dimensions,
    elements: data.elements,
  };
}

export async function listSessionsForDevice(deviceId: string): Promise<SessionMetadata[]> {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('*')
    .eq('device_id', deviceId)
    .order('last_modified', { ascending: false });

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    name: row.name,
    deviceId: row.device_id,
    peerId: row.peer_id,
    createdAt: new Date(row.created_at),
    lastModified: new Date(row.last_modified),
    pageCount: row.page_count,
    pageDimensions: row.page_dimensions,
    elements: row.elements,
  }));
}

export async function deleteSessionMetadata(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from(SESSIONS_TABLE)
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

// Real-time listener for session changes
export function subscribeToSession(
  sessionId: string,
  callback: (session: SessionMetadata | null) => void
): () => void {
  const channel = supabase
    .channel(`session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SESSIONS_TABLE,
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
          return;
        }
        const data = payload.new as any;
        callback({
          id: data.id,
          name: data.name,
          deviceId: data.device_id,
          peerId: data.peer_id,
          createdAt: new Date(data.created_at),
          lastModified: new Date(data.last_modified),
          pageCount: data.page_count,
          pageDimensions: data.page_dimensions,
          elements: data.elements,
        });
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// Update peer ID for P2P discovery
export async function updateSessionPeerId(sessionId: string, peerId: string): Promise<void> {
  const { error } = await supabase
    .from(SESSIONS_TABLE)
    .update({
      peer_id: peerId,
      last_modified: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw error;
}

// ============ IndexedDB Operations ============

const DB_NAME = 'pdf-tools-sessions';
const DB_VERSION = 1;
const CONTENT_STORE = 'session-content';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CONTENT_STORE)) {
        db.createObjectStore(CONTENT_STORE, { keyPath: 'sessionId' });
      }
    };
  });
}

export async function saveSessionContent(content: SessionContent): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONTENT_STORE, 'readwrite');
    const store = transaction.objectStore(CONTENT_STORE);
    const request = store.put(content);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getSessionContent(sessionId: string): Promise<SessionContent | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONTENT_STORE, 'readonly');
    const store = transaction.objectStore(CONTENT_STORE);
    const request = store.get(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function deleteSessionContent(sessionId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONTENT_STORE, 'readwrite');
    const store = transaction.objectStore(CONTENT_STORE);
    const request = store.delete(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function listLocalSessions(): Promise<string[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONTENT_STORE, 'readonly');
    const store = transaction.objectStore(CONTENT_STORE);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as string[]);
  });
}

// ============ Combined Operations ============

export async function saveFullSession(
  metadata: Omit<SessionMetadata, 'createdAt' | 'lastModified'> & { createdAt?: Date },
  content: Omit<SessionContent, 'sessionId'>
): Promise<void> {
  // Save metadata to Supabase
  await saveSessionMetadata(metadata);

  // Save content to IndexedDB
  await saveSessionContent({
    ...content,
    sessionId: metadata.id,
  });
}

export async function loadFullSession(sessionId: string): Promise<{
  metadata: SessionMetadata | null;
  content: SessionContent | null;
}> {
  const [metadata, content] = await Promise.all([
    getSessionMetadata(sessionId),
    getSessionContent(sessionId),
  ]);

  return { metadata, content };
}

export async function deleteFullSession(sessionId: string): Promise<void> {
  await Promise.all([
    deleteSessionMetadata(sessionId),
    deleteSessionContent(sessionId),
  ]);
}

// Generate a unique session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
