/**
 * Server-side event emitter for real-time updates
 *
 * Used by tRPC mutation handlers to notify clients of data changes.
 * Clients connect via socket.io and invalidate React Query cache.
 */

import { Server as SocketServer } from 'socket.io';

// Event types for different entities
export type EntityType =
  | 'items'
  | 'people'
  | 'projects'
  | 'organizations'
  | 'checkins'
  | 'routines'
  | 'meetings';

export type MutationType = 'create' | 'update' | 'delete';

export interface DataChangeEvent {
  entity: EntityType;
  mutation: MutationType;
  id?: number;
  ids?: number[];
}

/**
 * Notification event for AI-created content that needs user review
 */
export interface AIContentEvent {
  /** Type of content created */
  contentType: 'document' | 'workstream' | 'project' | 'meeting-notes' | 'other';
  /** Title/description of the content */
  title: string;
  /** Path to the file (relative to KB root) */
  filePath: string;
  /** Optional message to display */
  message?: string;
}

let io: SocketServer | null = null;

/**
 * Initialize the socket.io server
 */
export function initSocketServer(socketServer: SocketServer) {
  io = socketServer;

  io.on('connection', (socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Emit a data change event to all connected clients
 */
export function emitDataChange(event: DataChangeEvent) {
  if (!io) {
    console.warn('[socket] Socket server not initialized, skipping emit');
    return;
  }

  io.emit('data:changed', event);
}

/**
 * Emit an AI content created event to all connected clients
 * This triggers a toast notification prompting the user to review the content
 */
export function emitAIContent(event: AIContentEvent) {
  if (!io) {
    console.warn('[socket] Socket server not initialized, skipping emit');
    return;
  }

  io.emit('ai:content', event);
}

/**
 * Helper functions for common mutations
 */
export const emit = {
  items: {
    created: (id: number) => emitDataChange({ entity: 'items', mutation: 'create', id }),
    updated: (id: number) => emitDataChange({ entity: 'items', mutation: 'update', id }),
    deleted: (id: number) => emitDataChange({ entity: 'items', mutation: 'delete', id }),
    batchUpdated: (ids: number[]) => emitDataChange({ entity: 'items', mutation: 'update', ids }),
  },
  checkins: {
    created: (id: number) => emitDataChange({ entity: 'checkins', mutation: 'create', id }),
    updated: (id: number) => emitDataChange({ entity: 'checkins', mutation: 'update', id }),
    deleted: (id: number) => emitDataChange({ entity: 'checkins', mutation: 'delete', id }),
  },
  people: {
    created: (id: number) => emitDataChange({ entity: 'people', mutation: 'create', id }),
    updated: (id: number) => emitDataChange({ entity: 'people', mutation: 'update', id }),
    deleted: (id: number) => emitDataChange({ entity: 'people', mutation: 'delete', id }),
  },
  projects: {
    created: (id: number) => emitDataChange({ entity: 'projects', mutation: 'create', id }),
    updated: (id: number) => emitDataChange({ entity: 'projects', mutation: 'update', id }),
    deleted: (id: number) => emitDataChange({ entity: 'projects', mutation: 'delete', id }),
  },
  organizations: {
    created: (id: number) => emitDataChange({ entity: 'organizations', mutation: 'create', id }),
    updated: (id: number) => emitDataChange({ entity: 'organizations', mutation: 'update', id }),
    deleted: (id: number) => emitDataChange({ entity: 'organizations', mutation: 'delete', id }),
  },
  routines: {
    created: (id: number) => emitDataChange({ entity: 'routines', mutation: 'create', id }),
    updated: (id: number) => emitDataChange({ entity: 'routines', mutation: 'update', id }),
    deleted: (id: number) => emitDataChange({ entity: 'routines', mutation: 'delete', id }),
  },
  meetings: {
    synced: () => emitDataChange({ entity: 'meetings', mutation: 'update' }),
  },
  /**
   * AI content notifications - use when AI creates content that needs user review
   * Do NOT use for routine writes like diary entries or memory updates
   */
  ai: {
    documentCreated: (title: string, filePath: string, message?: string) =>
      emitAIContent({ contentType: 'document', title, filePath, message }),
    workstreamCreated: (title: string, filePath: string, message?: string) =>
      emitAIContent({ contentType: 'workstream', title, filePath, message }),
    projectCreated: (title: string, filePath: string, message?: string) =>
      emitAIContent({ contentType: 'project', title, filePath, message }),
    meetingNotesCreated: (title: string, filePath: string, message?: string) =>
      emitAIContent({ contentType: 'meeting-notes', title, filePath, message }),
    contentCreated: (title: string, filePath: string, message?: string) =>
      emitAIContent({ contentType: 'other', title, filePath, message }),
  },
};
