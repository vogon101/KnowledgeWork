/**
 * Organizations Router (tRPC)
 *
 * Type-safe API for organization operations.
 * Organizations represent workstreams/clients (Acme Corp, Example Org, etc.)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { mkdir, writeFile } from 'fs/promises';
import { router, publicProcedure } from '../trpc.js';
import { resolveKBPath } from '../../services/paths.js';
// =============================================================================
// Schemas
// =============================================================================
const OrganizationSchema = z.object({
    id: z.number(),
    slug: z.string(),
    name: z.string(),
    shortName: z.string().nullable(),
    description: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
const CreateOrganizationSchema = z.object({
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    name: z.string().min(1),
    shortName: z.string().optional(),
    description: z.string().optional(),
});
const UpdateOrganizationSchema = z.object({
    name: z.string().min(1).optional(),
    shortName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    color: z.enum(['indigo', 'teal', 'rose', 'orange']).nullable().optional(),
});
// =============================================================================
// Helper: Format organization for API response
// =============================================================================
function formatOrganization(org) {
    return {
        id: org.id,
        slug: org.slug,
        name: org.name,
        shortName: org.shortName,
        description: org.description,
        color: org.color,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
    };
}
// =============================================================================
// ROUTER
// =============================================================================
export const organizationsRouter = router({
    /**
     * List all organizations
     */
    list: publicProcedure
        .query(async ({ ctx }) => {
        const orgs = await ctx.prisma.organization.findMany({
            orderBy: { name: 'asc' },
        });
        return {
            organizations: orgs.map(formatOrganization),
            count: orgs.length,
        };
    }),
    /**
     * Get a specific organization by slug
     */
    get: publicProcedure
        .input(z.object({
        slug: z.string(),
    }))
        .query(async ({ ctx, input }) => {
        const org = await ctx.prisma.organization.findUnique({
            where: { slug: input.slug },
            include: {
                _count: {
                    select: {
                        projects: true,
                        people: true,
                    },
                },
            },
        });
        if (!org) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Organization not found: ${input.slug}`,
            });
        }
        return {
            ...formatOrganization(org),
            projectCount: org._count.projects,
            peopleCount: org._count.people,
        };
    }),
    /**
     * Create a new organization
     */
    create: publicProcedure
        .input(CreateOrganizationSchema)
        .mutation(async ({ ctx, input }) => {
        // Check if slug already exists
        const existing = await ctx.prisma.organization.findUnique({
            where: { slug: input.slug },
        });
        if (existing) {
            throw new TRPCError({
                code: 'CONFLICT',
                message: `Organization with slug '${input.slug}' already exists`,
            });
        }
        const org = await ctx.prisma.organization.create({
            data: {
                slug: input.slug,
                name: input.name,
                shortName: input.shortName || null,
                description: input.description || null,
            },
        });
        // Auto-create _general project for org-level tasks
        await ctx.prisma.project.create({
            data: {
                slug: '_general',
                name: input.name, // Use org name as project name
                orgId: org.id,
                isGeneral: true,
                status: 'active',
            },
        });
        // Create filesystem folder and README for _general project
        try {
            const generalDir = resolveKBPath(`${input.slug}/projects/_general`);
            await mkdir(generalDir, { recursive: true });
            const readmeContent = `---
type: project
title: ${input.name}
status: active
isGeneral: true
---

# ${input.name}

General tasks and activities for ${input.name} that aren't tied to a specific project.
`;
            await writeFile(`${generalDir}/README.md`, readmeContent);
        }
        catch (err) {
            // Log but don't fail if filesystem creation fails
            console.warn(`Failed to create filesystem for _general project: ${err}`);
        }
        return formatOrganization(org);
    }),
    /**
     * Update an organization
     */
    update: publicProcedure
        .input(z.object({
        slug: z.string(),
        data: UpdateOrganizationSchema,
    }))
        .mutation(async ({ ctx, input }) => {
        const org = await ctx.prisma.organization.findUnique({
            where: { slug: input.slug },
        });
        if (!org) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Organization not found: ${input.slug}`,
            });
        }
        const updated = await ctx.prisma.organization.update({
            where: { slug: input.slug },
            data: {
                ...(input.data.name !== undefined && { name: input.data.name }),
                ...(input.data.shortName !== undefined && { shortName: input.data.shortName }),
                ...(input.data.description !== undefined && { description: input.data.description }),
                ...(input.data.color !== undefined && { color: input.data.color }),
            },
        });
        return formatOrganization(updated);
    }),
    /**
     * Delete an organization (only if no projects/people reference it)
     */
    delete: publicProcedure
        .input(z.object({
        slug: z.string(),
    }))
        .mutation(async ({ ctx, input }) => {
        const org = await ctx.prisma.organization.findUnique({
            where: { slug: input.slug },
            include: {
                _count: {
                    select: {
                        projects: true,
                        people: true,
                    },
                },
            },
        });
        if (!org) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Organization not found: ${input.slug}`,
            });
        }
        if (org._count.projects > 0 || org._count.people > 0) {
            throw new TRPCError({
                code: 'PRECONDITION_FAILED',
                message: `Cannot delete organization with ${org._count.projects} projects and ${org._count.people} people`,
            });
        }
        await ctx.prisma.organization.delete({
            where: { slug: input.slug },
        });
        return { deleted: true };
    }),
    /**
     * Force delete an organization and all its contents
     *
     * This cascades:
     * - Soft-deletes all items in all projects
     * - Deletes all projects
     * - Unlinks all people (sets orgId to null)
     * - Deletes the organization
     */
    deleteForce: publicProcedure
        .input(z.object({
        slug: z.string(),
        deleteItems: z.boolean().default(true), // Soft-delete items
        deletePeople: z.boolean().default(false), // Whether to delete people or just unlink
    }))
        .mutation(async ({ ctx, input }) => {
        const org = await ctx.prisma.organization.findUnique({
            where: { slug: input.slug },
            include: {
                projects: { select: { id: true, slug: true } },
                people: { select: { id: true } },
                _count: {
                    select: {
                        projects: true,
                        people: true,
                    },
                },
            },
        });
        if (!org) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Organization not found: ${input.slug}`,
            });
        }
        const projectCount = org._count.projects;
        const peopleCount = org._count.people;
        // Handle items in all projects
        if (projectCount > 0 && input.deleteItems) {
            const projectIds = org.projects.map(p => p.id);
            await ctx.prisma.item.updateMany({
                where: { projectId: { in: projectIds } },
                data: { deletedAt: new Date() },
            });
        }
        // Delete all projects (MeetingProject will cascade)
        if (projectCount > 0) {
            await ctx.prisma.project.deleteMany({
                where: { orgId: org.id },
            });
        }
        // Handle people
        if (peopleCount > 0) {
            if (input.deletePeople) {
                // Delete all people in the org
                await ctx.prisma.person.deleteMany({
                    where: { orgId: org.id },
                });
            }
            else {
                // Just unlink people from the org
                await ctx.prisma.person.updateMany({
                    where: { orgId: org.id },
                    data: { orgId: null },
                });
            }
        }
        // Delete the organization
        await ctx.prisma.organization.delete({
            where: { slug: input.slug },
        });
        return {
            deleted: true,
            projectsDeleted: projectCount,
            peopleAffected: peopleCount,
        };
    }),
});
