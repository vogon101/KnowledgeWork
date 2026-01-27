/**
 * Migration Script: Sub-Projects → Workstreams
 *
 * This script migrates sub-project records to workstream Items and updates
 * the corresponding markdown files.
 *
 * Run with: npx tsx scripts/migrate-subprojects.ts
 *
 * Options:
 *   --dry-run   Preview changes without applying them
 *   --no-backup Skip backup creation (not recommended)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { PrismaClient } from '../src/generated/prisma/index.js';

const KNOWLEDGE_BASE_PATH = process.env.KNOWLEDGE_BASE_PATH || '.';
const prisma = new PrismaClient();

// Files known to have type: sub-project
const SUBPROJECT_FILES = [
  'example-org/projects/energy/nuclear.md',
  'example-org/projects/energy/analytics-dashboard.md',
  'acme-corp/projects/ya-management/employment-transition.md',
  'acme-corp/projects/ya-management/donations.md',
];

interface MigrationResult {
  filesUpdated: string[];
  itemsCreated: number;
  tasksUpdated: number;
  projectsDeleted: number;
  errors: string[];
}

async function createBackup(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3004/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('Backup failed:', await response.text());
      return false;
    }

    const result = await response.json();
    console.log(`✓ Backup created: ${result.data?.backupFile}`);
    return true;
  } catch (error) {
    console.error('Backup error:', (error as Error).message);
    return false;
  }
}

function updateMarkdownFile(filePath: string, dryRun: boolean): { success: boolean; error?: string } {
  const absolutePath = join(KNOWLEDGE_BASE_PATH, filePath);

  if (!existsSync(absolutePath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }

  try {
    const content = readFileSync(absolutePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    if (frontmatter.type !== 'sub-project') {
      return { success: false, error: `File does not have type: sub-project` };
    }

    // Update the type
    const updatedFrontmatter = {
      ...frontmatter,
      type: 'workstream',
    };

    if (dryRun) {
      console.log(`  Would update: ${filePath}`);
      console.log(`    type: sub-project → type: workstream`);
      return { success: true };
    }

    const newContent = matter.stringify(body, updatedFrontmatter);
    writeFileSync(absolutePath, newContent, 'utf-8');
    console.log(`  ✓ Updated: ${filePath}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function migrateSubprojectToWorkstream(
  subprojectSlug: string,
  dryRun: boolean
): Promise<{ itemId?: number; error?: string }> {
  // Find the sub-project as a Project record
  const subproject = await prisma.project.findFirst({
    where: {
      slug: subprojectSlug,
      parentId: { not: null }, // Sub-projects have a parent
    },
    include: { parent: true },
  });

  if (!subproject) {
    return { error: `Sub-project not found in database: ${subprojectSlug}` };
  }

  if (dryRun) {
    console.log(`  Would create Item from Project: ${subproject.name} (id=${subproject.id})`);
    return { itemId: -1 };
  }

  // Create workstream Item
  const item = await prisma.item.create({
    data: {
      title: subproject.name,
      itemType: 'workstream',
      status: subproject.status || 'active',
      priority: subproject.priority,
      projectId: subproject.parentId!, // Link to parent project
      filePath: subproject.filePath,
      fileHash: subproject.fileHash,
      description: subproject.description,
      sourceType: 'file',
      sourcePath: subproject.filePath,
    },
  });

  console.log(`  ✓ Created Item: ${item.title} (id=${item.id})`);
  return { itemId: item.id };
}

async function updateTasksForSubproject(
  oldProjectId: number,
  newProjectId: number,
  dryRun: boolean
): Promise<number> {
  const tasks = await prisma.item.findMany({
    where: {
      projectId: oldProjectId,
      itemType: 'task',
    },
  });

  if (tasks.length === 0) return 0;

  if (dryRun) {
    console.log(`  Would update ${tasks.length} tasks to new project`);
    return tasks.length;
  }

  await prisma.item.updateMany({
    where: {
      projectId: oldProjectId,
      itemType: 'task',
    },
    data: {
      projectId: newProjectId,
    },
  });

  console.log(`  ✓ Updated ${tasks.length} tasks`);
  return tasks.length;
}

async function deleteSubprojectRecord(
  slug: string,
  dryRun: boolean
): Promise<boolean> {
  const subproject = await prisma.project.findFirst({
    where: {
      slug,
      parentId: { not: null },
    },
  });

  if (!subproject) return false;

  if (dryRun) {
    console.log(`  Would delete Project record: ${subproject.name} (id=${subproject.id})`);
    return true;
  }

  await prisma.project.delete({
    where: { id: subproject.id },
  });

  console.log(`  ✓ Deleted Project record: ${subproject.name}`);
  return true;
}

async function runMigration(dryRun: boolean, skipBackup: boolean): Promise<MigrationResult> {
  const result: MigrationResult = {
    filesUpdated: [],
    itemsCreated: 0,
    tasksUpdated: 0,
    projectsDeleted: 0,
    errors: [],
  };

  console.log('\n=== Sub-Project → Workstream Migration ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}\n`);

  // Step 1: Create backup
  if (!dryRun && !skipBackup) {
    console.log('Step 1: Creating backup...');
    const backupOk = await createBackup();
    if (!backupOk) {
      result.errors.push('Backup failed - aborting migration');
      return result;
    }
  } else {
    console.log('Step 1: Skipping backup');
  }

  // Step 2: Update markdown files
  console.log('\nStep 2: Updating markdown files...');
  for (const filePath of SUBPROJECT_FILES) {
    const updateResult = updateMarkdownFile(filePath, dryRun);
    if (updateResult.success) {
      result.filesUpdated.push(filePath);
    } else {
      result.errors.push(`${filePath}: ${updateResult.error}`);
    }
  }

  // Step 3: Create workstream Items from sub-project Project records
  console.log('\nStep 3: Creating workstream Items...');

  // Get all sub-projects (Projects with a parent)
  const subprojects = await prisma.project.findMany({
    where: { parentId: { not: null } },
    include: { parent: true },
  });

  for (const subproject of subprojects) {
    console.log(`\nProcessing: ${subproject.name}`);

    // Create workstream Item
    const itemResult = await migrateSubprojectToWorkstream(subproject.slug, dryRun);
    if (itemResult.error) {
      result.errors.push(itemResult.error);
      continue;
    }
    if (itemResult.itemId && itemResult.itemId > 0) {
      result.itemsCreated++;
    }

    // Step 4: Update tasks referencing this sub-project
    if (subproject.parentId) {
      const tasksUpdated = await updateTasksForSubproject(
        subproject.id,
        subproject.parentId,
        dryRun
      );
      result.tasksUpdated += tasksUpdated;
    }

    // Step 5: Delete the sub-project Project record
    const deleted = await deleteSubprojectRecord(subproject.slug, dryRun);
    if (deleted) {
      result.projectsDeleted++;
    }
  }

  // Step 6: Run filesystem sync to populate filePath/fileHash
  if (!dryRun) {
    console.log('\nStep 6: Running filesystem sync...');
    try {
      const response = await fetch('http://localhost:3004/sync/filesystem', {
        method: 'POST',
      });
      const syncResult = await response.json();
      console.log(`  ✓ Filesystem sync: ${syncResult.data?.summary?.synced || 0} workstreams synced`);
    } catch (error) {
      result.errors.push(`Filesystem sync failed: ${(error as Error).message}`);
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipBackup = args.includes('--no-backup');

  try {
    const result = await runMigration(dryRun, skipBackup);

    console.log('\n=== Migration Summary ===');
    console.log(`Files updated: ${result.filesUpdated.length}`);
    console.log(`Items created: ${result.itemsCreated}`);
    console.log(`Tasks updated: ${result.tasksUpdated}`);
    console.log(`Projects deleted: ${result.projectsDeleted}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    }

    if (dryRun) {
      console.log('\n⚠️  This was a dry run. No changes were made.');
      console.log('Run without --dry-run to apply changes.');
    } else {
      console.log('\n✓ Migration complete!');
    }
  } catch (error) {
    console.error('Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
