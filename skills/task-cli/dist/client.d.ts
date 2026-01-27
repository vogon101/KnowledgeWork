/**
 * tRPC Client for CLI
 *
 * Creates a standalone tRPC client for command-line use.
 */
import type { AppRouter } from '../lib/server/trpc/index.js';
export declare const trpc: import("@trpc/client").TRPCClient<import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    files: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        tree: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                path?: string | undefined;
                includeHidden?: boolean | undefined;
                depth?: number | undefined;
            };
            output: {
                path: string;
                nodes: import("@kw/api-types").TreeNode[];
            };
            meta: object;
        }>;
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
    gmail: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
            };
            meta: object;
        }>;
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
    items: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                status?: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused" | ("pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused")[] | undefined;
                parentId?: number | undefined;
                itemType?: "task" | "workstream" | "goal" | "routine" | ("task" | "workstream" | "goal" | "routine")[] | undefined;
                targetPeriod?: string | undefined;
                ownerId?: number | undefined;
                projectId?: number | undefined;
                sourceMeetingId?: number | undefined;
                ownerName?: string | undefined;
                projectSlug?: string | undefined;
                limit?: number | undefined;
                offset?: number | undefined;
                includeCompleted?: boolean | undefined;
                orgSlug?: string | undefined;
                hasDueDate?: boolean | undefined;
                dueBefore?: string | undefined;
                dueAfter?: string | undefined;
                search?: string | undefined;
            };
            output: {
                items: {
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
                total: number;
                limit: number;
                offset: number;
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string | number;
                activitiesLimit?: number | undefined;
                childrenLimit?: number | undefined;
            };
            output: {
                updates: {
                    id: number;
                    task_id: number;
                    note: string;
                    update_type: string;
                    old_status: string | null;
                    new_status: string | null;
                    created_at: string;
                }[];
                attachments: {
                    id: number;
                    itemId: number;
                    path: string;
                    label: string | null;
                    attachmentType: string | null;
                    createdAt: string;
                }[];
                people: {
                    id: number;
                    itemId: number;
                    personId: number;
                    role: string;
                    personName: string;
                    createdAt: string;
                }[];
                subtasks: {
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
                checkIns: {
                    id: number;
                    itemId: number;
                    date: string;
                    note: string | null;
                    completed: boolean;
                    createdAt: string;
                }[];
                blockers: {
                    id: number;
                    displayId: string;
                    title: string;
                    status: string;
                    linkId: number;
                }[];
                blocking: {
                    id: number;
                    displayId: string;
                    title: string;
                    status: string;
                    linkId: number;
                }[];
                _counts: {
                    totalActivities: number;
                    totalSubtasks: number;
                    hasMoreActivities: boolean;
                    hasMoreSubtasks: boolean;
                };
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                status?: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused" | undefined;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                itemType?: "task" | "workstream" | "goal" | "routine" | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
            };
            output: {
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string | number;
                data: {
                    status?: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused" | undefined;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    title?: string | undefined;
                    itemType?: "task" | "workstream" | "goal" | "routine" | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                };
            };
            output: {
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            };
            meta: object;
        }>;
        complete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string | number;
                note?: string | undefined;
            };
            output: {
                previousStatus: string;
                markdownSync: {
                    synced: boolean;
                    sourceType: string | null;
                    message: string;
                };
                unblockedTasks: {
                    id: number;
                    displayId: string;
                    title: string;
                }[];
                clearedCheckIns: number;
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string | number;
            };
            output: {
                deleted: boolean;
                id: number;
                displayId: string;
            };
            meta: object;
        }>;
        restore: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string | number;
            };
            output: {
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
                checkinBy?: string | null | undefined;
                checkinId?: number | null | undefined;
                restored: boolean;
            };
            meta: object;
        }>;
        addNote: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string | number;
                note: string;
                updateType?: string | undefined;
            };
            output: {
                id: number;
                itemId: number;
                displayId: string;
                note: string | null;
                updateType: string;
                createdAt: string;
            };
            meta: object;
        }>;
        completeCheckin: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: string | number;
                checkinId?: number | undefined;
                clear?: boolean | undefined;
            };
            output: {
                itemId: number;
                displayId: string;
                completed: boolean;
            };
            meta: object;
        }>;
        checkins: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                includeFuture?: boolean | undefined;
            };
            output: {
                checkinId: number;
                checkinBy: string;
                checkinNote: string | null;
                isCheckin: true;
                status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                id: number;
                createdAt: string;
                updatedAt: string;
                title: string;
                displayId: string;
                itemType: "task" | "workstream" | "goal" | "routine";
                projectIsGeneral: boolean;
                subtaskCount: number;
                subtasksComplete: number;
                priority?: number | null | undefined;
                parentId?: number | null | undefined;
                description?: string | null | undefined;
                dueDate?: string | null | undefined;
                targetPeriod?: string | null | undefined;
                ownerId?: number | null | undefined;
                projectId?: number | null | undefined;
                sourceMeetingId?: number | null | undefined;
                sourceType?: string | null | undefined;
                sourcePath?: string | null | undefined;
                filePath?: string | null | undefined;
                fileHash?: string | null | undefined;
                routineParentId?: number | null | undefined;
                metadata?: Record<string, unknown> | null | undefined;
                completedAt?: string | null | undefined;
                deletedAt?: string | null | undefined;
                ownerName?: string | null | undefined;
                projectSlug?: string | null | undefined;
                projectName?: string | null | undefined;
                projectOrg?: string | null | undefined;
                projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                projectOrgShortName?: string | null | undefined;
                projectParentSlug?: string | null | undefined;
                projectFullPath?: string | null | undefined;
                sourceMeetingTitle?: string | null | undefined;
                sourceMeetingPath?: string | null | undefined;
            }[];
            meta: object;
        }>;
        getBlockers: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string | number;
            };
            output: {
                itemId: number;
                displayId: string;
                blockers: {
                    id: number;
                    displayId: string;
                    title: string;
                    status: string;
                    linkId: number;
                }[];
                count: number;
            };
            meta: object;
        }>;
        getBlocking: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string | number;
            };
            output: {
                itemId: number;
                displayId: string;
                blocking: {
                    id: number;
                    displayId: string;
                    title: string;
                    status: string;
                    linkId: number;
                }[];
                count: number;
            };
            meta: object;
        }>;
        addBlocker: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: string | number;
                blockerId: string | number;
            };
            output: {
                linkId: number;
                itemId: number;
                itemDisplayId: string;
                blockerId: number;
                blockerDisplayId: string;
                blockerTitle: string;
            };
            meta: object;
        }>;
        removeBlocker: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: string | number;
                blockerId: string | number;
            };
            output: {
                deleted: boolean;
                itemId: number;
                itemDisplayId: string;
                blockerId: number;
                blockerDisplayId: string;
            };
            meta: object;
        }>;
        addLink: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                fromId: string | number;
                toId: string | number;
                linkType: "blocks" | "related" | "duplicate";
            };
            output: {
                id: number;
                fromId: number;
                fromDisplayId: string;
                fromTitle: string;
                toId: number;
                toDisplayId: string;
                toTitle: string;
                linkType: string;
            };
            meta: object;
        }>;
        removeLink: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                fromId: string | number;
                toId: string | number;
                linkType: "blocks" | "related" | "duplicate";
            };
            output: {
                deleted: boolean;
                fromId: number;
                fromDisplayId: string;
                toId: number;
                toDisplayId: string;
                linkType: "blocks" | "related" | "duplicate";
            };
            meta: object;
        }>;
        getLinks: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string | number;
            };
            output: {
                itemId: number;
                displayId: string;
                outgoing: {
                    id: number;
                    linkType: string;
                    targetId: number;
                    targetDisplayId: string;
                    targetTitle: string;
                    targetStatus: string;
                }[];
                incoming: {
                    id: number;
                    linkType: string;
                    sourceId: number;
                    sourceDisplayId: string;
                    sourceTitle: string;
                    sourceStatus: string;
                }[];
            };
            meta: object;
        }>;
        addPerson: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: string | number;
                role: "assignee" | "waiting_on" | "stakeholder" | "reviewer" | "cc";
                personId?: number | undefined;
                personName?: string | undefined;
            };
            output: {
                id: number;
                itemId: number;
                itemDisplayId: string;
                personId: number;
                personName: string;
                role: string;
            };
            meta: object;
        }>;
        removePerson: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: string | number;
                role: "assignee" | "waiting_on" | "stakeholder" | "reviewer" | "cc";
                personId?: number | undefined;
                personName?: string | undefined;
            };
            output: {
                deleted: boolean;
                itemId: number;
                itemDisplayId: string;
                personId: number;
                role: "assignee" | "waiting_on" | "stakeholder" | "reviewer" | "cc";
            };
            meta: object;
        }>;
        getPeople: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string | number;
            };
            output: {
                itemId: number;
                displayId: string;
                people: {
                    id: number;
                    personId: number;
                    personName: string;
                    personEmail: string | null;
                    personOrg: string | null;
                    role: string;
                    createdAt: string;
                }[];
            };
            meta: object;
        }>;
        addCheckin: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: string | number;
                date: string;
                note?: string | undefined;
            };
            output: {
                id: number;
                itemId: number;
                itemDisplayId: string;
                itemTitle: string;
                date: string;
                note: string | null;
                completed: boolean;
            };
            meta: object;
        }>;
        listCheckins: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                itemId: string | number;
                includeCompleted?: boolean | undefined;
            };
            output: {
                itemId: number;
                displayId: string;
                checkins: {
                    id: number;
                    date: string;
                    note: string | null;
                    completed: boolean;
                    createdAt: string;
                }[];
            };
            meta: object;
        }>;
        updateCheckin: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
                date?: string | undefined;
                note?: string | undefined;
                completed?: boolean | undefined;
            };
            output: {
                id: number;
                itemId: number;
                itemDisplayId: string;
                itemTitle: string;
                date: string;
                note: string | null;
                completed: boolean;
            };
            meta: object;
        }>;
        rescheduleCheckin: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: string | number;
                newDate: string;
                clearCompleted?: boolean | undefined;
            };
            output: {
                id: number;
                itemId: number;
                itemDisplayId: string;
                itemTitle: string;
                date: string;
                clearedPrevious: number;
            };
            meta: object;
        }>;
        deleteCheckin: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
            };
            output: {
                deleted: boolean;
                id: number;
            };
            meta: object;
        }>;
        addTag: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: string | number;
                tagId?: number | undefined;
                tagName?: string | undefined;
            };
            output: {
                itemId: number;
                itemDisplayId: string;
                itemTitle: string;
                tagId: number;
                tagName: string;
                tagColor: string | null;
            };
            meta: object;
        }>;
        removeTag: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: string | number;
                tagId?: number | undefined;
                tagName?: string | undefined;
            };
            output: {
                deleted: boolean;
                itemId: number;
                itemDisplayId: string;
                tagId: number;
            };
            meta: object;
        }>;
        getTags: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: string | number;
            };
            output: {
                itemId: number;
                displayId: string;
                tags: {
                    id: number;
                    name: string;
                    color: string | null;
                    description: string | null;
                }[];
            };
            meta: object;
        }>;
    }>>;
    organizations: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                slug: string;
            };
            output: {
                deleted: boolean;
            };
            meta: object;
        }>;
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
    people: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    projects: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    query: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        today: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                ownerName?: string | undefined;
            } | undefined;
            output: {
                date: string;
                items: {
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
                count: number;
            };
            meta: object;
        }>;
        overdue: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                ownerName?: string | undefined;
            } | undefined;
            output: {
                items: {
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
                count: number;
            };
            meta: object;
        }>;
        waiting: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                total: number;
                byPerson: {
                    person: {
                        id: number;
                        name: string;
                    };
                    items: import("@kw/api-types").ItemWithRelations[];
                }[];
            };
            meta: object;
        }>;
        search: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                query: string;
                limit?: number | undefined;
                includeCompleted?: boolean | undefined;
            };
            output: {
                query: string;
                items: {
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
                count: number;
            };
            meta: object;
        }>;
        highPriority: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                ownerName?: string | undefined;
            } | undefined;
            output: {
                items: {
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
                count: number;
            };
            meta: object;
        }>;
        dashboard: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                ownerName?: string | undefined;
            } | undefined;
            output: {
                total: number;
                overdue: number;
                dueToday: number;
                highPriority: number;
                blocked: number;
            };
            meta: object;
        }>;
        activityFeed: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
                offset?: number | undefined;
            } | undefined;
            output: {
                activities: {
                    id: number;
                    action: string;
                    detail: string | null;
                    oldValue: string | null;
                    newValue: string | null;
                    createdAt: string;
                    createdBy: string | null;
                    item: {
                        id: number;
                        displayId: string;
                        title: string;
                        status: string;
                        projectSlug: string | null;
                        projectName: string | null;
                        projectOrg: string | null;
                    };
                }[];
                count: number;
            };
            meta: object;
        }>;
        upcoming: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                ownerName?: string | undefined;
                days?: number | undefined;
            } | undefined;
            output: {
                startDate: string;
                endDate: string;
                days: number;
                grouped: {
                    date: string;
                    items: {
                        status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                        id: number;
                        createdAt: string;
                        updatedAt: string;
                        title: string;
                        displayId: string;
                        itemType: "task" | "workstream" | "goal" | "routine";
                        projectIsGeneral: boolean;
                        subtaskCount: number;
                        subtasksComplete: number;
                        priority?: number | null | undefined;
                        parentId?: number | null | undefined;
                        description?: string | null | undefined;
                        dueDate?: string | null | undefined;
                        targetPeriod?: string | null | undefined;
                        ownerId?: number | null | undefined;
                        projectId?: number | null | undefined;
                        sourceMeetingId?: number | null | undefined;
                        sourceType?: string | null | undefined;
                        sourcePath?: string | null | undefined;
                        filePath?: string | null | undefined;
                        fileHash?: string | null | undefined;
                        routineParentId?: number | null | undefined;
                        metadata?: Record<string, unknown> | null | undefined;
                        completedAt?: string | null | undefined;
                        deletedAt?: string | null | undefined;
                        ownerName?: string | null | undefined;
                        projectSlug?: string | null | undefined;
                        projectName?: string | null | undefined;
                        projectOrg?: string | null | undefined;
                        projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                        projectOrgShortName?: string | null | undefined;
                        projectParentSlug?: string | null | undefined;
                        projectFullPath?: string | null | undefined;
                        sourceMeetingTitle?: string | null | undefined;
                        sourceMeetingPath?: string | null | undefined;
                        checkinBy?: string | null | undefined;
                        checkinId?: number | null | undefined;
                    }[];
                }[];
                total: number;
            };
            meta: object;
        }>;
        blocked: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            } | undefined;
            output: {
                items: {
                    blockers: {
                        id: number;
                        displayId: string;
                        title: string;
                        status: string;
                    }[];
                    blockerCount: number;
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
                count: number;
            };
            meta: object;
        }>;
        inProgress: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                limit?: number | undefined;
            } | undefined;
            output: {
                items: {
                    status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred" | "active" | "paused";
                    id: number;
                    createdAt: string;
                    updatedAt: string;
                    title: string;
                    displayId: string;
                    itemType: "task" | "workstream" | "goal" | "routine";
                    projectIsGeneral: boolean;
                    subtaskCount: number;
                    subtasksComplete: number;
                    priority?: number | null | undefined;
                    parentId?: number | null | undefined;
                    description?: string | null | undefined;
                    dueDate?: string | null | undefined;
                    targetPeriod?: string | null | undefined;
                    ownerId?: number | null | undefined;
                    projectId?: number | null | undefined;
                    sourceMeetingId?: number | null | undefined;
                    sourceType?: string | null | undefined;
                    sourcePath?: string | null | undefined;
                    filePath?: string | null | undefined;
                    fileHash?: string | null | undefined;
                    routineParentId?: number | null | undefined;
                    metadata?: Record<string, unknown> | null | undefined;
                    completedAt?: string | null | undefined;
                    deletedAt?: string | null | undefined;
                    ownerName?: string | null | undefined;
                    projectSlug?: string | null | undefined;
                    projectName?: string | null | undefined;
                    projectOrg?: string | null | undefined;
                    projectOrgColor?: "indigo" | "teal" | "rose" | "orange" | null | undefined;
                    projectOrgShortName?: string | null | undefined;
                    projectParentSlug?: string | null | undefined;
                    projectFullPath?: string | null | undefined;
                    sourceMeetingTitle?: string | null | undefined;
                    sourceMeetingPath?: string | null | undefined;
                    checkinBy?: string | null | undefined;
                    checkinId?: number | null | undefined;
                }[];
                count: number;
            };
            meta: object;
        }>;
    }>>;
    routines: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                routines: {
                    id: number;
                    title: string;
                    description: string | null;
                    priority: number | null;
                    ownerId: number | null;
                    ownerName: string | null;
                    projectId: number | null;
                    projectSlug: string | null;
                    projectName: string | null;
                    projectOrg: string | null;
                    projectFullPath: string | null;
                    recurrenceRule: string;
                    recurrenceTime: string | null;
                    recurrenceDays: string | null;
                    recurrenceMonths: string | null;
                    isDueToday: boolean | undefined;
                    completedToday: boolean | undefined;
                    lastCompleted: string | null;
                    completionCount: number;
                }[];
                count: number;
            };
            meta: object;
        }>;
        due: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                date?: string | undefined;
            } | undefined;
            output: {
                date: string;
                total: number;
                pendingCount: number;
                completedCount: number;
                pending: {
                    id: number;
                    title: string;
                    description: string | null;
                    priority: number | null;
                    ownerId: number | null;
                    ownerName: string | null;
                    projectId: number | null;
                    projectSlug: string | null;
                    projectName: string | null;
                    projectOrg: string | null;
                    projectFullPath: string | null;
                    recurrenceRule: string;
                    recurrenceTime: string | null;
                    recurrenceDays: string | null;
                    recurrenceMonths: string | null;
                    isDueToday: boolean | undefined;
                    completedToday: boolean | undefined;
                    lastCompleted: string | null;
                    completionCount: number;
                }[];
                completed: {
                    id: number;
                    title: string;
                    description: string | null;
                    priority: number | null;
                    ownerId: number | null;
                    ownerName: string | null;
                    projectId: number | null;
                    projectSlug: string | null;
                    projectName: string | null;
                    projectOrg: string | null;
                    projectFullPath: string | null;
                    recurrenceRule: string;
                    recurrenceTime: string | null;
                    recurrenceDays: string | null;
                    recurrenceMonths: string | null;
                    isDueToday: boolean | undefined;
                    completedToday: boolean | undefined;
                    lastCompleted: string | null;
                    completionCount: number;
                }[];
            };
            meta: object;
        }>;
        overdue: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                totalOverdue: number;
                totalMissedInstances: number;
                routines: {
                    id: number;
                    title: string;
                    recurrenceRule: string;
                    projectName: string | null;
                    overdueDates: string[];
                    daysOverdue: number;
                }[];
            };
            meta: object;
        }>;
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                id: number;
            };
            output: {
                id: number;
                title: string;
                description: string | null;
                priority: number | null;
                ownerId: number | null;
                ownerName: string | null;
                projectId: number | null;
                projectSlug: string | null;
                projectName: string | null;
                projectOrg: string | null;
                projectFullPath: string | null;
                recurrenceRule: string | null;
                recurrenceTime: string | null;
                recurrenceDays: string | null;
                recurrenceMonths: string | null;
                createdAt: string;
                updatedAt: string;
                history: {
                    id: number;
                    completed_date: string;
                    notes: string | null;
                    completed_at: string;
                }[];
            };
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                recurrenceRule: "custom" | "daily" | "weekly" | "monthly" | "bimonthly" | "yearly";
                description?: string | undefined;
                priority?: number | undefined;
                projectId?: number | undefined;
                ownerId?: number | undefined;
                recurrenceTime?: string | undefined;
                recurrenceDays?: (string | number)[] | undefined;
                recurrenceMonths?: number[] | undefined;
            };
            output: {
                id: number;
                title: string;
                recurrenceRule: string | null;
            };
            meta: object;
        }>;
        update: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
                data: {
                    description?: string | null | undefined;
                    priority?: number | null | undefined;
                    title?: string | undefined;
                    projectId?: number | null | undefined;
                    ownerId?: number | null | undefined;
                    recurrenceRule?: "custom" | "daily" | "weekly" | "monthly" | "bimonthly" | "yearly" | undefined;
                    recurrenceTime?: string | null | undefined;
                    recurrenceDays?: (string | number)[] | null | undefined;
                    recurrenceMonths?: number[] | null | undefined;
                };
            };
            output: {
                id: number;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
            };
            output: {
                deleted: boolean;
            };
            meta: object;
        }>;
        complete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
                notes?: string | undefined;
                date?: string | undefined;
            };
            output: {
                routineId: number;
                completionId: number | undefined;
                date: string;
                alreadyCompleted: boolean;
                diarySync: {
                    synced: boolean;
                    diaryPath: string;
                };
            };
            meta: object;
        }>;
        uncomplete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
                date?: string | undefined;
            };
            output: {
                routineId: number;
                date: string;
                wasCompleted: boolean;
            };
            meta: object;
        }>;
        skip: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
                notes?: string | undefined;
                date?: string | undefined;
            };
            output: {
                routineId: number;
                skipId: number | undefined;
                date: string;
                alreadySkipped: boolean;
            };
            meta: object;
        }>;
        unskip: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
                date?: string | undefined;
            };
            output: {
                routineId: number;
                date: string;
                wasSkipped: boolean;
            };
            meta: object;
        }>;
        skipAllOverdue: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
            };
            output: {
                routineId: number;
                skippedCount: number;
                datesSkipped: string[];
                nextDue: string;
            };
            meta: object;
        }>;
        completeAllOverdue: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
            };
            output: {
                routineId: number;
                completedCount: number;
                datesCompleted: string[];
                nextDue: string;
            };
            meta: object;
        }>;
    }>>;
    sync: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        allPreview: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                meetings: {
                    count: number;
                    withTasks: number;
                };
                workstreams: {
                    count: number;
                };
            };
            meta: object;
        }>;
        all: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                meetings: {
                    tasksCreated: number;
                    tasksUpdated: number;
                };
                projects: {
                    projectsCreated: number;
                    projectsUpdated: number;
                };
                filesystem: {
                    synced: number;
                    created: number;
                    updated: number;
                    skipped: number;
                    conflicts: number;
                    errors: number;
                };
            };
            meta: object;
        }>;
        meetingPreview: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                path: string;
            };
            output: {
                path: string;
                title: string;
                date: string;
                attendees: string[];
                projects: string[];
                primaryProject: string | undefined;
                actionsCount: number;
                actions: {
                    owner: string;
                    action: string;
                    project: string | undefined;
                    due: string | undefined;
                    status: string;
                    existingTaskId: number | null;
                    existingTaskStatus: string | null;
                    wouldCreate: boolean;
                    wouldSkip: boolean;
                    isDeleted: boolean;
                }[];
                wouldCreate: number;
                wouldSkip: number;
                isSynced: boolean;
            };
            meta: object;
        }>;
        meeting: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                path: string;
                dryRun?: boolean | undefined;
            };
            output: {
                dryRun: boolean;
                meetingPath: string;
                meetingTitle: string;
                actionsFound: number;
                tasksCreated: number;
                tasksUpdated: number;
                tasksSkipped: number;
                errors: string[];
                taskIds: number[];
            };
            meta: object;
        }>;
        filesystemPreview: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                total: number;
                byProject: {
                    project: string;
                    count: number;
                    workstreams: {
                        file: string;
                        title: string;
                        status: string;
                        type: "workstream" | "sub-project";
                        priority: number | undefined;
                    }[];
                }[];
            };
            meta: object;
        }>;
        filesystem: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                synced: number;
                created: number;
                updated: number;
                skipped: number;
                conflictsCount: number;
                errorsCount: number;
                conflicts: import("../lib/server/services/file-sync.js").ConflictInfo[];
                errors: string[];
            };
            meta: object;
        }>;
        file: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                path: string;
                force?: boolean | undefined;
            };
            output: {
                action: string;
                itemId: number | undefined;
                error: string | undefined;
                conflict?: undefined;
            } | {
                action: "skipped" | "created" | "updated" | "conflict";
                itemId: number | undefined;
                error: string | undefined;
                conflict: import("../lib/server/services/hash-utils.js").ConflictStatus | undefined;
            };
            meta: object;
        }>;
        itemToFile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                id: number;
                force?: boolean | undefined;
            };
            output: {
                success: boolean;
                filePath: string;
                error: string | undefined;
                hadConflict: boolean | undefined;
            };
            meta: object;
        }>;
        conflicts: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                total: number;
                conflicts: import("../lib/server/services/file-sync.js").ConflictInfo[];
            };
            meta: object;
        }>;
        resolveConflict: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                itemId: number;
                winner: "file" | "database";
            };
            output: {
                resolved: boolean;
                winner: string;
                error: string | undefined;
            };
            meta: object;
        }>;
    }>>;
    tags: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
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
    timecard: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("../lib/server/trpc/trpc.js").TRPCContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                client?: string | undefined;
                limit?: number | undefined;
                startDate?: string | undefined;
                endDate?: string | undefined;
            } | undefined;
            output: {
                entries: import("../lib/server/trpc/routers/timecard.js").TimecardEntry[];
            };
            meta: object;
        }>;
        summary: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                startDate?: string | undefined;
                endDate?: string | undefined;
            } | undefined;
            output: {
                totalHours: number;
                entryCount: number;
                clients: string[];
                clientSummaries: import("../lib/server/trpc/routers/timecard.js").ClientSummary[];
                monthlySummaries: import("../lib/server/trpc/routers/timecard.js").MonthSummary[];
            };
            meta: object;
        }>;
    }>>;
}>>>;
export type { AppRouter };
export { formatTaskId, parseTaskId } from '@kw/api-types';
