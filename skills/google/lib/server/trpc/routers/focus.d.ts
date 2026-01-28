/**
 * Focus Router (tRPC)
 *
 * API for tracking daily focus ratings with CSV backing.
 */
export interface FocusEntry {
    date: string;
    userRating: number | null;
    aiRating: number | null;
    userNotes: string;
    aiNotes: string;
}
export interface FocusSummary {
    avgUserRating: number | null;
    avgAiRating: number | null;
    entryCount: number;
    period: string;
}
export declare const focusRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List all focus entries with optional date range filter
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            limit?: number | undefined;
            startDate?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
        output: {
            entries: FocusEntry[];
        };
        meta: object;
    }>;
    /**
     * Get a focus entry for a specific date
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            date: string;
        };
        output: {
            entry: FocusEntry | null;
        };
        meta: object;
    }>;
    /**
     * Create or update a focus entry for a date
     */
    upsert: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            date: string;
            userRating?: number | undefined;
            aiRating?: number | undefined;
            userNotes?: string | undefined;
            aiNotes?: string | undefined;
        };
        output: {
            date: string;
            created: boolean;
            updated: boolean;
        };
        meta: object;
    }>;
    /**
     * Get summary statistics for a time period
     */
    summary: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            startDate?: string | undefined;
            endDate?: string | undefined;
            period?: "all" | "month" | "week" | undefined;
        } | undefined;
        output: {
            avgUserRating: number | null;
            avgAiRating: number | null;
            entryCount: number;
            period: string;
            weeklyBreakdown: {
                weekStart: string;
                avgUserRating: number | null;
                avgAiRating: number | null;
                entryCount: number;
            }[];
            entries: FocusEntry[];
        };
        meta: object;
    }>;
}>>;
export type FocusRouter = typeof focusRouter;
