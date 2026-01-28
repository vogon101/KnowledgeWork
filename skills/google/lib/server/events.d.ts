/**
 * Server-side event emitter for real-time updates
 *
 * Used by tRPC mutation handlers to notify clients of data changes.
 * Clients connect via socket.io and invalidate React Query cache.
 */
import { Server as SocketServer } from 'socket.io';
export type EntityType = 'items' | 'people' | 'projects' | 'organizations' | 'checkins' | 'routines' | 'meetings';
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
/**
 * Initialize the socket.io server
 */
export declare function initSocketServer(socketServer: SocketServer): void;
/**
 * Emit a data change event to all connected clients
 */
export declare function emitDataChange(event: DataChangeEvent): void;
/**
 * Emit an AI content created event to all connected clients
 * This triggers a toast notification prompting the user to review the content
 */
export declare function emitAIContent(event: AIContentEvent): void;
/**
 * Helper functions for common mutations
 */
export declare const emit: {
    items: {
        created: (id: number) => void;
        updated: (id: number) => void;
        deleted: (id: number) => void;
        batchUpdated: (ids: number[]) => void;
    };
    checkins: {
        created: (id: number) => void;
        updated: (id: number) => void;
        deleted: (id: number) => void;
    };
    people: {
        created: (id: number) => void;
        updated: (id: number) => void;
        deleted: (id: number) => void;
    };
    projects: {
        created: (id: number) => void;
        updated: (id: number) => void;
        deleted: (id: number) => void;
    };
    organizations: {
        created: (id: number) => void;
        updated: (id: number) => void;
        deleted: (id: number) => void;
    };
    routines: {
        created: (id: number) => void;
        updated: (id: number) => void;
        deleted: (id: number) => void;
    };
    meetings: {
        synced: () => void;
    };
    /**
     * AI content notifications - use when AI creates content that needs user review
     * Do NOT use for routine writes like diary entries or memory updates
     */
    ai: {
        documentCreated: (title: string, filePath: string, message?: string) => void;
        workstreamCreated: (title: string, filePath: string, message?: string) => void;
        projectCreated: (title: string, filePath: string, message?: string) => void;
        meetingNotesCreated: (title: string, filePath: string, message?: string) => void;
        contentCreated: (title: string, filePath: string, message?: string) => void;
    };
};
