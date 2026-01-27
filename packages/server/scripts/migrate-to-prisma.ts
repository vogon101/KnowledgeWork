/**
 * Migration script: tasks table → items table
 *
 * This script migrates data from the old schema (better-sqlite3) to the new
 * Prisma schema with the unified Item model.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-prisma.ts [--dry-run] [--verify-only]
 *
 * Options:
 *   --dry-run      Show what would be migrated without making changes
 *   --verify-only  Only verify the migration (requires previous run)
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, copyFileSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths
const OLD_DB_PATH = join(__dirname, '../../data/tasks.db');
const NEW_DB_PATH = join(__dirname, '../../data/items.db');
const BACKUP_PATH = join(__dirname, '../../data/tasks.db.backup');

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERIFY_ONLY = args.includes('--verify-only');

interface OldTask {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: number | null;
  task_type: string;
  due_date: string | null;
  checkin_by: string | null;
  checkin_completed_at: string | null;
  target_period: string | null;
  owner_id: number | null;
  project_id: number | null;
  workstream_id: number | null;
  parent_task_id: number | null;
  blocked_by_task_id: number | null;
  source_meeting_id: number | null;
  due_meeting_id: number | null;
  source_type: string | null;
  source_path: string | null;
  source_line: number | null;
  todoist_id: string | null;
  todoist_sync_enabled: number;
  recurrence_rule: string | null;
  recurrence_time: string | null;
  recurrence_days: string | null;
  recurrence_months: string | null;
  routine_parent_id: number | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

interface OldPerson {
  id: number;
  name: string;
  email: string | null;
  org: string | null;
  airtable_ya_id: string | null;
  airtable_sv_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OldProject {
  id: number;
  slug: string;
  name: string;
  org: string;
  status: string | null;
  priority: number | null;
  parent_id: number | null;
  todoist_project_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface OldMeeting {
  id: number;
  title: string;
  date: string;
  path: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OldTaskPerson {
  task_id: number;
  person_id: number;
  role: string;
  created_at: string;
}

interface OldTaskUpdate {
  id: number;
  task_id: number;
  note: string;
  update_type: string;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
}

interface OldRoutineCompletion {
  id: number;
  routine_id: number;
  completed_date: string;
  notes: string | null;
  completed_at: string;
}

interface OldRoutineSkip {
  id: number;
  routine_id: number;
  skip_date: string;
  notes: string | null;
  skipped_at: string;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Migration: tasks → items (Prisma)');
  console.log('='.repeat(60));
  console.log(`Old DB: ${OLD_DB_PATH}`);
  console.log(`New DB: ${NEW_DB_PATH}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : VERIFY_ONLY ? 'VERIFY ONLY' : 'LIVE'}`);
  console.log('');

  // Check old DB exists
  if (!existsSync(OLD_DB_PATH)) {
    console.error('ERROR: Old database not found:', OLD_DB_PATH);
    process.exit(1);
  }

  // Open old database
  const oldDb = new Database(OLD_DB_PATH, { readonly: true });
  oldDb.pragma('foreign_keys = ON');

  // Get counts from old DB
  const oldCounts = {
    tasks: (oldDb.prepare('SELECT COUNT(*) as cnt FROM tasks').get() as { cnt: number }).cnt,
    people: (oldDb.prepare('SELECT COUNT(*) as cnt FROM people').get() as { cnt: number }).cnt,
    projects: (oldDb.prepare('SELECT COUNT(*) as cnt FROM projects').get() as { cnt: number }).cnt,
    meetings: (oldDb.prepare('SELECT COUNT(*) as cnt FROM meetings').get() as { cnt: number }).cnt,
    taskPeople: (oldDb.prepare('SELECT COUNT(*) as cnt FROM task_people').get() as { cnt: number }).cnt,
    taskUpdates: (oldDb.prepare('SELECT COUNT(*) as cnt FROM task_updates').get() as { cnt: number }).cnt,
    routineCompletions: (oldDb.prepare('SELECT COUNT(*) as cnt FROM routine_completions').get() as { cnt: number }).cnt,
    routineSkips: (oldDb.prepare('SELECT COUNT(*) as cnt FROM routine_skips').get() as { cnt: number }).cnt,
  };

  console.log('Old database counts:');
  console.log(`  Tasks: ${oldCounts.tasks}`);
  console.log(`  People: ${oldCounts.people}`);
  console.log(`  Projects: ${oldCounts.projects}`);
  console.log(`  Meetings: ${oldCounts.meetings}`);
  console.log(`  Task-People: ${oldCounts.taskPeople}`);
  console.log(`  Task Updates: ${oldCounts.taskUpdates}`);
  console.log(`  Routine Completions: ${oldCounts.routineCompletions}`);
  console.log(`  Routine Skips: ${oldCounts.routineSkips}`);
  console.log('');

  if (VERIFY_ONLY) {
    await verifyMigration(oldDb, oldCounts);
    oldDb.close();
    return;
  }

  if (DRY_RUN) {
    console.log('DRY RUN - No changes will be made.');
    console.log('');
    console.log('Would migrate:');
    console.log(`  ${oldCounts.people} people → Person`);
    console.log(`  ${oldCounts.projects} projects → Project`);
    console.log(`  ${oldCounts.meetings} meetings → Meeting`);
    console.log(`  ${oldCounts.tasks} tasks → Item`);
    console.log(`  ${oldCounts.taskPeople} task_people → ItemPerson`);
    console.log(`  ${oldCounts.taskUpdates} task_updates → Activity`);
    console.log(`  ${oldCounts.routineCompletions} routine_completions → RoutineCompletion`);
    console.log(`  ${oldCounts.routineSkips} routine_skips → RoutineSkip`);
    oldDb.close();
    return;
  }

  // Create backup
  console.log('Creating backup...');
  copyFileSync(OLD_DB_PATH, BACKUP_PATH);
  console.log(`Backup created: ${BACKUP_PATH}`);
  console.log('');

  // Remove existing new DB if exists
  if (existsSync(NEW_DB_PATH)) {
    console.log('Removing existing new database...');
    unlinkSync(NEW_DB_PATH);
  }

  // Initialize Prisma with new database
  console.log('Initializing new database with Prisma schema...');

  // Set DATABASE_URL to point to new DB
  process.env.DATABASE_URL = `file:${NEW_DB_PATH}`;

  // Push schema to create tables
  const { execSync } = await import('child_process');
  execSync('npx prisma db push', {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: `file:../data/items.db` }
  });

  console.log('');

  // Create Prisma client with better-sqlite3 adapter
  const adapter = new PrismaBetterSqlite3({ url: NEW_DB_PATH });
  const prisma = new PrismaClient({ adapter });

  try {
    // Migrate People
    console.log('Migrating people...');
    const people = oldDb.prepare('SELECT * FROM people').all() as OldPerson[];
    for (const p of people) {
      await prisma.person.create({
        data: {
          id: p.id,
          name: p.name,
          email: p.email,
          org: p.org,
          airtableYaId: p.airtable_ya_id,
          airtableSvId: p.airtable_sv_id,
          notes: p.notes,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
        },
      });
    }
    console.log(`  ✓ ${people.length} people migrated`);

    // Migrate Projects
    console.log('Migrating projects...');
    const projects = oldDb.prepare('SELECT * FROM projects ORDER BY parent_id NULLS FIRST').all() as OldProject[];
    for (const p of projects) {
      await prisma.project.create({
        data: {
          id: p.id,
          slug: p.slug,
          name: p.name,
          org: p.org,
          status: p.status,
          priority: p.priority,
          parentId: p.parent_id,
          todoistProjectId: p.todoist_project_id,
          description: p.description,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
        },
      });
    }
    console.log(`  ✓ ${projects.length} projects migrated`);

    // Migrate Meetings
    console.log('Migrating meetings...');
    const meetings = oldDb.prepare('SELECT * FROM meetings').all() as OldMeeting[];
    for (const m of meetings) {
      await prisma.meeting.create({
        data: {
          id: m.id,
          title: m.title,
          date: new Date(m.date),
          path: m.path,
          location: m.location,
          notes: m.notes,
          createdAt: new Date(m.created_at),
          updatedAt: new Date(m.updated_at),
        },
      });
    }
    console.log(`  ✓ ${meetings.length} meetings migrated`);

    // Migrate Meeting-Project relationships
    console.log('Migrating meeting-project relationships...');
    const meetingProjects = oldDb.prepare('SELECT * FROM meeting_projects').all() as { meeting_id: number; project_id: number; is_primary: number }[];
    for (const mp of meetingProjects) {
      await prisma.meetingProject.create({
        data: {
          meetingId: mp.meeting_id,
          projectId: mp.project_id,
          isPrimary: mp.is_primary === 1,
        },
      });
    }
    console.log(`  ✓ ${meetingProjects.length} meeting-project relationships migrated`);

    // Migrate Meeting Attendees
    console.log('Migrating meeting attendees...');
    const meetingAttendees = oldDb.prepare('SELECT * FROM meeting_attendees').all() as { meeting_id: number; person_id: number }[];
    for (const ma of meetingAttendees) {
      await prisma.meetingAttendee.create({
        data: {
          meetingId: ma.meeting_id,
          personId: ma.person_id,
        },
      });
    }
    console.log(`  ✓ ${meetingAttendees.length} meeting attendees migrated`);

    // Migrate Tasks → Items (two-pass to handle self-referential FKs)
    console.log('Migrating tasks → items...');
    const tasks = oldDb.prepare(`SELECT * FROM tasks ORDER BY id`).all() as OldTask[];

    // First pass: Insert all items WITHOUT self-referential foreign keys
    console.log('  Pass 1: Creating items...');
    for (const t of tasks) {
      await prisma.item.create({
        data: {
          id: t.id,
          title: t.title,
          description: t.description,
          itemType: t.task_type || 'task',
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date ? new Date(t.due_date) : null,
          targetPeriod: t.target_period,
          // Skip self-referential FKs in first pass:
          // parentId, routineParentId, blockedByItemId
          projectId: t.project_id,
          position: 0,
          ownerId: t.owner_id,
          sourceType: t.source_type,
          sourcePath: t.source_path,
          sourceLine: t.source_line,
          sourceMeetingId: t.source_meeting_id,
          recurrenceRule: t.recurrence_rule,
          recurrenceTime: t.recurrence_time,
          recurrenceDays: t.recurrence_days,
          recurrenceMonths: t.recurrence_months,
          todoistId: t.todoist_id,
          todoistSyncEnabled: t.todoist_sync_enabled === 1,
          metadata: t.metadata,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
          completedAt: t.completed_at ? new Date(t.completed_at) : null,
          deletedAt: t.deleted_at ? new Date(t.deleted_at) : null,
        },
      });

      // If there's a checkin_by date, create a CheckIn record
      if (t.checkin_by) {
        await prisma.checkIn.create({
          data: {
            itemId: t.id,
            date: new Date(t.checkin_by),
            completed: t.checkin_completed_at !== null,
          },
        });
      }
    }

    // Second pass: Update self-referential foreign keys
    console.log('  Pass 2: Linking item relationships...');
    let linkedCount = 0;
    for (const t of tasks) {
      if (t.parent_task_id || t.routine_parent_id || t.blocked_by_task_id) {
        await prisma.item.update({
          where: { id: t.id },
          data: {
            parentId: t.parent_task_id || undefined,
            routineParentId: t.routine_parent_id || undefined,
            blockedByItemId: t.blocked_by_task_id || undefined,
          },
        });
        linkedCount++;
      }
    }
    console.log(`  ✓ ${tasks.length} tasks → items migrated (${linkedCount} with relationships)`);

    // Migrate Task-People → Item-Person
    console.log('Migrating task-people → item-person...');
    const taskPeople = oldDb.prepare('SELECT * FROM task_people').all() as OldTaskPerson[];
    for (const tp of taskPeople) {
      await prisma.itemPerson.create({
        data: {
          itemId: tp.task_id,
          personId: tp.person_id,
          role: tp.role,
          createdAt: new Date(tp.created_at),
        },
      });
    }
    console.log(`  ✓ ${taskPeople.length} task-people → item-person migrated`);

    // Migrate Task Updates → Activities
    console.log('Migrating task-updates → activities...');
    const taskUpdates = oldDb.prepare('SELECT * FROM task_updates').all() as OldTaskUpdate[];
    for (const tu of taskUpdates) {
      await prisma.activity.create({
        data: {
          itemId: tu.task_id,
          action: tu.update_type,
          detail: tu.note,
          oldValue: tu.old_status,
          newValue: tu.new_status,
          createdBy: 'migration',
          createdAt: new Date(tu.created_at),
        },
      });
    }
    console.log(`  ✓ ${taskUpdates.length} task-updates → activities migrated`);

    // Migrate Routine Completions
    console.log('Migrating routine completions...');
    const routineCompletions = oldDb.prepare('SELECT * FROM routine_completions').all() as OldRoutineCompletion[];
    for (const rc of routineCompletions) {
      await prisma.routineCompletion.create({
        data: {
          routineId: rc.routine_id,
          completedDate: new Date(rc.completed_date),
          notes: rc.notes,
          completedAt: new Date(rc.completed_at),
        },
      });
    }
    console.log(`  ✓ ${routineCompletions.length} routine completions migrated`);

    // Migrate Routine Skips
    console.log('Migrating routine skips...');
    const routineSkips = oldDb.prepare('SELECT * FROM routine_skips').all() as OldRoutineSkip[];
    for (const rs of routineSkips) {
      await prisma.routineSkip.create({
        data: {
          routineId: rs.routine_id,
          skipDate: new Date(rs.skip_date),
          notes: rs.notes,
          skippedAt: new Date(rs.skipped_at),
        },
      });
    }
    console.log(`  ✓ ${routineSkips.length} routine skips migrated`);

    // Migrate Tags
    console.log('Migrating tags...');
    const tags = oldDb.prepare('SELECT * FROM tags').all() as { id: number; name: string; color: string | null; description: string | null }[];
    for (const tag of tags) {
      await prisma.tag.create({
        data: {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          description: tag.description,
        },
      });
    }
    console.log(`  ✓ ${tags.length} tags migrated`);

    // Migrate Task Tags → Item Tags
    console.log('Migrating task-tags → item-tags...');
    const taskTags = oldDb.prepare('SELECT * FROM task_tags').all() as { task_id: number; tag_id: number }[];
    for (const tt of taskTags) {
      await prisma.itemTag.create({
        data: {
          itemId: tt.task_id,
          tagId: tt.tag_id,
        },
      });
    }
    console.log(`  ✓ ${taskTags.length} task-tags → item-tags migrated`);

    // Migrate Task Attachments → Item Attachments
    console.log('Migrating task-attachments → item-attachments...');
    const taskAttachments = oldDb.prepare('SELECT * FROM task_attachments').all() as { id: number; task_id: number; path: string; label: string | null; attachment_type: string | null; created_at: string }[];
    for (const ta of taskAttachments) {
      await prisma.itemAttachment.create({
        data: {
          itemId: ta.task_id,
          path: ta.path,
          label: ta.label,
          attachmentType: ta.attachment_type,
          createdAt: new Date(ta.created_at),
        },
      });
    }
    console.log(`  ✓ ${taskAttachments.length} task-attachments → item-attachments migrated`);

    // Migrate Todoist sync state
    console.log('Migrating todoist sync state...');
    const todoistSync = oldDb.prepare('SELECT * FROM todoist_sync WHERE id = 1').get() as { sync_token: string | null; last_sync: string | null; last_error: string | null; total_syncs: number; last_items_synced: number } | undefined;
    if (todoistSync) {
      await prisma.todoistSync.create({
        data: {
          id: 1,
          syncToken: todoistSync.sync_token,
          lastSync: todoistSync.last_sync ? new Date(todoistSync.last_sync) : null,
          lastError: todoistSync.last_error,
          totalSyncs: todoistSync.total_syncs,
          lastItemsSynced: todoistSync.last_items_synced,
        },
      });
    }
    console.log('  ✓ Todoist sync state migrated');

    // Migrate Todoist project map
    console.log('Migrating todoist project map...');
    const todoistProjectMaps = oldDb.prepare('SELECT * FROM todoist_project_map').all() as { todoist_project_id: string; project_id: number | null; project_name: string | null }[];
    for (const tpm of todoistProjectMaps) {
      await prisma.todoistProjectMap.create({
        data: {
          todoistProjectId: tpm.todoist_project_id,
          projectId: tpm.project_id,
          projectName: tpm.project_name,
        },
      });
    }
    console.log(`  ✓ ${todoistProjectMaps.length} todoist project maps migrated`);

    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log('');
    console.log(`New database: ${NEW_DB_PATH}`);
    console.log(`Backup: ${BACKUP_PATH}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run with --verify-only to check counts');
    console.log('  2. Update .env to point to new database');
    console.log('  3. Update task-service to use Prisma client');
    console.log('');

  } finally {
    await prisma.$disconnect();
    oldDb.close();
  }
}

async function verifyMigration(oldDb: Database.Database, oldCounts: Record<string, number>) {
  console.log('Verifying migration...');
  console.log('');

  if (!existsSync(NEW_DB_PATH)) {
    console.error('ERROR: New database not found. Run migration first.');
    process.exit(1);
  }

  const adapter = new PrismaBetterSqlite3({ url: NEW_DB_PATH });
  const prisma = new PrismaClient({ adapter });

  try {
    const newCounts = {
      items: await prisma.item.count(),
      people: await prisma.person.count(),
      projects: await prisma.project.count(),
      meetings: await prisma.meeting.count(),
      itemPeople: await prisma.itemPerson.count(),
      activities: await prisma.activity.count(),
      routineCompletions: await prisma.routineCompletion.count(),
      routineSkips: await prisma.routineSkip.count(),
    };

    console.log('Comparison:');
    console.log('');
    console.log('Table                    Old        New        Status');
    console.log('-'.repeat(60));

    const compare = (name: string, oldKey: string, newKey: string) => {
      const o = oldCounts[oldKey];
      const n = newCounts[newKey as keyof typeof newCounts];
      const status = o === n ? '✓ OK' : '✗ MISMATCH';
      console.log(`${name.padEnd(24)} ${String(o).padStart(6)}     ${String(n).padStart(6)}     ${status}`);
      return o === n;
    };

    let allOk = true;
    allOk = compare('Tasks → Items', 'tasks', 'items') && allOk;
    allOk = compare('People', 'people', 'people') && allOk;
    allOk = compare('Projects', 'projects', 'projects') && allOk;
    allOk = compare('Meetings', 'meetings', 'meetings') && allOk;
    allOk = compare('Task-People → ItemPerson', 'taskPeople', 'itemPeople') && allOk;
    allOk = compare('Updates → Activities', 'taskUpdates', 'activities') && allOk;
    allOk = compare('Routine Completions', 'routineCompletions', 'routineCompletions') && allOk;
    allOk = compare('Routine Skips', 'routineSkips', 'routineSkips') && allOk;

    console.log('');
    if (allOk) {
      console.log('✓ All counts match! Migration verified.');
    } else {
      console.log('✗ Some counts do not match. Please investigate.');
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
