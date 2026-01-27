-- Task Management System Schema
-- Version: 1.0.0

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Enable WAL mode for concurrent reads
PRAGMA journal_mode = WAL;

--------------------------------------------------------------------------------
-- PEOPLE
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  org TEXT CHECK (org IN ('ya', 'cbp', 'external', 'personal')),

  -- Airtable CRM links
  airtable_ya_id TEXT,   -- YA UK CRM record ID
  airtable_sv_id TEXT,   -- SV USA CRM record ID

  -- Metadata
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for name lookups (case-insensitive matching in queries)
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);

--------------------------------------------------------------------------------
-- PROJECTS
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  org TEXT NOT NULL CHECK (org IN ('acme-corp', 'example-org', 'consulting', 'personal', 'other')),
  status TEXT CHECK (status IN ('active', 'planning', 'paused', 'completed', 'archived')),
  priority INTEGER CHECK (priority BETWEEN 1 AND 4),

  -- Hierarchy
  parent_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,

  -- Todoist sync
  todoist_project_id TEXT,

  -- Metadata
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

--------------------------------------------------------------------------------
-- WORKSTREAMS
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workstreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Target period (constrained format)
  -- Valid formats: '2026-Q1', '2026-01', '2026-H1', '2026'
  target_period TEXT CHECK (
    target_period IS NULL OR
    target_period GLOB '[0-9][0-9][0-9][0-9]' OR           -- Year: 2026
    target_period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]' OR -- Month: 2026-01
    target_period GLOB '[0-9][0-9][0-9][0-9]-Q[1-4]' OR     -- Quarter: 2026-Q1
    target_period GLOB '[0-9][0-9][0-9][0-9]-H[1-2]'        -- Half: 2026-H1
  ),

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_workstreams_project ON workstreams(project_id);

--------------------------------------------------------------------------------
-- MEETINGS
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  path TEXT NOT NULL UNIQUE,  -- Path to markdown file

  -- Metadata
  location TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_path ON meetings(path);

-- Meeting-Project junction (many-to-many)
CREATE TABLE IF NOT EXISTS meeting_projects (
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,  -- First project is primary
  PRIMARY KEY (meeting_id, project_id)
);

-- Meeting-People junction (attendees)
CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, person_id)
);

--------------------------------------------------------------------------------
-- TASKS
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'complete', 'blocked', 'cancelled', 'deferred')
  ),
  priority INTEGER CHECK (priority IS NULL OR priority BETWEEN 1 AND 4),

  -- Task type
  task_type TEXT DEFAULT 'task' CHECK (
    task_type IN ('task', 'routine', 'goal', 'workstream')
  ),

  -- Recurrence (for routine type templates)
  recurrence_rule TEXT CHECK (
    recurrence_rule IS NULL OR
    recurrence_rule IN ('daily', 'weekly', 'monthly', 'bimonthly', 'yearly', 'custom')
  ),
  recurrence_time TEXT,           -- '17:00' for specific time of day
  recurrence_days TEXT,           -- JSON: [1,15] for monthly, ["mon","fri"] for weekly
  recurrence_months TEXT,         -- JSON: [2,4,6,8,10,12] for bi-monthly

  -- Routine instance linking
  routine_parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,

  -- Timing (flexible - use one or both)
  due_date DATE,
  checkin_by DATE,  -- For tasks owned by others: when to follow up
  checkin_completed_at DATETIME,  -- When the check-in was completed
  target_period TEXT CHECK (
    target_period IS NULL OR
    target_period GLOB '[0-9][0-9][0-9][0-9]' OR           -- Year: 2026
    target_period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]' OR -- Month: 2026-01
    target_period GLOB '[0-9][0-9][0-9][0-9]-Q[1-4]' OR     -- Quarter: 2026-Q1
    target_period GLOB '[0-9][0-9][0-9][0-9]-H[1-2]'        -- Half: 2026-H1
  ),

  -- Relationships
  owner_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  workstream_id INTEGER REFERENCES workstreams(id) ON DELETE SET NULL,
  parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  blocked_by_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL, -- Task blocking this one

  -- Meeting links
  source_meeting_id INTEGER REFERENCES meetings(id) ON DELETE SET NULL,  -- Where it originated
  due_meeting_id INTEGER REFERENCES meetings(id) ON DELETE SET NULL,     -- Meeting it's due for

  -- Source tracking (for sync-back functionality)
  source_type TEXT CHECK (source_type IS NULL OR source_type IN ('meeting', 'readme', 'todoist', 'manual')),
  source_path TEXT,    -- Relative path to source file
  source_line INTEGER, -- Line number in source file

  -- External sync
  todoist_id TEXT UNIQUE,
  todoist_sync_enabled BOOLEAN DEFAULT FALSE,

  -- Extensibility - store additional structured data as JSON
  metadata TEXT,  -- JSON object for future extensibility

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  deleted_at DATETIME DEFAULT NULL  -- Soft delete timestamp
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_target_period ON tasks(target_period);
CREATE INDEX IF NOT EXISTS idx_tasks_todoist ON tasks(todoist_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_blocked_by ON tasks(blocked_by_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_meeting ON tasks(source_meeting_id);
CREATE INDEX IF NOT EXISTS idx_tasks_routine_parent ON tasks(routine_parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);

--------------------------------------------------------------------------------
-- TASK UPDATES (Progress tracking)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Update content
  note TEXT NOT NULL,
  update_type TEXT DEFAULT 'progress' CHECK (
    update_type IN ('progress', 'status_change', 'blocker', 'note', 'attachment')
  ),

  -- Optional: what changed
  old_status TEXT,
  new_status TEXT,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_updates_task ON task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_date ON task_updates(created_at);

--------------------------------------------------------------------------------
-- TASK ATTACHMENTS (File links)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Attachment info
  path TEXT NOT NULL,      -- Relative path to file
  label TEXT,              -- Optional display name
  attachment_type TEXT,    -- 'document', 'link', 'image', etc.

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);

--------------------------------------------------------------------------------
-- TASK-PEOPLE RELATIONSHIPS
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_people (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN ('assignee', 'waiting_on', 'stakeholder', 'reviewer', 'cc')
  ),

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (task_id, person_id, role)
);

CREATE INDEX IF NOT EXISTS idx_task_people_person ON task_people(person_id);

--------------------------------------------------------------------------------
-- TODOIST SYNC STATE
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS todoist_sync (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- Singleton row
  sync_token TEXT,
  last_sync DATETIME,
  last_error TEXT,

  -- Stats
  total_syncs INTEGER DEFAULT 0,
  last_items_synced INTEGER DEFAULT 0
);

-- Initialize singleton row
INSERT OR IGNORE INTO todoist_sync (id) VALUES (1);

-- Todoist project mapping
CREATE TABLE IF NOT EXISTS todoist_project_map (
  todoist_project_id TEXT PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  project_name TEXT  -- Cached name from Todoist
);

--------------------------------------------------------------------------------
-- TAGS (Extensible tagging system)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,  -- Optional color code
  description TEXT
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);

--------------------------------------------------------------------------------
-- ROUTINE COMPLETIONS (Track when routines are completed)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS routine_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,  -- The date this routine was for (not when clicked)

  -- Metadata
  notes TEXT,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Ensure only one completion per routine per day
  UNIQUE(routine_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_routine_completions_routine ON routine_completions(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_completions_date ON routine_completions(completed_date);

--------------------------------------------------------------------------------
-- ROUTINE SKIPS (Track when routines are intentionally skipped)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS routine_skips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  skip_date DATE NOT NULL,  -- The date this routine was skipped for

  -- Metadata
  notes TEXT,
  skipped_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Ensure only one skip per routine per day
  UNIQUE(routine_id, skip_date)
);

CREATE INDEX IF NOT EXISTS idx_routine_skips_routine ON routine_skips(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_skips_date ON routine_skips(skip_date);

--------------------------------------------------------------------------------
-- VIEWS (Convenience views for common queries)
--------------------------------------------------------------------------------

-- Tasks with owner name (excludes soft-deleted tasks)
CREATE VIEW IF NOT EXISTS v_tasks AS
SELECT
  t.*,
  p.name AS owner_name,
  proj.slug AS project_slug,
  proj.name AS project_name,
  proj.org AS project_org,
  parent_proj.slug AS project_parent_slug,
  CASE
    WHEN parent_proj.slug IS NOT NULL THEN parent_proj.slug || '/' || proj.slug
    ELSE proj.slug
  END AS project_full_path,
  w.name AS workstream_name,
  sm.title AS source_meeting_title,
  sm.path AS source_meeting_path,
  dm.title AS due_meeting_title,
  rt.title AS routine_template_title,
  bt.title AS blocked_by_task_title,
  (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id AND deleted_at IS NULL) AS subtask_count,
  (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id AND status = 'complete' AND deleted_at IS NULL) AS subtasks_complete,
  (SELECT COUNT(*) FROM tasks WHERE routine_parent_id = t.id AND deleted_at IS NULL) AS routine_instance_count,
  (SELECT COUNT(*) FROM tasks WHERE routine_parent_id = t.id AND status = 'complete' AND deleted_at IS NULL) AS routine_instances_complete
FROM tasks t
LEFT JOIN people p ON t.owner_id = p.id
LEFT JOIN projects proj ON t.project_id = proj.id
LEFT JOIN projects parent_proj ON proj.parent_id = parent_proj.id
LEFT JOIN workstreams w ON t.workstream_id = w.id
LEFT JOIN meetings sm ON t.source_meeting_id = sm.id
LEFT JOIN meetings dm ON t.due_meeting_id = dm.id
LEFT JOIN tasks rt ON t.routine_parent_id = rt.id
LEFT JOIN tasks bt ON t.blocked_by_task_id = bt.id
WHERE t.deleted_at IS NULL;

-- Pending tasks (most common query)
CREATE VIEW IF NOT EXISTS v_pending_tasks AS
SELECT * FROM v_tasks WHERE status IN ('pending', 'in_progress', 'blocked');

-- Overdue tasks
CREATE VIEW IF NOT EXISTS v_overdue_tasks AS
SELECT * FROM v_tasks
WHERE status IN ('pending', 'in_progress')
  AND due_date < date('now');

-- Routine templates (for managing routines)
CREATE VIEW IF NOT EXISTS v_routines AS
SELECT * FROM v_tasks WHERE task_type = 'routine';

-- Routine instances for a date range
CREATE VIEW IF NOT EXISTS v_routine_instances AS
SELECT * FROM v_tasks WHERE routine_parent_id IS NOT NULL;

--------------------------------------------------------------------------------
-- TRIGGERS
--------------------------------------------------------------------------------

-- Update updated_at timestamp on task changes
CREATE TRIGGER IF NOT EXISTS tasks_updated_at
AFTER UPDATE ON tasks
BEGIN
  UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Log status changes automatically
CREATE TRIGGER IF NOT EXISTS tasks_status_change
AFTER UPDATE OF status ON tasks
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO task_updates (task_id, note, update_type, old_status, new_status)
  VALUES (NEW.id, 'Status changed from ' || OLD.status || ' to ' || NEW.status, 'status_change', OLD.status, NEW.status);
END;

-- Set completed_at when task is completed
CREATE TRIGGER IF NOT EXISTS tasks_completed
AFTER UPDATE OF status ON tasks
WHEN NEW.status = 'complete' AND OLD.status != 'complete'
BEGIN
  UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps on other tables
CREATE TRIGGER IF NOT EXISTS people_updated_at AFTER UPDATE ON people
BEGIN UPDATE people SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS projects_updated_at AFTER UPDATE ON projects
BEGIN UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS workstreams_updated_at AFTER UPDATE ON workstreams
BEGIN UPDATE workstreams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS meetings_updated_at AFTER UPDATE ON meetings
BEGIN UPDATE meetings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

-- Unset blocked_by_task_id when a task is soft deleted
-- This handles the cascade since soft delete doesn't trigger ON DELETE SET NULL
CREATE TRIGGER IF NOT EXISTS tasks_soft_delete_unblock
AFTER UPDATE OF deleted_at ON tasks
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
  UPDATE tasks SET blocked_by_task_id = NULL WHERE blocked_by_task_id = NEW.id;
END;
