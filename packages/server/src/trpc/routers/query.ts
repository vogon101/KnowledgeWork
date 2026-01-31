/**
 * Query Router (tRPC)
 *
 * Common query shortcuts for items (today, overdue, waiting, search).
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { formatTaskId, type ItemWithRelations } from '@kw/api-types';
import type { Prisma } from '../../generated/prisma/index.js';

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
}): ItemWithRelations {
  return {
    id: item.id,
    displayId: formatTaskId(item.id),
    title: item.title,
    description: item.description,
    itemType: item.itemType as ItemWithRelations['itemType'],
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
    subtasksComplete: 0,
    checkinBy: null,
    checkinId: null,
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
  _count: { select: { children: true } },
};

// =============================================================================
// ROUTER
// =============================================================================

export const queryRouter = router({
  /**
   * Get items due today
   */
  today: publicProcedure
    .input(z.object({
      ownerName: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Prisma.ItemWhereInput = {
        deletedAt: null,
        itemType: 'task', // Exclude routines - they have their own section
        status: { notIn: ['complete', 'cancelled'] },
        dueDate: { gte: today, lt: tomorrow },
      };

      if (input?.ownerName) {
        where.owner = { name: { contains: input.ownerName } };
      }

      const items = await ctx.prisma.item.findMany({
        where,
        include: itemIncludes,
        orderBy: [
          { priority: { sort: 'asc', nulls: 'last' } },
          { dueDate: { sort: 'asc', nulls: 'last' } },
        ],
      });

      return {
        date: today.toISOString().split('T')[0],
        items: items.map(formatItem),
        count: items.length,
      };
    }),

  /**
   * Get overdue items
   */
  overdue: publicProcedure
    .input(z.object({
      ownerName: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Prisma.ItemWhereInput = {
        deletedAt: null,
        itemType: 'task', // Exclude routines - they have their own section
        status: { notIn: ['complete', 'cancelled'] },
        dueDate: { lt: today },
      };

      if (input?.ownerName) {
        where.owner = { name: { contains: input.ownerName } };
      }

      const items = await ctx.prisma.item.findMany({
        where,
        include: itemIncludes,
        orderBy: [
          { dueDate: 'asc' },
          { priority: { sort: 'asc', nulls: 'last' } },
        ],
      });

      return {
        items: items.map(formatItem),
        count: items.length,
      };
    }),

  /**
   * Get items waiting on others
   */
  waiting: publicProcedure
    .query(async ({ ctx }) => {
      // Get items where there's a waiting_on relationship
      const waitingRelations = await ctx.prisma.itemPerson.findMany({
        where: {
          role: 'waiting_on',
          item: {
            itemType: 'task', // Exclude routines - they have their own section
            status: { notIn: ['complete', 'cancelled'] },
            deletedAt: null,
          },
        },
        include: {
          item: { include: itemIncludes },
          person: { select: { id: true, name: true } },
        },
        orderBy: {
          item: { dueDate: { sort: 'asc', nulls: 'last' } },
        },
      });

      // Group by person
      const byPerson = new Map<number, {
        person: { id: number; name: string };
        items: ItemWithRelations[];
      }>();

      for (const rel of waitingRelations) {
        if (!byPerson.has(rel.personId)) {
          byPerson.set(rel.personId, {
            person: rel.person,
            items: [],
          });
        }
        byPerson.get(rel.personId)!.items.push(formatItem(rel.item));
      }

      return {
        total: waitingRelations.length,
        byPerson: Array.from(byPerson.values()),
      };
    }),

  /**
   * Search items by text
   */
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      includeCompleted: z.boolean().optional().default(false),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Prisma.ItemWhereInput = {
        deletedAt: null,
        OR: [
          { title: { contains: input.query } },
          { description: { contains: input.query } },
        ],
      };

      if (!input.includeCompleted) {
        where.status = { notIn: ['complete', 'cancelled'] };
      }

      const items = await ctx.prisma.item.findMany({
        where,
        include: itemIncludes,
        orderBy: [
          { priority: { sort: 'asc', nulls: 'last' } },
          { updatedAt: 'desc' },
        ],
        take: input.limit,
      });

      return {
        query: input.query,
        items: items.map(formatItem),
        count: items.length,
      };
    }),

  /**
   * Get high priority items
   */
  highPriority: publicProcedure
    .input(z.object({
      ownerName: z.string().optional(),
      limit: z.number().optional().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Prisma.ItemWhereInput = {
        deletedAt: null,
        itemType: 'task', // Exclude routines - they have their own section
        status: { notIn: ['complete', 'cancelled'] },
        priority: { in: [1, 2] },
      };

      if (input?.ownerName) {
        where.owner = { name: { contains: input.ownerName } };
      }

      const items = await ctx.prisma.item.findMany({
        where,
        include: itemIncludes,
        orderBy: [
          { priority: 'asc' },
          { dueDate: { sort: 'asc', nulls: 'last' } },
        ],
        take: input?.limit || 20,
      });

      return {
        items: items.map(formatItem),
        count: items.length,
      };
    }),

  /**
   * Dashboard summary stats
   */
  dashboard: publicProcedure
    .input(z.object({
      ownerName: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Base where for owner filter
      const baseWhere: Prisma.ItemWhereInput = {
        deletedAt: null,
        itemType: 'task', // Exclude routines - they have their own section
        status: { notIn: ['complete', 'cancelled'] },
      };

      if (input?.ownerName) {
        baseWhere.owner = { name: { contains: input.ownerName } };
      }

      const [total, overdue, dueToday, highPriority, blocked] = await Promise.all([
        ctx.prisma.item.count({ where: baseWhere }),
        ctx.prisma.item.count({
          where: { ...baseWhere, dueDate: { lt: today } },
        }),
        ctx.prisma.item.count({
          where: {
            ...baseWhere,
            dueDate: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        }),
        ctx.prisma.item.count({
          where: { ...baseWhere, priority: { in: [1, 2] } },
        }),
        ctx.prisma.item.count({
          where: { ...baseWhere, status: 'blocked' },
        }),
      ]);

      return {
        total,
        overdue,
        dueToday,
        highPriority,
        blocked,
      };
    }),

  /**
   * Get recent activity feed (status changes, completions, notes)
   */
  activityFeed: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(30),
      offset: z.number().optional().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { limit = 30, offset = 0 } = input || {};

      const activities = await ctx.prisma.activity.findMany({
        where: {
          item: {
            deletedAt: null,
          },
        },
        include: {
          item: {
            include: {
              // Always use organization relation, not legacy org column
              project: {
                select: {
                  slug: true,
                  name: true,
                  organization: { select: { slug: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return {
        activities: activities.map((a) => ({
          id: a.id,
          action: a.action,
          detail: a.detail,
          oldValue: a.oldValue,
          newValue: a.newValue,
          createdAt: a.createdAt.toISOString(),
          createdBy: a.createdBy,
          item: {
            id: a.item.id,
            displayId: formatTaskId(a.item.id),
            title: a.item.title,
            status: a.item.status,
            projectSlug: a.item.project?.slug || null,
            projectName: a.item.project?.name || null,
            projectOrg: a.item.project?.organization?.slug || null,
          },
        })),
        count: activities.length,
      };
    }),

  /**
   * Get tasks due in the next N days (for weekly planning)
   */
  upcoming: publicProcedure
    .input(z.object({
      days: z.number().optional().default(7),
      ownerName: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { days = 7, ownerName } = input || {};

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);

      const where: Prisma.ItemWhereInput = {
        deletedAt: null,
        itemType: 'task', // Exclude routines - they have their own section
        status: { notIn: ['complete', 'cancelled'] },
        dueDate: { gte: today, lt: endDate },
      };

      if (ownerName) {
        where.owner = { name: { contains: ownerName } };
      }

      const items = await ctx.prisma.item.findMany({
        where,
        include: itemIncludes,
        orderBy: [
          { dueDate: 'asc' },
          { priority: { sort: 'asc', nulls: 'last' } },
        ],
      });

      // Group by day
      const byDay = new Map<string, ItemWithRelations[]>();

      for (const item of items) {
        const dateKey = item.dueDate!.toISOString().split('T')[0];
        if (!byDay.has(dateKey)) {
          byDay.set(dateKey, []);
        }
        byDay.get(dateKey)!.push(formatItem(item));
      }

      // Convert to sorted array
      const grouped = Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, items]) => ({ date, items }));

      return {
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days,
        grouped,
        total: items.length,
      };
    }),

  /**
   * Get blocked items (for action panel)
   * Uses ItemLink system for many-to-many blocking relationships
   */
  blocked: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { limit = 20 } = input || {};

      const items = await ctx.prisma.item.findMany({
        where: {
          deletedAt: null,
          itemType: 'task', // Exclude routines - they have their own section
          status: 'blocked',
        },
        include: {
          ...itemIncludes,
          // Include blockers via ItemLink (items blocking this one)
          linksTo: {
            where: { linkType: 'blocks' },
            include: {
              from: { select: { id: true, title: true, status: true } },
            },
          },
        },
        orderBy: [
          { priority: { sort: 'asc', nulls: 'last' } },
          { dueDate: { sort: 'asc', nulls: 'last' } },
        ],
        take: limit,
      });

      return {
        items: items.map((item) => {
          // Get blockers from ItemLink system
          const blockers = item.linksTo.filter(link => link.from != null).map(link => ({
            id: link.from.id,
            displayId: formatTaskId(link.from.id),
            title: link.from.title,
            status: link.from.status,
          }));

          return {
            ...formatItem(item),
            blockers,
            blockerCount: blockers.length,
          };
        }),
        count: items.length,
      };
    }),

  /**
   * Get in-progress items (for today's focus)
   */
  inProgress: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { limit = 10 } = input || {};

      const items = await ctx.prisma.item.findMany({
        where: {
          deletedAt: null,
          itemType: 'task', // Exclude routines - they have their own section
          status: 'in_progress',
        },
        include: itemIncludes,
        orderBy: [
          { priority: { sort: 'asc', nulls: 'last' } },
          { dueDate: { sort: 'asc', nulls: 'last' } },
        ],
        take: limit,
      });

      return {
        items: items.map(formatItem),
        count: items.length,
      };
    }),
});

export type QueryRouter = typeof queryRouter;
