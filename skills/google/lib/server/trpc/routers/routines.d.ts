/**
 * Routines Router (tRPC)
 *
 * Type-safe API for routine operations.
 * Routines are Items with itemType='routine' that recur on a schedule.
 */
export declare const routinesRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List all routine templates
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            routines: {
                id: number;
                title: string;
                description: string | null;
                priority: number | null;
                ownerId: number | null;
                ownerName: string | null;
                projectId: number | null;
                projectSlug: string | null;
                projectName: string | null;
                projectOrg: string | null;
                projectFullPath: string | null;
                recurrenceRule: string;
                recurrenceTime: string | null;
                recurrenceDays: string | null;
                recurrenceMonths: string | null;
                isDueToday: boolean | undefined;
                completedToday: boolean | undefined;
                lastCompleted: string | null;
                completionCount: number;
            }[];
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get routines due on a date (default: today)
     */
    due: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            date?: string | undefined;
        } | undefined;
        output: {
            date: string;
            total: number;
            pendingCount: number;
            completedCount: number;
            pending: {
                id: number;
                title: string;
                description: string | null;
                priority: number | null;
                ownerId: number | null;
                ownerName: string | null;
                projectId: number | null;
                projectSlug: string | null;
                projectName: string | null;
                projectOrg: string | null;
                projectFullPath: string | null;
                recurrenceRule: string;
                recurrenceTime: string | null;
                recurrenceDays: string | null;
                recurrenceMonths: string | null;
                isDueToday: boolean | undefined;
                completedToday: boolean | undefined;
                lastCompleted: string | null;
                completionCount: number;
            }[];
            completed: {
                id: number;
                title: string;
                description: string | null;
                priority: number | null;
                ownerId: number | null;
                ownerName: string | null;
                projectId: number | null;
                projectSlug: string | null;
                projectName: string | null;
                projectOrg: string | null;
                projectFullPath: string | null;
                recurrenceRule: string;
                recurrenceTime: string | null;
                recurrenceDays: string | null;
                recurrenceMonths: string | null;
                isDueToday: boolean | undefined;
                completedToday: boolean | undefined;
                lastCompleted: string | null;
                completionCount: number;
            }[];
        };
        meta: object;
    }>;
    /**
     * Get overdue routines
     */
    overdue: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            totalOverdue: number;
            totalMissedInstances: number;
            routines: {
                id: number;
                title: string;
                recurrenceRule: string;
                projectName: string | null;
                overdueDates: string[];
                daysOverdue: number;
            }[];
        };
        meta: object;
    }>;
    /**
     * Get a specific routine with history
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: number;
        };
        output: {
            id: number;
            title: string;
            description: string | null;
            priority: number | null;
            ownerId: number | null;
            ownerName: string | null;
            projectId: number | null;
            projectSlug: string | null;
            projectName: string | null;
            projectOrg: string | null;
            projectFullPath: string | null;
            recurrenceRule: string | null;
            recurrenceTime: string | null;
            recurrenceDays: string | null;
            recurrenceMonths: string | null;
            createdAt: string;
            updatedAt: string;
            history: {
                id: number;
                completed_date: string;
                notes: string | null;
                completed_at: string;
            }[];
        };
        meta: object;
    }>;
    /**
     * Create a new routine
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            title: string;
            recurrenceRule: "custom" | "daily" | "weekly" | "monthly" | "bimonthly" | "yearly";
            description?: string | undefined;
            priority?: number | undefined;
            projectId?: number | undefined;
            ownerId?: number | undefined;
            recurrenceTime?: string | undefined;
            recurrenceDays?: (string | number)[] | undefined;
            recurrenceMonths?: number[] | undefined;
        };
        output: {
            id: number;
            title: string;
            recurrenceRule: string | null;
        };
        meta: object;
    }>;
    /**
     * Update a routine
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            data: {
                description?: string | null | undefined;
                priority?: number | null | undefined;
                title?: string | undefined;
                projectId?: number | null | undefined;
                ownerId?: number | null | undefined;
                recurrenceRule?: "custom" | "daily" | "weekly" | "monthly" | "bimonthly" | "yearly" | undefined;
                recurrenceTime?: string | null | undefined;
                recurrenceDays?: (string | number)[] | null | undefined;
                recurrenceMonths?: number[] | null | undefined;
            };
        };
        output: {
            id: number;
        };
        meta: object;
    }>;
    /**
     * Delete a routine
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
        };
        output: {
            deleted: boolean;
        };
        meta: object;
    }>;
    /**
     * Complete a routine for a date (default: today)
     */
    complete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            notes?: string | undefined;
            date?: string | undefined;
        };
        output: {
            routineId: number;
            completionId: number | undefined;
            date: string;
            alreadyCompleted: boolean;
            diarySync: {
                synced: boolean;
                diaryPath: string;
            };
        };
        meta: object;
    }>;
    /**
     * Uncomplete a routine for a date
     */
    uncomplete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            date?: string | undefined;
        };
        output: {
            routineId: number;
            date: string;
            wasCompleted: boolean;
        };
        meta: object;
    }>;
    /**
     * Skip a routine for a date
     */
    skip: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            notes?: string | undefined;
            date?: string | undefined;
        };
        output: {
            routineId: number;
            skipId: number | undefined;
            date: string;
            alreadySkipped: boolean;
        };
        meta: object;
    }>;
    /**
     * Unskip a routine for a date
     */
    unskip: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            date?: string | undefined;
        };
        output: {
            routineId: number;
            date: string;
            wasSkipped: boolean;
        };
        meta: object;
    }>;
    /**
     * Skip all overdue instances, advancing to next due date
     */
    skipAllOverdue: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
        };
        output: {
            routineId: number;
            skippedCount: number;
            datesSkipped: string[];
            nextDue: string;
        };
        meta: object;
    }>;
    /**
     * Complete all overdue instances, advancing to next due date
     */
    completeAllOverdue: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
        };
        output: {
            routineId: number;
            completedCount: number;
            datesCompleted: string[];
            nextDue: string;
        };
        meta: object;
    }>;
}>>;
export type RoutinesRouter = typeof routinesRouter;
