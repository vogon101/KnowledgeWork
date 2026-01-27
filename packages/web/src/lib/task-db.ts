/**
 * Task Database - Read-only interface for the task management system
 *
 * This module provides read-only access to the task SQLite database.
 * All writes should go through the Task Service API (port 3004).
 *
 * Usage:
 *   import { getTasksForMeeting, getTaskById } from '@/lib/task-db';
 */

import Database from "better-sqlite3";
import { join } from "path";
import { existsSync } from "fs";

// Database path - from environment variable or default location in server package
const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), "../server/data/items.db");

// Cached database connection with timeout
let db: Database.Database | null = null;
let dbLastUsed = 0;
const DB_CACHE_TTL = 5000; // Close connection after 5 seconds of inactivity

function getDb(): Database.Database {
  const now = Date.now();

  // If connection is stale, close it
  if (db && now - dbLastUsed > DB_CACHE_TTL) {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    db = null;
  }

  if (!db) {
    // Check file exists first
    if (!existsSync(DB_PATH)) {
      throw new Error("Task database not available");
    }

    try {
      db = new Database(DB_PATH, { readonly: true, timeout: 5000 });
      // Don't set journal_mode on readonly connection - it's a write operation
    } catch (err) {
      console.warn("Task database connection failed:", err);
      throw new Error("Task database not available");
    }
  }

  dbLastUsed = now;
  return db;
}

// Wrapper to handle connection errors gracefully
function withDb<T>(fn: (database: Database.Database) => T, fallback: T): T {
  try {
    return fn(getDb());
  } catch (err) {
    // Clear cached connection on error so next call retries
    if (db) {
      try { db.close(); } catch { /* ignore */ }
      db = null;
    }
    console.warn("Database query failed:", err);
    return fallback;
  }
}

// Base query for tasks with all joins (replaces the v_tasks view)
// Uses camelCase aliases aligned with ItemWithRelations from @kw/api-types
const BASE_TASK_QUERY = `
  SELECT
    i.id,
    i.title,
    i.description,
    i.status,
    i.priority,
    date(i.due_date) as dueDate,
    i.target_period as targetPeriod,
    i.parent_id as parentId,
    i.project_id as projectId,
    i.owner_id as ownerId,
    i.source_meeting_id as sourceMeetingId,
    i.source_type as sourceType,
    i.source_path as sourcePath,
    i.item_type as taskType,
    i.routine_parent_id as routineParentId,
    i.created_at as createdAt,
    i.updated_at as updatedAt,
    i.completed_at as completedAt,
    i.deleted_at as deletedAt,
    p.name as ownerName,
    proj.slug as projectSlug,
    proj.name as projectName,
    proj.org as projectOrg,
    org.color as projectOrgColor,
    org.short_name as projectOrgShortName,
    parent_proj.slug as projectParentSlug,
    CASE
      WHEN parent_proj.slug IS NOT NULL THEN parent_proj.slug || '/' || proj.slug
      ELSE proj.slug
    END as projectFullPath,
    sm.title as sourceMeetingTitle,
    (SELECT COUNT(*) FROM items WHERE parent_id = i.id AND deleted_at IS NULL) as subtaskCount,
    (SELECT COUNT(*) FROM items WHERE parent_id = i.id AND status = 'complete' AND deleted_at IS NULL) as subtasksComplete,
    -- Check-in data: get the next pending check-in for this item
    (SELECT date(c.date) FROM check_ins c WHERE c.item_id = i.id AND c.completed = 0 ORDER BY c.date ASC LIMIT 1) as checkinBy,
    (SELECT c.id FROM check_ins c WHERE c.item_id = i.id AND c.completed = 0 ORDER BY c.date ASC LIMIT 1) as checkinId
  FROM items i
  LEFT JOIN people p ON i.owner_id = p.id
  LEFT JOIN projects proj ON i.project_id = proj.id
  LEFT JOIN organizations org ON proj.org_id = org.id
  LEFT JOIN projects parent_proj ON proj.parent_id = parent_proj.id
  LEFT JOIN meetings sm ON i.source_meeting_id = sm.id
  WHERE i.deleted_at IS NULL
`;

// =============================================================================
// TYPES - Using camelCase to match @kw/api-types
// =============================================================================

export interface Task {
  id: number;
  displayId: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred";
  priority: number | null;
  dueDate: string | null;
  checkinBy: string | null;  // Date of next pending check-in (from check_ins table)
  checkinId: number | null;  // ID of next pending check-in (for completing it)
  targetPeriod: string | null;
  ownerId: number | null;
  ownerName: string | null;
  projectId: number | null;
  projectSlug: string | null;
  projectName: string | null;
  projectOrg: string | null;
  projectOrgColor: "indigo" | "teal" | "rose" | "orange" | null;
  projectOrgShortName: string | null;
  projectParentSlug: string | null;
  projectFullPath: string | null; // Full path for URLs, e.g., "energy/nuclear" for subprojects
  projectIsGeneral: boolean; // True for org-level general projects
  sourceMeetingId: number | null;
  sourceMeetingTitle: string | null;
  parentId: number | null;  // Aligned with ItemWithRelations
  subtaskCount: number;
  subtasksComplete: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskUpdate {
  id: number;
  taskId: number;
  note: string;
  updateType: string;
  oldStatus: string | null;
  newStatus: string | null;
  createdAt: string;
}

export interface Person {
  id: number;
  name: string;
  email: string | null;
  org: string | null;
  notes: string | null;
}

export interface Meeting {
  id: number;
  title: string;
  date: string;
  path: string;
}

// =============================================================================
// TASK QUERIES
// =============================================================================

/**
 * Get tasks that originated from a specific meeting
 */
export function getTasksForMeeting(meetingPath: string): Task[] {
  try {
    const database = getDb();

    // First get the meeting ID from the path
    const meeting = database
      .prepare("SELECT id FROM meetings WHERE path = ?")
      .get(meetingPath) as { id: number } | undefined;

    if (!meeting) {
      return [];
    }

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         AND i.source_meeting_id = ?
         ORDER BY COALESCE(i.priority, 5), i.created_at`
      )
      .all(meeting.id) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get tasks for meeting:", meetingPath);
    return [];
  }
}

/**
 * Get a single task by ID
 */
export function getTaskById(taskId: number): (Task & { updates: TaskUpdate[] }) | null {
  try {
    const database = getDb();

    const task = database.prepare(`${BASE_TASK_QUERY} AND i.id = ?`).get(taskId) as Task | undefined;

    if (!task) {
      return null;
    }

    // Activities table replaces task_updates in items.db
    const updates = database
      .prepare(
        `SELECT id, item_id as taskId, detail as note, action as updateType,
                old_value as oldStatus, new_value as newStatus, created_at as createdAt
         FROM activities WHERE item_id = ? ORDER BY created_at DESC`
      )
      .all(taskId) as TaskUpdate[];

    return {
      ...task,
      displayId: `T-${task.id}`,
      updates,
    };
  } catch (err) {
    // Clear cached connection on error so next call retries
    if (db) {
      try { db.close(); } catch { /* ignore */ }
      db = null;
    }
    console.warn("Failed to get task:", taskId, err);
    return null;
  }
}

/**
 * Get tasks for a project
 * @param projectSlug - The project slug to filter by
 * @param includeCompleted - Whether to include completed/cancelled tasks
 * @param orgSlug - Optional organization slug for disambiguation (important for _general projects)
 */
export function getTasksForProject(projectSlug: string, includeCompleted = false, orgSlug?: string): Task[] {
  try {
    const database = getDb();

    const statusFilter = includeCompleted ? "" : "AND i.status NOT IN ('complete', 'cancelled')";
    const orgFilter = orgSlug ? "AND org.slug = ?" : "";
    const params: (string | number)[] = [projectSlug];
    if (orgSlug) params.push(orgSlug);

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         AND proj.slug = ?
         ${orgFilter}
         ${statusFilter}
         ORDER BY
           CASE WHEN i.status IN ('complete', 'cancelled') THEN 1 ELSE 0 END,
           COALESCE(i.priority, 5),
           i.due_date NULLS LAST`
      )
      .all(...params) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get tasks for project:", projectSlug);
    return [];
  }
}

/**
 * Get tasks for a person by name
 */
export function getTasksForPerson(personName: string, includeCompleted = true): Task[] {
  try {
    const database = getDb();
    const statusFilter = includeCompleted ? "" : "AND i.status NOT IN ('complete', 'cancelled')";

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         AND p.name LIKE ?
           ${statusFilter}
         ORDER BY
           CASE WHEN i.status IN ('complete', 'cancelled') THEN 1 ELSE 0 END,
           COALESCE(i.priority, 5),
           i.due_date NULLS LAST`
      )
      .all(`%${personName}%`) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get tasks for person:", personName);
    return [];
  }
}

/**
 * Get all pending tasks
 */
export function getPendingTasks(limit = 100): Task[] {
  try {
    const database = getDb();

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         AND i.status IN ('pending', 'in_progress', 'blocked')
         ORDER BY COALESCE(i.priority, 5), i.due_date NULLS LAST
         LIMIT ?`
      )
      .all(limit) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get pending tasks");
    return [];
  }
}

/**
 * Get all tasks including completed
 */
export function getAllTasks(limit = 500): Task[] {
  try {
    const database = getDb();

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         ORDER BY
           CASE WHEN i.status IN ('complete', 'cancelled') THEN 1 ELSE 0 END,
           COALESCE(i.priority, 5),
           i.due_date NULLS LAST
         LIMIT ?`
      )
      .all(limit) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get all tasks");
    return [];
  }
}

/**
 * Get overdue tasks
 */
export function getOverdueTasks(): Task[] {
  try {
    const database = getDb();

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         AND i.status IN ('pending', 'in_progress')
         AND date(i.due_date) < date('now')
         ORDER BY i.due_date, COALESCE(i.priority, 5)`
      )
      .all() as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get overdue tasks");
    return [];
  }
}

/**
 * Check if the task database is available
 */
export function isTaskDbAvailable(): boolean {
  try {
    const database = getDb();
    // Actually test the connection with a simple query
    database.prepare("SELECT 1").get();
    return true;
  } catch {
    // Clear cached connection so next attempt retries fresh
    if (db) {
      try { db.close(); } catch { /* ignore */ }
      db = null;
    }
    return false;
  }
}

/**
 * Get meeting by path
 */
export function getMeetingByPath(path: string): Meeting | null {
  try {
    const database = getDb();
    return database.prepare("SELECT * FROM meetings WHERE path = ?").get(path) as Meeting | undefined ?? null;
  } catch {
    return null;
  }
}

/**
 * Get subtasks for a parent task
 */
export function getSubtasks(parentTaskId: number): Task[] {
  try {
    const database = getDb();

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         AND i.parent_id = ?
         ORDER BY COALESCE(i.priority, 5), i.created_at`
      )
      .all(parentTaskId) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get subtasks for task:", parentTaskId);
    return [];
  }
}

/**
 * Get parent task if this is a subtask
 */
export function getParentTask(taskId: number): Task | null {
  try {
    const database = getDb();

    const task = database.prepare("SELECT parent_id FROM items WHERE id = ?").get(taskId) as
      | { parent_id: number | null }
      | undefined;

    if (!task?.parent_id) {
      return null;
    }

    const parent = database.prepare(`${BASE_TASK_QUERY} AND i.id = ?`).get(task.parent_id) as Task | undefined;

    return parent ? { ...parent, displayId: `T-${parent.id}` } : null;
  } catch {
    console.warn("Failed to get parent task for:", taskId);
    return null;
  }
}

/**
 * Get related tasks (same project)
 */
export function getRelatedTasks(taskId: number, limit = 5): Task[] {
  try {
    const database = getDb();

    const task = database.prepare("SELECT project_id FROM items WHERE id = ?").get(taskId) as
      | { project_id: number | null }
      | undefined;

    if (!task || !task.project_id) {
      return [];
    }

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         AND i.id != ?
         AND i.status NOT IN ('complete', 'cancelled')
         AND i.project_id = ?
         ORDER BY COALESCE(i.priority, 5), i.due_date NULLS LAST
         LIMIT ?`
      )
      .all(taskId, task.project_id, limit) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get related tasks for:", taskId);
    return [];
  }
}

/**
 * Get all people
 */
export function getAllPeople(): Person[] {
  try {
    const database = getDb();
    return database.prepare("SELECT * FROM people ORDER BY name").all() as Person[];
  } catch {
    console.warn("Failed to get people");
    return [];
  }
}

/**
 * Get a person by ID
 */
export function getPersonById(personId: number): Person | null {
  try {
    const database = getDb();
    return database.prepare("SELECT * FROM people WHERE id = ?").get(personId) as Person | undefined ?? null;
  } catch {
    return null;
  }
}

/**
 * Get a person by name (partial match)
 */
export function getPersonByName(name: string): Person | null {
  try {
    const database = getDb();
    return database.prepare("SELECT * FROM people WHERE name LIKE ?").get(`%${name}%`) as Person | undefined ?? null;
  } catch {
    return null;
  }
}

/**
 * Get tasks waiting on a person (they need to do something)
 */
export function getTasksWaitingOnPerson(personId: number): Task[] {
  try {
    const database = getDb();

    // First get item IDs where this person is waiting_on
    const itemIds = database
      .prepare(
        `SELECT item_id FROM item_people
         WHERE person_id = ? AND role = 'waiting_on'`
      )
      .all(personId) as { item_id: number }[];

    if (itemIds.length === 0) return [];

    const ids = itemIds.map(r => r.item_id);
    const placeholders = ids.map(() => '?').join(',');

    const tasks = database
      .prepare(
        `${BASE_TASK_QUERY}
         AND i.id IN (${placeholders})
         AND i.status NOT IN ('complete', 'cancelled')
         ORDER BY i.due_date NULLS LAST, COALESCE(i.priority, 5)`
      )
      .all(...ids) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to get tasks waiting on person:", personId);
    return [];
  }
}

/**
 * Get meetings for a person
 */
export function getMeetingsForPerson(personId: number): Meeting[] {
  try {
    const database = getDb();

    const meetings = database
      .prepare(
        `SELECT m.* FROM meetings m
         JOIN meeting_attendees ma ON m.id = ma.meeting_id
         WHERE ma.person_id = ?
         ORDER BY m.date DESC
         LIMIT 20`
      )
      .all(personId) as Meeting[];

    return meetings;
  } catch {
    console.warn("Failed to get meetings for person:", personId);
    return [];
  }
}

/**
 * Get people with task counts
 */
export function getPeopleWithTaskCounts(): (Person & {
  owned_tasks: number;
  waiting_on_tasks: number;
})[] {
  try {
    const database = getDb();

    return database
      .prepare(
        `SELECT
           p.*,
           (SELECT COUNT(*) FROM items i WHERE i.owner_id = p.id AND i.status NOT IN ('complete', 'cancelled') AND i.deleted_at IS NULL) as owned_tasks,
           (SELECT COUNT(*) FROM item_people ip JOIN items i ON ip.item_id = i.id WHERE ip.person_id = p.id AND ip.role = 'waiting_on' AND i.status NOT IN ('complete', 'cancelled') AND i.deleted_at IS NULL) as waiting_on_tasks
         FROM people p
         ORDER BY owned_tasks DESC, p.name`
      )
      .all() as (Person & { owned_tasks: number; waiting_on_tasks: number })[];
  } catch {
    console.warn("Failed to get people with task counts");
    return [];
  }
}

/**
 * Project path information for URL construction
 */
export interface ProjectPath {
  org: string;
  slug: string;
  parentSlug: string | null;
  fullPath: string; // Either "slug" or "parentSlug/slug" for subprojects
}

/**
 * Resolve a project slug to its full URL path (handles subprojects)
 * For a subproject like "nuclear" under "energy", returns:
 * { org: "example-org", slug: "nuclear", parentSlug: "energy", fullPath: "energy/nuclear" }
 */
export function resolveProjectPath(slug: string, orgHint?: string): ProjectPath | null {
  try {
    const database = getDb();

    // First try to find the project by slug
    let project = database
      .prepare(
        `SELECT p.slug, p.org, p.parent_id, parent.slug as parent_slug
         FROM projects p
         LEFT JOIN projects parent ON p.parent_id = parent.id
         WHERE p.slug = ?
         ${orgHint ? "AND p.org = ?" : ""}
         LIMIT 1`
      )
      .get(orgHint ? [slug, orgHint] : [slug]) as {
        slug: string;
        org: string;
        parent_id: number | null;
        parent_slug: string | null;
      } | undefined;

    if (!project) {
      return null;
    }

    return {
      org: project.org,
      slug: project.slug,
      parentSlug: project.parent_slug,
      fullPath: project.parent_slug
        ? `${project.parent_slug}/${project.slug}`
        : project.slug,
    };
  } catch {
    console.warn("Failed to resolve project path for:", slug);
    return null;
  }
}

/**
 * Resolve multiple project slugs to their full paths
 */
export function resolveProjectPaths(slugs: string[], orgHint?: string): Map<string, ProjectPath> {
  const results = new Map<string, ProjectPath>();

  for (const slug of slugs) {
    const path = resolveProjectPath(slug, orgHint);
    if (path) {
      results.set(slug, path);
    }
  }

  return results;
}

/**
 * Search tasks by title, description, or other criteria
 */
export function searchTasks(query: string, options: {
  limit?: number;
  includeCompleted?: boolean;
  owner?: string;
  project?: string;
  status?: string;
} = {}): Task[] {
  try {
    const database = getDb();
    const { limit = 50, includeCompleted = false, owner, project, status } = options;

    // Build conditions separately for the BASE_TASK_QUERY
    let conditions = '';
    const params: (string | number)[] = [];

    // Full-text search on title and description
    if (query) {
      conditions += ` AND (i.title LIKE ? OR i.description LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`);
    }

    // Filter by owner
    if (owner) {
      conditions += ` AND p.name LIKE ?`;
      params.push(`%${owner}%`);
    }

    // Filter by project
    if (project) {
      conditions += ` AND (proj.slug LIKE ? OR proj.name LIKE ?)`;
      params.push(`%${project}%`, `%${project}%`);
    }

    // Filter by status
    if (status) {
      conditions += ` AND i.status = ?`;
      params.push(status);
    }

    // Exclude completed unless requested
    if (!includeCompleted) {
      conditions += ` AND i.status NOT IN ('complete', 'cancelled')`;
    }

    const sql = `${BASE_TASK_QUERY}
      ${conditions}
      ORDER BY
        CASE WHEN i.status IN ('complete', 'cancelled') THEN 1 ELSE 0 END,
        COALESCE(i.priority, 5),
        i.due_date NULLS LAST
      LIMIT ?`;
    params.push(limit);

    const tasks = database.prepare(sql).all(...params) as Task[];

    return tasks.map((t) => ({
      ...t,
      displayId: `T-${t.id}`,
    }));
  } catch {
    console.warn("Failed to search tasks:", query);
    return [];
  }
}

/**
 * Get task stats for a project
 */
export function getProjectTaskStats(projectSlug: string): {
  total: number;
  complete: number;
  pending: number;
  in_progress: number;
  blocked: number;
} {
  try {
    const database = getDb();

    const project = database.prepare("SELECT id FROM projects WHERE slug = ?").get(projectSlug) as
      | { id: number }
      | undefined;

    if (!project) {
      return { total: 0, complete: 0, pending: 0, in_progress: 0, blocked: 0 };
    }

    const stats = database
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
           SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
         FROM items
         WHERE project_id = ? AND deleted_at IS NULL`
      )
      .get(project.id) as { total: number; complete: number; pending: number; in_progress: number; blocked: number };

    return stats;
  } catch {
    return { total: 0, complete: 0, pending: 0, in_progress: 0, blocked: 0 };
  }
}
