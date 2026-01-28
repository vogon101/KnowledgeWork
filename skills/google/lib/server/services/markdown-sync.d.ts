import { STATUS_TO_EMOJI, STATUS_TO_ACTION_STATUS } from './status-constants.js';
export { STATUS_TO_EMOJI, STATUS_TO_ACTION_STATUS };
export interface SyncResult {
    success: boolean;
    source_type: string | null;
    source_path: string | null;
    message: string;
    changes?: string[];
}
/**
 * Sync task status back to its source markdown file
 */
export declare function syncTaskToSource(taskId: number, basePath: string): Promise<SyncResult>;
/**
 * Batch sync all tasks with source files
 */
export declare function syncAllTasksToSources(basePath: string): Promise<{
    success: boolean;
    total: number;
    synced: number;
    skipped: number;
    errors: string[];
}>;
