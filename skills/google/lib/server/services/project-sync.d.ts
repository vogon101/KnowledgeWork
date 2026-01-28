/**
 * Project Sync Service
 *
 * Syncs projects from the knowledge base filesystem into the task database.
 */
interface ProjectInfo {
    slug: string;
    name: string;
    org: string;
    status: string | null;
    priority: number | null;
    description?: string;
    isSubProject: boolean;
    parentSlug?: string;
}
interface SyncResult {
    projects_found: number;
    projects_created: number;
    projects_updated: number;
    errors: string[];
}
/**
 * Scan the knowledge base for all projects
 */
export declare function scanProjects(): ProjectInfo[];
/**
 * Sync projects to the database
 */
export declare function syncProjects(): Promise<SyncResult>;
/**
 * Get all projects from the database
 */
export declare function getDbProjects(): Promise<{
    id: number;
    slug: string;
    name: string;
    org: string | null;
    status: string | null;
}[]>;
export {};
