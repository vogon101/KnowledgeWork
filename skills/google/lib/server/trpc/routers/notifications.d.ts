/**
 * Notifications Router (tRPC)
 *
 * API for sending notifications to connected web clients.
 * Used by AI agents to notify users when content needs review.
 */
export declare const notificationsRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Notify connected clients that AI has created content needing review
     *
     * Use this when:
     * - AI creates a new document, workstream, or project
     * - AI generates meeting notes or summaries
     * - AI creates any content the user should review
     *
     * Do NOT use for:
     * - Routine diary entries
     * - Memory/context updates
     * - Internal system files
     */
    aiContentCreated: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            filePath: string;
            title: string;
            contentType: "document" | "workstream" | "project" | "meeting-notes" | "other";
            message?: string | undefined;
        };
        output: {
            success: boolean;
            notified: boolean;
            contentType: "document" | "workstream" | "project" | "meeting-notes" | "other";
            title: string;
            filePath: string;
        };
        meta: object;
    }>;
}>>;
export type NotificationsRouter = typeof notificationsRouter;
