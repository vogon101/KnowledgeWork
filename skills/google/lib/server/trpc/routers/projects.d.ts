/**
 * Projects Router (tRPC)
 *
 * Type-safe API for project operations.
 */
export declare const projectsRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List all projects
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            org?: string | undefined;
            status?: string | undefined;
            limit?: number | undefined;
            offset?: number | undefined;
            includeChildren?: boolean | undefined;
        } | undefined;
        output: {
            projects: {
                childCount: number;
                id: number;
                name: string;
                org: string;
                slug: string;
                isGeneral: boolean;
                status?: "active" | "paused" | "planning" | "completed" | "archived" | null | undefined;
                createdAt?: string | undefined;
                updatedAt?: string | undefined;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                parentSlug?: string | null | undefined;
                parentName?: string | null | undefined;
                fullPath?: string | undefined;
                organizationName?: string | undefined;
                organizationShortName?: string | null | undefined;
                organizationColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
            }[];
            total: number;
            limit: number;
            offset: number;
        };
        meta: object;
    }>;
    /**
     * Get a single project by slug
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            slug: string;
            org?: string | undefined;
        };
        output: {
            children: {
                name: string;
                id: number;
                slug: string;
                status: string | null;
            }[];
            taskStats: {
                total: number;
                pending: number;
                in_progress: number;
                complete: number;
                blocked: number;
                cancelled: number;
            };
            id: number;
            name: string;
            org: string;
            slug: string;
            isGeneral: boolean;
            status?: "active" | "paused" | "planning" | "completed" | "archived" | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            priority?: number | null | undefined;
            parentId?: number | null | undefined;
            description?: string | null | undefined;
            parentSlug?: string | null | undefined;
            parentName?: string | null | undefined;
            fullPath?: string | undefined;
            organizationName?: string | undefined;
            organizationShortName?: string | null | undefined;
            organizationColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
        };
        meta: object;
    }>;
    /**
     * Create a new project
     */
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            org: string;
            slug: string;
            status?: "active" | "paused" | "planning" | "completed" | "archived" | null | undefined;
            priority?: number | null | undefined;
            parentId?: number | null | undefined;
            description?: string | null | undefined;
            isGeneral?: boolean | undefined;
        };
        output: {
            id: number;
            name: string;
            org: string;
            slug: string;
            isGeneral: boolean;
            status?: "active" | "paused" | "planning" | "completed" | "archived" | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            priority?: number | null | undefined;
            parentId?: number | null | undefined;
            description?: string | null | undefined;
            parentSlug?: string | null | undefined;
            parentName?: string | null | undefined;
            fullPath?: string | undefined;
            organizationName?: string | undefined;
            organizationShortName?: string | null | undefined;
            organizationColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
        };
        meta: object;
    }>;
    /**
     * Update a project
     */
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            data: {
                status?: "active" | "paused" | "planning" | "completed" | "archived" | null | undefined;
                name?: string | undefined;
                org?: string | undefined;
                slug?: string | undefined;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                isGeneral?: boolean | undefined;
            };
        };
        output: {
            id: number;
            name: string;
            org: string;
            slug: string;
            isGeneral: boolean;
            status?: "active" | "paused" | "planning" | "completed" | "archived" | null | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            priority?: number | null | undefined;
            parentId?: number | null | undefined;
            description?: string | null | undefined;
            parentSlug?: string | null | undefined;
            parentName?: string | null | undefined;
            fullPath?: string | undefined;
            organizationName?: string | undefined;
            organizationShortName?: string | null | undefined;
            organizationColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
        };
        meta: object;
    }>;
    /**
     * Resolve a project slug to its full path (for URL construction)
     */
    resolvePath: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            slug: string;
            org?: string | undefined;
        };
        output: {
            org: string;
            slug: string;
            parentSlug: string | null;
            fullPath: string;
        } | null;
        meta: object;
    }>;
    /**
     * Delete a project
     *
     * Options:
     * - cascade: Delete all items, child projects, and meeting links
     * - orphan: Move items and child projects to parent (or unset if no parent)
     * - fail: Fail if project has any references (default)
     */
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: number;
            onItems?: "cascade" | "orphan" | "fail" | undefined;
            onChildren?: "cascade" | "orphan" | "fail" | undefined;
        };
        output: {
            deleted: boolean;
            slug: string;
            org: string | null;
            itemsAffected: number;
            childrenAffected: number;
        };
        meta: object;
    }>;
    /**
     * List projects with task statistics (for dashboard project progress)
     */
    withTaskStats: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            status?: string | undefined;
            limit?: number | undefined;
            sortBy?: "name" | "priority" | "activity" | undefined;
        } | undefined;
        output: {
            projects: {
                childCount: number;
                taskStats: {
                    total: number;
                    pending: number;
                    in_progress: number;
                    complete: number;
                    blocked: number;
                    cancelled: number;
                };
                recentActivityCount: number;
                recentCompletions: number;
                dueToday: number;
                dueThisWeek: number;
                checkinsToday: number;
                checkinsThisWeek: number;
                activityScore: number;
                id: number;
                name: string;
                org: string;
                slug: string;
                isGeneral: boolean;
                status?: "active" | "paused" | "planning" | "completed" | "archived" | null | undefined;
                createdAt?: string | undefined;
                updatedAt?: string | undefined;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                parentSlug?: string | null | undefined;
                parentName?: string | null | undefined;
                fullPath?: string | undefined;
                organizationName?: string | undefined;
                organizationShortName?: string | null | undefined;
                organizationColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
            }[];
            total: number;
        };
        meta: object;
    }>;
}>>;
export type ProjectsRouter = typeof projectsRouter;
