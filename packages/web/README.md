# @kw/web

Next.js web application for KnowledgeWork - the frontend for task management, project browsing, and content viewing.

## Stack

- **Framework**: Next.js 16 (App Router)
- **React**: React 19
- **Styling**: TailwindCSS v4
- **UI Components**: shadcn/ui, Radix primitives
- **API Client**: tRPC + React Query
- **Markdown**: react-markdown, remark-gfm, rehype-highlight
- **Icons**: lucide-react

## Getting Started

```bash
# From repo root
pnpm dev:web

# Or from this directory
pnpm dev
```

The app runs on `http://localhost:3000`.

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home dashboard
│   ├── tasks/             # Task management
│   │   ├── page.tsx      # Task list
│   │   └── [id]/         # Task detail
│   ├── routines/          # Routine management
│   ├── people/            # People directory
│   └── api/               # API routes
│       └── search/        # Server-side search
│
├── components/
│   ├── ui/               # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── task-list.tsx     # Task listing component
│   ├── task-detail-popover.tsx
│   ├── routines-section.tsx
│   └── ...
│
├── hooks/
│   └── use-toast.ts      # Toast notifications
│
├── lib/
│   ├── trpc.ts           # tRPC client setup
│   ├── knowledge-base.ts # Markdown file reading
│   └── utils.ts          # Utilities (cn, etc.)
│
└── server/
    └── terminal-server.ts # Terminal WebSocket server
```

## Key Patterns

### tRPC Client

All API calls use tRPC for type-safe communication:

```typescript
import { trpc } from "@/lib/trpc";

// Queries
const { data, isLoading } = trpc.items.list.useQuery({ status: 'pending' });

// Mutations
const mutation = trpc.items.update.useMutation({
  onSuccess: () => {
    utils.items.list.invalidate();
  },
});
```

### Component Structure

Components follow a consistent pattern:

```typescript
"use client";

import { trpc } from "@/lib/trpc";

interface Props {
  id: number;
}

export function TaskCard({ id }: Props) {
  const { data } = trpc.items.get.useQuery({ id });
  // ...
}
```

### File System Access

The web app reads markdown content directly via `knowledge-base.ts`:

```typescript
import { getKnowledgeBase } from "@/lib/knowledge-base";

const files = await getKnowledgeBase().listFiles("diary");
```

This is configured via `CONTENT_PATH` environment variable.

## Environment Variables

Create `.env.local`:

```bash
# tRPC API endpoint
TASK_SERVICE_URL=http://localhost:3004

# Content directory path
CONTENT_PATH=../content
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm dev:terminal` | Start terminal WebSocket server |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with routines and recent tasks |
| `/tasks` | Task management with filtering |
| `/routines` | Routine management |
| `/people` | People directory |
| `/diary/[...path]` | Diary entries (markdown) |
| `/projects/[...path]` | Project documentation (markdown) |

## Dependencies

### Production

- `@kw/api-types` - Shared Zod schemas
- `@kw/server` - tRPC type definitions
- `@tanstack/react-query` - Server state management
- `@trpc/client`, `@trpc/react-query` - Type-safe API client
- `next`, `react`, `react-dom` - Core framework
- Various Radix UI components for accessible UI

### Development

- `typescript` - Type checking
- `tailwindcss` - CSS framework
- `eslint` - Linting

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md) - System overview
- [API Reference](../../docs/API.md) - tRPC procedures
- [Code Style](../../docs/CODE_STYLE.md) - Coding conventions
