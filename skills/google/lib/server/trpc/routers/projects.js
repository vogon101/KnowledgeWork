/**
 * Projects Router (tRPC)
 *
 * Type-safe API for project operations.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import { CreateProjectSchema, UpdateProjectSchema, ProjectOrgSchema, ORG_COLORS, } from '@kw/api-types';
// =============================================================================
// HELPER: Format Prisma project to API response
// =============================================================================
function formatProject(project) {
    // Always use organization relation - legacy org column is deprecated
    const orgSlug = project.organization?.slug || 'other';
    return {
        id: project.id,
        slug: project.slug,
        name: project.name,
        org: orgSlug,
        status: project.status,
        priority: project.priority,
        parentId: project.parentId,
        description: project.description,
        isGeneral: project.isGeneral,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        parentSlug: project.parent?.slug || null,
        parentName: project.parent?.name || null,
        fullPath: project.parent?.slug
            ? `${project.parent.slug}/${project.slug}`
            : project.slug,
        // Include organization details from relation
        organizationName: project.organization?.name,
        organizationShortName: project.organization?.shortName || null,
        organizationColor: project.organization?.color &&
            ORG_COLORS.includes(project.organization.color)
            ? project.organization.color
            : null,
    };
}
// =============================================================================
// ROUTER
// =============================================================================
export const projectsRouter = router({
    /**
     * List all projects
     */
    list: publicProcedure
        .input(z.object({
        org: ProjectOrgSchema.optional(),
        status: z.string().optional(),
        includeChildren: z.boolean().optional().default(true),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
    }).optional())
        .query(async ({ ctx, input }) => {
        const { org, status, includeChildren = true, limit = 100, offset = 0 } = input || {};
        const where = {};
        // Filter by organization relation, not legacy org column
        if (org)
            where.organization = { slug: org };
        if (status)
            where.status = status;
        if (!includeChildren)
            where.parentId = null;
        const [projects, total] = await Promise.all([
            ctx.prisma.project.findMany({
                where,
                include: {
                    parent: { select: { slug: true, name: true } },
                    organization: { select: { slug: true, name: true, shortName: true, color: true } },
                    _count: { select: { children: true } },
                },
                orderBy: [
                    { priority: { sort: 'asc', nulls: 'last' } },
                    { name: 'asc' },
                ],
                take: limit,
                skip: offset,
            }),
            ctx.prisma.project.count({ where }),
        ]);
        return {
            projects: projects.map((p) => ({
                ...formatProject(p),
                childCount: p._count.children,
            })),
            total,
            limit,
            offset,
        };
    }),
    /**
     * Get a single project by slug
     */
    get: publicProcedure
        .input(z.object({
        slug: z.string(),
        org: z.string().optional(),
    }))
        .query(async ({ ctx, input }) => {
        const where = { slug: input.slug };
        // Filter by organization relation, not legacy org column
        if (input.org)
            where.organization = { slug: input.org };
        const project = await ctx.prisma.project.findFirst({
            where,
            include: {
                parent: { select: { slug: true, name: true } },
                organization: { select: { slug: true, name: true, shortName: true, color: true } },
                children: {
                    select: { id: true, slug: true, name: true, status: true },
                    orderBy: { name: 'asc' },
                },
            },
        });
        if (!project) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Project "${input.slug}" not found`,
            });
        }
        // Get task stats
        const taskStats = await ctx.prisma.item.groupBy({
            by: ['status'],
            where: { projectId: project.id, deletedAt: null },
            _count: true,
        });
        const stats = {
            total: 0,
            pending: 0,
            in_progress: 0,
            complete: 0,
            blocked: 0,
            cancelled: 0,
        };
        for (const stat of taskStats) {
            stats.total += stat._count;
            if (stat.status in stats) {
                stats[stat.status] = stat._count;
            }
        }
        return {
            ...formatProject(project),
            children: project.children,
            taskStats: stats,
        };
    }),
    /**
     * Create a new project
     */
    create: publicProcedure
        .input(CreateProjectSchema)
        .mutation(async ({ ctx, input }) => {
        // Look up organization by slug - must exist
        const organization = await ctx.prisma.organization.findUnique({
            where: { slug: input.org },
        });
        if (!organization) {
            throw new Error(`Organization '${input.org}' not found. Create the organization first.`);
        }
        const project = await ctx.prisma.project.create({
            data: {
                slug: input.slug,
                name: input.name,
                // Only use orgId FK - legacy org column is deprecated
                orgId: organization.id,
                status: input.status || null,
                priority: input.priority || null,
                parentId: input.parentId || null,
                description: input.description || null,
            },
            include: {
                parent: { select: { slug: true, name: true } },
                organization: { select: { slug: true, name: true, shortName: true, color: true } },
            },
        });
        return formatProject(project);
    }),
    /**
     * Update a project
     */
    update: publicProcedure
        .input(z.object({
        id: z.number(),
        data: UpdateProjectSchema,
    }))
        .mutation(async ({ ctx, input }) => {
        try {
            // If org is being updated, look up the organization - must exist
            let orgId;
            if (input.data.org !== undefined) {
                const organization = await ctx.prisma.organization.findUnique({
                    where: { slug: input.data.org },
                });
                if (!organization) {
                    throw new Error(`Organization '${input.data.org}' not found. Create the organization first.`);
                }
                orgId = organization.id;
            }
            const project = await ctx.prisma.project.update({
                where: { id: input.id },
                data: {
                    ...(input.data.slug !== undefined && { slug: input.data.slug }),
                    ...(input.data.name !== undefined && { name: input.data.name }),
                    // Only use orgId FK - legacy org column is deprecated
                    ...(orgId !== undefined && { orgId }),
                    ...(input.data.status !== undefined && { status: input.data.status }),
                    ...(input.data.priority !== undefined && { priority: input.data.priority }),
                    ...(input.data.description !== undefined && { description: input.data.description }),
                },
                include: {
                    parent: { select: { slug: true, name: true } },
                    organization: { select: { slug: true, name: true, shortName: true, color: true } },
                },
            });
            return formatProject(project);
        }
        catch (e) {
            if (e.code === 'P2025') {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Project with ID ${input.id} not found`,
                });
            }
            throw e;
        }
    }),
    /**
     * Resolve a project slug to its full path (for URL construction)
     */
    resolvePath: publicProcedure
        .input(z.object({
        slug: z.string(),
        org: z.string().optional(),
    }))
        .query(async ({ ctx, input }) => {
        const where = { slug: input.slug };
        // Filter by organization relation, not legacy org column
        if (input.org)
            where.organization = { slug: input.org };
        const project = await ctx.prisma.project.findFirst({
            where,
            include: {
                parent: { select: { slug: true } },
                organization: { select: { slug: true } },
            },
        });
        if (!project) {
            return null;
        }
        const path = {
            // Always use organization relation
            org: project.organization?.slug || 'other',
            slug: project.slug,
            parentSlug: project.parent?.slug || null,
            fullPath: project.parent?.slug
                ? `${project.parent.slug}/${project.slug}`
                : project.slug,
        };
        return path;
    }),
    /**
     * Delete a project
     *
     * Options:
     * - cascade: Delete all items, child projects, and meeting links
     * - orphan: Move items and child projects to parent (or unset if no parent)
     * - fail: Fail if project has any references (default)
     */
    delete: publicProcedure
        .input(z.object({
        id: z.number(),
        onItems: z.enum(['cascade', 'orphan', 'fail']).default('fail'),
        onChildren: z.enum(['cascade', 'orphan', 'fail']).default('fail'),
    }))
        .mutation(async ({ ctx, input }) => {
        const project = await ctx.prisma.project.findUnique({
            where: { id: input.id },
            include: {
                _count: {
                    select: {
                        items: { where: { deletedAt: null } },
                        children: true,
                    },
                },
                organization: { select: { slug: true } },
            },
        });
        if (!project) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Project with ID ${input.id} not found`,
            });
        }
        const itemCount = project._count.items;
        const childCount = project._count.children;
        // Check for items
        if (itemCount > 0) {
            if (input.onItems === 'fail') {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: `Cannot delete project with ${itemCount} items. Use --cascade-items or --orphan-items`,
                });
            }
            if (input.onItems === 'orphan') {
                // Move items to parent project (or unset)
                await ctx.prisma.item.updateMany({
                    where: { projectId: input.id },
                    data: { projectId: project.parentId },
                });
            }
            else if (input.onItems === 'cascade') {
                // Delete all items (soft delete via deletedAt)
                await ctx.prisma.item.updateMany({
                    where: { projectId: input.id },
                    data: { deletedAt: new Date() },
                });
            }
        }
        // Check for children
        if (childCount > 0) {
            if (input.onChildren === 'fail') {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: `Cannot delete project with ${childCount} child projects. Use --cascade-children or --orphan-children`,
                });
            }
            if (input.onChildren === 'orphan') {
                // Move children to parent project (or unset)
                await ctx.prisma.project.updateMany({
                    where: { parentId: input.id },
                    data: { parentId: project.parentId },
                });
            }
            else if (input.onChildren === 'cascade') {
                // Recursively get all descendant project IDs
                const getAllDescendantIds = async (parentId) => {
                    const children = await ctx.prisma.project.findMany({
                        where: { parentId },
                        select: { id: true },
                    });
                    const childIds = children.map(c => c.id);
                    const descendantIds = [];
                    for (const childId of childIds) {
                        descendantIds.push(childId, ...(await getAllDescendantIds(childId)));
                    }
                    return descendantIds;
                };
                const descendantIds = await getAllDescendantIds(input.id);
                if (descendantIds.length > 0) {
                    // Soft delete all items in descendant projects
                    await ctx.prisma.item.updateMany({
                        where: { projectId: { in: descendantIds } },
                        data: { deletedAt: new Date() },
                    });
                    // Delete all descendant projects
                    await ctx.prisma.project.deleteMany({
                        where: { id: { in: descendantIds } },
                    });
                }
            }
        }
        // MeetingProject relations will cascade-delete automatically
        // Now delete the project
        await ctx.prisma.project.delete({
            where: { id: input.id },
        });
        return {
            deleted: true,
            slug: project.slug,
            org: project.organization?.slug || null,
            itemsAffected: itemCount,
            childrenAffected: childCount,
        };
    }),
    /**
     * List projects with task statistics (for dashboard project progress)
     */
    withTaskStats: publicProcedure
        .input(z.object({
        status: z.string().optional(),
        sortBy: z.enum(['activity', 'name', 'priority']).optional().default('activity'),
        limit: z.number().optional().default(20),
    }).optional())
        .query(async ({ ctx, input }) => {
        const { status, sortBy = 'activity', limit = 20 } = input || {};
        const where = {};
        if (status)
            where.status = status;
        // Get all projects with item stats
        const projects = await ctx.prisma.project.findMany({
            where,
            include: {
                parent: { select: { slug: true, name: true } },
                organization: { select: { slug: true, name: true, shortName: true, color: true } },
                _count: { select: { children: true } },
            },
            orderBy: [
                { priority: { sort: 'asc', nulls: 'last' } },
                { name: 'asc' },
            ],
        });
        // Get task stats for each project in parallel
        const projectsWithStats = await Promise.all(projects.map(async (project) => {
            const taskStats = await ctx.prisma.item.groupBy({
                by: ['status'],
                where: { projectId: project.id, deletedAt: null },
                _count: true,
            });
            const stats = {
                total: 0,
                pending: 0,
                in_progress: 0,
                complete: 0,
                blocked: 0,
                cancelled: 0,
            };
            for (const stat of taskStats) {
                stats.total += stat._count;
                if (stat.status in stats) {
                    stats[stat.status] = stat._count;
                }
            }
            // Get recent activity count (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const recentActivityCount = await ctx.prisma.activity.count({
                where: {
                    item: { projectId: project.id, deletedAt: null },
                    createdAt: { gte: weekAgo },
                },
            });
            // Get recent completions count (last 7 days)
            const recentCompletions = await ctx.prisma.item.count({
                where: {
                    projectId: project.id,
                    deletedAt: null,
                    status: 'complete',
                    completedAt: { gte: weekAgo },
                },
            });
            // Get tasks due this week and today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 8); // +8 to include full 7th day
            const [dueToday, dueThisWeek, checkinsToday, checkinsThisWeek] = await Promise.all([
                // Tasks due today
                ctx.prisma.item.count({
                    where: {
                        projectId: project.id,
                        deletedAt: null,
                        status: { notIn: ['complete', 'cancelled'] },
                        dueDate: { gte: today, lt: tomorrow },
                    },
                }),
                // Tasks due this week (excluding today to avoid double counting)
                ctx.prisma.item.count({
                    where: {
                        projectId: project.id,
                        deletedAt: null,
                        status: { notIn: ['complete', 'cancelled'] },
                        dueDate: {
                            gte: tomorrow,
                            lt: weekFromNow,
                        },
                    },
                }),
                // Check-ins due today
                ctx.prisma.checkIn.count({
                    where: {
                        item: { projectId: project.id, deletedAt: null },
                        completed: false,
                        date: { gte: today, lt: tomorrow },
                    },
                }),
                // Check-ins due this week (excluding today)
                ctx.prisma.checkIn.count({
                    where: {
                        item: { projectId: project.id, deletedAt: null },
                        completed: false,
                        date: {
                            gte: tomorrow,
                            lt: weekFromNow,
                        },
                    },
                }),
            ]);
            return {
                ...formatProject(project),
                childCount: project._count.children,
                taskStats: stats,
                recentActivityCount,
                recentCompletions,
                dueToday,
                dueThisWeek,
                checkinsToday,
                checkinsThisWeek,
                // Compute an "activity score" for sorting
                activityScore: recentActivityCount + recentCompletions * 2 + stats.in_progress + stats.blocked * 0.5,
            };
        }));
        // Sort based on sortBy
        let sorted = projectsWithStats;
        if (sortBy === 'activity') {
            sorted = projectsWithStats.sort((a, b) => b.activityScore - a.activityScore);
        }
        else if (sortBy === 'name') {
            sorted = projectsWithStats.sort((a, b) => a.name.localeCompare(b.name));
        }
        else if (sortBy === 'priority') {
            sorted = projectsWithStats.sort((a, b) => {
                const aPri = a.priority ?? 999;
                const bPri = b.priority ?? 999;
                return aPri - bPri;
            });
        }
        return {
            projects: sorted.slice(0, limit),
            total: projects.length,
        };
    }),
});
