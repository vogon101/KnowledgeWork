/**
 * Items Router (tRPC)
 *
 * Type-safe API for item (task) operations.
 * Replaces the REST endpoints in tasks-prisma.ts
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import {
  ItemQuerySchema,
  CreateItemSchema,
  UpdateItemSchema,
  formatTaskId,
  type ItemWithRelations,
} from '@kw/api-types';
import { syncTaskToSource } from '../../services/markdown-sync.js';
import { logTaskActivity } from '../../services/diary-sync.js';
import { getKnowledgeBasePath } from '../../services/paths.js';
import type { Activity, ItemAttachment, ItemPerson, CheckIn, Prisma } from '../../generated/prisma/index.js';
import { itemIdSchema, resolveItemId } from '../utils/id-parser.js';
import { emit } from '../../events.js';

// =============================================================================
// HELPER: Format Prisma item to API response
// =============================================================================

function formatItem(item: {
  id: number;
  title: string;
  description: string | null;
  itemType: string;
  status: string;
  priority: number | null;
  dueDate: Date | null;
  targetPeriod: string | null;
  projectId: number | null;
  ownerId: number | null;
  parentId: number | null;
  sourceType: string | null;
  sourcePath: string | null;
  sourceMeetingId: number | null;
  filePath?: string | null;
  fileHash?: string | null;
  routineParentId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  deletedAt: Date | null;
  project?: {
    slug: string;
    name: string;
    isGeneral: boolean;
    parent?: { slug: string } | null;
    organization: { slug: string; shortName: string | null; color: string | null } | null;
  } | null;
  owner?: { id: number; name: string } | null;
  sourceMeeting?: { title: string; path: string } | null;
  _count?: { children: number };
  children?: Array<{ status: string }>;
  checkIns?: Array<{ id: number; date: Date; completed: boolean }>;
}): ItemWithRelations {
  return {
    id: item.id,
    displayId: formatTaskId(item.id),
    title: item.title,
    description: item.description,
    itemType: item.itemType as 'task' | 'routine',
    status: item.status as ItemWithRelations['status'],
    priority: item.priority,
    dueDate: item.dueDate?.toISOString().split('T')[0] || null,
    targetPeriod: item.targetPeriod,
    projectId: item.projectId,
    ownerId: item.ownerId,
    parentId: item.parentId,
    sourceType: item.sourceType,
    sourcePath: item.sourcePath,
    sourceMeetingId: item.sourceMeetingId,
    filePath: item.filePath || null,
    fileHash: item.fileHash || null,
    routineParentId: item.routineParentId || null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    completedAt: item.completedAt?.toISOString() || null,
    deletedAt: item.deletedAt?.toISOString() || null,
    // Relations - always use organization relation, not legacy org column
    ownerName: item.owner?.name || null,
    projectSlug: item.project?.slug || null,
    projectName: item.project?.name || null,
    projectOrg: item.project?.organization?.slug || null,
    projectOrgColor: (item.project?.organization?.color as 'indigo' | 'teal' | 'rose' | 'orange') || null,
    projectOrgShortName: item.project?.organization?.shortName || null,
    projectParentSlug: item.project?.parent?.slug || null,
    projectFullPath: item.project?.parent?.slug
      ? `${item.project.parent.slug}/${item.project.slug}`
      : item.project?.slug || null,
    projectIsGeneral: item.project?.isGeneral || false,
    sourceMeetingTitle: item.sourceMeeting?.title || null,
    sourceMeetingPath: item.sourceMeeting?.path || null,
    subtaskCount: item._count?.children || 0,
    subtasksComplete: item.children?.filter(c => c.status === 'complete').length || 0,
    // First pending check-in (from itemIncludes)
    checkinBy: item.checkIns?.[0]?.date
      ? item.checkIns[0].date.toISOString().split('T')[0]
      : null,
    checkinId: item.checkIns?.[0]?.id || null,
  };
}

// Standard includes for item queries
const itemIncludes = {
  project: {
    select: {
      slug: true,
      name: true,
      isGeneral: true,
      // Always use organization relation, not legacy org column
      parent: { select: { slug: true } },
      organization: { select: { slug: true, shortName: true, color: true } },
    },
  },
  owner: { select: { id: true, name: true } },
  sourceMeeting: { select: { title: true, path: true } },
  checkIns: {
    where: { completed: false },
    orderBy: { date: 'asc' as const },
    take: 1,
  },
  _count: { select: { children: true } },
};

// =============================================================================
// ROUTER
// =============================================================================

export const itemsRouter = router({
  /**
   * List items with filters
   */
  list: publicProcedure
    .input(ItemQuerySchema)
    .query(async ({ ctx, input }) => {
      const {
        status,
        ownerId,
        ownerName,
        projectId,
        projectSlug,
        orgSlug,
        parentId,
        sourceMeetingId,
        itemType,
        dueBefore,
        dueAfter,
        targetPeriod,
        search,
        includeCompleted,
        limit = 100,
        offset = 0,
      } = input;

      // Build where clause
      const where: Prisma.ItemWhereInput = {
        deletedAt: null,
      };

      // Status filter
      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        where.status = { in: statuses };
      } else if (!includeCompleted) {
        where.status = { notIn: ['complete', 'cancelled'] };
      }

      // Item type filter
      if (itemType) {
        const types = Array.isArray(itemType) ? itemType : [itemType];
        where.itemType = { in: types };
      }

      // Owner filters
      if (ownerId) where.ownerId = ownerId;
      if (ownerName) where.owner = { name: { contains: ownerName } };

      // Project filters - use organization relation, not legacy org column
      if (projectId) where.projectId = projectId;
      if (projectSlug) where.project = { slug: projectSlug };
      if (orgSlug) where.project = { ...where.project as object, organization: { slug: orgSlug } };

      // Relationship filters
      if (parentId) where.parentId = parentId;
      if (sourceMeetingId) where.sourceMeetingId = sourceMeetingId;

      // Date filters
      if (dueBefore || dueAfter) {
        where.dueDate = {
          ...(dueBefore ? { lte: new Date(dueBefore) } : {}),
          ...(dueAfter ? { gte: new Date(dueAfter) } : {}),
        };
      }
      if (targetPeriod) where.targetPeriod = targetPeriod;

      // Text search
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.prisma.item.findMany({
          where,
          include: itemIncludes,
          orderBy: [
            { priority: { sort: 'asc', nulls: 'last' } },
            { dueDate: { sort: 'asc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
          take: limit,
          skip: offset,
        }),
        ctx.prisma.item.count({ where }),
      ]);

      return {
        items: items.map(formatItem),
        total,
        limit,
        offset,
      };
    }),

  /**
   * Get a single item by ID
   */
  get: publicProcedure
    .input(z.object({
      id: z.union([z.number(), z.string()]),
      // Pagination for nested data
      activitiesLimit: z.number().optional().default(50),
      childrenLimit: z.number().optional().default(100),
    }))
    .query(async ({ ctx, input }) => {
      const id = resolveItemId(input.id);

      const item = await ctx.prisma.item.findUnique({
        where: { id },
        include: {
          ...itemIncludes,
          activities: {
            orderBy: { createdAt: 'desc' },
            take: input.activitiesLimit,
          },
          attachments: true,
          itemPeople: {
            include: { person: { select: { id: true, name: true } } },
          },
          children: {
            include: itemIncludes,
            take: input.childrenLimit,
          },
          checkIns: { orderBy: { date: 'asc' } },
          // Include blockers (items blocking this one) via ItemLink
          linksTo: {
            where: { linkType: 'blocks' },
            include: {
              from: { select: { id: true, title: true, status: true } },
            },
          },
          // Include items this one is blocking via ItemLink
          linksFrom: {
            where: { linkType: 'blocks' },
            include: {
              to: { select: { id: true, title: true, status: true } },
            },
          },
          _count: {
            select: {
              activities: true,
              children: true,
            },
          },
        },
      });

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Item ${formatTaskId(id)} not found`,
        });
      }

      return {
        ...formatItem(item),
        updates: item.activities.map((a: Activity) => ({
          id: a.id,
          task_id: a.itemId,
          note: a.detail || '',
          update_type: a.action,
          old_status: a.oldValue,
          new_status: a.newValue,
          created_at: a.createdAt.toISOString(),
        })),
        attachments: item.attachments.map((a: ItemAttachment) => ({
          id: a.id,
          itemId: a.itemId,
          path: a.path,
          label: a.label,
          attachmentType: a.attachmentType,
          createdAt: a.createdAt.toISOString(),
        })),
        people: item.itemPeople.map((ip: ItemPerson & { person: { name: string } }) => ({
          id: ip.id,
          itemId: ip.itemId,
          personId: ip.personId,
          role: ip.role,
          personName: ip.person.name,
          createdAt: ip.createdAt.toISOString(),
        })),
        subtasks: item.children.map(formatItem),
        checkIns: item.checkIns.map((c: CheckIn) => ({
          id: c.id,
          itemId: c.itemId,
          date: c.date.toISOString().split('T')[0],
          note: c.note,
          completed: c.completed,
          createdAt: c.createdAt.toISOString(),
        })),
        // Blockers: items that must complete before this one can proceed
        blockers: item.linksTo.filter(link => link.from != null).map(link => ({
          id: link.from.id,
          displayId: formatTaskId(link.from.id),
          title: link.from.title,
          status: link.from.status,
          linkId: link.id,
        })),
        // Blocking: items waiting for this one to complete
        blocking: item.linksFrom.filter(link => link.to != null).map(link => ({
          id: link.to.id,
          displayId: formatTaskId(link.to.id),
          title: link.to.title,
          status: link.to.status,
          linkId: link.id,
        })),
        // Pagination info
        _counts: {
          totalActivities: item._count.activities,
          totalSubtasks: item._count.children,
          hasMoreActivities: item._count.activities > item.activities.length,
          hasMoreSubtasks: item._count.children > item.children.length,
        },
      };
    }),

  /**
   * Create a new item
   */
  create: publicProcedure
    .input(CreateItemSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.item.create({
        data: {
          title: input.title,
          description: input.description || null,
          itemType: input.itemType || 'task',
          status: input.status || 'pending',
          priority: input.priority || null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          targetPeriod: input.targetPeriod || null,
          ownerId: input.ownerId || null,
          projectId: input.projectId || null,
          parentId: input.parentId || null,
          sourceMeetingId: input.sourceMeetingId || null,
          sourceType: input.sourceType || null,
          sourcePath: input.sourcePath || null,
          filePath: input.filePath || null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
        include: itemIncludes,
      });

      // Log creation activity
      await ctx.prisma.activity.create({
        data: {
          itemId: item.id,
          action: 'created',
          detail: null,
          oldValue: null,
          newValue: null,
          createdBy: 'user',
        },
      });

      // Emit real-time update
      emit.items.created(item.id);

      return formatItem(item);
    }),

  /**
   * Update an item
   */
  update: publicProcedure
    .input(z.object({
      id: z.union([z.number(), z.string()]),
      data: UpdateItemSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const id = resolveItemId(input.id);

      // Fetch the old item to track changes
      const oldItem = await ctx.prisma.item.findUnique({
        where: { id },
        include: {
          owner: { select: { name: true } },
          project: { select: { name: true } },
        },
      });

      if (!oldItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Item ${formatTaskId(id)} not found`,
        });
      }

      const data = input.data;

      // Build update data (use Unchecked to allow direct ID assignment)
      const updateData: Prisma.ItemUncheckedUpdateInput = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      if (data.targetPeriod !== undefined) updateData.targetPeriod = data.targetPeriod;
      if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
      if (data.projectId !== undefined) updateData.projectId = data.projectId;
      if (data.parentId !== undefined) updateData.parentId = data.parentId;
      if (data.sourceMeetingId !== undefined) updateData.sourceMeetingId = data.sourceMeetingId;
      if (data.metadata !== undefined) updateData.metadata = data.metadata ? JSON.stringify(data.metadata) : null;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update',
        });
      }

      try {
        const item = await ctx.prisma.item.update({
          where: { id },
          data: updateData,
          include: itemIncludes,
        });

        // Track activities for each changed field
        const activities: Array<{
          itemId: number;
          action: string;
          detail: string | null;
          oldValue: string | null;
          newValue: string | null;
          createdBy: string;
        }> = [];

        // Status change
        if (data.status !== undefined && data.status !== oldItem.status) {
          activities.push({
            itemId: id,
            action: 'status_changed',
            detail: null,
            oldValue: oldItem.status,
            newValue: data.status,
            createdBy: 'user',
          });
        }

        // Priority change
        if (data.priority !== undefined && data.priority !== oldItem.priority) {
          activities.push({
            itemId: id,
            action: 'priority_changed',
            detail: null,
            oldValue: oldItem.priority?.toString() || null,
            newValue: data.priority?.toString() || null,
            createdBy: 'user',
          });
        }

        // Due date change
        const oldDueDate = oldItem.dueDate?.toISOString().split('T')[0] || null;
        const newDueDate = data.dueDate || null;
        if (data.dueDate !== undefined && newDueDate !== oldDueDate) {
          activities.push({
            itemId: id,
            action: 'due_date_changed',
            detail: null,
            oldValue: oldDueDate,
            newValue: newDueDate,
            createdBy: 'user',
          });
        }

        // Title change
        if (data.title !== undefined && data.title !== oldItem.title) {
          activities.push({
            itemId: id,
            action: 'title_changed',
            detail: null,
            oldValue: oldItem.title,
            newValue: data.title,
            createdBy: 'user',
          });
        }

        // Owner change
        if (data.ownerId !== undefined && data.ownerId !== oldItem.ownerId) {
          activities.push({
            itemId: id,
            action: 'owner_changed',
            detail: null,
            oldValue: oldItem.owner?.name || null,
            newValue: null, // Will be resolved on display
            createdBy: 'user',
          });
        }

        // Project change
        if (data.projectId !== undefined && data.projectId !== oldItem.projectId) {
          activities.push({
            itemId: id,
            action: 'project_changed',
            detail: null,
            oldValue: oldItem.project?.name || null,
            newValue: null, // Will be resolved on display
            createdBy: 'user',
          });
        }

        // Create all activity records
        if (activities.length > 0) {
          await ctx.prisma.activity.createMany({
            data: activities,
          });
        }

        // Emit real-time update
        emit.items.updated(id);

        return formatItem(item);
      } catch (e) {
        if ((e as { code?: string }).code === 'P2025') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Item ${formatTaskId(id)} not found`,
          });
        }
        throw e;
      }
    }),

  /**
   * Complete an item (mark status as complete)
   */
  complete: publicProcedure
    .input(z.object({
      id: z.union([z.number(), z.string()]),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = resolveItemId(input.id);

      const item = await ctx.prisma.item.findUnique({
        where: { id },
        include: itemIncludes,
      });

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Item ${formatTaskId(id)} not found`,
        });
      }

      const oldStatus = item.status;

      // Update status
      await ctx.prisma.item.update({
        where: { id },
        data: {
          status: 'complete',
          completedAt: new Date(),
        },
      });

      // Clear pending check-ins
      const clearedCheckIns = await ctx.prisma.checkIn.updateMany({
        where: { itemId: id, completed: false },
        data: { completed: true },
      });

      // Unblock dependent items using ItemLink system (many-to-many)
      // Find all items that this completing task blocks
      const blockingLinks = await ctx.prisma.itemLink.findMany({
        where: {
          fromId: id,
          linkType: 'blocks',
        },
        include: {
          to: {
            select: { id: true, title: true, status: true },
          },
        },
      });

      const unblockedItems: Array<{ id: number; title: string }> = [];

      // For each blocked item, check if it has other blockers
      for (const link of blockingLinks) {
        const blockedItem = link.to;
        if (!blockedItem) continue;

        // Delete this blocking link
        await ctx.prisma.itemLink.delete({
          where: { id: link.id },
        });

        // Check if the item has remaining blockers (excluding the one we just removed)
        const remainingBlockers = await ctx.prisma.itemLink.count({
          where: {
            toId: blockedItem.id,
            linkType: 'blocks',
          },
        });

        // Only unblock if no remaining blockers AND status is currently blocked
        if (remainingBlockers === 0 && blockedItem.status === 'blocked') {
          await ctx.prisma.item.update({
            where: { id: blockedItem.id },
            data: { status: 'pending' },
          });
          unblockedItems.push({ id: blockedItem.id, title: blockedItem.title });

          // Log activity on the unblocked item
          await ctx.prisma.activity.create({
            data: {
              itemId: blockedItem.id,
              action: 'unblocked',
              detail: `Auto-unblocked: ${formatTaskId(id)} was completed`,
              createdBy: 'system',
            },
          });
        }
      }

      // Always log completion activity
      await ctx.prisma.activity.create({
        data: {
          itemId: id,
          action: 'status_changed',
          detail: input.note || null,
          oldValue: oldStatus,
          newValue: 'complete',
          createdBy: 'user',
        },
      });

      // Sync to source markdown
      let markdownSync = { synced: false, sourceType: null as string | null, message: '' };
      const basePath = getKnowledgeBasePath();
      const syncResult = await syncTaskToSource(id, basePath);
      markdownSync = {
        synced: syncResult.success,
        sourceType: syncResult.source_type,
        message: syncResult.message,
      };

      // Log to diary
      logTaskActivity(basePath, {
        taskId: id,
        displayId: formatTaskId(id),
        title: item.title,
        action: 'completed',
        projectName: item.project?.name,
        projectSlug: item.project?.slug,
      });

      // Get updated item
      const updatedItem = await ctx.prisma.item.findUnique({
        where: { id },
        include: itemIncludes,
      });

      // Emit real-time updates for completed item and any unblocked items
      emit.items.updated(id);
      if (unblockedItems.length > 0) {
        emit.items.batchUpdated(unblockedItems.map(t => t.id));
      }

      return {
        ...formatItem(updatedItem!),
        previousStatus: oldStatus,
        markdownSync,
        unblockedTasks: unblockedItems.map((t: { id: number; title: string }) => ({
          id: t.id,
          displayId: formatTaskId(t.id),
          title: t.title,
        })),
        clearedCheckIns: clearedCheckIns.count,
      };
    }),

  /**
   * Delete an item (soft delete)
   */
  delete: publicProcedure
    .input(z.object({
      id: z.union([z.number(), z.string()]),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = resolveItemId(input.id);

      try {
        await ctx.prisma.item.update({
          where: { id, deletedAt: null },
          data: { deletedAt: new Date() },
        });

        // Emit real-time update
        emit.items.deleted(id);

        return { deleted: true, id, displayId: formatTaskId(id) };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2025') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Item ${formatTaskId(id)} not found or already deleted`,
          });
        }
        throw e;
      }
    }),

  /**
   * Restore a soft-deleted item
   */
  restore: publicProcedure
    .input(z.object({
      id: z.union([z.number(), z.string()]),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = resolveItemId(input.id);

      // Find the item (including deleted ones)
      const item = await ctx.prisma.item.findUnique({
        where: { id },
        include: itemIncludes,
      });

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Item ${formatTaskId(id)} not found`,
        });
      }

      if (!item.deletedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Item ${formatTaskId(id)} is not deleted`,
        });
      }

      // Restore the item
      const restored = await ctx.prisma.item.update({
        where: { id },
        data: { deletedAt: null },
        include: itemIncludes,
      });

      // Emit real-time update
      emit.items.created(id);

      return {
        restored: true,
        ...formatItem(restored),
      };
    }),

  /**
   * Add a note (activity) to an item
   */
  addNote: publicProcedure
    .input(z.object({
      id: z.union([z.number(), z.string()]),
      note: z.string().min(1),
      updateType: z.string().optional().default('note'),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = resolveItemId(input.id);

      // Verify item exists
      const item = await ctx.prisma.item.findUnique({
        where: { id },
      });

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Item ${formatTaskId(id)} not found`,
        });
      }

      // Create activity
      const activity = await ctx.prisma.activity.create({
        data: {
          itemId: id,
          action: input.updateType,
          detail: input.note,
          createdBy: 'user',
        },
      });

      // Emit real-time update
      emit.items.updated(id);

      return {
        id: activity.id,
        itemId: id,
        displayId: formatTaskId(id),
        note: activity.detail,
        updateType: activity.action,
        createdAt: activity.createdAt.toISOString(),
      };
    }),

  /**
   * Complete a check-in for an item
   */
  completeCheckin: publicProcedure
    .input(z.object({
      id: z.union([z.number(), z.string()]),
      checkinId: z.number().optional(),
      clear: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.id);

      // Verify item exists
      const item = await ctx.prisma.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Item ${formatTaskId(itemId)} not found`,
        });
      }

      // Complete check-in(s)
      if (input.checkinId) {
        // Complete specific check-in
        await ctx.prisma.checkIn.update({
          where: { id: input.checkinId },
          data: { completed: true },
        });
        emit.checkins.updated(input.checkinId);
      } else if (input.clear) {
        // Complete all pending check-ins for this item
        await ctx.prisma.checkIn.updateMany({
          where: { itemId, completed: false },
          data: { completed: true },
        });
      }

      // Emit real-time update for the item (check-in state changed)
      emit.items.updated(itemId);

      return {
        itemId,
        displayId: formatTaskId(itemId),
        completed: true,
      };
    }),

  /**
   * Get items with check-ins due
   */
  checkins: publicProcedure
    .input(z.object({
      includeFuture: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const checkIns = await ctx.prisma.checkIn.findMany({
        where: {
          completed: false,
          ...(input.includeFuture ? {} : { date: { lte: new Date() } }),
          item: {
            status: { notIn: ['complete', 'cancelled'] },
            deletedAt: null,
          },
        },
        include: {
          item: { include: itemIncludes },
        },
        orderBy: { date: 'asc' },
      });

      return checkIns.map((c) => ({
        ...formatItem(c.item),
        checkinId: c.id,
        checkinBy: c.date.toISOString().split('T')[0],
        checkinNote: c.note,
        isCheckin: true as const,
      }));
    }),

  // ===========================================================================
  // BLOCKING SYSTEM (many-to-many via ItemLink)
  // ===========================================================================

  /**
   * Get all items blocking a specific item (items that must complete first)
   */
  getBlockers: publicProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
    }))
    .query(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.id);

      // Get all items that block this item (where this item is the "to" and linkType is "blocks")
      const blockingLinks = await ctx.prisma.itemLink.findMany({
        where: {
          toId: itemId,
          linkType: 'blocks',
        },
        include: {
          from: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      return {
        itemId,
        displayId: formatTaskId(itemId),
        blockers: blockingLinks.filter(l => l.from != null).map(l => ({
          id: l.from.id,
          displayId: formatTaskId(l.from.id),
          title: l.from.title,
          status: l.from.status,
          linkId: l.id,
        })),
        count: blockingLinks.length,
      };
    }),

  /**
   * Get all items blocked by a specific item (items waiting for this one)
   */
  getBlocking: publicProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
    }))
    .query(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.id);

      // Get all items this item blocks (where this item is the "from" and linkType is "blocks")
      const blockedLinks = await ctx.prisma.itemLink.findMany({
        where: {
          fromId: itemId,
          linkType: 'blocks',
        },
        include: {
          to: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      return {
        itemId,
        displayId: formatTaskId(itemId),
        blocking: blockedLinks.filter(l => l.to != null).map(l => ({
          id: l.to.id,
          displayId: formatTaskId(l.to.id),
          title: l.to.title,
          status: l.to.status,
          linkId: l.id,
        })),
        count: blockedLinks.length,
      };
    }),

  /**
   * Add a blocker to an item (create "blocks" link)
   */
  addBlocker: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      blockerId: z.union([z.string(), z.number()]),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);
      const blockerId = resolveItemId(input.blockerId);

      // Verify both items exist
      const [item, blocker] = await Promise.all([
        ctx.prisma.item.findUnique({ where: { id: itemId }, select: { id: true, title: true } }),
        ctx.prisma.item.findUnique({ where: { id: blockerId }, select: { id: true, title: true } }),
      ]);

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${formatTaskId(itemId)} not found` });
      }
      if (!blocker) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Blocker ${formatTaskId(blockerId)} not found` });
      }

      // Prevent self-blocking
      if (itemId === blockerId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'An item cannot block itself' });
      }

      try {
        // Create link: blocker blocks item (blocker is "from", item is "to")
        const link = await ctx.prisma.itemLink.create({
          data: {
            fromId: blockerId,
            toId: itemId,
            linkType: 'blocks',
          },
        });

        // Log activity
        await ctx.prisma.activity.create({
          data: {
            itemId,
            action: 'blocked',
            detail: `Blocked by ${formatTaskId(blockerId)}: ${blocker.title}`,
            createdBy: 'user',
          },
        });

        return {
          linkId: link.id,
          itemId,
          itemDisplayId: formatTaskId(itemId),
          blockerId,
          blockerDisplayId: formatTaskId(blockerId),
          blockerTitle: blocker.title,
        };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `${formatTaskId(blockerId)} already blocks ${formatTaskId(itemId)}`,
          });
        }
        throw e;
      }
    }),

  /**
   * Remove a blocker from an item (delete "blocks" link)
   */
  removeBlocker: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      blockerId: z.union([z.string(), z.number()]),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);
      const blockerId = resolveItemId(input.blockerId);

      const result = await ctx.prisma.itemLink.deleteMany({
        where: {
          fromId: blockerId,
          toId: itemId,
          linkType: 'blocks',
        },
      });

      if (result.count > 0) {
        // Log activity
        await ctx.prisma.activity.create({
          data: {
            itemId,
            action: 'unblocked',
            detail: `No longer blocked by ${formatTaskId(blockerId)}`,
            createdBy: 'user',
          },
        });
      }

      return {
        deleted: result.count > 0,
        itemId,
        itemDisplayId: formatTaskId(itemId),
        blockerId,
        blockerDisplayId: formatTaskId(blockerId),
      };
    }),

  // ===========================================================================
  // ITEM LINKS (blocks, related, duplicate)
  // ===========================================================================

  /**
   * Add a link between two items
   */
  addLink: publicProcedure
    .input(z.object({
      fromId: z.union([z.string(), z.number()]),
      toId: z.union([z.string(), z.number()]),
      linkType: z.enum(['blocks', 'related', 'duplicate']),
    }))
    .mutation(async ({ ctx, input }) => {
      const fromId = resolveItemId(input.fromId);
      const toId = resolveItemId(input.toId);

      // Verify both items exist
      const [fromItem, toItem] = await Promise.all([
        ctx.prisma.item.findUnique({ where: { id: fromId }, select: { id: true, title: true } }),
        ctx.prisma.item.findUnique({ where: { id: toId }, select: { id: true, title: true } }),
      ]);

      if (!fromItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${formatTaskId(fromId)} not found` });
      }
      if (!toItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${formatTaskId(toId)} not found` });
      }

      try {
        const link = await ctx.prisma.itemLink.create({
          data: {
            fromId,
            toId,
            linkType: input.linkType,
          },
        });

        return {
          id: link.id,
          fromId: link.fromId,
          fromDisplayId: formatTaskId(link.fromId),
          fromTitle: fromItem.title,
          toId: link.toId,
          toDisplayId: formatTaskId(link.toId),
          toTitle: toItem.title,
          linkType: link.linkType,
        };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Link already exists: ${formatTaskId(fromId)} ${input.linkType} ${formatTaskId(toId)}`,
          });
        }
        throw e;
      }
    }),

  /**
   * Remove a link between two items
   */
  removeLink: publicProcedure
    .input(z.object({
      fromId: z.union([z.string(), z.number()]),
      toId: z.union([z.string(), z.number()]),
      linkType: z.enum(['blocks', 'related', 'duplicate']),
    }))
    .mutation(async ({ ctx, input }) => {
      const fromId = resolveItemId(input.fromId);
      const toId = resolveItemId(input.toId);

      const result = await ctx.prisma.itemLink.deleteMany({
        where: {
          fromId,
          toId,
          linkType: input.linkType,
        },
      });

      if (result.count > 0) {
      }
      return {
        deleted: result.count > 0,
        fromId,
        fromDisplayId: formatTaskId(fromId),
        toId,
        toDisplayId: formatTaskId(toId),
        linkType: input.linkType,
      };
    }),

  /**
   * Get all links for an item
   */
  getLinks: publicProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
    }))
    .query(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.id);

      const [outgoing, incoming] = await Promise.all([
        ctx.prisma.itemLink.findMany({
          where: { fromId: itemId },
          include: { to: { select: { id: true, title: true, status: true } } },
        }),
        ctx.prisma.itemLink.findMany({
          where: { toId: itemId },
          include: { from: { select: { id: true, title: true, status: true } } },
        }),
      ]);

      return {
        itemId,
        displayId: formatTaskId(itemId),
        outgoing: outgoing.filter(l => l.to != null).map(l => ({
          id: l.id,
          linkType: l.linkType,
          targetId: l.toId,
          targetDisplayId: formatTaskId(l.toId),
          targetTitle: l.to.title,
          targetStatus: l.to.status,
        })),
        incoming: incoming.filter(l => l.from != null).map(l => ({
          id: l.id,
          linkType: l.linkType,
          sourceId: l.fromId,
          sourceDisplayId: formatTaskId(l.fromId),
          sourceTitle: l.from.title,
          sourceStatus: l.from.status,
        })),
      };
    }),

  // ===========================================================================
  // ITEM PEOPLE (roles: waiting_on, assignee, stakeholder, reviewer, cc)
  // ===========================================================================

  /**
   * Add a person with a role to an item
   */
  addPerson: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      personId: z.number().optional(),
      personName: z.string().optional(),
      role: z.enum(['assignee', 'waiting_on', 'stakeholder', 'reviewer', 'cc']),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);

      // Resolve person ID
      let personId = input.personId;
      if (!personId && input.personName) {
        const person = await ctx.prisma.person.findFirst({
          where: { name: { contains: input.personName } },
          select: { id: true, name: true },
        });
        if (!person) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Person not found: ${input.personName}` });
        }
        personId = person.id;
      }

      if (!personId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either personId or personName required' });
      }

      // Verify item exists
      const item = await ctx.prisma.item.findUnique({
        where: { id: itemId },
        select: { id: true, title: true },
      });
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${formatTaskId(itemId)} not found` });
      }

      // Get person name
      const person = await ctx.prisma.person.findUnique({
        where: { id: personId },
        select: { id: true, name: true },
      });
      if (!person) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Person with ID ${personId} not found` });
      }

      try {
        const itemPerson = await ctx.prisma.itemPerson.create({
          data: {
            itemId,
            personId,
            role: input.role,
          },
        });

        return {
          id: itemPerson.id,
          itemId,
          itemDisplayId: formatTaskId(itemId),
          personId,
          personName: person.name,
          role: itemPerson.role,
        };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `${person.name} already has role ${input.role} on ${formatTaskId(itemId)}`,
          });
        }
        throw e;
      }
    }),

  /**
   * Remove a person role from an item
   */
  removePerson: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      personId: z.number().optional(),
      personName: z.string().optional(),
      role: z.enum(['assignee', 'waiting_on', 'stakeholder', 'reviewer', 'cc']),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);

      // Resolve person ID
      let personId = input.personId;
      if (!personId && input.personName) {
        const person = await ctx.prisma.person.findFirst({
          where: { name: { contains: input.personName } },
          select: { id: true },
        });
        if (!person) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Person not found: ${input.personName}` });
        }
        personId = person.id;
      }

      if (!personId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either personId or personName required' });
      }

      const result = await ctx.prisma.itemPerson.deleteMany({
        where: {
          itemId,
          personId,
          role: input.role,
        },
      });

      if (result.count > 0) {
      }
      return {
        deleted: result.count > 0,
        itemId,
        itemDisplayId: formatTaskId(itemId),
        personId,
        role: input.role,
      };
    }),

  /**
   * Get all people associated with an item
   */
  getPeople: publicProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
    }))
    .query(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.id);

      const itemPeople = await ctx.prisma.itemPerson.findMany({
        where: { itemId },
        include: {
          // Use organization relation, not legacy org column
          person: {
            select: {
              id: true,
              name: true,
              email: true,
              organization: { select: { slug: true } },
            },
          },
        },
        orderBy: { role: 'asc' },
      });

      return {
        itemId,
        displayId: formatTaskId(itemId),
        people: itemPeople.map(ip => ({
          id: ip.id,
          personId: ip.personId,
          personName: ip.person.name,
          personEmail: ip.person.email,
          personOrg: ip.person.organization?.slug || null,
          role: ip.role,
          createdAt: ip.createdAt.toISOString(),
        })),
      };
    }),

  // ===========================================================================
  // CHECK-INS
  // ===========================================================================

  /**
   * Add a check-in date to an item
   */
  addCheckin: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      date: z.string(), // YYYY-MM-DD
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);

      // Verify item exists
      const item = await ctx.prisma.item.findUnique({
        where: { id: itemId },
        select: { id: true, title: true },
      });
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${formatTaskId(itemId)} not found` });
      }

      const checkin = await ctx.prisma.checkIn.create({
        data: {
          itemId,
          date: new Date(input.date),
          note: input.note,
        },
      });

      // Emit real-time updates
      emit.checkins.created(checkin.id);
      emit.items.updated(itemId);

      return {
        id: checkin.id,
        itemId,
        itemDisplayId: formatTaskId(itemId),
        itemTitle: item.title,
        date: checkin.date.toISOString().split('T')[0],
        note: checkin.note,
        completed: checkin.completed,
      };
    }),

  /**
   * List check-ins for an item
   */
  listCheckins: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      includeCompleted: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);

      const checkins = await ctx.prisma.checkIn.findMany({
        where: {
          itemId,
          ...(input.includeCompleted ? {} : { completed: false }),
        },
        orderBy: { date: 'asc' },
      });

      return {
        itemId,
        displayId: formatTaskId(itemId),
        checkins: checkins.map(c => ({
          id: c.id,
          date: c.date.toISOString().split('T')[0],
          note: c.note,
          completed: c.completed,
          createdAt: c.createdAt.toISOString(),
        })),
      };
    }),

  /**
   * Update a check-in (reschedule)
   */
  updateCheckin: publicProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(), // YYYY-MM-DD
      note: z.string().optional(),
      completed: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: { date?: Date; note?: string; completed?: boolean } = {};
      if (input.date !== undefined) updateData.date = new Date(input.date);
      if (input.note !== undefined) updateData.note = input.note;
      if (input.completed !== undefined) updateData.completed = input.completed;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      try {
        const checkin = await ctx.prisma.checkIn.update({
          where: { id: input.id },
          data: updateData,
          include: { item: { select: { id: true, title: true } } },
        });

        // Emit real-time updates
        emit.checkins.updated(checkin.id);
        emit.items.updated(checkin.itemId);

        return {
          id: checkin.id,
          itemId: checkin.itemId,
          itemDisplayId: formatTaskId(checkin.itemId),
          itemTitle: checkin.item.title,
          date: checkin.date.toISOString().split('T')[0],
          note: checkin.note,
          completed: checkin.completed,
        };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2025') {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Check-in ${input.id} not found` });
        }
        throw e;
      }
    }),

  /**
   * Reschedule check-in(s) for an item - completes existing and creates new
   */
  rescheduleCheckin: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      newDate: z.string(), // YYYY-MM-DD
      clearCompleted: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);

      // Verify item exists
      const item = await ctx.prisma.item.findUnique({
        where: { id: itemId },
        select: { id: true, title: true },
      });
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${formatTaskId(itemId)} not found` });
      }

      // Mark existing pending check-ins as completed if requested
      let cleared = 0;
      if (input.clearCompleted) {
        const result = await ctx.prisma.checkIn.updateMany({
          where: { itemId, completed: false },
          data: { completed: true },
        });
        cleared = result.count;
      }

      // Create new check-in with the new date
      const checkin = await ctx.prisma.checkIn.create({
        data: {
          itemId,
          date: new Date(input.newDate),
        },
      });

      // Emit real-time updates
      emit.checkins.created(checkin.id);
      emit.items.updated(itemId);

      return {
        id: checkin.id,
        itemId,
        itemDisplayId: formatTaskId(itemId),
        itemTitle: item.title,
        date: checkin.date.toISOString().split('T')[0],
        clearedPrevious: cleared,
      };
    }),

  /**
   * Delete a check-in
   */
  deleteCheckin: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the itemId before deleting
        const checkin = await ctx.prisma.checkIn.findUnique({
          where: { id: input.id },
          select: { itemId: true },
        });

        await ctx.prisma.checkIn.delete({
          where: { id: input.id },
        });

        // Emit real-time updates
        emit.checkins.deleted(input.id);
        if (checkin) {
          emit.items.updated(checkin.itemId);
        }

        return { deleted: true, id: input.id };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2025') {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Check-in ${input.id} not found` });
        }
        throw e;
      }
    }),

  // ===========================================================================
  // TAGS
  // ===========================================================================

  /**
   * Add a tag to an item
   */
  addTag: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      tagId: z.number().optional(),
      tagName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);

      // Resolve tag ID
      let tagId = input.tagId;
      if (!tagId && input.tagName) {
        const tag = await ctx.prisma.tag.findUnique({
          where: { name: input.tagName },
        });
        if (!tag) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Tag not found: ${input.tagName}` });
        }
        tagId = tag.id;
      }

      if (!tagId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either tagId or tagName required' });
      }

      // Verify item exists
      const item = await ctx.prisma.item.findUnique({
        where: { id: itemId },
        select: { id: true, title: true },
      });
      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Item ${formatTaskId(itemId)} not found` });
      }

      // Get tag info
      const tag = await ctx.prisma.tag.findUnique({
        where: { id: tagId },
        select: { id: true, name: true, color: true },
      });
      if (!tag) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Tag with ID ${tagId} not found` });
      }

      try {
        await ctx.prisma.itemTag.create({
          data: {
            itemId,
            tagId,
          },
        });

        return {
          itemId,
          itemDisplayId: formatTaskId(itemId),
          itemTitle: item.title,
          tagId,
          tagName: tag.name,
          tagColor: tag.color,
        };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Item ${formatTaskId(itemId)} already has tag "${tag.name}"`,
          });
        }
        throw e;
      }
    }),

  /**
   * Remove a tag from an item
   */
  removeTag: publicProcedure
    .input(z.object({
      itemId: z.union([z.string(), z.number()]),
      tagId: z.number().optional(),
      tagName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.itemId);

      // Resolve tag ID
      let tagId = input.tagId;
      if (!tagId && input.tagName) {
        const tag = await ctx.prisma.tag.findUnique({
          where: { name: input.tagName },
        });
        if (!tag) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Tag not found: ${input.tagName}` });
        }
        tagId = tag.id;
      }

      if (!tagId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either tagId or tagName required' });
      }

      const result = await ctx.prisma.itemTag.deleteMany({
        where: {
          itemId,
          tagId,
        },
      });

      if (result.count > 0) {
      }
      return {
        deleted: result.count > 0,
        itemId,
        itemDisplayId: formatTaskId(itemId),
        tagId,
      };
    }),

  /**
   * Get all tags for an item
   */
  getTags: publicProcedure
    .input(z.object({
      id: z.union([z.string(), z.number()]),
    }))
    .query(async ({ ctx, input }) => {
      const itemId = resolveItemId(input.id);

      const itemTags = await ctx.prisma.itemTag.findMany({
        where: { itemId },
        include: {
          tag: true,
        },
      });

      return {
        itemId,
        displayId: formatTaskId(itemId),
        tags: itemTags.map(it => ({
          id: it.tag.id,
          name: it.tag.name,
          color: it.tag.color,
          description: it.tag.description,
        })),
      };
    }),
});

export type ItemsRouter = typeof itemsRouter;
