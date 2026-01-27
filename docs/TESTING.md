# Testing Guide

This document describes the testing strategy, tools, and conventions for the KnowledgeWork project.

## Testing Philosophy

1. **Test behavior, not implementation** — Tests should verify what code does, not how
2. **Regression tests for bugs** — Every bug fix must include a test that would have caught it
3. **Focus on critical paths** — Prioritize tests for data mutations and core business logic
4. **Fast feedback** — Tests should run quickly to enable continuous testing during development

---

## Test Stack

| Tool | Purpose |
|------|---------|
| Vitest | Test runner and assertions |
| @testing-library/react | React component testing |
| msw | API mocking (coming soon) |
| Prisma Test Environment | Database testing |

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @kw/server test
pnpm --filter @kw/web test
pnpm --filter @kw/api-types test

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage

# Run single test file
pnpm test -- items.test.ts
```

---

## Test Organization

### Directory Structure

```
packages/server/
├── src/
│   └── trpc/routers/
│       ├── items.ts
│       └── items.test.ts      # Colocated tests
└── tests/
    ├── setup.ts               # Test setup
    └── fixtures/              # Shared test data
        └── items.ts

packages/web/
├── src/
│   └── components/
│       ├── task-list.tsx
│       └── task-list.test.tsx # Colocated tests
└── tests/
    └── setup.tsx              # Test setup with providers
```

### Naming Conventions

```typescript
// File: feature.test.ts (colocated) or tests/feature.test.ts

describe('ItemsRouter', () => {
  describe('list', () => {
    it('should return all items when no filter provided', () => {});
    it('should filter items by status', () => {});
    it('should paginate results with limit and offset', () => {});
  });

  describe('create', () => {
    it('should create item with required fields', () => {});
    it('should throw BAD_REQUEST for invalid input', () => {});
  });
});
```

---

## Server Testing

### tRPC Router Tests

```typescript
// packages/server/src/trpc/routers/items.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContext } from '../../tests/setup';
import { itemsRouter } from './items';

describe('ItemsRouter', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;

  beforeEach(async () => {
    ctx = await createTestContext();
    // Clear database
    await ctx.prisma.item.deleteMany();
  });

  describe('list', () => {
    it('should return items filtered by status', async () => {
      // Arrange: Create test data
      await ctx.prisma.item.create({
        data: { title: 'Pending task', status: 'pending' },
      });
      await ctx.prisma.item.create({
        data: { title: 'Complete task', status: 'complete' },
      });

      // Act: Call procedure
      const caller = itemsRouter.createCaller(ctx);
      const result = await caller.list({ status: 'pending' });

      // Assert: Check result
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Pending task');
    });

    it('should paginate results', async () => {
      // Create 10 items
      for (let i = 0; i < 10; i++) {
        await ctx.prisma.item.create({
          data: { title: `Task ${i}`, status: 'pending' },
        });
      }

      const caller = itemsRouter.createCaller(ctx);
      const result = await caller.list({ limit: 5, offset: 0 });

      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('create', () => {
    it('should create item with required fields', async () => {
      const caller = itemsRouter.createCaller(ctx);
      const item = await caller.create({
        title: 'New task',
        status: 'pending',
      });

      expect(item.id).toBeDefined();
      expect(item.title).toBe('New task');
    });

    it('should throw BAD_REQUEST for empty title', async () => {
      const caller = itemsRouter.createCaller(ctx);

      await expect(
        caller.create({ title: '', status: 'pending' })
      ).rejects.toThrow();
    });
  });
});
```

### Test Context Setup

```typescript
// packages/server/tests/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createTestContext() {
  return {
    prisma,
  };
}

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
```

### Database Testing

```typescript
// Use transactions for isolation
describe('ItemService', () => {
  it('should handle concurrent updates', async () => {
    const ctx = await createTestContext();

    // Use transaction to isolate test
    await ctx.prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: { title: 'Test', status: 'pending' },
      });

      // Test concurrent updates
      await Promise.all([
        tx.item.update({ where: { id: item.id }, data: { status: 'in_progress' } }),
        tx.item.update({ where: { id: item.id }, data: { priority: 1 } }),
      ]);

      // Verify final state
      const updated = await tx.item.findUnique({ where: { id: item.id } });
      expect(updated?.status).toBe('in_progress');
    });
  });
});
```

---

## Component Testing

### React Component Tests

```typescript
// packages/web/src/components/task-list.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskList } from './task-list';
import { TRPCTestProvider } from '../../tests/setup';

describe('TaskList', () => {
  it('should render list of tasks', async () => {
    const mockTasks = [
      { id: 1, title: 'Task 1', status: 'pending' },
      { id: 2, title: 'Task 2', status: 'complete' },
    ];

    render(
      <TRPCTestProvider
        queryData={{ 'items.list': { items: mockTasks, total: 2 } }}
      >
        <TaskList />
      </TRPCTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    render(
      <TRPCTestProvider loading>
        <TaskList />
      </TRPCTestProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should handle task completion', async () => {
    const onComplete = vi.fn();

    render(
      <TRPCTestProvider
        queryData={{ 'items.list': { items: [{ id: 1, title: 'Task 1', status: 'pending' }] } }}
        mutationHandlers={{ 'items.update': onComplete }}
      >
        <TaskList />
      </TRPCTestProvider>
    );

    const completeButton = await screen.findByRole('button', { name: /complete/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, data: { status: 'complete' } })
      );
    });
  });
});
```

### Test Provider Setup

```typescript
// packages/web/tests/setup.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@kw/server/src/trpc';

interface TRPCTestProviderProps {
  children: React.ReactNode;
  queryData?: Record<string, unknown>;
  mutationHandlers?: Record<string, (input: unknown) => void>;
  loading?: boolean;
}

export function TRPCTestProvider({
  children,
  queryData = {},
  mutationHandlers = {},
  loading = false,
}: TRPCTestProviderProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  // Seed query cache with test data
  Object.entries(queryData).forEach(([key, data]) => {
    queryClient.setQueryData([key], data);
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## Schema Testing

### Zod Schema Tests

```typescript
// packages/api-types/src/schemas/item.test.ts
import { describe, it, expect } from 'vitest';
import { ItemSchema, CreateItemSchema } from './item';

describe('ItemSchema', () => {
  it('should validate valid item', () => {
    const item = {
      id: 1,
      title: 'Test task',
      status: 'pending',
      priority: 2,
      dueDate: '2024-01-15',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = ItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const item = {
      id: 1,
      title: 'Test',
      status: 'invalid_status',
    };

    const result = ItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it('should reject priority outside range', () => {
    const item = {
      id: 1,
      title: 'Test',
      status: 'pending',
      priority: 5,
    };

    const result = ItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });
});

describe('CreateItemSchema', () => {
  it('should have default status', () => {
    const input = { title: 'Test' };
    const result = CreateItemSchema.parse(input);
    expect(result.status).toBe('pending');
  });

  it('should not require id', () => {
    const input = { title: 'Test', status: 'pending' };
    const result = CreateItemSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
```

---

## Test Fixtures

### Shared Test Data

```typescript
// packages/server/tests/fixtures/items.ts
import type { Item } from '@kw/api-types';

export const fixtures = {
  pendingItem: {
    id: 1,
    title: 'Pending task',
    status: 'pending' as const,
    priority: 2,
    dueDate: '2024-01-15',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  completeItem: {
    id: 2,
    title: 'Complete task',
    status: 'complete' as const,
    priority: 1,
    completedAt: new Date('2024-01-10'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-10'),
  },
} satisfies Record<string, Partial<Item>>;

// Factory function
export function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: Math.floor(Math.random() * 10000),
    title: 'Test task',
    status: 'pending',
    priority: null,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## Coverage Requirements

### Minimum Coverage

| Package | Statements | Branches | Functions |
|---------|------------|----------|-----------|
| api-types | 90% | 85% | 90% |
| server | 80% | 75% | 80% |
| web | 70% | 65% | 70% |

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules',
        'tests/fixtures',
        '**/*.d.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
      },
    },
  },
});
```

---

## Best Practices

### Do

- **Arrange-Act-Assert** — Structure tests clearly
- **One assertion per test** — When practical, test one thing
- **Descriptive names** — Tests document expected behavior
- **Test edge cases** — Empty arrays, null values, boundaries
- **Isolate tests** — No shared state between tests

### Don't

- **Test implementation** — Don't test private methods directly
- **Mock everything** — Only mock external dependencies
- **Ignore flaky tests** — Fix or delete them
- **Skip cleanup** — Always reset state between tests

### Example: Good Test

```typescript
describe('calculateNextDue', () => {
  it('should return next week for weekly routine', () => {
    // Arrange
    const routine = createRoutine({
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
      lastCompleted: new Date('2024-01-08'), // Monday
    });

    // Act
    const nextDue = calculateNextDue(routine);

    // Assert
    expect(nextDue).toEqual(new Date('2024-01-15')); // Next Monday
  });
});
```

### Example: Bad Test

```typescript
// Too many assertions, unclear purpose
it('should work', () => {
  const routine = createRoutine({ recurrenceRule: 'FREQ=DAILY' });
  expect(routine.id).toBeDefined();
  expect(routine.recurrenceRule).toBe('FREQ=DAILY');
  const next = calculateNextDue(routine);
  expect(next).toBeDefined();
  expect(next.getTime()).toBeGreaterThan(Date.now());
});
```

---

## CI/CD Integration

Tests run automatically on:
- Push to any branch
- Pull request creation
- Merge to main

```yaml
# .github/workflows/test.yml (example)
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test -- --coverage
```
