/**
 * Files Router (tRPC)
 *
 * Type-safe API for browsing and reading files in the knowledge base.
 * All operations are read-only and paths are validated to stay within KB.
 */
import { type TreeNode } from '@kw/api-types';
export declare const filesRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List files and folders in a directory
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            path?: string | undefined;
            includeHidden?: boolean | undefined;
        };
        output: {
            path: string;
            entries: {
                path: string;
                type: "file" | "folder";
                name: string;
                size?: number | undefined;
                mtime?: string | undefined;
                frontmatterTitle?: string | null | undefined;
                extension?: string | undefined;
            }[];
            total: number;
        };
        meta: object;
    }>;
    /**
     * Get file content and metadata
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            path: string;
        };
        output: {
            path: string;
            metadata: {
                size: number;
                mtime: string;
                extension: string;
                isMarkdown: boolean;
            };
            content: string;
            frontmatter?: Record<string, unknown> | undefined;
        };
        meta: object;
    }>;
    /**
     * Get a tree structure of files and folders
     */
    tree: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            path?: string | undefined;
            includeHidden?: boolean | undefined;
            depth?: number | undefined;
        };
        output: {
            path: string;
            nodes: TreeNode[];
        };
        meta: object;
    }>;
    /**
     * Search for files matching a query
     */
    search: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            query: string;
            path?: string | undefined;
            limit?: number | undefined;
            extensions?: string[] | undefined;
        };
        output: {
            query: string;
            results: {
                entry: {
                    path: string;
                    type: "file" | "folder";
                    name: string;
                    size?: number | undefined;
                    mtime?: string | undefined;
                    frontmatterTitle?: string | null | undefined;
                    extension?: string | undefined;
                };
                score: number;
                matches?: {
                    start: number;
                    end: number;
                }[] | undefined;
            }[];
            total: number;
        };
        meta: object;
    }>;
}>>;
export type FilesRouter = typeof filesRouter;
