/**
 * Sync Router (tRPC)
 *
 * Type-safe API for sync operations:
 * - Meeting sync: Parse meeting markdown → create tasks
 * - Filesystem sync: Bidirectional sync between workstream files and DB
 */
export declare const syncRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Preview what would be synced from all sources
     */
    allPreview: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            meetings: {
                count: number;
                withTasks: number;
            };
            workstreams: {
                count: number;
            };
        };
        meta: object;
    }>;
    /**
     * Sync all sources (meetings + filesystem)
     */
    all: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            meetings: {
                tasksCreated: number;
                tasksUpdated: number;
            };
            projects: {
                projectsCreated: number;
                projectsUpdated: number;
            };
            filesystem: {
                synced: number;
                created: number;
                updated: number;
                skipped: number;
                conflicts: number;
                errors: number;
            };
        };
        meta: object;
    }>;
    /**
     * Preview what would be synced from a meeting
     */
    meetingPreview: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            path: string;
        };
        output: {
            path: string;
            title: string;
            date: string;
            attendees: string[];
            projects: string[];
            primaryProject: string | undefined;
            actionsCount: number;
            actions: {
                owner: string;
                action: string;
                project: string | undefined;
                due: string | undefined;
                status: string;
                existingTaskId: number | null;
                existingTaskStatus: string | null;
                wouldCreate: boolean;
                wouldSkip: boolean;
                isDeleted: boolean;
            }[];
            wouldCreate: number;
            wouldSkip: number;
            isSynced: boolean;
        };
        meta: object;
    }>;
    /**
     * Sync actions from a meeting file to the database
     */
    meeting: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            path: string;
            dryRun?: boolean | undefined;
        };
        output: {
            dryRun: boolean;
            meetingPath: string;
            meetingTitle: string;
            actionsFound: number;
            tasksCreated: number;
            tasksUpdated: number;
            tasksSkipped: number;
            errors: string[];
            taskIds: number[];
        };
        meta: object;
    }>;
    /**
     * Preview workstream files found in filesystem
     */
    filesystemPreview: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            total: number;
            byProject: {
                project: string;
                count: number;
                workstreams: {
                    file: string;
                    title: string;
                    status: string;
                    type: "workstream" | "sub-project";
                    priority: number | undefined;
                }[];
            }[];
        };
        meta: object;
    }>;
    /**
     * Sync all workstream files to database
     */
    filesystem: import("@trpc/server").TRPCMutationProcedure<{
        input: void;
        output: {
            synced: number;
            created: number;
            updated: number;
            skipped: number;
            conflictsCount: number;
            errorsCount: number;
            conflicts: import("../../services/file-sync.js").ConflictInfo[];
            errors: string[];
        };
        meta: object;
    }>;
    /**
     * Sync a specific file to database
     */
    file: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            path: string;
            force?: boolean | undefined;
        };
        output: {
            action: string;
            itemId: number | undefined;
            error: string | undefined;
            conflict?: undefined;
        } | {
            action: "skipped" | "created" | "updated" | "conflict";
            itemId: number | undefined;
            error: string | undefined;
            conflict: import("../../services/hash-utils.js").ConflictStatus | undefined;
        };
        meta: object;
    }>;
    /**
     * Push database changes to file
     */
    itemToFile: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            force?: boolean | undefined;
        };
        output: {
            success: boolean;
            filePath: string;
            error: string | undefined;
            hadConflict: boolean | undefined;
        };
        meta: object;
    }>;
    /**
     * List all sync conflicts
     */
    conflicts: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            total: number;
            conflicts: import("../../services/file-sync.js").ConflictInfo[];
        };
        meta: object;
    }>;
    /**
     * Resolve a conflict
     */
    resolveConflict: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            itemId: number;
            winner: "file" | "database";
        };
        output: {
            resolved: boolean;
            winner: string;
            error: string | undefined;
        };
        meta: object;
    }>;
}>>;
export type SyncRouter = typeof syncRouter;
