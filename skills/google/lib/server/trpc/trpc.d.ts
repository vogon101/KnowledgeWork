/**
 * tRPC Instance Setup
 *
 * Separate file to avoid circular dependencies with routers.
 */
import type { PrismaClient } from '../generated/prisma/index.js';
export interface TRPCContext {
    prisma: PrismaClient;
}
export declare function createContext(): Promise<TRPCContext>;
export declare const router: import("@trpc/server").TRPCRouterBuilder<{
    ctx: TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}>;
export declare const publicProcedure: import("@trpc/server").TRPCProcedureBuilder<TRPCContext, object, {}, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
export declare const middleware: <$ContextOverrides>(fn: import("@trpc/server").TRPCMiddlewareFunction<TRPCContext, object, object, $ContextOverrides, unknown>) => import("@trpc/server").TRPCMiddlewareBuilder<TRPCContext, object, $ContextOverrides, unknown>;
