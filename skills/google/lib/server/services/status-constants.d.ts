/**
 * Status Constants
 *
 * Mappings between database statuses and their markdown representations.
 * Used by markdown-sync and file-sync services.
 */
export declare const STATUS_TO_EMOJI: Record<string, string>;
export declare const STATUS_TO_ACTION_STATUS: Record<string, string>;
/**
 * Map workstream file status to database Item status
 */
export declare function mapWorkstreamStatus(status: string): string;
/**
 * Map database Item status to workstream file status
 */
export declare function mapDbStatusToFile(dbStatus: string): string;
