/**
 * People Router (tRPC)
 *
 * Type-safe API for person operations.
 */
export declare const peopleRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List all people with task counts
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            search?: string | undefined;
            org?: string | undefined;
            limit?: number | undefined;
            offset?: number | undefined;
        } | undefined;
        output: {
            people: {
                id: number;
                name: string;
                ownedTasks: number;
                waitingOnTasks: number;
                email?: string | null | undefined;
                org?: string | null | undefined;
                airtableYaId?: string | null | undefined;
                airtableSvId?: string | null | undefined;
                notes?: string | null | undefined;
                createdAt?: string | undefined;
                updatedAt?: string | undefined;
            }[];
            total: number;
            limit: number;
            offset: number;
        };
        meta: object;
    }>;
    /**
     * Get a single person by ID
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: number;
        };
        output: {
            ownedTasks: {
                id: number;
                displayId: string;
                title: string;
                status: string;
                priority: number | null;
                dueDate: string | null;
                projectSlug: string | null;
                projectName: string | null;
            }[];
            waitingOnTasks: {
                id: number;
                displayId: string;
                title: string;
                status: string;
                priority: number | null;
                dueDate: string | null;
                ownerName: string | null;
                projectSlug: string | null;
                projectName: string | null;
            }[];
            id: number;
            name: string;
            email?: string | null | undefined;
            org?: string | null | undefined;
            airtableYaId?: string | null | undefined;
            airtableSvId?: string | null | undefined;
            notes?: string | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        };
        meta: object;
    }>;
    /**
     * Create a new person
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            email?: string | null | undefined;
            org?: string | null | undefined;
            airtableYaId?: string | null | undefined;
            airtableSvId?: string | null | undefined;
            notes?: string | null | undefined;
        };
        output: {
            id: number;
            name: string;
            email?: string | null | undefined;
            org?: string | null | undefined;
            airtableYaId?: string | null | undefined;
            airtableSvId?: string | null | undefined;
            notes?: string | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        };
        meta: object;
    }>;
    /**
     * Update a person
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            data: {
                name?: string | undefined;
                email?: string | null | undefined;
                org?: string | null | undefined;
                airtableYaId?: string | null | undefined;
                airtableSvId?: string | null | undefined;
                notes?: string | null | undefined;
            };
        };
        output: {
            id: number;
            name: string;
            email?: string | null | undefined;
            org?: string | null | undefined;
            airtableYaId?: string | null | undefined;
            airtableSvId?: string | null | undefined;
            notes?: string | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        };
        meta: object;
    }>;
    /**
     * Find person by name
     */
    findByName: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            name: string;
        };
        output: {
            id: number;
            name: string;
            email?: string | null | undefined;
            org?: string | null | undefined;
            airtableYaId?: string | null | undefined;
            airtableSvId?: string | null | undefined;
            notes?: string | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
        } | null;
        meta: object;
    }>;
    /**
     * Delete a person
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
}>>;
export type PeopleRouter = typeof peopleRouter;
