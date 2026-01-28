/**
 * Gmail Router (tRPC)
 *
 * Type-safe API for Gmail operations.
 * Requires Gmail OAuth setup via: npx tsx src/scripts/gmail-auth.ts
 */
export declare const gmailRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Check Gmail configuration and authentication status.
     */
    status: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            configured: boolean;
            authenticated: boolean;
            email: string | null;
            error: string | null;
        };
        meta: object;
    }>;
    /**
     * List emails with optional filters.
     */
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            labelIds?: string[] | undefined;
            query?: string | undefined;
            maxResults?: number | undefined;
            pageToken?: string | undefined;
            includeSpamTrash?: boolean | undefined;
        };
        output: {
            emails: {
                id: string;
                date: string;
                threadId: string;
                to: {
                    email: string;
                    name?: string | null | undefined;
                }[];
                isUnread: boolean;
                labelIds: string[];
                hasAttachments: boolean;
                subject?: string | null | undefined;
                from?: {
                    email: string;
                    name?: string | null | undefined;
                } | null | undefined;
                snippet?: string | null | undefined;
            }[];
            nextPageToken: string | null;
            resultSizeEstimate: number | null | undefined;
        };
        meta: object;
    }>;
    /**
     * Search emails using Gmail query syntax.
     */
    search: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            query: string;
            maxResults?: number | undefined;
            pageToken?: string | undefined;
        };
        output: {
            emails: {
                id: string;
                date: string;
                threadId: string;
                to: {
                    email: string;
                    name?: string | null | undefined;
                }[];
                isUnread: boolean;
                labelIds: string[];
                hasAttachments: boolean;
                subject?: string | null | undefined;
                from?: {
                    email: string;
                    name?: string | null | undefined;
                } | null | undefined;
                snippet?: string | null | undefined;
            }[];
            nextPageToken: string | null;
            resultSizeEstimate: number | null | undefined;
        };
        meta: object;
    }>;
    /**
     * Get a single email by ID with full content.
     */
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            cc: {
                email: string;
                name?: string | null | undefined;
            }[];
            id: string;
            date: string;
            attachments: {
                attachmentId: string;
                filename: string;
                mimeType: string;
                size: number;
            }[];
            threadId: string;
            to: {
                email: string;
                name? /**
                 * Check Gmail configuration and authentication status.
                 */: string | null | undefined;
            }[];
            isUnread: boolean;
            labelIds: string[];
            hasAttachments: boolean;
            bcc: {
                email: string;
                name?: string | null | undefined;
            }[];
            subject?: string | null | undefined;
            from?: {
                email: string;
                name?: string | null | undefined;
            } | null | undefined;
            snippet?: string | null | undefined;
            replyTo?: {
                email: string;
                name?: string | null | undefined;
            } | null | undefined;
            bodyText?: string | null | undefined;
            bodyHtml?: string | null | undefined;
            headers?: Record<string, string> | undefined;
        };
        meta: object;
    }>;
    /**
     * Get all messages in a thread.
     */
    getThread: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            messages: {
                cc: {
                    email: string;
                    name?: string | null | undefined;
                }[];
                id: string;
                date: string;
                attachments: {
                    attachmentId: string;
                    filename: string;
                    mimeType: string;
                    size: number;
                }[];
                threadId: string;
                to: {
                    email: string;
                    name?: string | null | undefined;
                }[];
                isUnread: boolean;
                labelIds: string[];
                hasAttachments: boolean;
                bcc: {
                    email: string;
                    name?: string | null | undefined;
                }[];
                subject?: string | null | undefined;
                from?: {
                    email: string;
                    name?: string | null | undefined;
                } | null | undefined;
                snippet?: string | null | undefined;
                replyTo?: {
                    email: string;
                    name?: string | null | undefined;
                } | null | undefined;
                bodyText?: string | null | undefined;
                bodyHtml?: string | null | undefined;
                headers?: Record<string, string> | undefined;
            }[];
            snippet?: string | null | undefined;
            historyId?: string | undefined;
        };
        meta: object;
    }>;
    /**
     * List available labels.
     */
    labels: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            labels: {
                type: "system" | "user";
                id: string;
                name: string;
                messagesTotal?: number | undefined;
                messagesUnread?: number | undefined;
                threadsTotal?: number | undefined;
                threadsUnread?: number | undefined;
            }[];
        };
        meta: object;
    }>;
    /**
     * Mark an email as read.
     */
    markAsRead: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            markedAsRead: boolean;
        };
        meta: object;
    }>;
    /**
     * Mark an email as unread.
     */
    markAsUnread: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            markedAsUnread: boolean;
        };
        meta: object;
    }>;
    /**
     * Archive an email (remove from INBOX).
     */
    archive: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            archived: boolean;
        };
        meta: object;
    }>;
    /**
     * Move an email to trash.
     */
    trash: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            trashed: boolean;
        };
        meta: object;
    }>;
    /**
     * Untrash an email.
     */
    untrash: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            id: string;
        };
        output: {
            id: string;
            untrashed: boolean;
        };
        meta: object;
    }>;
    /**
     * Search contacts by name or email.
     * Requires re-authentication with contacts scope.
     */
    contactsSearch: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            query: string;
            maxResults?: number | undefined;
        };
        output: {
            contacts: {
                emails: string[];
                resourceName: string;
                phones: string[];
                name?: string | null | undefined;
                organization?: string | null | undefined;
                jobTitle?: string | null | undefined;
            }[];
            totalPeople: number;
        };
        meta: object;
    }>;
    /**
     * List recent/frequent contacts.
     */
    contactsList: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            maxResults?: number | undefined;
        };
        output: {
            contacts: {
                emails: string[];
                resourceName: string;
                phones: string[];
                name?: string | null | undefined;
                organization?: string | null | undefined;
                jobTitle?: string | null | undefined;
            }[];
            totalPeople: number;
        };
        meta: object;
    }>;
}>>;
export type GmailRouter = typeof gmailRouter;
