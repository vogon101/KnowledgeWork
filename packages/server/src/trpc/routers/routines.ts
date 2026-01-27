/**
 * Routines Router (tRPC)
 *
 * Type-safe API for routine operations.
 * Routines are Items with itemType='routine' that recur on a schedule.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import {
  getRoutines,
  getRoutinesDue,
  getOverdueRoutines,
  completeRoutine,
  uncompleteRoutine,
  skipRoutine,
  unskipRoutine,
  skipRoutineToNextDue,
  completeRoutineToNextDue,
  getRoutineHistory,
} from '../../services/routine-generator-prisma.js';
import { logRoutineCompletion } from '../../services/diary-sync.js';
import { getKnowledgeBasePath } from '../../services/paths.js';
import type { Prisma } from '../../generated/prisma/index.js';

// =============================================================================
// Schemas
// =============================================================================

const RecurrenceRuleSchema = z.enum(['daily', 'weekly', 'monthly', 'bimonthly', 'yearly', 'custom']);

const RoutineSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.number().nullable(),
  ownerId: z.number().nullable(),
  ownerName: z.string().nullable(),
  projectId: z.number().nullable(),
  projectSlug: z.string().nullable(),
  projectName: z.string().nullable(),
  projectOrg: z.string().nullable(),
  projectFullPath: z.string().nullable(),
  recurrenceRule: z.string(),
  recurrenceTime: z.string().nullable(),
  recurrenceDays: z.string().nullable(),
  recurrenceMonths: z.string().nullable(),
  isDueToday: z.boolean().optional(),
  completedToday: z.boolean().optional(),
  lastCompleted: z.string().nullable(),
  completionCount: z.number(),
});

const CreateRoutineSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().min(1).max(4).optional(),
  ownerId: z.number().optional(),
  projectId: z.number().optional(),
  recurrenceRule: RecurrenceRuleSchema,
  recurrenceTime: z.string().optional(),
  recurrenceDays: z.array(z.union([z.string(), z.number()])).optional(),
  recurrenceMonths: z.array(z.number()).optional(),
});

const UpdateRoutineSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.number().min(1).max(4).nullable().optional(),
  ownerId: z.number().nullable().optional(),
  projectId: z.number().nullable().optional(),
  recurrenceRule: RecurrenceRuleSchema.optional(),
  recurrenceTime: z.string().nullable().optional(),
  recurrenceDays: z.array(z.union([z.string(), z.number()])).nullable().optional(),
  recurrenceMonths: z.array(z.number()).nullable().optional(),
});

// =============================================================================
// Helper: Format routine from service to API response
// =============================================================================

// Type for the raw routine data returned by routine-generator-prisma service
interface RawRoutineData {
  id: number;
  title: string;
  description: string | null;
  priority: number | null;
  owner_id: number | null;
  owner_name: string | null;
  project_id: number | null;
  project_slug: string | null;
  project_name: string | null;
  project_org: string | null;
  project_full_path: string | null;
  recurrence_rule: string;
  recurrence_time: string | null;
  recurrence_days: string | null;
  recurrence_months: string | null;
  is_due_today?: boolean;
  completed_today?: boolean;
  last_completed: string | null;
  completion_count: number;
}

function formatRoutine(r: RawRoutineData) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    priority: r.priority,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    projectId: r.project_id,
    projectSlug: r.project_slug,
    projectName: r.project_name,
    projectOrg: r.project_org,
    projectFullPath: r.project_full_path,
    recurrenceRule: r.recurrence_rule,
    recurrenceTime: r.recurrence_time,
    recurrenceDays: r.recurrence_days,
    recurrenceMonths: r.recurrence_months,
    isDueToday: r.is_due_today,
    completedToday: r.completed_today,
    lastCompleted: r.last_completed,
    completionCount: r.completion_count,
  };
}

// =============================================================================
// ROUTER
// =============================================================================

export const routinesRouter = router({
  /**
   * List all routine templates
   */
  list: publicProcedure
    .query(async () => {
      const { routines } = await getRoutines();
      return {
        routines: routines.map(formatRoutine),
        count: routines.length,
      };
    }),

  /**
   * Get routines due on a date (default: today)
   */
  due: publicProcedure
    .input(z.object({
      date: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const date = input?.date ? new Date(input.date) : new Date();
      const routines = await getRoutinesDue(date);

      const pending = routines.filter((r) => !r.completed_today);
      const completed = routines.filter((r) => r.completed_today);

      return {
        date: date.toISOString().split('T')[0],
        total: routines.length,
        pendingCount: pending.length,
        completedCount: completed.length,
        pending: pending.map(formatRoutine),
        completed: completed.map(formatRoutine),
      };
    }),

  /**
   * Get overdue routines
   */
  overdue: publicProcedure
    .query(async () => {
      const overdue = await getOverdueRoutines();

      return {
        totalOverdue: overdue.length,
        totalMissedInstances: overdue.reduce((sum, o) => sum + o.days_overdue, 0),
        routines: overdue.map((o) => ({
          id: o.routine.id,
          title: o.routine.title,
          recurrenceRule: o.routine.recurrence_rule,
          projectName: o.routine.project_name,
          overdueDates: o.overdue_dates,
          daysOverdue: o.days_overdue,
        })),
      };
    }),

  /**
   * Get a specific routine with history
   */
  get: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const routine = await ctx.prisma.item.findFirst({
        where: {
          id: input.id,
          itemType: 'routine',
          deletedAt: null,
        },
        include: {
          owner: { select: { name: true } },
          project: {
            select: {
              slug: true,
              name: true,
              // Always use organization relation, not legacy org column
              parent: { select: { slug: true } },
              organization: { select: { slug: true } },
            },
          },
        },
      });

      if (!routine) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Routine ${input.id} not found`,
        });
      }

      const history = await getRoutineHistory(input.id);

      const projectFullPath = routine.project?.parent?.slug
        ? `${routine.project.parent.slug}/${routine.project.slug}`
        : routine.project?.slug || null;

      return {
        id: routine.id,
        title: routine.title,
        description: routine.description,
        priority: routine.priority,
        ownerId: routine.ownerId,
        ownerName: routine.owner?.name || null,
        projectId: routine.projectId,
        projectSlug: routine.project?.slug || null,
        projectName: routine.project?.name || null,
        projectOrg: routine.project?.organization?.slug || null,
        projectFullPath,
        recurrenceRule: routine.recurrenceRule,
        recurrenceTime: routine.recurrenceTime,
        recurrenceDays: routine.recurrenceDays,
        recurrenceMonths: routine.recurrenceMonths,
        createdAt: routine.createdAt.toISOString(),
        updatedAt: routine.updatedAt.toISOString(),
        history,
      };
    }),

  /**
   * Create a new routine
   */
  create: publicProcedure
    .input(CreateRoutineSchema)
    .mutation(async ({ ctx, input }) => {
      const routine = await ctx.prisma.item.create({
        data: {
          title: input.title,
          description: input.description || null,
          status: 'pending',
          priority: input.priority || null,
          itemType: 'routine',
          recurrenceRule: input.recurrenceRule,
          recurrenceTime: input.recurrenceTime || null,
          recurrenceDays: input.recurrenceDays ? JSON.stringify(input.recurrenceDays) : null,
          recurrenceMonths: input.recurrenceMonths ? JSON.stringify(input.recurrenceMonths) : null,
          ownerId: input.ownerId || null,
          projectId: input.projectId || null,
        },
      });

      return {
        id: routine.id,
        title: routine.title,
        recurrenceRule: routine.recurrenceRule,
      };
    }),

  /**
   * Update a routine
   */
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: UpdateRoutineSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const routine = await ctx.prisma.item.findFirst({
        where: {
          id: input.id,
          itemType: 'routine',
          deletedAt: null,
        },
      });

      if (!routine) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Routine ${input.id} not found`,
        });
      }

      const updateData: Prisma.ItemUncheckedUpdateInput = {};

      if (input.data.title !== undefined) updateData.title = input.data.title;
      if (input.data.description !== undefined) updateData.description = input.data.description;
      if (input.data.priority !== undefined) updateData.priority = input.data.priority;
      if (input.data.ownerId !== undefined) updateData.ownerId = input.data.ownerId;
      if (input.data.projectId !== undefined) updateData.projectId = input.data.projectId;
      if (input.data.recurrenceRule !== undefined) updateData.recurrenceRule = input.data.recurrenceRule;
      if (input.data.recurrenceTime !== undefined) updateData.recurrenceTime = input.data.recurrenceTime;
      if (input.data.recurrenceDays !== undefined) {
        updateData.recurrenceDays = input.data.recurrenceDays
          ? JSON.stringify(input.data.recurrenceDays)
          : null;
      }
      if (input.data.recurrenceMonths !== undefined) {
        updateData.recurrenceMonths = input.data.recurrenceMonths
          ? JSON.stringify(input.data.recurrenceMonths)
          : null;
      }

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update',
        });
      }

      await ctx.prisma.item.update({
        where: { id: input.id },
        data: updateData,
      });

      return { id: input.id };
    }),

  /**
   * Delete a routine
   */
  delete: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const routine = await ctx.prisma.item.findFirst({
        where: {
          id: input.id,
          itemType: 'routine',
          deletedAt: null,
        },
      });

      if (!routine) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Routine ${input.id} not found`,
        });
      }

      // Delete completion history and skip history, then the routine
      await ctx.prisma.$transaction([
        ctx.prisma.routineCompletion.deleteMany({ where: { routineId: input.id } }),
        ctx.prisma.routineSkip.deleteMany({ where: { routineId: input.id } }),
        ctx.prisma.item.delete({ where: { id: input.id } }),
      ]);

      return { deleted: true };
    }),

  /**
   * Complete a routine for a date (default: today)
   */
  complete: publicProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const completionDate = input.date ? new Date(input.date) : new Date();

      // Get routine title for diary logging
      const routine = await ctx.prisma.item.findFirst({
        where: {
          id: input.id,
          itemType: 'routine',
          deletedAt: null,
        },
        select: { title: true },
      });

      if (!routine) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Routine ${input.id} not found`,
        });
      }

      const result = await completeRoutine(input.id, completionDate, input.notes);

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Routine not found',
        });
      }

      // Log to diary (only if not already completed)
      let diarySync = { synced: false, diaryPath: '' };
      if (!result.already_completed) {
        const basePath = getKnowledgeBasePath();
        const diaryResult = logRoutineCompletion(basePath, routine.title, completionDate);
        diarySync = { synced: diaryResult.success, diaryPath: diaryResult.diaryPath };
      }

      return {
        routineId: input.id,
        completionId: result.completion_id,
        date: completionDate.toISOString().split('T')[0],
        alreadyCompleted: result.already_completed || false,
        diarySync,
      };
    }),

  /**
   * Uncomplete a routine for a date
   */
  uncomplete: publicProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const date = input.date ? new Date(input.date) : new Date();
      const result = await uncompleteRoutine(input.id, date);

      return {
        routineId: input.id,
        date: date.toISOString().split('T')[0],
        wasCompleted: result.deleted,
      };
    }),

  /**
   * Skip a routine for a date
   */
  skip: publicProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const skipDate = input.date ? new Date(input.date) : new Date();
      const result = await skipRoutine(input.id, skipDate, input.notes);

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Routine not found',
        });
      }

      return {
        routineId: input.id,
        skipId: result.skip_id,
        date: skipDate.toISOString().split('T')[0],
        alreadySkipped: result.already_skipped || false,
      };
    }),

  /**
   * Unskip a routine for a date
   */
  unskip: publicProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const date = input.date ? new Date(input.date) : new Date();
      const result = await unskipRoutine(input.id, date);

      return {
        routineId: input.id,
        date: date.toISOString().split('T')[0],
        wasSkipped: result.deleted,
      };
    }),

  /**
   * Skip all overdue instances, advancing to next due date
   */
  skipAllOverdue: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await skipRoutineToNextDue(input.id);

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Routine not found',
        });
      }

      return {
        routineId: input.id,
        skippedCount: result.skipped_count,
        datesSkipped: result.skipped_dates,
        nextDue: result.next_due,
      };
    }),

  /**
   * Complete all overdue instances, advancing to next due date
   */
  completeAllOverdue: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await completeRoutineToNextDue(input.id);

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Routine not found',
        });
      }

      return {
        routineId: input.id,
        completedCount: result.completed_count,
        datesCompleted: result.completed_dates,
        nextDue: result.next_due,
      };
    }),
});

export type RoutinesRouter = typeof routinesRouter;
