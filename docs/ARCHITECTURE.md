# Architecture

This document describes the high-level architecture of KnowledgeWork, including system components, data flow, and key design decisions.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          KnowledgeWork (Framework)                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js Web App (port 3000)                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │   │
│  │  │   Pages     │  │ Components  │  │    React Query + tRPC   │   │   │
│  │  │  (App Dir)  │  │  (shadcn)   │  │       Client            │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    │ tRPC (HTTP/JSON)                    │
│                                    ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                Express + tRPC Server (port 3004)                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │   │
│  │  │   tRPC      │  │  Services   │  │        Prisma           │   │   │
│  │  │   Routers   │  │  (Business  │  │         ORM             │   │   │
│  │  │             │  │   Logic)    │  │                         │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  skills/           # Knowledge Agent skills (symlinked to content)│   │
│  │  templates/        # CLAUDE.md template                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      Content Repo (External / Separate)                │
│                                                                        │
│   ┌───────────────┐               ┌───────────────────────────────┐   │
│   │   SQLite DB   │               │   Markdown Content            │   │
│   │  (.data/      │               │                               │   │
│   │   items.db)   │               │  - diary/      (daily logs)   │   │
│   │               │               │  - [org]/      (projects,     │   │
│   │  - Items      │               │                 meetings)     │   │
│   │  - People     │               │  - .claude/    (skills link,  │   │
│   │  - Projects   │               │                 context)      │   │
│   │  - Meetings   │               │                               │   │
│   └───────────────┘               └───────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

**Note**: The content (database + markdown files) lives in a separate repository from the KnowledgeWork framework. This allows the framework to be shared while keeping personal data private. The `KNOWLEDGE_BASE_PATH` and `DATABASE_URL` environment variables configure the server to point to your content repo.

## Component Details

### 1. Web Frontend (`packages/web`)

**Technology**: Next.js 15 (App Router), React 19, TailwindCSS v4

**Responsibilities**:
- User interface for tasks, projects, routines, people
- Markdown content browsing (diary, meetings, projects)
- File-based content rendering via `knowledge-base.ts`

**Key Patterns**:
- tRPC client for all API calls (no direct fetch)
- React Query for caching and state management
- Server components for initial data, client components for interactivity

**Directory Structure**:
```
packages/web/src/
├── app/                    # Next.js App Router pages
│   ├── tasks/             # Task management UI
│   ├── routines/          # Routine management
│   ├── people/            # People directory
│   └── api/search/        # Server-side search API
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   ├── task-list.tsx     # Task listing component
│   └── ...
└── lib/
    ├── trpc.ts           # tRPC client setup
    └── knowledge-base.ts # Markdown file reading
```

### 2. API Server (`packages/server`)

**Technology**: Express, tRPC, Prisma, SQLite

**Responsibilities**:
- RESTful and tRPC API endpoints
- Business logic for items, routines, projects, people
- Database operations via Prisma
- File sync between markdown and database

**Key Patterns**:
- tRPC routers for type-safe procedures
- Prisma for database access (no raw SQL)
- Services layer for complex business logic

**Directory Structure**:
```
packages/server/src/
├── trpc/
│   ├── index.ts          # tRPC app router
│   ├── trpc.ts           # tRPC context and setup
│   └── routers/          # Domain-specific routers
│       ├── items.ts      # Tasks/items CRUD
│       ├── routines.ts   # Routine management
│       ├── projects.ts   # Project operations
│       ├── people.ts     # People directory
│       └── sync.ts       # File sync operations
├── services/             # Business logic
│   ├── file-sync.ts      # Markdown ↔ DB sync
│   └── meeting-parser.ts # Meeting file parsing
├── prisma/
│   └── schema.prisma     # Database schema
└── index.ts              # Server entry point
```

### 3. Shared Types (`packages/api-types`)

**Technology**: TypeScript, Zod

**Responsibilities**:
- Shared type definitions
- Zod schemas for validation
- Type inference for tRPC

**Key Exports**:
```typescript
// Schemas (Zod)
export { ItemSchema, CreateItemSchema, UpdateItemSchema } from './schemas/item';
export { PersonSchema, CreatePersonSchema } from './schemas/person';
export { ProjectSchema, CreateProjectSchema } from './schemas/project';
export { RoutineSchema, CreateRoutineSchema } from './schemas/routine';

// Types (inferred from Zod)
export type { Item, CreateItem, UpdateItem };
export type { Person, CreatePerson };
export type { Project, CreateProject };
export type { Routine, CreateRoutine };
```

## Data Flow

### 1. Type-Safe API Calls

```
                    ┌─────────────────────────┐
                    │    api-types package    │
                    │  (Zod schemas + types)  │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │  Web Client   │  │  tRPC Router  │  │   Prisma      │
    │  (inference)  │  │  (validation) │  │   (mapping)   │
    └───────────────┘  └───────────────┘  └───────────────┘
```

1. Schemas defined in `api-types`
2. Server validates inputs with Zod schemas
3. Client infers types from tRPC router
4. Prisma operations use same types

### 2. Query Flow

```
Component → useQuery → tRPC Client → HTTP → tRPC Router → Prisma → DB
    │                                                               │
    └──────────────────── Typed Response ──────────────────────────┘
```

### 3. Mutation Flow

```
User Action → useMutation → tRPC Client → HTTP → tRPC Router
                                                      │
                                                      ▼
                                              Input Validation
                                                      │
                                                      ▼
                                              Business Logic
                                                      │
                                                      ▼
                                              Prisma → DB
                                                      │
                                                      ▼
                                              Response → Client
                                                      │
                                                      ▼
                                              Cache Invalidation
```

## Database Schema

See [packages/server/prisma/schema.prisma](../packages/server/prisma/schema.prisma) for the full schema.

**Core Entities**:

| Entity | Description |
|--------|-------------|
| `Item` | Tasks, routines, and other actionable items |
| `Person` | People (owners, contacts) |
| `Project` | Projects with hierarchy support |
| `Meeting` | Meeting records synced from markdown |
| `Activity` | Item activity log (status changes, notes) |

**Key Relationships**:
- Items belong to Projects (optional)
- Items have Owners (Person, optional)
- Items can be blocked by other Items
- Projects have parent/child hierarchy

## Content Storage

### Database (SQLite)
- **Source of truth** for actionable items
- Tasks, routines, people, projects
- Activity history and metadata

### Filesystem (Markdown)
- **Source of truth** for content
- Project documentation, meeting notes, diary
- Parsed and synced to database as needed

### Sync Strategy
```
Markdown Files  ←──sync──→  Database
    │                          │
    │                          │
    ▼                          ▼
  Read-only               Source of truth
  content view            for item status
```

## Key Design Decisions

### 1. Why tRPC over REST?

- **End-to-end type safety**: Changes to API automatically reflect in client
- **No code generation**: Types inferred at build time
- **Better DX**: IDE autocomplete for all API calls
- **Colocated validation**: Zod schemas at procedure level

### 2. Why SQLite?

- **Simplicity**: Single file, no server management
- **Local-first**: Works offline, fast for single-user
- **Prisma support**: Full ORM capabilities
- **Portable**: Easy backup and migration

### 3. Why Markdown Content?

- **Git-friendly**: Version control for all content
- **Portable**: No lock-in, easy to migrate
- **Human-readable**: Edit with any text editor
- **Obsidian-compatible**: Use as knowledge base

### 4. Why Separate Server and Web?

- **Clear boundaries**: API can be used by CLI, other tools
- **Independent deployment**: Can scale/update separately
- **Type boundary**: Forces explicit API contracts

## Performance Considerations

### Caching Strategy
- React Query caches tRPC responses
- Stale-while-revalidate for most queries
- Optimistic updates for mutations

### Database Indexing
- Indexed columns: `status`, `ownerId`, `projectId`, `dueDate`
- See Prisma schema for full index definitions

### Pagination
- List endpoints support `limit` and `offset`
- Default limit: 50 items
- Use cursor-based pagination for large datasets

## Security Considerations

### Input Validation
- All inputs validated with Zod schemas
- Type coercion handled explicitly
- No raw SQL queries

### Authentication
- Currently single-user (no auth)
- Ready for auth middleware when needed

### Data Isolation
- Content directory separate from code
- Database in server package
- No secrets in code

## Future Architecture Considerations

### Potential Improvements
1. **Real-time updates**: WebSocket or SSE for live updates
2. **Full-text search**: SQLite FTS or external search engine
3. **Multi-user**: Add authentication and authorization
4. **Cloud sync**: Optional sync to cloud storage

### Migration Path
1. Add auth middleware to tRPC context
2. Add user relation to entities
3. Deploy server separately from web
4. Add cloud database option
