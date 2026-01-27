# Guide for Coding Agents

This document is for Claude and other AI coding agents working on the KnowledgeWork codebase. It covers architecture, design principles, and patterns to follow.

**Not for**: Content/knowledge management agents (see `content/CLAUDE.md` instead).

---

## Quick Context

**KnowledgeWork** is a personal task management system with:
- **Web UI** (Next.js) for viewing/editing tasks, projects, people, meetings
- **API server** (tRPC) for type-safe operations
- **Markdown content** (diary, meetings, projects) synced with database
- **CLI** for AI agents to manage tasks

**Key insight**: The system serves both humans (web UI) and AI agents (CLI). Keep interfaces simple and predictable for both.

---

## Design Principles

### 1. Simplicity for AI Consumers

The CLI and API are used by AI agents. Design for predictability:

**DO:**
```bash
# Clear, consistent output format
tcli list --status pending
# T-42 | pending | Fix login bug | Alice | inventory-tracker

tcli today
# T-42 | pending | Fix login bug | Due: 2026-01-26
# T-45 | in_progress | Review PR | Due: 2026-01-26
```

**DON'T:**
```bash
# Inconsistent formats that require parsing guesswork
tcli list
# Here are your tasks:
#   - Fix login bug (T-42) - assigned to Alice, due soon!
#   - [URGENT] Review PR
```

**Principles:**
- One concept per command (don't mix tasks and check-ins in same output)
- Consistent column order in tabular output
- Predictable field names matching API (camelCase)
- Exit codes: 0 = success, non-zero = error
- Errors to stderr, data to stdout

### 2. Fewer, Composable React Components

Prefer reusable components with options over many single-purpose components.

**DO:**
```typescript
// One TaskList with view options
<TaskList
  filter={{ status: "pending", owner: "Alice" }}
  groupBy="project"
  showCheckIns={true}
  onTaskClick={(task) => openModal(task)}
/>

// Reused across:
// - Dashboard (filter: today's tasks)
// - Project page (filter: project tasks)
// - Person page (filter: person's tasks)
```

**DON'T:**
```typescript
// Proliferation of similar components
<TodayTaskList />
<ProjectTaskList projectId={id} />
<PersonTaskList personId={id} />
<OverdueTaskList />
<WeeklyTaskList />
// Each with duplicated loading/error/mutation logic
```

**Current good examples:**
- `TaskList` / `GroupedTaskList` - single component, multiple views via props
- `Badge` - semantic variants (`success`, `warning`, `danger`) + org colors
- `Combobox` - reusable select with search, used for projects, people, tasks

**Component composition pattern:**
```typescript
// task-list/index.ts exports
export { TaskList, GroupedTaskList } from "./task-list";
export { TaskRow } from "./task-row";
export { CheckinRow } from "./checkin-row";
export { useTaskMutations } from "./use-task-mutations";
export { statusConfig } from "./config";

// Shared mutation hook - DRY
export function useTaskMutations({ onSuccess }) {
  const utils = trpc.useUtils();

  const updateStatus = trpc.items.update.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      onSuccess?.();
    },
  });

  return { updateStatus, /* ... */ };
}
```

### 3. Centralized Business Logic

Business logic belongs in the **server**, not scattered across components.

**DO:**
```typescript
// Server: query.ts - single source of truth for "today's items"
today: publicProcedure.query(async ({ ctx }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return ctx.prisma.item.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ['complete', 'cancelled'] },
      dueDate: { gte: today, lt: tomorrow },
    },
  });
}),

// Client: just calls the query
const { data: todayItems } = trpc.query.today.useQuery();
```

**DON'T:**
```typescript
// Client: duplicating date logic everywhere
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const { data } = trpc.items.list.useQuery({});
const todayItems = data?.items.filter(item => {
  const due = new Date(item.dueDate);
  return due >= today && due < tomorrow;
});

// Now this logic is in 5 different components...
```

**Where logic belongs:**

| Logic | Location | Example |
|-------|----------|---------|
| "What's due today?" | `query.ts` router | `query.today` procedure |
| "What's overdue?" | `query.ts` router | `query.overdue` procedure |
| "Format task for display" | `items.ts` router | `formatItem()` helper |
| "Parse meeting markdown" | `services/meeting-parser.ts` | `parseMeeting()` |
| Date calculations | Server services | Not in React components |
| Status transitions | Server mutations | Validate in `items.update` |

### 4. Database is Source of Truth

The database is authoritative for task state. Markdown files are synced *from* the database, not the other way around for status.

**Data flow:**
```
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE (SQLite)                        │
│                    Source of Truth for:                      │
│            Status, Due Dates, Owners, Projects               │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────────┐
        │  Web UI  │   │   CLI    │   │ Markdown Files   │
        │          │   │          │   │ (meetings, diary)│
        └──────────┘   └──────────┘   └──────────────────┘
                              │               │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │  Sync Layer  │
                              │ (file-sync,  │
                              │ markdown-sync)│
                              └──────────────┘
```

**Sync rules:**
1. **Meeting actions** → Database creates tasks (meeting markdown is source for *initial* action text)
2. **Task status changes** → Database updates → Sync writes back to markdown
3. **Never** edit task status directly in markdown files (will be overwritten)

**Services:**
- `file-sync.ts` - Syncs workstream files (markdown frontmatter ↔ Item records)
- `markdown-sync.ts` - Writes task status back to meeting action tables
- `meeting-parser.ts` - Parses meeting markdown, creates tasks

### 5. Normalize, Don't Duplicate

**CRITICAL**: Never store data that can be obtained via relationships.

**DO:**
```prisma
model Project {
  id             Int
  slug           String
  orgId          Int?                    // FK only
  organization   Organization? @relation(fields: [orgId], references: [id])
  // Get org data via: project.organization.slug
}
```

```typescript
// Query with include
const project = await prisma.project.findUnique({
  where: { id },
  include: {
    organization: { select: { slug: true, name: true, color: true } }
  },
});
// Access: project.organization?.slug
```

**DON'T:**
```prisma
model Project {
  id             Int
  slug           String
  orgId          Int?
  organization   Organization? @relation(...)
  org            String?       // REDUNDANT - duplicates organization.slug
  orgColor       String?       // REDUNDANT - duplicates organization.color
}
```

**Known legacy violations** (marked for removal):
- `Project.org` - legacy string column, use `organization.slug` instead
- `Person.org` - legacy string column, use `organization.slug` instead

### 6. Type Safety End-to-End

Types flow from schemas to UI with no gaps:

```
@kw/api-types (Zod schemas)
         │
         ├──→ Server Router (validates input)
         │         │
         │         └──→ Prisma (type-safe queries)
         │
         └──→ tRPC Client (infers types from router)
                   │
                   └──→ React Components (fully typed props)
```

**Schema-first workflow:**
1. Define/modify schema in `packages/api-types/src/schemas/`
2. Export from `packages/api-types/src/index.ts`
3. Run `pnpm --filter @kw/api-types build`
4. Types automatically propagate to server and client

**Never:**
- Use `any` types
- Duplicate type definitions
- Type-cast without validation

### 7. Consistent Field Naming

| Context | Convention | Example |
|---------|------------|---------|
| TypeScript/API | camelCase | `dueDate`, `projectSlug` |
| Database columns | snake_case | `due_date`, `project_slug` |
| URL params | kebab-case | `/tasks?due-date=2026-01-26` |
| UI display | Normal English | "Due Date", "Project" |

**Prisma handles mapping:**
```prisma
model Item {
  dueDate DateTime? @map("due_date")
}
```

### 8. Explicit Over Implicit

Make behavior obvious, not magical.

**DO:**
```typescript
// Explicit: clear what happens
const { data } = trpc.items.list.useQuery({
  status: 'pending',
  includeCompleted: false,
  limit: 50
});
```

**DON'T:**
```typescript
// Implicit: what does "smart" mean?
const { data } = trpc.items.smartList.useQuery();
```

---

## Architecture Overview

### Package Structure

```
KnowledgeWork/                # Framework repo
├── packages/
│   ├── api-types/     # Zod schemas, shared types
│   │   └── src/
│   │       ├── schemas/
│   │       │   ├── item.ts       # Item/Task schemas
│   │       │   ├── project.ts    # Project schemas
│   │       │   ├── person.ts     # Person schemas
│   │       │   ├── meeting.ts    # Meeting schemas
│   │       │   ├── routine.ts    # Routine schemas
│   │       │   └── enums.ts      # Status, type enums
│   │       └── index.ts          # Re-exports all
│   │
│   ├── server/        # tRPC API server (port 3004)
│   │   └── src/
│   │       ├── trpc/
│   │       │   ├── routers/      # Domain routers
│   │       │   │   ├── items.ts
│   │       │   │   ├── query.ts  # Complex queries
│   │       │   │   ├── projects.ts
│   │       │   │   ├── people.ts
│   │       │   │   └── sync.ts   # File sync
│   │       │   ├── index.ts      # Root router
│   │       │   └── trpc.ts       # tRPC setup
│   │       ├── services/         # Business logic
│   │       │   ├── file-sync.ts
│   │       │   ├── markdown-sync.ts
│   │       │   └── meeting-parser.ts
│   │       └── prisma/
│   │           └── schema.prisma
│   │
│   └── web/           # Next.js frontend (port 3000)
│       └── src/
│           ├── app/              # Pages (App Router)
│           ├── components/
│           │   ├── ui/           # shadcn primitives
│           │   ├── task-list/    # Task components
│           │   └── ...
│           └── lib/
│               ├── trpc.ts       # tRPC client
│               └── utils.ts
│
├── skills/            # Knowledge Agent skills
│   ├── task-cli/      # CLI for task management
│   ├── meetings/      # Meeting management
│   ├── dates/         # Date calculations
│   └── ...            # Other skills
│
├── templates/         # Templates for content repos
│   └── CLAUDE.md      # Knowledge Agent template
│
├── scripts/           # Setup scripts
│   └── setup.ts       # Content repo setup
│
└── docs/              # This documentation

Content Repo/                 # Separate repo (your data)
├── .claude/
│   ├── skills/        # Symlink → KnowledgeWork/skills
│   ├── local-skills/  # Personal skills
│   └── context/       # Working memory
├── .data/
│   └── items.db       # Database
├── diary/             # Daily logs
└── [org]/             # Organization content
```

### Key Files

| File | Purpose | When to Modify |
|------|---------|----------------|
| `api-types/src/schemas/item.ts` | Item/Task type definitions | Adding/removing task fields |
| `server/src/trpc/routers/items.ts` | Task CRUD operations | Changing task behavior |
| `server/src/trpc/routers/query.ts` | Complex queries (today, overdue) | Adding query shortcuts |
| `server/src/services/file-sync.ts` | Markdown ↔ DB sync | Changing sync behavior |
| `web/src/components/task-list/` | Task list UI | Changing task display |
| `web/src/lib/trpc.ts` | tRPC client setup | Rarely |

---

## Common Tasks

### Adding a New Field to Items

1. **Schema** (`api-types/src/schemas/item.ts`):
```typescript
export const ItemSchema = z.object({
  // ... existing fields
  newField: z.string().nullable().optional(),
});

export const CreateItemSchema = z.object({
  // ... add if settable on create
  newField: z.string().optional(),
});
```

2. **Rebuild types**:
```bash
pnpm --filter @kw/api-types build
```

3. **Database** (`server/prisma/schema.prisma`):
```prisma
model Item {
  // ... existing fields
  newField String? @map("new_field")
}
```

4. **Migrate**:
```bash
cd packages/server
npx prisma migrate dev --name add_new_field
```

5. **Router** (`server/src/trpc/routers/items.ts`):
```typescript
// In formatItem helper
newField: item.newField,

// In create mutation
newField: input.newField || null,

// In update mutation
if (data.newField !== undefined) updateData.newField = data.newField;
```

6. **UI** (as needed in components)

### Adding a New Query

Put complex queries in `query.ts`, not `items.ts`:

```typescript
// server/src/trpc/routers/query.ts
export const queryRouter = router({
  // ... existing queries

  /**
   * Get items blocked by a specific person
   */
  blockedByPerson: publicProcedure
    .input(z.object({ personId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.item.findMany({
        where: {
          deletedAt: null,
          status: 'blocked',
          people: {
            some: {
              personId: input.personId,
              role: 'waiting_on',
            },
          },
        },
        include: itemIncludes,
      });
    }),
});
```

### Adding a New Reusable Component

Follow the composition pattern:

```typescript
// components/my-feature/index.ts
export { MyFeature } from "./my-feature";
export { MyFeatureItem } from "./my-feature-item";
export { useMyFeatureMutations } from "./use-my-feature-mutations";
export type { MyFeatureProps } from "./types";

// components/my-feature/use-my-feature-mutations.ts
export function useMyFeatureMutations({ onSuccess }) {
  const utils = trpc.useUtils();

  const mutation = trpc.items.update.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      onSuccess?.();
    },
  });

  return { mutation };
}

// components/my-feature/my-feature.tsx
export function MyFeature({ filter, onItemClick }: MyFeatureProps) {
  const { data, isLoading } = trpc.items.list.useQuery(filter);
  const { mutation } = useMyFeatureMutations({ onSuccess: () => {} });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {data?.items.map(item => (
        <MyFeatureItem
          key={item.id}
          item={item}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  );
}
```

---

## Anti-Patterns to Avoid

### 1. Duplicating Query Logic

```typescript
// BAD: Same date logic in 3 components
function TodayTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // ... filter logic
}

function Dashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // ... same filter logic
}

// GOOD: One server query
const { data } = trpc.query.today.useQuery();
```

### 2. Over-Engineering Components

```typescript
// BAD: Too many props, too flexible
<TaskList
  data={data}
  loading={loading}
  error={error}
  onRefresh={refetch}
  renderItem={(item) => <CustomItem item={item} />}
  renderEmpty={() => <EmptyState />}
  renderLoading={() => <Skeleton />}
  sortFn={(a, b) => a.dueDate - b.dueDate}
  filterFn={(item) => item.status !== 'complete'}
  groupFn={(item) => item.projectSlug}
  // 20 more props...
/>

// GOOD: Reasonable options, sensible defaults
<TaskList
  filter={{ status: 'pending' }}
  groupBy="project"
  onTaskClick={handleClick}
/>
```

### 3. Mixing Concerns in Routers

```typescript
// BAD: Business logic in router
create: publicProcedure.mutation(async ({ ctx, input }) => {
  // 50 lines of validation logic
  // 30 lines of side effects
  // Email sending
  // Notification creation
  // Analytics tracking
  return ctx.prisma.item.create({ data: input });
}),

// GOOD: Router is thin, delegates to services
create: publicProcedure.mutation(async ({ ctx, input }) => {
  const item = await itemService.create(ctx.prisma, input);
  await notificationService.notifyCreation(item);
  return formatItem(item);
}),
```

### 4. Inconsistent Error Handling

```typescript
// BAD: Different error patterns
// Router A: returns null
if (!item) return null;

// Router B: throws generic error
if (!item) throw new Error('Not found');

// Router C: throws tRPC error
if (!item) throw new TRPCError({ code: 'NOT_FOUND' });

// GOOD: Consistent tRPC errors
if (!item) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `Item ${id} not found`,
  });
}
```

---

## Testing Guidelines

### What to Test

| Layer | What to Test | Example |
|-------|--------------|---------|
| **Routers** | Input validation, business rules | "Should reject invalid status" |
| **Services** | Complex logic, edge cases | "Should detect sync conflicts" |
| **Queries** | Correct filtering, joins | "Should include project data" |
| **Formatters** | Output shape, null handling | "Should format dates as ISO" |

### Test Structure

```typescript
// packages/server/src/test/trpc-items.test.ts
describe('Items Router', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    caller = createCaller({ prisma: getPrisma() });
  });

  describe('create', () => {
    it('should create item with required fields', async () => {
      const item = await caller.items.create({
        title: 'Test task',
      });

      expect(item.displayId).toMatch(/^T-\d+$/);
      expect(item.status).toBe('pending');
    });

    it('should reject empty title', async () => {
      await expect(
        caller.items.create({ title: '' })
      ).rejects.toThrow();
    });
  });
});
```

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Specific file
pnpm test trpc-items
```

---

## CLI Design for AI Agents

The CLI is a primary interface for AI agents. Design for parseability:

### Output Formats

```bash
# List format: ID | STATUS | TITLE | OWNER | PROJECT
tcli list
T-42 | pending | Fix login bug | Alice | inventory-tracker
T-45 | in_progress | Review PR | Bob | analytics-dashboard

# Detail format: Key: Value
tcli get T-42
ID:       T-42
Title:    Fix login bug
Status:   pending
Priority: 2
Owner:    Alice
Project:  inventory-tracker (acme-corp)
Due:      2026-01-26

# Success messages: Action: Result
tcli complete T-42
Completed: T-42 | Fix login bug

# Errors to stderr
tcli get T-99999
Error: Item T-99999 not found
```

### Command Patterns

```bash
# CRUD follows: action resource [id] [options]
tcli list [--status X] [--owner X] [--project X]
tcli get <id>
tcli create <type> <title> [--option value]
tcli update <id> [--field value]
tcli complete <id>

# Query shortcuts for common operations
tcli today        # Items due today
tcli overdue      # Overdue items
tcli checkins     # Check-ins due

# Batch operations use comma-separated IDs
tcli complete T-42,T-43,T-44
```

---

## Debugging Tips

### tRPC Issues

```typescript
// Enable verbose logging in development
// packages/server/src/index.ts
app.use('/api/trpc', (req, res, next) => {
  console.log('tRPC:', req.method, req.url, req.body);
  next();
});
```

### Database Issues

```bash
# Open Prisma Studio
cd packages/server
npx prisma studio

# Check database directly
sqlite3 data/items.db ".schema Item"
```

### Type Issues

```bash
# Rebuild all types
pnpm --filter @kw/api-types build

# Check for type errors
pnpm tsc --noEmit
```

---

## Quick Reference

### Commands

```bash
# Development
pnpm dev:all          # Start web + server
pnpm dev:web          # Web only
pnpm dev:server       # Server only

# Building
pnpm build            # Build all
pnpm --filter @kw/api-types build  # Rebuild types

# Testing
pnpm test             # Run tests
pnpm test:watch       # Watch mode

# Database
cd packages/server
npx prisma migrate dev --name description
npx prisma studio
```

### Status Values

```typescript
type ItemStatus =
  | 'pending'      // Not started
  | 'in_progress'  // Actively working
  | 'complete'     // Done
  | 'blocked'      // Waiting on something
  | 'cancelled'    // Explicitly cancelled
  | 'deferred';    // Intentionally paused
```

### Common Queries

```typescript
// Today's items
trpc.query.today.useQuery()

// Overdue items
trpc.query.overdue.useQuery()

// Items by project
trpc.items.list.useQuery({ projectSlug: 'analytics-dashboard' })

// Items by owner
trpc.items.list.useQuery({ ownerName: 'Alice' })

// Check-ins due
trpc.items.checkins.useQuery()
```

---

## Summary of Principles

1. **Simplicity for AI** - Predictable formats, consistent patterns
2. **Composable Components** - Few components, many configurations
3. **Centralized Logic** - Business rules on server, not in UI
4. **Database is Truth** - Markdown syncs *from* database
5. **No Duplication** - Use relationships, not redundant columns
6. **Type Safety** - Schemas → Server → Client, no gaps
7. **Consistent Naming** - camelCase in code, snake_case in DB
8. **Explicit Behavior** - Clear parameters, no magic

When in doubt: **simpler is better**. If you're adding complexity, make sure it's solving a real problem, not a hypothetical one.

---

## Agents Architecture

### Overview

KnowledgeWork includes a set of **subagents** for productivity workflows. These are defined in `agents/` and symlinked into content repos via the setup script.

### Agent Files

Agents are markdown files with YAML frontmatter:

```yaml
---
name: agent-name
description: |
  What this agent does.
  Trigger phrases that invoke it.
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
model: opus
permissionMode: default
skills:
  - task-cli
  - gmail
  - dates
  - working-memory
---

[Agent instructions in markdown]
```

### Agent Directory Structure

```
KnowledgeWork/agents/           # Framework agents (source of truth)
├── cowork.md                   # Research & communications
├── chase.md                    # Follow-up tracking
├── meeting-prep.md             # Meeting preparation
├── weekly-review.md            # Week review & planning
├── writer.md                   # Document drafting
└── people.md                   # Relationship context

Content repo/.claude/agents/    # Symlinked from framework
├── cowork.md -> framework      # Framework agent (symlink)
├── chase.md -> framework       # Framework agent (symlink)
└── custom.md                   # Local agent (real file, overrides framework)
```

### Setup Script Behavior

The setup script (`scripts/setup.ts`):
1. Creates `.claude/agents/` directory in content repo
2. Symlinks each `.md` file from `KnowledgeWork/agents/`
3. Local agents (real files) take precedence over framework symlinks

### Creating New Agents

To add a new framework agent:

1. Create `agents/new-agent.md` in KnowledgeWork
2. Define frontmatter (name, description, tools, skills, model)
3. Write agent instructions
4. Run setup script to deploy to content repos

### Agent Conventions

All agents should:

1. **Have Write/Edit tools** for working-memory updates
2. **Include working-memory skill** for context access
3. **Have a "Report Back" section** specifying what to record
4. **Use AskUserQuestion** for clarification
5. **Reference skills via relative paths** (`.claude/skills/...`)

### Report Back Pattern

Every agent should update `.claude/context/working-memory.md` with:
- Key findings or insights
- Resolved items (remove from memory)
- New blockers or waiting-on items
- Patterns worth noting

Format: `[YYYY-MM-DD] [Tag] {note}`

### Docx/Xlsx Skills

Agents reference `docx` and `xlsx` skills for document output. These are external plugins:

```
/plugin install document-skills@anthropic-agent-skills
```

They're listed in agent skills for clarity but require separate installation.
