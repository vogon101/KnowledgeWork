---
name: task-cli
description: Task database CLI for creating, updating, querying tasks. Reference for all task operations.
allowed-tools: Bash(.claude/skills/task-cli/scripts/task-cli.sh:*)
---

# Task CLI (Type-Safe)

Type-safe CLI for task management using tRPC with end-to-end type safety.

**Service:** Task Service at `http://localhost:3004`
**Script:** `.claude/skills/task-cli/scripts/task-cli.sh`

## Benefits Over Old Scripts

- **End-to-end type safety** — tRPC client shares types with the server
- **No curl commands** — type-safe function calls instead of HTTP
- **Concise output** — optimised for AI parsing
- **Batch operations** — update/complete multiple items at once
- **Auto-complete** — TypeScript knows all valid fields and values

## Date Concepts

The system has two ways to surface tasks at the right time:

| Concept | Purpose | Use When |
|---------|---------|----------|
| **Due Date** | Hard deadline | Task must be done by this date |
| **Check-ins** | Periodic reviews | Long-running task needs regular touch-points |

### Due Date (`--due`)
A deadline. Task becomes overdue if not completed by this date. Use for:
- Tasks with actual deadlines ("Submit report by Friday")
- Meeting prep ("Prep agenda before 2pm meeting")

**Accepted formats:**
- `2026-01-28` — ISO date (YYYY-MM-DD)
- `today`, `tod` — today's date
- `tomorrow`, `tom` — tomorrow's date
- `monday`, `tue`, etc. — next occurrence of that weekday
- `+3d` — 3 days from today (works with any number)
- `none` — clear due date (update only)

### Check-ins
Scheduled dates to review progress on a task. A task can have **multiple check-ins**. When a check-in date arrives, the task appears in `tcli checkins`. Completing a check-in doesn't complete the task. Use for:
- Long-running projects ("Check vendor status every Tuesday")
- Delegated work ("Follow up with James on Friday")
- Monitoring items ("Check analytics weekly")
- Soft reminders ("Revisit this idea in mid-January")

**Key difference**: A task has one due date, but can have many check-ins. Use check-ins for soft reminders without deadlines.

## Organization-Level Tasks (General Projects)

Each organization has a `_general` project for tasks not tied to a specific initiative. The underscore prefix sorts it to the top in file listings.

```bash
# Create org-level task - must specify org since _general exists in multiple orgs
tcli create task "General admin work" --project acme-corp/_general
tcli create task "ExOrg admin" --project example-org/_general

# Create project-specific task (always use org/slug format)
tcli create task "Update nuclear tracker" --project acme-corp/analytics-dashboard
tcli create task "Website update" --project acme-corp/website
```

**When to use `_general`:**
- Administrative tasks for the org
- Tasks spanning multiple projects
- Quick items not tied to a specific initiative
- Inbox-style tasks to triage later

**When to use a specific project:**
- Work on a defined initiative
- Tasks with clear project scope

**Disambiguating projects:** Use `org/project` syntax when a project slug exists in multiple orgs.

## Important Workflows

### Creating Tasks from Meetings

**ALWAYS use `tcli sync meeting <path>` to create tasks from meeting actions.**

This command:
- Automatically links tasks to source meeting
- Sets owner from the Actions table
- Assigns project from meeting frontmatter

**NEVER manually create tasks for meeting actions** — they won't be linked to the meeting and will lack source tracking.

```bash
# Correct: Sync meeting actions to tasks
tcli sync meeting acme-corp/meetings/2026/01/2026-01-28-standup.md

# Wrong: Creating tasks manually loses meeting link
tcli create task "Review budget"  # ❌ No meeting link
```

**Note:** There's no way to retroactively link an existing task to a meeting. If you accidentally created a task manually, delete it and re-sync the meeting.

### Before Creating Tasks

Always verify project slug exists before using it:

```bash
tcli projects | grep -i <keyword>
```

The `--project` flag always requires the fully qualified `org/slug` format:
- ✅ `--project acme-corp/kw-web` (org/slug)
- ❌ `--project kw-web` (missing org — will be rejected)
- ❌ `--project knowledge-work-web` (display name — won't work)

## Quick Reference

```bash
# Alias for convenience
alias tcli='.claude/skills/task-cli/scripts/task-cli.sh'

# ─────────────────────────────────────────────────────────────
# QUERYING
# ─────────────────────────────────────────────────────────────

# List items
tcli list                              # All pending items
tcli list --owner Alice              # Filtered by owner
tcli list --project acme-corp/grid-management  # Filtered by project
tcli list --due today                  # Due today
tcli list --type workstream            # Only workstreams
tcli list --status pending,in_progress # Multiple statuses

# Query shortcuts
tcli today                             # Items due today
tcli overdue                           # Overdue items (past due date)
tcli checkins                          # Items with check-ins due
tcli waiting                           # Items waiting on others
tcli blocked                           # Blocked items with blocker info
tcli priority                          # High priority items (P1, P2)
tcli stats                             # Summary statistics/dashboard

# Get details
tcli get T-42                          # Full item details
tcli get T-42,T-43,T-44               # Batch get (compact list)
tcli history T-42                      # Activity history for item
tcli subtasks T-42                     # Show subtasks

# Search
tcli search "nuclear"                  # Search by title

# Activity feed
tcli activity                          # Recent activity (last 30)
tcli activity --limit 50               # More activity
tcli activity --since 2026-01-20       # Activity since date

# ─────────────────────────────────────────────────────────────
# CREATING & UPDATING
# ─────────────────────────────────────────────────────────────

# Create items
tcli create task "Task title" --owner Alice --priority 2
tcli create task "Blocked task" --blocked-by T-100,T-101
tcli create workstream "Workstream name" --project acme-corp/energy
tcli create goal "Q1 Goal" --target 2026-Q1

# Update items
tcli update T-42 --status complete     # Update status
tcli update T-42 --priority 1          # Update priority
tcli update T-42 --due 2026-02-15      # Set due date
tcli update T-42 --due none            # Clear due date
tcli update T-42 --owner James         # Change owner
tcli update T-42 --project acme-corp/nuclear  # Move to project
tcli update T-42,T-43,T-44 --status complete  # Batch update

# Complete items (shorthand)
tcli complete T-42                     # Mark complete
tcli complete T-42,T-43                # Batch complete

# Delete/restore
tcli delete T-42                       # Soft delete
tcli delete T-42,T-43                  # Batch delete
tcli restore T-42                      # Restore deleted item

# Add notes
tcli note T-42 "Made progress on draft"           # Add note
tcli note T-42 "Blocked on approval" --type blocker  # Blocker note

# ─────────────────────────────────────────────────────────────
# CHECK-INS (Soft Reminders)
# ─────────────────────────────────────────────────────────────
# NOTE: Check-ins are SEPARATE from due dates. Use check-ins for
# soft reminders/review dates. Use --due for hard deadlines.
# The update command does NOT have a --checkin option.

tcli checkin-add T-42 2026-01-25       # Add check-in (date is POSITIONAL)
tcli checkin-add T-42 2026-02-01 --note "Follow up on proposal"
tcli checkin-list T-42                 # List check-ins for task
tcli checkin-list T-42 --include-completed  # Include completed
tcli checkin-complete T-42             # Complete next pending check-in
tcli checkin-complete T-42 --checkin-id 5   # Complete specific one
tcli checkin-complete T-42 --clear     # Complete all pending
tcli checkin-delete 123                # Delete check-in by ID

# ─────────────────────────────────────────────────────────────
# BLOCKING & LINKS
# ─────────────────────────────────────────────────────────────

tcli update T-101 --blocked-by T-100          # Block by task (sets status + adds blocker)
tcli update T-101 --blocked-by T-100,T-200    # Block by multiple tasks
tcli update T-101 --add-blocker T-200         # Add another blocker
tcli update T-101 --remove-blocker T-100      # Remove blocker
tcli blocked                                  # List all blocked tasks

# General links (not blocking)
tcli link-add T-100 blocks T-101       # Create blocking link
tcli link-add T-100 related T-101      # Create related link
tcli link-remove T-100 blocks T-101    # Remove link
tcli links T-100                       # View all links for task

# ─────────────────────────────────────────────────────────────
# PEOPLE
# ─────────────────────────────────────────────────────────────

tcli people                            # List all people with task counts
tcli people Alice                    # Show tasks for specific person
tcli people-create "Jane Doe" --org acme-corp --email jane@example.com
tcli people-update "Jane Doe" --new-name "Jane Smith"
tcli people-delete "Jane Doe"

# Item-person roles
tcli person-add T-42 "James" waiting_on    # Add waiting_on role
tcli person-add T-42 "Sarah" reviewer      # Add reviewer
tcli person-remove T-42 "James" waiting_on # Remove role
tcli item-people T-42                      # Show all people on item

# ─────────────────────────────────────────────────────────────
# TAGS
# ─────────────────────────────────────────────────────────────

tcli tags list                         # List all tags
tcli tags get "urgent"                 # Get tag details with items
tcli tags create "urgent" --color red  # Create tag
tcli tags update 1 --name "critical"   # Update tag
tcli tags delete 1                     # Delete tag

tcli tag-add T-42 "urgent"             # Add tag to item
tcli tag-remove T-42 "urgent"          # Remove tag from item
tcli item-tags T-42                    # Show tags on item

# ─────────────────────────────────────────────────────────────
# ROUTINES
# ─────────────────────────────────────────────────────────────

tcli routines due                      # Today's routines
tcli routines due --date 2026-01-20    # Routines for specific date
tcli routines overdue                  # Overdue routines
tcli routines list                     # All routine templates
tcli routines get 51                   # Routine details with history
tcli routines complete 51              # Complete routine for today
tcli routines complete 51 --date 2026-01-15  # Complete for specific date
tcli routines skip 51                  # Skip routine for today
tcli routines skip 51 --notes "Holiday"     # Skip with reason
tcli routines skip-all-overdue 51      # Skip all overdue instances
tcli routines uncomplete 51            # Undo completion
tcli routines unskip 51                # Undo skip
tcli routines create "Daily standup" --rule daily --time 09:00
tcli routines update 51 --title "New title"
tcli routines delete 51                # Delete routine

# ─────────────────────────────────────────────────────────────
# PROJECTS & ORGANIZATIONS
# ─────────────────────────────────────────────────────────────

tcli projects                          # List all projects
tcli projects --org example-org    # Filter by org
tcli projects grid-management          # Get project details
tcli projects-create energy-policy "Energy Policy" --org example-org
tcli projects-update energy-policy --status active
tcli projects-delete old-project       # Delete project

tcli orgs                              # List all organizations
tcli orgs acme-corp                # Get organization details
tcli orgs-create newclient "New Client" --short-name NC
tcli orgs-update newclient --name "Updated Name"
tcli orgs-delete newclient             # Delete (fails if referenced)

# ─────────────────────────────────────────────────────────────
# SPECIALIZED QUERIES
# ─────────────────────────────────────────────────────────────

tcli goals                             # List all goals
tcli goals --org acme-corp             # Goals for org
tcli workstreams                       # List workstreams
tcli workstreams --status active       # Filter by status

# ─────────────────────────────────────────────────────────────
# SYNC OPERATIONS
# ─────────────────────────────────────────────────────────────

tcli sync meeting-preview path/to/meeting.md  # Preview meeting sync
tcli sync meeting path/to/meeting.md          # Sync meeting actions to DB
tcli sync meeting path/to/meeting.md --dry-run  # Preview without changes
tcli sync filesystem-preview                  # Preview workstream files
tcli sync filesystem                          # Sync all workstream files
tcli sync file path/to/workstream/README.md   # Sync specific file
tcli sync file path/to/file.md --force        # Force sync
tcli sync item T-42                           # Push DB changes to file
tcli sync conflicts                           # List sync conflicts
tcli sync resolve T-42 file                   # Resolve conflict (file wins)
tcli sync resolve T-42 database               # Resolve conflict (DB wins)
```

## Output Format

The CLI produces concise, tabular output optimised for AI parsing:

```
$ tcli list --due today
T-1187  pending   p1  Alice   Prepare SV USA stakeholder list    due:today
T-1188  pending   p1  James     Croydon SPD images                 due:today
T-1117  pending   p2  Alice   YA website redesign scoping        due:today
────────────────────────────────────────────────────────────────────────────
3 items | 0 overdue | 2 high priority
```

**Column format:**
- ID (T-xxxx)
- Status (pending, in_prog, complete, blocked)
- Priority (p1-p4 or blank)
- Owner (first name, 10 chars max)
- Title (40 chars max)
- Due date indicator

**Due indicators:**
- `due:today` — due today
- `due:tmrw` — due tomorrow
- `due:3d` — due in 3 days
- `due:15 Jan` — due on specific date
- `OVERDUE:2d` — 2 days overdue

## Commands

### list

List items with optional filters.

```bash
tcli list [options]

Options:
  --type TYPE       Item type (task, workstream, goal, routine)
  --project ORG/SLUG  Project (requires org/slug format, e.g. myorg/website)
  --owner NAME      Owner name (partial match)
  --due DATE        Due date filter (today, tomorrow, this-week, YYYY-MM-DD)
  --status STATUS   Status filter (comma-separated: pending,in_progress,blocked)
  --limit N         Max results
```

**⚠️ COMMON MISTAKES — read carefully:**

1. **NO `--due-before` or `--due-after` flags.** These DO NOT EXIST. Use `--due` with a single value:
   - `--due today` — due today
   - `--due this-week` — due this week
   - `--due 2026-02-01` — due on that exact date
   - For range queries, use `tcli overdue` or filter results after fetching

2. **Statuses must be comma-separated in ONE flag**, not repeated:
   - ✅ `--status pending,in_progress,blocked`
   - ❌ `--status pending --status in_progress --status blocked`

3. **No range queries.** The `--due` flag is a single-value filter, not a range. To find tasks due in a week, use `--due this-week`.

### activity

Show recent activity feed (status changes, completions, notes added). Essential for understanding what has happened in the task system.

```bash
tcli activity                    # Recent activity (last 30)
tcli activity --limit 50         # Show more
tcli activity --since 2026-01-20 # Activity since date
```

**Output format:**
```
Recent Activity (15 items)
──────────────────────────────────────────────────────────────────────
22 Jan 14:30  T-1234   pending → complete  Review budget document [Grid Management]
22 Jan 12:15  T-1235   created             Prepare presentation slides [Nuclear]
22 Jan 10:00  T-1200   note: Made progress  Long-running project [YA Management]
```

**Use cases:**
- Daily summary: See what was accomplished today
- End of day: Review progress and changes made
- Morning review: Catch up on what happened since last session
- Audit trail: Understand when and how tasks changed

### today

Show items due today.

```bash
tcli today
```

### overdue

Show all overdue items.

```bash
tcli overdue
```

### get

Get details for one or more items. Accepts comma-separated IDs for batch queries.

```bash
tcli get T-42                  # Full details for single item
tcli get T-42,T-43,T-44       # Compact list view for multiple items
```

Single ID returns full detail view. Multiple IDs return compact list view (same format as `tcli list`). Missing IDs are silently skipped in batch mode.

### create

Create a new item.

```bash
tcli create TYPE "title" [options]

Types: task, workstream, goal

Options:
  --owner NAME       Owner name
  --project ORG/SLUG Project (requires org/slug format, e.g. myorg/website)
  --due DATE         Due date (today, tomorrow, +3d, monday, YYYY-MM-DD)
  --target PERIOD    Target period for goals (e.g., 2026-Q1, 2026-01)
  --priority N       Priority (1-4)
  --description TXT  Description
  --parent ID        Parent item ID (for subtasks)
  --blocked-by IDS   Comma-separated IDs of blocking items (creates task as blocked)
```

**Default owner:** Tasks should be assigned to the main user by default (check `.claude/context/background.md` for their name). Only assign to someone else when explicitly indicated:
- "John to do X" → assign to John
- "Ask Sarah to X" → assign to Sarah
- "Review the document" → assign to main user (default)

**Note:** To set a soft reminder/review date, create the task first, then use `checkin-add`.

### update

Update one or more items. Supports comma-separated IDs for batch updates.

```bash
tcli update ID [options]
tcli update T-42,T-43,T-44 --status complete

Options:
  --status STATUS       New status (pending, in_progress, complete, blocked, cancelled, deferred, active, paused)
  --priority N          New priority (1-4)
  --due DATE            New due date (today, tomorrow, +3d, monday, YYYY-MM-DD, or "none" to clear)
  --target PERIOD       Target period (e.g., 2026-Q1)
  --title TEXT          New title
  --description TEXT    New description
  --owner NAME          New owner
  --project ORG/SLUG    Move to project (requires org/slug format)
  --parent ID           Set parent item (for subtasks)
  --blocked-by IDS      Set blockers (comma-separated, also sets status to blocked)
  --add-blocker IDS     Add blockers without clearing existing ones
  --remove-blocker IDS  Remove specific blockers
```

**Clearing due date:** Use `--due none` to remove a due date:
```bash
tcli update T-42 --due none          # Clear due date
```

**Setting soft reminders:** The update command does NOT have a `--checkin` or `--attention` option. Use `checkin-add` instead:
```bash
tcli checkin-add T-42 2026-02-10     # Add soft reminder for Feb 10
```

### complete

Shorthand for `update --status complete`.

```bash
tcli complete T-42
tcli complete T-42,T-43,T-44
```

### people

List people or show tasks for a specific person.

```bash
tcli people                            # List all people with task counts
tcli people Alice                    # Show tasks for Alice
tcli people --org acme-corp        # Filter by organization
```

### people-create / people-update / people-delete

Manage people records.

```bash
tcli people-create "Jane Doe" --org acme-corp --email jane@example.com --notes "Board member"
tcli people-update "Jane Doe" --new-name "Jane Smith" --email new@example.com
tcli people-delete "Jane Doe"
```

### person-add / person-remove / item-people

Manage people roles on items (assignee, waiting_on, stakeholder, reviewer, cc).

```bash
tcli person-add T-42 "James" waiting_on    # Mark waiting on James
tcli person-add T-42 "Sarah" reviewer      # Add as reviewer
tcli person-remove T-42 "James" waiting_on # Remove the role
tcli item-people T-42                      # Show all people on item
```

### delete / restore

Soft delete and restore items.

```bash
tcli delete T-42                       # Soft delete single item
tcli delete T-42,T-43,T-44             # Batch delete
tcli restore T-42                      # Restore deleted item
```

### note

Add notes or updates to items.

```bash
tcli note T-42 "Made progress on draft"              # Add a note
tcli note T-42 "Blocked on approval" --type blocker  # Blocker note
tcli note T-42 "50% complete" --type progress        # Progress note
```

### history

Show activity history for an item.

```bash
tcli history T-42
```

Output shows all status changes, notes, and updates with timestamps.

### subtasks

Show subtasks for an item.

```bash
tcli subtasks T-42
```

### waiting

Show items waiting on others (items with `waiting_on` person roles).

```bash
tcli waiting
```

### priority / high

Show high priority items (P1 and P2).

```bash
tcli priority                          # All P1 and P2 items
tcli high                              # Alias for priority
tcli priority --owner Alice          # Filter by owner
tcli priority --limit 10               # Limit results
```

### stats / dashboard

Show summary statistics.

```bash
tcli stats                             # Summary dashboard
tcli dashboard                         # Alias for stats
tcli stats --owner Alice             # Filter by owner
```

Output includes: total active, overdue, due today, high priority, blocked counts.

### goals

List goals.

```bash
tcli goals                             # All goals
tcli goals --project energy            # Filter by project
tcli goals --target 2026-Q1            # Filter by target period
```

### workstreams

List workstreams.

```bash
tcli workstreams                       # All workstreams
tcli workstreams --project energy      # Filter by project
tcli workstreams --status active       # Filter by status
```

### tags

Manage tags.

```bash
tcli tags list                         # List all tags
tcli tags list --search "urgent"       # Search tags
tcli tags get "urgent"                 # Get tag with items
tcli tags get 1                        # Get tag by ID
tcli tags create "urgent" --color red --description "Needs immediate attention"
tcli tags update 1 --name "critical" --color orange
tcli tags delete 1
```

### tag-add / tag-remove / item-tags

Manage tags on items.

```bash
tcli tag-add T-42 "urgent"             # Add tag to item
tcli tag-remove T-42 "urgent"          # Remove tag from item
tcli item-tags T-42                    # Show all tags on item
```

### search

Search items by title.

```bash
tcli search "nuclear"
```

### checkins

Show tasks where a check-in date has arrived. These are tasks you've scheduled to review.

```bash
tcli checkins                  # Items with check-ins due today or earlier
```

### Check-in Management

Check-ins are scheduled review dates for tasks. Use them for long-running tasks that need periodic attention.

```bash
# Add a check-in
tcli checkin-add T-42 2026-01-25                      # Check on Jan 25
tcli checkin-add T-42 2026-02-01 --note "Follow up"   # With note

# List check-ins for a task
tcli checkin-list T-42                    # Pending check-ins
tcli checkin-list T-42 --include-completed  # All check-ins

# Complete a check-in (marks check-in done, NOT the task)
tcli checkin-complete T-42                # Complete next pending check-in
tcli checkin-complete T-42 --checkin-id 5 # Complete specific check-in
tcli checkin-complete T-42 --clear        # Complete all pending check-ins

# Delete a check-in
tcli checkin-delete 123                   # Delete by check-in ID
```

**Example workflow for delegated task:**
```bash
# Create task for someone else to do
tcli create task "James to review proposal" --owner James --due 2026-01-31

# Schedule check-ins to follow up
tcli checkin-add T-42 2026-01-22 --note "First follow-up"
tcli checkin-add T-42 2026-01-28 --note "Final check before deadline"

# When check-in date arrives, task appears in:
tcli checkins

# After following up, complete the check-in (task stays open)
tcli checkin-complete T-42
```

### Task Blocking (Many-to-Many)

Tasks can be blocked by **multiple** other tasks. The blocking system uses ItemLink for many-to-many relationships.

**Setting blockers with `--blocked-by`:**
```bash
# Mark T-101 as blocked by T-100 (sets status + adds blocker)
tcli update T-101 --blocked-by T-100

# Block by multiple tasks at once (comma-separated)
tcli update T-101 --blocked-by T-100,T-200
```

This sets the status to `blocked` AND records all blockers. The task will show in `tcli blocked` with blocker info.

**Adding/removing individual blockers:**
```bash
# Add another blocker to an already-blocked task
tcli update T-101 --add-blocker T-300

# Remove a specific blocker
tcli update T-101 --remove-blocker T-100
```

**Auto-unblock behavior:**
When a blocking task is completed, the system checks if the blocked task has remaining blockers:
- If **no remaining blockers** → status automatically changes to `pending`
- If **other blockers remain** → status stays `blocked`

**Alternative — use link-add for general relationships:**
```bash
tcli link-add T-100 blocks T-101    # Creates relationship link
tcli link-add T-100 related T-101   # Related but not blocking
tcli link-remove T-100 blocks T-101 # Remove a link
tcli links T-100                    # View all links for a task
```

Note: `link-add` creates a relationship but doesn't automatically set status to blocked. Use `--blocked-by` for actual blocking dependencies.

**When to use blocking:**
- Sequential tasks from a meeting (research → draft → review)
- Prerequisites (proposal must be approved before implementation)
- Dependencies (API change blocks frontend work)
- Multiple prerequisites: task requires 2+ things to complete first

**Important:** Don't write "(blocked by X)" in task titles — use `--blocked-by` to create proper relationships that the system can track.

### routines

Manage recurring routines (daily reviews, weekly updates, etc).

```bash
tcli routines due                      # Today's routines (pending + completed)
tcli routines due --date 2026-01-20    # Routines for specific date
tcli routines overdue                  # Overdue routines with missed dates
tcli routines list                     # All routine templates
tcli routines complete 51              # Complete routine #51 for today
tcli routines complete 51 --date 2026-01-15  # Complete for specific date
tcli routines skip 51                  # Skip routine for today
tcli routines skip 51 --notes "Holiday"      # Skip with reason
tcli routines skip-all-overdue 51      # Skip all overdue instances
```

**Routines output:**
```
Routines for 2026-01-16
────────────────────────────────────────────────────────────

Pending (2):
    51  p1  Morning Review [Personal]
    52      Weekly Grid Update [Grid Management]

Completed (1):
    53  ✓   End of Day Summary
```

### projects

List projects or get project details.

```bash
tcli projects                          # List all projects
tcli projects --org example-org    # Filter by org
tcli projects grid-management          # Get project details
```

### organizations

Manage organizations (workstreams/clients like Acme Corp, ExOrg, etc.).

Organizations are now stored in the database rather than as a fixed enum, allowing new organizations to be added dynamically.

```bash
# List all organizations
tcli orgs

# Get organization details (includes project/people counts)
tcli orgs acme-corp

# Create a new organization
tcli orgs-create newclient "New Client Name" --short-name NC --description "Description"

# Update an organization
tcli orgs-update newclient --name "Updated Name"
tcli orgs-update newclient --short-name ""  # Clear short name

# Delete an organization (fails if projects/people reference it)
tcli orgs-delete newclient
```

**Output example:**
```
$ tcli orgs
6 organizations
────────────────────────────────────────────────────────────
example-org      Centre for Example Org (ExOrg)
consulting           Consulting
external             External
other                Other
personal             Personal
acme-corp        Acme Corp (YA)

$ tcli orgs acme-corp
Acme Corp (acme-corp)
────────────────────────────────────────
Short name:  YA
Projects:    7
People:      4
Created:     2026-01-19
```

### sync

Sync operations for meetings and workstream files.

#### Meeting Sync

Sync actions from meeting markdown files to the task database.

```bash
# Preview what would be synced
tcli sync meeting-preview acme-corp/meetings/2026/01/2026-01-15-meeting.md

# Actually sync the actions (creates tasks)
tcli sync meeting acme-corp/meetings/2026/01/2026-01-15-meeting.md

# Dry run (preview without making changes)
tcli sync meeting path/to/meeting.md --dry-run
```

**Meeting preview output:**
```
Meeting: YA Strategy Meeting
Path: acme-corp/meetings/2026/01/2026-01-15-meeting.md
Date: 2026-01-15
Attendees: Alice, John, Julia
Primary Project: ya-management
────────────────────────────────────────────────────────────

4 actions found
  Would create: 3
  Would skip: 1

Actions:
  + CREATE: Schedule 6-month check-in
          Owner: Alice, Due: 2026-01-20, Status: Pending
  + CREATE: Finalise goals document
          Owner: James, Due: -, Status: Pending
  ○ SKIP: Review budget (T-1234)
          Owner: Julia, Due: -, Status: Complete
```

#### Filesystem Sync

Bidirectional sync between workstream markdown files and the database.

```bash
# Preview workstream files found in filesystem
tcli sync filesystem-preview

# Sync all workstream files to database
tcli sync filesystem

# Sync a specific file to database
tcli sync file example-org/projects/energy/nuclear.md

# Force sync (overrides conflict detection)
tcli sync file path/to/file.md --force

# Push database changes to a workstream file
tcli sync item T-42

# Force push (overrides conflict detection)
tcli sync item T-42 --force
```

#### Conflict Management

When both file and database have changed since the last sync, a conflict is detected.

```bash
# List all conflicts
tcli sync conflicts

# Resolve a conflict (choose winner)
tcli sync resolve T-42 file      # File version wins
tcli sync resolve T-42 database  # Database version wins
```

**Conflict output:**
```
3 conflicts
────────────────────────────────────────────────────────────

T-1234: example-org/projects/energy/nuclear.md
  Reason: Both file and database modified since last sync
  File hash: abc12345...
  DB hash: def67890...
```

## AI Confirmation Workflow

When processing batch updates (from quick notes, meeting processing, or user context), the AI **proposes changes and asks for confirmation** before executing.

### How It Works

```
AI processes input (quick note / context)
    ↓
AI identifies proposed changes
    ↓
AI uses AskUserQuestion to present proposals
    ↓
User approves/rejects via tool options
    ↓
AI executes only approved actions
```

### Smart Task Detection

Many phrases indicate follow-ups on existing work rather than new tasks. These should add **check-ins** to existing tasks instead of creating duplicates.

**What is a check-in?** A check-in is a soft reminder date attached to a task. Unlike due dates (hard deadlines), check-ins are "revisit this around X" prompts. A task can have multiple check-ins. When the check-in date arrives, the task appears in `tcli checkins`. Completing a check-in marks the reminder done but keeps the task open.

**Check-ins are for the main user.** Check-ins are reminders for YOU to follow up - they don't need an owner specified. The task itself may be owned by someone else (e.g., "John to review document"), but the check-in is your reminder to chase John.

**Common use cases for check-ins:**
- Delegated work: "Check in with John next week" → add check-in to John's task (reminder for you to chase him)
- Long-running projects: Weekly review dates
- Waiting on others: Reminder to chase

**Detection patterns:**

| Pattern | Action |
|---------|--------|
| "Check in with Y" | Search for task owned by Y, propose check-in |
| "Discuss X with Y" | Search for task about X, propose check-in |
| "Follow up on X" | Search for task about X, propose check-in |
| "Waiting on Y for X" | Search for task about X, add waiting_on |
| "Chase Y about X" | Search for task, propose check-in |
| "Call scheduled with Y" | NOT a new task — add check-in to existing project task for the call date |
| "Meeting booked for X" | NOT a new task — it's a calendar event. Add check-in if follow-up needed |

**Calendar events are NOT tasks.** A scheduled call or meeting is a calendar event, not an actionable task. Do not create tasks like "Call with X" or "Meeting with Y". Instead, add a check-in to the relevant existing project task for that date, so you're reminded to prepare or follow up.

**Workflow for "Check in with John":**
1. Search: `tcli list --owner John`
2. Present John's pending tasks to user
3. User selects which task to add check-in to
4. Execute: `tcli checkin-add T-XX YYYY-MM-DD --note "Check in with John"`

### Confirmation Prompt Format

The AI presents proposals in a structured format:

```json
{
  "questions": [{
    "question": "Confirm these task changes?",
    "header": "Task updates",
    "options": [
      {"label": "Create: Review Q1 budget", "description": "New task, P2, due Friday"},
      {"label": "Check-in on T-42", "description": "Add check-in to existing task"},
      {"label": "Skip all", "description": "Don't make any changes"}
    ],
    "multiSelect": true
  }]
}
```

### Prompt Templates

All AI prompts for quick notes and batch updates are defined in:
`packages/web/src/prompts/`

These templates include confirmation instructions, task pattern detection, and type-specific processing rules.

## Focus Tracking

Track daily focus ratings and view trends.

```bash
# Record focus rating for today
tcli focus --user 4 --ai 3 --notes "Productive morning, distracted afternoon"

# Record with date
tcli focus --date 2026-01-27 --user 3 --ai 3

# View today's focus entry
tcli focus

# View specific date
tcli focus --date 2026-01-25

# List recent focus entries
tcli focus-list                    # Last 30 entries
tcli focus-list --week             # Last 7 days
tcli focus-list --month 2026-01    # Specific month
tcli focus-list --limit 10         # Limit results

# View summary and trends
tcli focus-summary                 # Last month
tcli focus-summary --period week   # Last week
tcli focus-summary --period all    # All time
```

**Rating scale:**
- 1: Very distracted, little progress
- 2: Struggled to focus, some progress
- 3: Mixed focus, moderate progress
- 4: Good focus, solid progress
- 5: Excellent focus, highly productive

**Output format:**
```
Focus entries (7)
──────────────────────────────────────────────────────────
Date         User  AI    Notes
──────────────────────────────────────────────────────────
2026-01-28    4/5   3/5  Productive morning
2026-01-27    3/5   3/5  Distracted by meetings
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    @kw/api-types                            │
│         (Zod schemas + inferred TypeScript types)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌───────────────┐ ┌──────────┐ ┌────────────────┐
│  task-service │ │ Next.js  │ │  task-cli      │
│  (tRPC server)│ │ (tRPC    │ │  (tRPC client) │
│               │ │  client) │ │                │
└───────────────┘ └──────────┘ └────────────────┘
```

## Installation

The CLI uses `tsx` to run TypeScript directly. Install dependencies:

```bash
cd .claude/skills/task-cli && npm install
```

Then use via the wrapper script:

```bash
.claude/skills/task-cli/scripts/task-cli.sh list
```

Or add an alias:

```bash
alias tcli='.claude/skills/task-cli/scripts/task-cli.sh'
```
