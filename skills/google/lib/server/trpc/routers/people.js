/**
 * People Router (tRPC)
 *
 * Type-safe API for person operations.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import { CreatePersonSchema, UpdatePersonSchema, } from '@kw/api-types';
import { formatTaskId } from '@kw/api-types';
// =============================================================================
// HELPER: Format Prisma person to API response
// =============================================================================
function formatPerson(person) {
    return {
        id: person.id,
        name: person.name,
        email: person.email,
        // Always use organization relation - legacy org column is deprecated
        org: (person.organization?.slug || null),
        airtableYaId: person.airtableYaId,
        airtableSvId: person.airtableSvId,
        notes: person.notes,
        createdAt: person.createdAt.toISOString(),
        updatedAt: person.updatedAt.toISOString(),
    };
}
// =============================================================================
// ROUTER
// =============================================================================
export const peopleRouter = router({
    /**
     * List all people with task counts
     */
    list: publicProcedure
        .input(z.object({
        search: z.string().optional(),
        org: z.string().optional(),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
    }).optional())
        .query(async ({ ctx, input }) => {
        const { search, org, limit = 100, offset = 0 } = input || {};
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
            ];
        }
        // Filter by organization relation, not legacy org column
        if (org) {
            where.organization = { slug: org };
        }
        const [people, total] = await Promise.all([
            ctx.prisma.person.findMany({
                where,
                include: {
                    organization: { select: { slug: true } },
                },
                orderBy: { name: 'asc' },
                take: limit,
                skip: offset,
            }),
            ctx.prisma.person.count({ where }),
        ]);
        // Get task counts for each person
        const peopleWithStats = await Promise.all(people.map(async (person) => {
            const [ownedTasks, waitingOnTasks] = await Promise.all([
                ctx.prisma.item.count({
                    where: {
                        ownerId: person.id,
                        status: { notIn: ['complete', 'cancelled'] },
                        deletedAt: null,
                    },
                }),
                ctx.prisma.itemPerson.count({
                    where: {
                        personId: person.id,
                        role: 'waiting_on',
                        item: {
                            status: { notIn: ['complete', 'cancelled'] },
                            deletedAt: null,
                        },
                    },
                }),
            ]);
            return {
                ...formatPerson(person),
                ownedTasks,
                waitingOnTasks,
            };
        }));
        return {
            people: peopleWithStats,
            total,
            limit,
            offset,
        };
    }),
    /**
     * Get a single person by ID
     */
    get: publicProcedure
        .input(z.object({
        id: z.number(),
    }))
        .query(async ({ ctx, input }) => {
        const person = await ctx.prisma.person.findUnique({
            where: { id: input.id },
            include: {
                organization: { select: { slug: true } },
            },
        });
        if (!person) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Person with ID ${input.id} not found`,
            });
        }
        // Get tasks owned by this person
        const ownedTasks = await ctx.prisma.item.findMany({
            where: {
                ownerId: person.id,
                status: { notIn: ['complete', 'cancelled'] },
                deletedAt: null,
            },
            include: {
                project: {
                    select: {
                        slug: true,
                        name: true,
                        organization: { select: { slug: true } },
                    },
                },
            },
            orderBy: [
                { priority: { sort: 'asc', nulls: 'last' } },
                { dueDate: { sort: 'asc', nulls: 'last' } },
            ],
        });
        // Get tasks where this person is waiting_on
        const waitingOnTasks = await ctx.prisma.itemPerson.findMany({
            where: {
                personId: person.id,
                role: 'waiting_on',
                item: {
                    status: { notIn: ['complete', 'cancelled'] },
                    deletedAt: null,
                },
            },
            include: {
                item: {
                    include: {
                        project: {
                            select: {
                                slug: true,
                                name: true,
                                organization: { select: { slug: true } },
                            },
                        },
                        owner: { select: { name: true } },
                    },
                },
            },
        });
        return {
            ...formatPerson(person),
            ownedTasks: ownedTasks.map((item) => ({
                id: item.id,
                displayId: formatTaskId(item.id),
                title: item.title,
                status: item.status,
                priority: item.priority,
                dueDate: item.dueDate?.toISOString().split('T')[0] || null,
                projectSlug: item.project?.slug || null,
                projectName: item.project?.name || null,
            })),
            waitingOnTasks: waitingOnTasks.map((ip) => ({
                id: ip.item.id,
                displayId: formatTaskId(ip.item.id),
                title: ip.item.title,
                status: ip.item.status,
                priority: ip.item.priority,
                dueDate: ip.item.dueDate?.toISOString().split('T')[0] || null,
                ownerName: ip.item.owner?.name || null,
                projectSlug: ip.item.project?.slug || null,
                projectName: ip.item.project?.name || null,
            })),
        };
    }),
    /**
     * Create a new person
     */
    create: publicProcedure
        .input(CreatePersonSchema)
        .mutation(async ({ ctx, input }) => {
        // Look up organization by slug if provided
        let orgId = null;
        if (input.org) {
            const organization = await ctx.prisma.organization.findUnique({
                where: { slug: input.org },
            });
            if (organization) {
                orgId = organization.id;
            }
            // If org slug provided but not found, we silently ignore
            // (person can exist without org)
        }
        const person = await ctx.prisma.person.create({
            data: {
                name: input.name,
                email: input.email || null,
                // Only use orgId FK - legacy org column is deprecated
                orgId,
                airtableYaId: input.airtableYaId || null,
                airtableSvId: input.airtableSvId || null,
                notes: input.notes || null,
            },
            include: {
                organization: { select: { slug: true } },
            },
        });
        return formatPerson(person);
    }),
    /**
     * Update a person
     */
    update: publicProcedure
        .input(z.object({
        id: z.number(),
        data: UpdatePersonSchema,
    }))
        .mutation(async ({ ctx, input }) => {
        try {
            // Look up organization by slug if org is being updated
            let orgId;
            if (input.data.org !== undefined) {
                if (input.data.org) {
                    const organization = await ctx.prisma.organization.findUnique({
                        where: { slug: input.data.org },
                    });
                    orgId = organization?.id || null;
                }
                else {
                    orgId = null; // Clearing org
                }
            }
            const person = await ctx.prisma.person.update({
                where: { id: input.id },
                data: {
                    ...(input.data.name !== undefined && { name: input.data.name }),
                    ...(input.data.email !== undefined && { email: input.data.email }),
                    // Only use orgId FK - legacy org column is deprecated
                    ...(orgId !== undefined && { orgId }),
                    ...(input.data.notes !== undefined && { notes: input.data.notes }),
                },
                include: {
                    organization: { select: { slug: true } },
                },
            });
            return formatPerson(person);
        }
        catch (e) {
            if (e.code === 'P2025') {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Person with ID ${input.id} not found`,
                });
            }
            throw e;
        }
    }),
    /**
     * Find person by name
     */
    findByName: publicProcedure
        .input(z.object({
        name: z.string(),
    }))
        .query(async ({ ctx, input }) => {
        const person = await ctx.prisma.person.findFirst({
            where: { name: { contains: input.name } },
            include: {
                organization: { select: { slug: true } },
            },
        });
        return person ? formatPerson(person) : null;
    }),
    /**
     * Delete a person
     */
    delete: publicProcedure
        .input(z.object({
        id: z.number(),
    }))
        .mutation(async ({ ctx, input }) => {
        try {
            // First, unassign any items owned by this person
            await ctx.prisma.item.updateMany({
                where: { ownerId: input.id },
                data: { ownerId: null },
            });
            // Delete the person
            await ctx.prisma.person.delete({
                where: { id: input.id },
            });
            return { deleted: true };
        }
        catch (e) {
            if (e.code === 'P2025') {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Person not found',
                });
            }
            throw e;
        }
    }),
});
