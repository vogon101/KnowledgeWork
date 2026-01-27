# Code Style Guide

This document describes the coding conventions and patterns used throughout the KnowledgeWork codebase.

## Core Principles

1. **Type Safety First** — All code must be fully typed. No `any` types without explicit justification.
2. **API-First Changes** — Schema changes in `api-types` before implementation.
3. **Consistent Patterns** — Follow established patterns in the codebase.
4. **Minimal Dependencies** — Prefer standard library solutions over new dependencies.

---

## TypeScript

### Strict Mode

All packages use strict TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true
  }
}
```

### Type Definitions

**Do:**
```typescript
// Use explicit return types for exported functions
export function calculateDueDate(item: Item): Date | null {
  return item.dueDate ? new Date(item.dueDate) : null;
}

// Use type inference for internal functions
const formatDate = (date: Date) => date.toISOString();

// Use Zod schemas as source of truth
import { ItemSchema } from '@kw/api-types';
type Item = z.infer<typeof ItemSchema>;
```

**Don't:**
```typescript
// Avoid any types
function processData(data: any) { ... }  // Bad

// Avoid type assertions without justification
const item = data as Item;  // Bad without validation
```

### Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Variables, functions | camelCase | `dueDate`, `createTask` |
| Types, interfaces | PascalCase | `Item`, `CreateItemInput` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_ITEMS`, `DEFAULT_LIMIT` |
| Files (components) | kebab-case | `task-list.tsx` |
| Files (types) | kebab-case | `item.ts` |

### Interface vs Type

```typescript
// Use interface for object shapes
interface ItemProps {
  item: Item;
  onUpdate: (id: number) => void;
}

// Use type for unions, intersections, utilities
type ItemStatus = 'pending' | 'in_progress' | 'complete';
type ItemWithRelations = Item & { project: Project };
```

---

## React Patterns

### Component Structure

```typescript
// Standard component file structure
"use client";  // If client component

import { useState } from "react";
import { ExternalIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

interface TaskCardProps {
  task: Item;
  onComplete?: () => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  // tRPC queries/mutations
  const updateMutation = trpc.items.update.useMutation({
    onSuccess: () => onComplete?.(),
  });

  // Event handlers
  const handleClick = () => {
    updateMutation.mutate({ id: task.id, data: { status: 'complete' } });
  };

  // Render
  return (
    <div className="...">
      {/* Component content */}
    </div>
  );
}
```

### Client vs Server Components

```typescript
// Server component (default in App Router)
// Can use async/await, no "use client"
export default async function TasksPage() {
  // Fetch data on server
  return <TaskList />;
}

// Client component
"use client";
export function TaskList() {
  // Uses hooks, event handlers
  const { data } = trpc.items.list.useQuery();
  return <div onClick={...}>...</div>;
}
```

### State Management

```typescript
// Local state for UI
const [isOpen, setIsOpen] = useState(false);

// Server state via tRPC + React Query
const itemsQuery = trpc.items.list.useQuery({ status: 'pending' });
const utils = trpc.useUtils();

// Mutations with cache invalidation
const mutation = trpc.items.update.useMutation({
  onSuccess: () => {
    utils.items.list.invalidate();
    utils.items.get.invalidate({ id: itemId });
  },
});
```

---

## tRPC Patterns

### Router Structure

```typescript
// packages/server/src/trpc/routers/items.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { CreateItemSchema } from '@kw/api-types';

export const itemsRouter = router({
  // Queries: read operations
  list: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.item.findMany({
        where: input.status ? { status: input.status } : undefined,
        take: input.limit,
      });
      return { items, total: items.length };
    }),

  // Mutations: write operations
  create: publicProcedure
    .input(CreateItemSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.item.create({ data: input });
    }),
});
```

### Client Usage

```typescript
// Queries
const { data, isLoading, error } = trpc.items.list.useQuery({
  status: 'pending',
});

// Mutations
const mutation = trpc.items.create.useMutation({
  onSuccess: (data) => {
    // Handle success
  },
  onError: (error) => {
    // Handle error
  },
});

// Calling mutation
mutation.mutate({ title: 'New task' });
```

---

## Zod Schemas

### Schema Definition

```typescript
// packages/api-types/src/schemas/item.ts
import { z } from 'zod';

// Base schema
export const ItemSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'complete', 'blocked', 'cancelled', 'deferred']),
  priority: z.number().min(1).max(4).nullable(),
  dueDate: z.string().nullable(),  // ISO date string
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create schema (omit auto-generated fields)
export const CreateItemSchema = ItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(['pending', 'in_progress']).default('pending'),
});

// Update schema (all fields optional except id)
export const UpdateItemSchema = z.object({
  id: z.number(),
  data: ItemSchema.partial().omit({ id: true }),
});

// Type inference
export type Item = z.infer<typeof ItemSchema>;
export type CreateItem = z.infer<typeof CreateItemSchema>;
```

### Validation Patterns

```typescript
// Parse with error handling
const result = ItemSchema.safeParse(data);
if (!result.success) {
  console.error(result.error.issues);
  return;
}
const item = result.data;

// Transform during parse
const DateSchema = z.string().transform(s => new Date(s));
```

---

## CSS / Tailwind

### Class Organization

```typescript
// Order: layout → sizing → spacing → visual → interactive
<div className="
  flex flex-col           // Layout
  w-full max-w-md         // Sizing
  p-4 gap-2              // Spacing
  bg-zinc-800 rounded-lg  // Visual
  hover:bg-zinc-700       // Interactive
">
```

### Component Variants

```typescript
// Use cn() for conditional classes
import { cn } from "@/lib/utils";

function Button({ variant, className, ...props }) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded font-medium",
        variant === "primary" && "bg-blue-600 text-white",
        variant === "secondary" && "bg-zinc-700 text-zinc-200",
        className
      )}
      {...props}
    />
  );
}
```

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Text primary | `text-zinc-100` | Main text |
| Text secondary | `text-zinc-400` | Secondary text |
| Background | `bg-zinc-900` | Page background |
| Surface | `bg-zinc-800` | Cards, panels |
| Border | `border-zinc-700` | Dividers |
| Accent | `text-blue-400` | Links, highlights |

---

## File Organization

### Import Order

```typescript
// 1. React/Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. External libraries
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

// 3. Internal packages
import { ItemSchema } from "@kw/api-types";

// 4. Internal modules (absolute paths)
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

// 5. Relative imports
import { TaskCard } from "./task-card";
import type { TaskListProps } from "./types";
```

### Directory Structure

```
src/
├── app/                    # Next.js pages (App Router)
│   ├── tasks/
│   │   ├── page.tsx       # Route component
│   │   └── [id]/
│   │       └── page.tsx   # Dynamic route
│   └── layout.tsx
├── components/
│   ├── ui/                # shadcn primitives
│   ├── task-list.tsx      # Feature components
│   └── task-card.tsx
└── lib/
    ├── trpc.ts            # tRPC client
    └── utils.ts           # Utilities
```

---

## Error Handling

### tRPC Errors

```typescript
// Server: throw tRPC errors
import { TRPCError } from '@trpc/server';

if (!item) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `Item ${id} not found`,
  });
}

// Client: handle in mutation
const mutation = trpc.items.update.useMutation({
  onError: (error) => {
    if (error.data?.code === 'NOT_FOUND') {
      showToast('Item not found', 'error');
    } else {
      showToast(error.message, 'error');
    }
  },
});
```

### Form Validation

```typescript
// Use Zod for form validation
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  email: z.string().email('Invalid email'),
});

// Validate before submission
const handleSubmit = () => {
  const result = formSchema.safeParse(formData);
  if (!result.success) {
    setErrors(result.error.flatten().fieldErrors);
    return;
  }
  mutation.mutate(result.data);
};
```

---

## Testing Conventions

See [TESTING.md](./TESTING.md) for full testing guide.

### Naming

```typescript
// Test file: same name with .test.ts
// items.ts → items.test.ts

// Describe blocks: feature or component name
describe('ItemsRouter', () => {
  // It blocks: should + expected behavior
  it('should return items filtered by status', () => {
    // ...
  });
});
```

---

## Documentation

### Code Comments

```typescript
// Use comments for non-obvious logic
// Skip date validation if status is 'cancelled' - cancelled items don't need due dates
if (status !== 'cancelled') {
  validateDueDate(dueDate);
}

// JSDoc for public APIs
/**
 * Calculate the next due date for a routine based on its recurrence rule.
 * @param routine - The routine to calculate for
 * @returns The next due date, or null if the routine is disabled
 */
export function calculateNextDue(routine: Routine): Date | null {
  // ...
}
```

### Type Documentation

```typescript
// Document complex types
export interface SyncResult {
  /** Number of tasks created from meeting notes */
  tasksCreated: number;
  /** Number of existing tasks updated */
  tasksUpdated: number;
  /** Tasks that already existed and didn't need changes */
  tasksSkipped: number;
  /** Parsing or validation errors */
  errors: string[];
}
```
