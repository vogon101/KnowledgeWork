/**
 * Timecard Router (tRPC)
 *
 * Read-only API for viewing timecard data from CSV.
 */
export interface TimecardEntry {
    date: string;
    client: string;
    hours: number;
    tasks: string;
}
export interface ClientSummary {
    client: string;
    totalHours: number;
    entryCount: number;
}
export interface MonthSummary {
    month: string;
    clients: ClientSummary[];
    totalHours: number;
}
export declare const timecardRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List all timecard entries with optional filters
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            client?: string | undefined;
            limit?: number | undefined;
            startDate?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
        output: {
            entries: TimecardEntry[];
        };
        meta: object;
    }>;
    /**
     * Get summary statistics
     */
    summary: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            startDate?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
        output: {
            totalHours: number;
            entryCount: number;
            clients: string[];
            clientSummaries: ClientSummary[];
            monthlySummaries: MonthSummary[];
        };
        meta: object;
    }>;
}>>;
export type TimecardRouter = typeof timecardRouter;
