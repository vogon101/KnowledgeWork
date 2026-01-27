# @kw/api-types

Shared Zod schemas and TypeScript types for the KnowledgeWork API. This package is the **single source of truth** for all API type definitions.

## Installation

This package is included in the monorepo. Import directly:

```typescript
import { ItemSchema, CreateItemSchema, type Item } from '@kw/api-types';
```

## Usage

### Type Inference

Types are inferred from Zod schemas:

```typescript
import { ItemSchema, type Item } from '@kw/api-types';

// Type is automatically inferred
const item: Item = {
  id: 1,
  title: 'Task title',
  status: 'pending',
  // ...
};

// Validate data at runtime
const result = ItemSchema.safeParse(unknownData);
if (result.success) {
  const validItem: Item = result.data;
}
```

### Input Validation

Use schemas for tRPC input validation:

```typescript
import { CreateItemSchema } from '@kw/api-types';

export const itemsRouter = router({
  create: publicProcedure
    .input(CreateItemSchema)
    .mutation(async ({ ctx, input }) => {
      // input is fully typed
      return ctx.prisma.item.create({ data: input });
    }),
});
```

### Schema Composition

Build complex schemas from primitives:

```typescript
import { ItemSchema, PersonSchema, ProjectSchema } from '@kw/api-types';
import { z } from 'zod';

const ItemWithRelationsSchema = ItemSchema.extend({
  owner: PersonSchema.nullable(),
  project: ProjectSchema.nullable(),
});
```

## Available Exports

### Enums

| Export | Description |
|--------|-------------|
| `ItemStatusSchema` | Item status enum: pending, in_progress, complete, blocked, cancelled, deferred |
| `ItemTypeSchema` | Item type: task, routine, checkin |
| `PersonOrgSchema` | Person organization: ya, cbp, external, personal |
| `ProjectOrgSchema` | Project organization |
| `ProjectStatusSchema` | Project status |
| `ActivityTypeSchema` | Activity types: note, status_change, creation, etc. |

### Person

| Export | Description |
|--------|-------------|
| `PersonSchema` | Full person object |
| `CreatePersonSchema` | Input for creating person |
| `UpdatePersonSchema` | Input for updating person |
| `PersonWithStatsSchema` | Person with task counts |

### Project

| Export | Description |
|--------|-------------|
| `ProjectSchema` | Full project object |
| `CreateProjectSchema` | Input for creating project |
| `UpdateProjectSchema` | Input for updating project |
| `ProjectWithParentSchema` | Project with parent relation |

### Item (Task)

| Export | Description |
|--------|-------------|
| `ItemSchema` | Full item object |
| `CreateItemSchema` | Input for creating item |
| `UpdateItemSchema` | Input for updating item |
| `ItemWithRelationsSchema` | Item with owner, project, activities |
| `ActivitySchema` | Activity/update entry |
| `CheckInSchema` | Check-in schedule |

### Routine

| Export | Description |
|--------|-------------|
| `RoutineSchema` | Full routine object |
| `CreateRoutineSchema` | Input for creating routine |
| `UpdateRoutineSchema` | Input for updating routine |
| `RoutineWithStatusSchema` | Routine with completion status |
| `RoutineDueResponseSchema` | Due routines response |
| `RoutineOverdueResponseSchema` | Overdue routines response |

### Responses

| Export | Description |
|--------|-------------|
| `ApiResponseMetaSchema` | Standard response metadata |
| `ApiErrorResponseSchema` | Error response format |
| `SyncResultSchema` | File sync result |
| `MeetingSyncResultSchema` | Meeting sync result |

### Utilities

| Export | Description |
|--------|-------------|
| `formatTaskId(id)` | Format as "TASK-123" |
| `parseTaskId(str)` | Parse "TASK-123" to number |

## Directory Structure

```
src/
├── index.ts              # Main exports
└── schemas/
    ├── enums.ts          # Shared enum schemas
    ├── person.ts         # Person schemas
    ├── project.ts        # Project schemas
    ├── meeting.ts        # Meeting schemas
    ├── item.ts           # Item/task schemas
    ├── routine.ts        # Routine schemas
    └── responses.ts      # API response schemas
```

## Adding New Schemas

### 1. Create Schema File

```typescript
// src/schemas/new-feature.ts
import { z } from 'zod';

export const NewFeatureSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  createdAt: z.date(),
});

export const CreateNewFeatureSchema = NewFeatureSchema.omit({
  id: true,
  createdAt: true,
});

export type NewFeature = z.infer<typeof NewFeatureSchema>;
export type CreateNewFeature = z.infer<typeof CreateNewFeatureSchema>;
```

### 2. Export from Index

```typescript
// src/index.ts
export {
  NewFeatureSchema,
  CreateNewFeatureSchema,
  type NewFeature,
  type CreateNewFeature,
} from './schemas/new-feature.js';
```

### 3. Rebuild

```bash
pnpm --filter @kw/api-types build
```

## Schema Conventions

### Naming

| Pattern | Usage | Example |
|---------|-------|---------|
| `FooSchema` | Full object schema | `ItemSchema` |
| `CreateFooSchema` | Create input (no id, timestamps) | `CreateItemSchema` |
| `UpdateFooSchema` | Update input (id required, rest optional) | `UpdateItemSchema` |
| `FooWithRelationsSchema` | Includes related objects | `ItemWithRelationsSchema` |
| `type Foo` | TypeScript type | `type Item` |

### Field Conventions

- Use camelCase for all fields
- Dates as ISO strings (`z.string()`) or Zod date (`z.date()`)
- Optional fields use `.nullable()` or `.optional()`
- IDs are always `z.number()`

### Default Values

```typescript
// Provide defaults for create schemas
export const CreateItemSchema = z.object({
  title: z.string().min(1),
  status: ItemStatusSchema.default('pending'),
  priority: z.number().min(1).max(4).nullable().default(null),
});
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Compile TypeScript |
| `pnpm dev` | Watch mode compilation |
| `pnpm clean` | Remove dist/ directory |

## Dependencies

- `zod` - Schema validation library

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md) - System overview
- [API Reference](../../docs/API.md) - tRPC procedures
- [Code Style](../../docs/CODE_STYLE.md) - Type conventions
