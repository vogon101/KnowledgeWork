/**
 * Items Router (tRPC)
 *
 * Type-safe API for item (task) operations.
 * Replaces the REST endpoints in tasks-prisma.ts
 */
export declare const itemsRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("../trpc.js").TRPCContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * List items with filters
     */
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
    /**
     * Get a single item by ID
     */
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
    /**
     * Create a new item
     */
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
    /**
     * Update an item
     */
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
    /**
     * Complete an item (mark status as complete)
     */
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
    /**
     * Delete an item (soft delete)
     */
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
    /**
     * Restore a soft-deleted item
     */
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
    /**
     * Add a note (activity) to an item
     */
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
    /**
     * Complete a check-in for an item
     */
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
    /**
     * Get items with check-ins due
     */
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
    /**
     * Get all items blocking a specific item (items that must complete first)
     */
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
    /**
     * Get all items blocked by a specific item (items waiting for this one)
     */
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
    /**
     * Add a blocker to an item (create "blocks" link)
     */
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
    /**
     * Remove a blocker from an item (delete "blocks" link)
     */
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
    /**
     * Add a link between two items
     */
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
    /**
     * Remove a link between two items
     */
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
    /**
     * Get all links for an item
     */
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
    /**
     * Add a person with a role to an item
     */
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
    /**
     * Remove a person role from an item
     */
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
    /**
     * Get all people associated with an item
     */
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
    /**
     * Add a check-in date to an item
     */
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
    /**
     * List check-ins for an item
     */
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
    /**
     * Update a check-in (reschedule)
     */
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
    /**
     * Reschedule check-in(s) for an item - completes existing and creates new
     */
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
    /**
     * Delete a check-in
     */
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
    /**
     * Add a tag to an item
     */
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
    /**
     * Remove a tag from an item
     */
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
    /**
     * Get all tags for an item
     */
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
export type ItemsRouter = typeof itemsRouter;
