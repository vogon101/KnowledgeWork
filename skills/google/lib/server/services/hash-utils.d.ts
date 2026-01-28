/**
 * Hash utilities for file sync
 *
 * Provides content hashing for detecting file changes and conflicts
 * between the filesystem and database.
 */
/**
 * Compute SHA-256 hash of file content
 *
 * @param content - The file content to hash
 * @returns The hex-encoded SHA-256 hash
 */
export declare function computeContentHash(content: string): string;
/**
 * Check if a file has changed based on its hash
 *
 * @param currentContent - The current file content
 * @param storedHash - The previously stored hash
 * @returns true if the content has changed
 */
export declare function hasContentChanged(currentContent: string, storedHash: string | null): boolean;
/**
 * Conflict detection result
 */
export interface ConflictStatus {
    hasConflict: boolean;
    fileChanged: boolean;
    dbChanged: boolean;
    currentFileHash: string;
    storedFileHash: string | null;
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
export declare function detectConflict(currentFileContent: string, storedFileHash: string | null, dbUpdatedAt: Date | null, lastSyncedAt: Date | null): ConflictStatus;
