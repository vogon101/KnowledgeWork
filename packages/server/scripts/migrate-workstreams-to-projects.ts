/**
 * Migration: Move workstreams from items table to projects table
 *
 * - Converts goal items (IDs 1094, 1095) to item_type = 'task'
 * - For each workstream item: creates a child project row, then deletes the item
 *
 * Usage:
 *   npx tsx scripts/migrate-workstreams-to-projects.ts [--dry-run]
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

// Map item statuses to project statuses
function mapItemStatusToProjectStatus(status: string): string {
  switch (status) {
    case 'active':
    case 'in_progress':
      return 'active';
    case 'pending':
      return 'planning';
    case 'blocked':
    case 'paused':
      return 'paused';
    case 'complete':
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'archived';
    default:
      return 'active';
  }
}

async function main() {
  console.log(`Migration: workstreams → projects ${dryRun ? '(DRY RUN)' : ''}\n`);

  // Step 1: Convert goals to tasks
  const goals = await prisma.item.findMany({
    where: { itemType: 'goal', deletedAt: null },
    select: { id: true, title: true },
  });

  console.log(`Found ${goals.length} goal items to convert to tasks:`);
  for (const goal of goals) {
    console.log(`  - T-${goal.id}: ${goal.title}`);
    if (!dryRun) {
      await prisma.item.update({
        where: { id: goal.id },
        data: { itemType: 'task' },
      });
    }
  }

  // Step 2: Convert workstreams to child projects
  const workstreams = await prisma.item.findMany({
    where: { itemType: 'workstream', deletedAt: null },
    include: {
      project: {
        select: { id: true, slug: true, name: true, orgId: true },
      },
    },
  });

  console.log(`\nFound ${workstreams.length} workstream items to migrate to projects:`);
  for (const ws of workstreams) {
    const projectStatus = mapItemStatusToProjectStatus(ws.status);
    console.log(`  - T-${ws.id}: "${ws.title}" (status: ${ws.status} → ${projectStatus}, parent: ${ws.project?.slug || 'none'})`);

    if (!dryRun && ws.project) {
      // Check if child project already exists
      const existing = await prisma.project.findFirst({
        where: {
          slug: ws.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          parentId: ws.project.id,
        },
      });

      if (existing) {
        console.log(`    → Child project already exists (id: ${existing.id}), skipping creation`);
      } else {
        const slug = ws.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const newProject = await prisma.project.create({
          data: {
            slug,
            name: ws.title,
            orgId: ws.project.orgId,
            parentId: ws.project.id,
            status: projectStatus,
            priority: ws.priority,
          },
        });
        console.log(`    → Created project id: ${newProject.id}, slug: "${slug}"`);
      }

      // Delete the workstream item
      await prisma.item.delete({ where: { id: ws.id } });
      console.log(`    → Deleted item T-${ws.id}`);
    }
  }

  // Step 3: Also convert any soft-deleted goals/workstreams
  if (!dryRun) {
    const deletedGoals = await prisma.item.updateMany({
      where: { itemType: 'goal' },
      data: { itemType: 'task' },
    });
    if (deletedGoals.count > 0) {
      console.log(`\nConverted ${deletedGoals.count} remaining (deleted) goal items to tasks`);
    }

    // Soft-deleted workstreams: just convert to task type so they don't break queries
    const deletedWorkstreams = await prisma.item.updateMany({
      where: { itemType: 'workstream' },
      data: { itemType: 'task' },
    });
    if (deletedWorkstreams.count > 0) {
      console.log(`Converted ${deletedWorkstreams.count} remaining (deleted) workstream items to tasks`);
    }
  }

  console.log(`\nMigration ${dryRun ? 'preview' : ''} complete.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
