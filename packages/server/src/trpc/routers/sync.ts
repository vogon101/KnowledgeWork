/**
 * Sync Router (tRPC)
 *
 * Type-safe API for sync operations:
 * - Meeting sync: Parse meeting markdown → create tasks
 * - Filesystem sync: Bidirectional sync between workstream files and DB
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import {
  getMeetingByPath,
  parseDueDate,
  type ParsedMeeting,
} from '../../services/meeting-parser.js';
import { scanProjects, syncProjects } from '../../services/project-sync.js';
import { formatTaskId } from '@kw/api-types';
import type { PrismaClient } from '../../generated/prisma/index.js';

// =============================================================================
// Types
// =============================================================================

interface SyncResult {
  meetingPath: string;
  meetingTitle: string;
  actionsFound: number;
  tasksCreated: number;
  tasksUpdated: number;
  tasksSkipped: number;
  errors: string[];
  taskIds: number[];
}

// =============================================================================
// Helper: Map action status to task status
// =============================================================================

function mapActionStatus(status: string): string {
  const lower = status.toLowerCase();
  if (lower === 'done' || lower === 'complete' || lower === 'completed') return 'complete';
  if (lower === 'cancelled' || lower === 'canceled') return 'cancelled';
  if (lower === 'in progress' || lower === 'in-progress' || lower === 'active') return 'in_progress';
  if (lower === 'blocked') return 'blocked';
  if (lower === 'deferred') return 'deferred';
  return 'pending';
}

// =============================================================================
// ROUTER
// =============================================================================

export const syncRouter = router({
  // ===========================================================================
  // SYNC ALL (combined operations)
  // ===========================================================================

  /**
   * Preview what would be synced from all sources
   */
  allPreview: publicProcedure
    .query(async ({ ctx }) => {
      // Get count of meetings
      const meetingCount = await ctx.prisma.meeting.count();

      // Get filesystem preview (projects including workstreams)
      const projects = scanProjects();

      return {
        meetings: {
          count: meetingCount,
          withTasks: 0, // Simplified - would need separate query
        },
        projects: {
          count: projects.length,
        },
      };
    }),

  /**
   * Sync all sources (meetings + filesystem)
   */
  all: publicProcedure
    .mutation(async () => {
      // Sync projects (including workstreams as child projects)
      const projectResult = await syncProjects();

      return {
        meetings: {
          tasksCreated: 0,
          tasksUpdated: 0,
        },
        projects: {
          projectsFound: projectResult.projects_found,
          projectsCreated: projectResult.projects_created,
          projectsUpdated: projectResult.projects_updated,
          errors: projectResult.errors.length,
        },
      };
    }),

  // ===========================================================================
  // MEETING SYNC
  // ===========================================================================

  /**
   * Preview what would be synced from a meeting
   */
  meetingPreview: publicProcedure
    .input(z.object({
      path: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const meeting = getMeetingByPath(input.path);

      if (!meeting) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Meeting not found at path: ${input.path}`,
        });
      }

      // Get meeting ID if exists
      const meetingRecord = await ctx.prisma.meeting.findUnique({
        where: { path: meeting.path },
      });

      // For each action, check if it already exists
      const actionsWithStatus = await Promise.all(
        meeting.actions.map(async (action) => {
          let existingTask = null;
          if (meetingRecord) {
            existingTask = await ctx.prisma.item.findFirst({
              where: {
                sourceMeetingId: meetingRecord.id,
                title: action.action,
              },
              select: { id: true, status: true, deletedAt: true },
            });
          }

          return {
            owner: action.owner,
            action: action.action,
            project: action.project,
            due: action.due,
            status: action.status,
            existingTaskId: existingTask?.id || null,
            existingTaskStatus: existingTask?.status || null,
            wouldCreate: !existingTask && action.status.toLowerCase() !== 'complete',
            wouldSkip: !!existingTask || action.status.toLowerCase() === 'complete',
            isDeleted: !!existingTask?.deletedAt,
          };
        })
      );

      return {
        path: meeting.path,
        title: meeting.title,
        date: meeting.date,
        attendees: meeting.attendees,
        projects: meeting.projects,
        primaryProject: meeting.primaryProject,
        actionsCount: meeting.actions.length,
        actions: actionsWithStatus,
        wouldCreate: actionsWithStatus.filter((a) => a.wouldCreate).length,
        wouldSkip: actionsWithStatus.filter((a) => a.wouldSkip).length,
        isSynced: !!meetingRecord,
      };
    }),

  /**
   * Sync actions from a meeting file to the database
   */
  meeting: publicProcedure
    .input(z.object({
      path: z.string(),
      dryRun: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const meeting = getMeetingByPath(input.path);

      if (!meeting) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Meeting not found at path: ${input.path}`,
        });
      }

      if (input.dryRun) {
        return {
          meetingPath: meeting.path,
          meetingTitle: meeting.title,
          actionsFound: meeting.actions.length,
          tasksCreated: 0,
          tasksUpdated: 0,
          tasksSkipped: 0,
          errors: [],
          taskIds: [],
          dryRun: true,
        };
      }

      // Actually sync the meeting
      const result = await syncMeetingActions(ctx.prisma, meeting);

      return {
        ...result,
        dryRun: false,
      };
    }),

  // ===========================================================================
  // PROJECT SYNC (replaces old filesystem/workstream sync)
  // ===========================================================================

  /**
   * Preview projects found in filesystem (including workstreams as child projects)
   */
  filesystemPreview: publicProcedure
    .query(() => {
      const projects = scanProjects();

      return {
        total: projects.length,
        projects: projects.map((p) => ({
          slug: p.slug,
          name: p.name,
          org: p.org,
          status: p.status,
          isSubProject: p.isSubProject,
          parentSlug: p.parentSlug,
        })),
      };
    }),

  /**
   * Sync all projects (including workstreams) from filesystem to database
   */
  filesystem: publicProcedure
    .mutation(async () => {
      const result = await syncProjects();

      return {
        projectsFound: result.projects_found,
        projectsCreated: result.projects_created,
        projectsUpdated: result.projects_updated,
        errors: result.errors,
      };
    }),
});

// =============================================================================
// Helper: Sync meeting actions (extracted from sync-prisma.ts)
// =============================================================================

async function syncMeetingActions(prisma: PrismaClient, meeting: ParsedMeeting): Promise<SyncResult> {
  const result: SyncResult = {
    meetingPath: meeting.path,
    meetingTitle: meeting.title,
    actionsFound: meeting.actions.length,
    tasksCreated: 0,
    tasksUpdated: 0,
    tasksSkipped: 0,
    errors: [],
    taskIds: [],
  };

  // Extract org from meeting path (e.g., "acme-corp/meetings/..." -> "acme-corp")
  const meetingOrg = meeting.path.split('/')[0] || undefined;

  // Find or create meeting in database (always, even with no actions)
  let meetingRecord = await prisma.meeting.findUnique({
    where: { path: meeting.path },
  });

  if (!meetingRecord) {
    meetingRecord = await prisma.meeting.create({
      data: {
        title: meeting.title,
        date: new Date(meeting.date),
        path: meeting.path,
      },
    });

    // Link projects if available
    for (let i = 0; i < meeting.projects.length; i++) {
      const projectSlug = meeting.projects[i];
      const project = await prisma.project.findFirst({
        where: {
          slug: projectSlug,
          ...(meetingOrg ? { organization: { slug: meetingOrg } } : {}),
        },
      });
      if (project) {
        await prisma.meetingProject.upsert({
          where: {
            meetingId_projectId: {
              meetingId: meetingRecord.id,
              projectId: project.id,
            },
          },
          create: {
            meetingId: meetingRecord.id,
            projectId: project.id,
            isPrimary: i === 0,
          },
          update: {},
        });
      }
    }
  }

  // Sync attendees
  for (const attendeeName of meeting.attendees) {
    let person = await prisma.person.findFirst({
      where: { name: { equals: attendeeName } },
    });
    if (!person) {
      person = await prisma.person.create({
        data: { name: attendeeName },
      });
    }
    await prisma.meetingAttendee.upsert({
      where: {
        meetingId_personId: {
          meetingId: meetingRecord.id,
          personId: person.id,
        },
      },
      create: {
        meetingId: meetingRecord.id,
        personId: person.id,
      },
      update: {},
    });
  }

  // If no actions, we're done (meeting and attendees are already synced)
  if (meeting.actions.length === 0) {
    return result;
  }

  // Process each action
  for (const action of meeting.actions) {
    try {
      // Skip completed/cancelled actions
      const statusLower = action.status.toLowerCase();
      if (statusLower === 'complete' || statusLower === 'cancelled') {
        result.tasksSkipped++;
        continue;
      }

      // Check if task already exists
      const existingTask = await prisma.item.findFirst({
        where: {
          sourceMeetingId: meetingRecord.id,
          title: action.action,
        },
      });

      if (existingTask) {
        if (existingTask.deletedAt) {
          result.tasksSkipped++;
          continue;
        }
        const newStatus = mapActionStatus(action.status);
        if (existingTask.status !== newStatus && newStatus !== 'complete') {
          await prisma.item.update({
            where: { id: existingTask.id },
            data: { status: newStatus },
          });
          result.tasksUpdated++;
          result.taskIds.push(existingTask.id);
        } else {
          result.tasksSkipped++;
          result.taskIds.push(existingTask.id);
        }
        continue;
      }

      // Find or create owner
      let ownerId: number | null = null;
      const additionalAssignees: number[] = [];

      if (action.owner) {
        const ownerNames = action.owner
          .split(/[,&]|\band\b/i)
          .map((n) => n.trim())
          .filter((n) => n.length > 0);

        for (let i = 0; i < ownerNames.length; i++) {
          const ownerName = ownerNames[i];
          let person = await prisma.person.findFirst({
            where: { name: { contains: ownerName } },
          });
          if (!person) {
            person = await prisma.person.create({
              data: { name: ownerName },
            });
          }

          if (i === 0) {
            ownerId = person.id;
          } else {
            additionalAssignees.push(person.id);
          }
        }
      }

      // Find project (scoped to meeting's org)
      let projectId: number | null = null;
      const projectSlug = action.project || meeting.primaryProject;
      if (projectSlug) {
        const project = await prisma.project.findFirst({
          where: {
            slug: projectSlug,
            ...(meetingOrg ? { organization: { slug: meetingOrg } } : {}),
          },
        });
        projectId = project?.id || null;
      }

      // Parse due date
      const dueDate = parseDueDate(action.due);

      // Create task
      const newTask = await prisma.item.create({
        data: {
          title: action.action,
          status: mapActionStatus(action.status),
          itemType: 'task',
          dueDate: dueDate ? new Date(dueDate) : null,
          ownerId,
          projectId,
          sourceMeetingId: meetingRecord.id,
          sourceType: 'meeting',
          sourcePath: meeting.path,
        },
      });

      // Link additional assignees
      for (const assigneeId of additionalAssignees) {
        await prisma.itemPerson.create({
          data: {
            itemId: newTask.id,
            personId: assigneeId,
            role: 'assignee',
          },
        });
      }

      result.tasksCreated++;
      result.taskIds.push(newTask.id);
    } catch (error) {
      result.errors.push(`Failed to process action "${action.action}": ${(error as Error).message}`);
    }
  }

  return result;
}

export type SyncRouter = typeof syncRouter;
