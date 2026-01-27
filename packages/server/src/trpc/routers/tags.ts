/**
 * Tags Router (tRPC)
 *
 * Type-safe API for tag management operations.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import type { Prisma } from '../../generated/prisma/index.js';

// =============================================================================
// ROUTER
// =============================================================================

export const tagsRouter = router({
  /**
   * List all tags
   */
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().optional().default(100),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { search, limit } = input || {};

      const tags = await ctx.prisma.tag.findMany({
        where: search ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        } : undefined,
        include: {
          _count: {
            select: { items: true },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
      });

      return tags.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        description: t.description,
        itemCount: t._count.items,
      }));
    }),

  /**
   * Get a single tag by ID or name
   */
  get: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!input.id && !input.name) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either id or name required' });
      }

      const tag = await ctx.prisma.tag.findFirst({
        where: input.id ? { id: input.id } : { name: input.name },
        include: {
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  itemType: true,
                },
              },
            },
          },
        },
      });

      if (!tag) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Tag not found: ${input.id || input.name}` });
      }

      return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        items: tag.items.map(it => ({
          id: it.item.id,
          title: it.item.title,
          status: it.item.status,
          itemType: it.item.itemType,
        })),
      };
    }),

  /**
   * Create a new tag
   */
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      color: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const tag = await ctx.prisma.tag.create({
          data: {
            name: input.name,
            color: input.color,
            description: input.description,
          },
        });

        return {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          description: tag.description,
        };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Tag already exists: ${input.name}`,
          });
        }
        throw e;
      }
    }),

  /**
   * Update a tag
   */
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      color: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Prisma.TagUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.description !== undefined) updateData.description = data.description;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      try {
        const tag = await ctx.prisma.tag.update({
          where: { id },
          data: updateData,
        });

        return {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          description: tag.description,
        };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2025') {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Tag ${id} not found` });
        }
        if ((e as { code?: string }).code === 'P2002') {
          throw new TRPCError({ code: 'CONFLICT', message: `Tag name already exists: ${data.name}` });
        }
        throw e;
      }
    }),

  /**
   * Delete a tag
   */
  delete: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Delete associated ItemTag records first
        await ctx.prisma.itemTag.deleteMany({
          where: { tagId: input.id },
        });

        await ctx.prisma.tag.delete({
          where: { id: input.id },
        });

        return { deleted: true, id: input.id };
      } catch (e) {
        if ((e as { code?: string }).code === 'P2025') {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Tag ${input.id} not found` });
        }
        throw e;
      }
    }),
});

export type TagsRouter = typeof tagsRouter;
