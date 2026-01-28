/**
 * Server-side event emitter for real-time updates
 *
 * Used by tRPC mutation handlers to notify clients of data changes.
 * Clients connect via socket.io and invalidate React Query cache.
 */
let io = null;
/**
 * Initialize the socket.io server
 */
export function initSocketServer(socketServer) {
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
export function emitDataChange(event) {
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
export function emitAIContent(event) {
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
        created: (id) => emitDataChange({ entity: 'items', mutation: 'create', id }),
        updated: (id) => emitDataChange({ entity: 'items', mutation: 'update', id }),
        deleted: (id) => emitDataChange({ entity: 'items', mutation: 'delete', id }),
        batchUpdated: (ids) => emitDataChange({ entity: 'items', mutation: 'update', ids }),
    },
    checkins: {
        created: (id) => emitDataChange({ entity: 'checkins', mutation: 'create', id }),
        updated: (id) => emitDataChange({ entity: 'checkins', mutation: 'update', id }),
        deleted: (id) => emitDataChange({ entity: 'checkins', mutation: 'delete', id }),
    },
    people: {
        created: (id) => emitDataChange({ entity: 'people', mutation: 'create', id }),
        updated: (id) => emitDataChange({ entity: 'people', mutation: 'update', id }),
        deleted: (id) => emitDataChange({ entity: 'people', mutation: 'delete', id }),
    },
    projects: {
        created: (id) => emitDataChange({ entity: 'projects', mutation: 'create', id }),
        updated: (id) => emitDataChange({ entity: 'projects', mutation: 'update', id }),
        deleted: (id) => emitDataChange({ entity: 'projects', mutation: 'delete', id }),
    },
    organizations: {
        created: (id) => emitDataChange({ entity: 'organizations', mutation: 'create', id }),
        updated: (id) => emitDataChange({ entity: 'organizations', mutation: 'update', id }),
        deleted: (id) => emitDataChange({ entity: 'organizations', mutation: 'delete', id }),
    },
    routines: {
        created: (id) => emitDataChange({ entity: 'routines', mutation: 'create', id }),
        updated: (id) => emitDataChange({ entity: 'routines', mutation: 'update', id }),
        deleted: (id) => emitDataChange({ entity: 'routines', mutation: 'delete', id }),
    },
    meetings: {
        synced: () => emitDataChange({ entity: 'meetings', mutation: 'update' }),
    },
    /**
     * AI content notifications - use when AI creates content that needs user review
     * Do NOT use for routine writes like diary entries or memory updates
     */
    ai: {
        documentCreated: (title, filePath, message) => emitAIContent({ contentType: 'document', title, filePath, message }),
        workstreamCreated: (title, filePath, message) => emitAIContent({ contentType: 'workstream', title, filePath, message }),
        projectCreated: (title, filePath, message) => emitAIContent({ contentType: 'project', title, filePath, message }),
        meetingNotesCreated: (title, filePath, message) => emitAIContent({ contentType: 'meeting-notes', title, filePath, message }),
        contentCreated: (title, filePath, message) => emitAIContent({ contentType: 'other', title, filePath, message }),
    },
};
