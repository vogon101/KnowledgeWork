# @kw/server

Express + tRPC backend server for KnowledgeWork - the source of truth for tasks, routines, projects, and people.

## Stack

- **Framework**: Express.js
- **API Layer**: tRPC (type-safe RPC)
- **ORM**: Prisma
- **Database**: SQLite (via better-sqlite3)
- **Validation**: Zod schemas from `@kw/api-types`
- **Testing**: Vitest

## Getting Started

```bash
# From repo root
pnpm dev:server

# Or from this directory
pnpm dev
```

The server runs on `http://localhost:3004`.

## Directory Structure

```
src/
├── trpc/
│   ├── index.ts           # Router exports & context
│   ├── trpc.ts            # tRPC setup
│   └── routers/
│       ├── items.ts       # Tasks/items CRUD
│       ├── routines.ts    # Routine management
│       ├── projects.ts    # Project operations
│       ├── people.ts      # People directory
│       └── sync.ts        # File sync operations
│
├── routes/                # Legacy REST routes (migration)
│   ├── tasks-prisma.ts
│   ├── people-prisma.ts
│   └── ...
│
├── services/
│   ├── project-sync.ts    # Markdown ↔ DB sync
│   └── meeting-parser.ts  # Meeting file parsing
│
├── prisma.ts              # Prisma client setup
├── db.ts                  # Legacy database (deprecated)
└── index.ts               # Server entry point

prisma/
├── schema.prisma          # Database schema
└── migrations/            # Database migrations

data/
└── items.db               # SQLite database file
```

## API Endpoints

### tRPC (Recommended)

Base URL: `http://localhost:3004/api/trpc`

All procedures are type-safe. See [API Reference](../../docs/API.md) for full documentation.

```typescript
// Client usage
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@kw/server/src/trpc/index.js';

export const trpc = createTRPCReact<AppRouter>();

// Use in components
const { data } = trpc.items.list.useQuery({ status: 'pending' });
```

### REST (Legacy)

Legacy REST endpoints are available but deprecated:

| Endpoint | Description |
|----------|-------------|
| `GET /tasks` | List tasks |
| `GET /people` | List people |
| `GET /projects` | List projects |
| `GET /routines` | List routines |
| `POST /sync/meeting` | Sync meeting file |

Use tRPC endpoints for new code.

## Database

### Schema

The database schema is defined in `prisma/schema.prisma`. Key models:

- **Item** - Tasks, routines, and actionable items
- **Person** - People (owners, contacts)
- **Project** - Projects with hierarchy
- **Meeting** - Meeting records synced from markdown
- **Activity** - Item activity log

### Migrations

```bash
# Generate migration after schema changes
npx prisma migrate dev --name description

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

## Environment Variables

Create `.env`:

```bash
# Database path
DATABASE_URL="file:./data/items.db"

# Content directory for file sync
CONTENT_PATH="/path/to/content"

# Server port
TASK_SERVICE_PORT=3004
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start with hot reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run compiled code |
| `pnpm db:init` | Initialize database |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |

## Adding New Endpoints

### 1. Define Schema

Add Zod schemas in `packages/api-types`:

```typescript
// packages/api-types/src/schemas/new-feature.ts
export const NewFeatureSchema = z.object({
  id: z.number(),
  name: z.string(),
});
```

### 2. Create Router

Add tRPC router in `src/trpc/routers/`:

```typescript
// src/trpc/routers/new-feature.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { NewFeatureSchema } from '@kw/api-types';

export const newFeatureRouter = router({
  list: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.newFeature.findMany();
    }),

  create: publicProcedure
    .input(NewFeatureSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.newFeature.create({ data: input });
    }),
});
```

### 3. Register Router

Add to main router in `src/trpc/index.ts`:

```typescript
import { newFeatureRouter } from './routers/new-feature';

export const appRouter = router({
  items: itemsRouter,
  newFeature: newFeatureRouter,  // Add here
});
```

### 4. Add Tests

Create test file in `src/trpc/routers/`:

```typescript
// src/trpc/routers/new-feature.test.ts
describe('NewFeatureRouter', () => {
  it('should list features', async () => {
    // Test implementation
  });
});
```

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

See [Testing Guide](../../docs/TESTING.md) for patterns and best practices.

## Dependencies

### Production

- `@kw/api-types` - Shared Zod schemas
- `@prisma/client` - Database ORM
- `@trpc/server` - Type-safe API
- `express` - HTTP server
- `zod` - Schema validation

### Development

- `vitest` - Testing framework
- `tsx` - TypeScript execution
- `typescript` - Type checking

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md) - System overview
- [API Reference](../../docs/API.md) - Full tRPC documentation
- [Code Style](../../docs/CODE_STYLE.md) - Coding conventions
- [Testing](../../docs/TESTING.md) - Testing guide
