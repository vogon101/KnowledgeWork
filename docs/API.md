# API Reference

This document describes the tRPC API provided by the server package. All APIs are fully typed using Zod schemas from `@kw/api-types`.

## Base URL

- **Development**: `http://localhost:3004/trpc`
- **tRPC Panel**: `http://localhost:3004/panel` (development only)

## Client Setup

```typescript
// packages/web/src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@kw/server/src/trpc/index.js';

export const trpc = createTRPCReact<AppRouter>();
```

## Router Overview

| Router | Description | Key Procedures |
|--------|-------------|----------------|
| `items` | Tasks and actionable items | list, get, create, update, delete |
| `routines` | Recurring tasks | list, due, complete, skip |
| `projects` | Project management | list, get, create, update |
| `people` | People directory | list, get, create, update, delete |
| `sync` | File synchronization | meeting, filesystem |

---

## Items Router

Manages tasks and other actionable items.

### `items.list`

List items with filtering and pagination.

```typescript
// Query
const { data } = trpc.items.list.useQuery({
  status: 'pending',           // Optional: filter by status
  projectId: 1,                // Optional: filter by project
  ownerId: 2,                  // Optional: filter by owner
  includeCompleted: false,     // Optional: include completed items
  limit: 50,                   // Optional: max items (default 50)
  offset: 0,                   // Optional: pagination offset
});

// Response type
type Response = {
  items: Item[];
  total: number;
  hasMore: boolean;
};
```

### `items.get`

Get a single item by ID with full details.

```typescript
// Query
const { data } = trpc.items.get.useQuery({ id: 42 });

// Response includes relations
type Response = Item & {
  updates: Activity[];
  subtasks?: Item[];
};
```

### `items.create`

Create a new item.

```typescript
// Mutation
const mutation = trpc.items.create.useMutation();

mutation.mutate({
  title: 'Task title',
  description: 'Optional description',
  status: 'pending',                    // Default: pending
  priority: 2,                          // 1-4, optional
  dueDate: '2024-01-15',               // ISO date, optional
  ownerId: 1,                          // Optional
  projectId: 2,                        // Optional
  // For blocking relationships, use items.addBlocker after creation
});
```

### `items.update`

Update an existing item.

```typescript
const mutation = trpc.items.update.useMutation();

mutation.mutate({
  id: 42,
  data: {
    status: 'in_progress',
    priority: 1,
  },
});
```

### `items.addNote`

Add a note/activity to an item.

```typescript
const mutation = trpc.items.addNote.useMutation();

mutation.mutate({
  id: 42,
  note: 'Made progress on this',
  updateType: 'note',  // Default: 'note'
});
```

### `items.completeCheckin`

Mark a check-in as completed.

```typescript
const mutation = trpc.items.completeCheckin.useMutation();

mutation.mutate({
  id: 42,
  checkinId: 5,        // Optional: specific check-in ID
});
```

### `items.addBlocker`

Add a blocking relationship between items. Creates an ItemLink with `linkType: 'blocks'`.

```typescript
const mutation = trpc.items.addBlocker.useMutation();

mutation.mutate({
  itemId: 42,          // The item being blocked
  blockerId: 10,       // The blocking item
});
// Sets itemId's status to 'blocked' if it has any blockers
```

### `items.removeBlocker`

Remove a blocking relationship. If no blockers remain, sets status to 'pending'.

```typescript
const mutation = trpc.items.removeBlocker.useMutation();

mutation.mutate({
  itemId: 42,
  blockerId: 10,
});
```

### `items.getBlockers`

Get all items blocking a specific item.

```typescript
const { data } = trpc.items.getBlockers.useQuery({ id: 42 });

type Response = {
  itemId: number;
  displayId: string;
  blockers: Array<{
    id: number;
    displayId: string;
    title: string;
    status: string;
    linkId: number;
  }>;
  count: number;
};
```

### `items.getBlocking`

Get all items that a specific item is blocking.

```typescript
const { data } = trpc.items.getBlocking.useQuery({ id: 10 });

type Response = {
  itemId: number;
  displayId: string;
  blocking: Array<{
    id: number;
    displayId: string;
    title: string;
    status: string;
    linkId: number;
  }>;
  count: number;
};
```

---

## Routines Router

Manages recurring tasks and habits.

### `routines.list`

List all routine templates.

```typescript
const { data } = trpc.routines.list.useQuery();

type Response = {
  routines: Routine[];
  total: number;
};
```

### `routines.due`

Get routines due today with completion status.

```typescript
const { data } = trpc.routines.due.useQuery();

type Response = {
  date: string;
  total: number;
  pendingCount: number;
  completedCount: number;
  pending: RoutineWithStatus[];
  completed: RoutineWithStatus[];
};
```

### `routines.overdue`

Get overdue routine instances.

```typescript
const { data } = trpc.routines.overdue.useQuery();

type Response = {
  totalOverdue: number;
  totalMissedInstances: number;
  routines: OverdueRoutine[];
};
```

### `routines.complete`

Mark a routine as completed for a date.

```typescript
const mutation = trpc.routines.complete.useMutation();

mutation.mutate({
  id: 5,
  date: '2024-01-15',   // Optional: defaults to today
  notes: 'Done early',   // Optional
});
```

### `routines.uncomplete`

Remove completion for a routine on a date.

```typescript
const mutation = trpc.routines.uncomplete.useMutation();

mutation.mutate({
  id: 5,
  date: '2024-01-15',   // Optional: defaults to today
});
```

### `routines.skip`

Skip a routine for a date.

```typescript
const mutation = trpc.routines.skip.useMutation();

mutation.mutate({
  id: 5,
  date: '2024-01-15',
  notes: 'On vacation',
});
```

### `routines.skipAllOverdue`

Skip all overdue instances, advancing to next due date.

```typescript
const mutation = trpc.routines.skipAllOverdue.useMutation();

mutation.mutate({ id: 5 });

type Response = {
  routineId: number;
  skippedCount: number;
  datesSkipped: string[];
  nextDue: string;
};
```

---

## Projects Router

Manages projects and their hierarchy.

### `projects.list`

List all projects.

```typescript
const { data } = trpc.projects.list.useQuery();

type Response = {
  projects: Project[];
  total: number;
};
```

### `projects.get`

Get a project with task counts.

```typescript
const { data } = trpc.projects.get.useQuery({ slug: 'my-project', org: 'acme-corp' });

type Response = Project & {
  taskCount: number;
  pendingCount: number;
  children: Project[];
};
```

### `projects.create`

Create a new project.

```typescript
const mutation = trpc.projects.create.useMutation();

mutation.mutate({
  slug: 'my-project',
  name: 'My Project',
  org: 'acme-corp',
  status: 'active',
  priority: 2,
  parentId: 1,          // Optional: for sub-projects
  description: '...',
});
```

### `projects.update`

Update a project.

```typescript
const mutation = trpc.projects.update.useMutation();

mutation.mutate({
  id: 1,
  data: {
    status: 'completed',
    priority: 1,
  },
});
```

---

## People Router

Manages the people directory.

### `people.list`

List all people with optional filtering.

```typescript
const { data } = trpc.people.list.useQuery({
  search: 'john',      // Optional: search by name
  org: 'ya',           // Optional: filter by org
  limit: 50,           // Optional
});

type Response = {
  people: PersonWithStats[];
  total: number;
};
```

### `people.get`

Get a person with their tasks.

```typescript
const { data } = trpc.people.get.useQuery({ id: 1 });

type Response = Person & {
  ownedTasks: Item[];
  waitingOnTasks: Item[];
};
```

### `people.create`

Create a new person.

```typescript
const mutation = trpc.people.create.useMutation();

mutation.mutate({
  name: 'John Smith',
  email: 'john@example.com',
  org: 'ya',           // 'ya' | 'cbp' | 'external' | 'personal'
  notes: 'Key contact',
});
```

### `people.update`

Update a person.

```typescript
const mutation = trpc.people.update.useMutation();

mutation.mutate({
  id: 1,
  data: {
    email: 'newemail@example.com',
    notes: 'Updated notes',
  },
});
```

### `people.delete`

Delete a person (unassigns their tasks).

```typescript
const mutation = trpc.people.delete.useMutation();

mutation.mutate({ id: 1 });
```

---

## Sync Router

Manages synchronization between markdown files and database.

### `sync.meeting`

Sync actions from a meeting file to database.

```typescript
const mutation = trpc.sync.meeting.useMutation();

mutation.mutate({
  path: 'acme-corp/meetings/2024/01/2024-01-15-standup.md',
  dryRun: false,       // Optional: preview without changes
});

type Response = {
  meetingPath: string;
  meetingTitle: string;
  actionsFound: number;
  tasksCreated: number;
  tasksUpdated: number;
  tasksSkipped: number;
  errors: string[];
  taskIds: string[];
};
```

### `sync.meetingPreview`

Preview what would be synced from a meeting.

```typescript
const { data } = trpc.sync.meetingPreview.useQuery({
  path: 'acme-corp/meetings/2024/01/2024-01-15-standup.md',
});
```

### `sync.filesystem`

Sync all workstream files to database.

```typescript
const mutation = trpc.sync.filesystem.useMutation();

mutation.mutate();

type Response = {
  synced: number;
  errors: string[];
};
```

---

## Common Types

### Item Status

```typescript
type ItemStatus =
  | 'pending'
  | 'in_progress'
  | 'complete'
  | 'blocked'
  | 'cancelled'
  | 'deferred';
```

### Priority

```typescript
type Priority = 1 | 2 | 3 | 4;  // 1 = highest, 4 = lowest
```

### Target Period

```typescript
type TargetPeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | null;
```

### Organization

```typescript
type Org = 'ya' | 'cbp' | 'external' | 'personal';
```

---

## Error Handling

tRPC errors include error codes and messages:

```typescript
import { TRPCError } from '@trpc/server';

// Common error codes
type TRPCErrorCode =
  | 'NOT_FOUND'         // Resource not found
  | 'BAD_REQUEST'       // Invalid input
  | 'INTERNAL_ERROR'    // Server error
  | 'UNAUTHORIZED';     // Not authenticated

// Client-side handling
const mutation = trpc.items.update.useMutation({
  onError: (error) => {
    if (error.data?.code === 'NOT_FOUND') {
      // Handle not found
    }
  },
});
```

---

## React Query Integration

### Cache Invalidation

```typescript
const utils = trpc.useUtils();

// After mutation
const mutation = trpc.items.create.useMutation({
  onSuccess: () => {
    utils.items.list.invalidate();  // Refetch lists
  },
});
```

### Optimistic Updates

```typescript
const mutation = trpc.items.update.useMutation({
  onMutate: async (newData) => {
    await utils.items.get.cancel({ id: newData.id });
    const previous = utils.items.get.getData({ id: newData.id });

    utils.items.get.setData({ id: newData.id }, (old) => ({
      ...old,
      ...newData.data,
    }));

    return { previous };
  },
  onError: (err, newData, context) => {
    utils.items.get.setData({ id: newData.id }, context?.previous);
  },
});
```

---

## Health Check

```bash
curl http://localhost:3004/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```
