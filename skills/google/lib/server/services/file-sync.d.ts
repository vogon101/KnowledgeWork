/**
 * File Sync Service
 *
 * Bidirectional sync between workstream markdown files and the Item table.
 * Handles:
 * - Scanning project directories for workstream files
 * - Creating/updating Item records from file frontmatter
 * - Pushing database changes back to file frontmatter
 * - Conflict detection via content hashing
 */
import { type ConflictStatus } from './hash-utils.js';
import { mapWorkstreamStatus, mapDbStatusToFile } from './status-constants.js';
export { mapWorkstreamStatus, mapDbStatusToFile };
export interface WorkstreamFrontmatter {
    type: 'workstream' | 'sub-project';
    title: string;
    status: string;
    parent?: string;
    priority?: number;
    tags?: string[];
}
export interface ScannedWorkstream {
    filePath: string;
    absolutePath: string;
    frontmatter: WorkstreamFrontmatter;
    content: string;
    contentHash: string;
    parentProjectSlug: string;
    org: string;
}
export interface SyncResult {
    synced: number;
    created: number;
    updated: number;
    skipped: number;
    conflicts: ConflictInfo[];
    errors: string[];
}
export interface ConflictInfo {
    filePath: string;
    itemId: number;
    reason: string;
    fileHash: string;
    dbHash: string | null;
}
export interface ItemToFileResult {
    success: boolean;
    filePath: string;
    error?: string;
    hadConflict?: boolean;
}
/**
 * Scan all project directories for workstream files
 */
export declare function scanAllWorkstreams(): ScannedWorkstream[];
/**
 * Scan a specific file and return workstream data if valid
 */
export declare function scanWorkstreamFile(filePath: string): ScannedWorkstream | null;
/**
 * Sync a single workstream file to the database
 */
export declare function syncWorkstreamToDb(workstream: ScannedWorkstream): Promise<{
    action: 'created' | 'updated' | 'skipped' | 'conflict';
    itemId?: number;
    error?: string;
    conflict?: ConflictStatus;
}>;
/**
 * Sync all workstream files to the database
 */
export declare function syncFilesystemToDb(): Promise<SyncResult>;
/**
 * Update a workstream file's frontmatter from database Item
 */
export declare function syncItemToFile(itemId: number): Promise<ItemToFileResult>;
/**
 * Get all items with potential sync conflicts
 */
export declare function detectAllConflicts(): Promise<ConflictInfo[]>;
/**
 * Force sync from file, ignoring conflicts (file wins)
 */
export declare function forceFileSyncToDb(filePath: string): Promise<{
    success: boolean;
    itemId?: number;
    error?: string;
}>;
/**
 * Force sync from database, ignoring conflicts (database wins)
 */
export declare function forceDbSyncToFile(itemId: number): Promise<ItemToFileResult>;
