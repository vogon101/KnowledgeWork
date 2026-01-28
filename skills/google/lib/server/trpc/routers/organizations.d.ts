/**
 * Organizations Router (tRPC)
 *
 * Type-safe API for organization operations.
 * Organizations represent workstreams/clients (Acme Corp, Example Org, etc.)
 */
export declare const organizationsRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List all organizations
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            organizations: {
                id: number;
                slug: string;
                name: string;
                shortName: string | null;
                description: string | null;
                color: "indigo" | "teal" | "rose" | "orange" | null;
                createdAt: string;
                updatedAt: string;
            }[];
            count: number;
        };
        meta: object;
    }>;
    /**
     * Get a specific organization by slug
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            slug: string;
        };
        output: {
            projectCount: number;
            peopleCount: number;
            id: number;
            slug: string;
            name: string;
            shortName: string | null;
            description: string | null;
            color: "indigo" | "teal" | "rose" | "orange" | null;
            createdAt: string;
            updatedAt: string;
        };
        meta: object;
    }>;
    /**
     * Create a new organization
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            slug: string;
            description?: string | undefined;
            shortName?: string | undefined;
        };
        output: {
            id: number;
            slug: string;
            name: string;
            shortName: string | null;
            description: string | null;
            color: "indigo" | "teal" | "rose" | "orange" | null;
            createdAt: string;
            updatedAt: string;
        };
        meta: object;
    }>;
    /**
     * Update an organization
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            slug: string;
            data: {
                description?: string | null | undefined;
                name?: string | undefined;
                shortName?: string | null | undefined;
                color?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
            };
        };
        output: {
            id: number;
            slug: string;
            name: string;
            shortName: string | null;
            description: string | null;
            color: "indigo" | "teal" | "rose" | "orange" | null;
            createdAt: string;
            updatedAt: string;
        };
        meta: object;
    }>;
    /**
     * Delete an organization (only if no projects/people reference it)
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            slug: string;
        };
        output: {
            deleted: boolean;
        };
        meta: object;
    }>;
    /**
     * Force delete an organization and all its contents
     *
     * This cascades:
     * - Soft-deletes all items in all projects
     * - Deletes all projects
     * - Unlinks all people (sets orgId to null)
     * - Deletes the organization
     */
    deleteForce: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            slug: string;
            deleteItems?: boolean | undefined;
            deletePeople?: boolean | undefined;
        };
        output: {
            deleted: boolean;
            projectsDeleted: number;
            peopleAffected: number;
        };
        meta: object;
    }>;
}>>;
export type OrganizationsRouter = typeof organizationsRouter;
