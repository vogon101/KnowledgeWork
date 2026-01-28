/**
 * Tags Router (tRPC)
 *
 * Type-safe API for tag management operations.
 */
export declare const tagsRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List all tags
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            search?: string | undefined;
            limit?: number | undefined;
        } | undefined;
        output: {
            id: number;
            name: string;
            color: string | null;
            description: string | null;
            itemCount: number;
        }[];
        meta: object;
    }>;
    /**
     * Get a single tag by ID or name
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            name?: string | undefined;
            id?: number | undefined;
        };
        output: {
            id: number;
            name: string;
            color: string | null;
            description: string | null;
            items: {
                id: number;
                title: string;
                status: string;
                itemType: string;
            }[];
        };
        meta: object;
    }>;
    /**
     * Create a new tag
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            description?: string | undefined;
            color?: string | undefined;
        };
        output: {
            id: number;
            name: string;
            color: string | null;
            description: string | null;
        };
        meta: object;
    }>;
    /**
     * Update a tag
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            description?: string | null | undefined;
            name?: string | undefined;
            color?: string | null | undefined;
        };
        output: {
            id: number;
            name: string;
            color: string | null;
            description: string | null;
        };
        meta: object;
    }>;
    /**
     * Delete a tag
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
        };
        output: {
            deleted: boolean;
            id: number;
        };
        meta: object;
    }>;
}>>;
export type TagsRouter = typeof tagsRouter;
