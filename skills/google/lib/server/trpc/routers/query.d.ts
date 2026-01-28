/**
 * Query Router (tRPC)
 *
 * Common query shortcuts for items (today, overdue, waiting, search).
 */
import { type ItemWithRelations } from '@kw/api-types';
export declare const queryRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Get items due today
     */
    today: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            ownerName?: string | undefined;
        } | undefined;
        output: {
            date: string;
            items: {
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            }[];
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get overdue items
     */
    overdue: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            ownerName?: string | undefined;
        } | undefined;
        output: {
            items: {
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            }[];
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get items waiting on others
     */
    waiting: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            total: number;
            byPerson: {
                person: {
                    id: number;
                    name: string;
                };
                items: ItemWithRelations[];
            }[];
        };
        meta: object;
    }>;
    /**
     * Search items by text
     */
    search: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            query: string;
            limit?: number | undefined;
            includeCompleted?: boolean | undefined;
        };
        output: {
            query: string;
            items: {
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            }[];
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get high priority items
     */
    highPriority: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            ownerName?: string | undefined;
        } | undefined;
        output: {
            items: {
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            }[];
            count: number;
        };
        meta: object;
    }>;
    /**
     * Dashboard summary stats
     */
    dashboard: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            ownerName?: string | undefined;
        } | undefined;
        output: {
            total: number;
            overdue: number;
            dueToday: number;
            highPriority: number;
            blocked: number;
        };
        meta: object;
    }>;
    /**
     * Get recent activity feed (status changes, completions, notes)
     */
    activityFeed: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            offset?: number | undefined;
        } | undefined;
        output: {
            activities: {
                id: number;
                action: string;
                detail: string | null;
                oldValue: string | null;
                newValue: string | null;
                createdAt: string;
                createdBy: string | null;
                item: {
                    id: number;
                    displayId: string;
                    title: string;
                    status: string;
                    projectSlug: string | null;
                    projectName: string | null;
                    projectOrg: string | null;
                };
            }[];
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get tasks due in the next N days (for weekly planning)
     */
    upcoming: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            ownerName?: string | undefined;
            days?: number | undefined;
        } | undefined;
        output: {
            startDate: string;
            endDate: string;
            days: number;
            grouped: {
                date: string;
                items: {
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
            }[];
            total: number;
        };
        meta: object;
    }>;
    /**
     * Get blocked items (for action panel)
     * Uses ItemLink system for many-to-many blocking relationships
     */
    blocked: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
        } | undefined;
        output: {
            items: {
                blockers: {
                    id: number;
                    displayId: string;
                    title: string;
                    status: string;
                }[];
                blockerCount: number;
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            }[];
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get in-progress items (for today's focus)
     */
    inProgress: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
        } | undefined;
        output: {
            items: {
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            }[];
            count: number;
        };
        meta: object;
    }>;
}>>;
export type QueryRouter = typeof queryRouter;
