/**
 * Hash utilities for file sync
 *
 * Provides content hashing for detecting file changes and conflicts
 * between the filesystem and database.
 */
import { createHash } from 'crypto';
/**
 * Compute SHA-256 hash of file content
 *
 * @param content - The file content to hash
 * @returns The hex-encoded SHA-256 hash
 */
export function computeContentHash(content) {
    return createHash('sha256').update(content, 'utf8').digest('hex');
}
/**
 * Check if a file has changed based on its hash
 *
 * @param currentContent - The current file content
 * @param storedHash - The previously stored hash
 * @returns true if the content has changed
 */
export function hasContentChanged(currentContent, storedHash) {
    if (!storedHash)
        return true;
    return computeContentHash(currentContent) !== storedHash;
}
/**
 * Detect if there's a sync conflict
 *
 * A conflict occurs when both the file and database have been modified
 * since the last sync.
 *
 * @param currentFileContent - Current content of the file
 * @param storedFileHash - Hash stored in DB from last sync
 * @param dbUpdatedAt - When the DB record was last updated
 * @param lastSyncedAt - When the last sync occurred
 * @returns Conflict status with details
 */
export function detectConflict(currentFileContent, storedFileHash, dbUpdatedAt, lastSyncedAt) {
    const currentFileHash = computeContentHash(currentFileContent);
    const fileChanged = storedFileHash !== currentFileHash;
    // DB is considered changed if it was updated after the last sync
    const dbChanged = dbUpdatedAt && lastSyncedAt
        ? dbUpdatedAt > lastSyncedAt
        : false;
    return {
        hasConflict: fileChanged && dbChanged,
        fileChanged,
        dbChanged,
        currentFileHash,
        storedFileHash,
    };
}
