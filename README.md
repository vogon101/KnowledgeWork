# KnowledgeWork

A personal knowledge management system with task tracking, project management, meeting notes, and diary entries. Built as a monorepo with a Next.js frontend, Express/tRPC backend, and markdown-based content storage.

## Quick Start

> **Using Claude Code?** Just say: *"Set up this project. Use ~/my-knowledge as my content directory."*
> Claude can run all these steps for you - just tell it where you want your content stored.

```bash
# 1. Install dependencies
pnpm install

# 2. Set up a content directory (stores your data separately from the framework)
#    Choose where you want your notes, tasks, and projects stored:
pnpm setup:content --path ~/my-knowledge

# 3. Configure server environment
cp packages/server/.env.example packages/server/.env
# Edit packages/server/.env with your content path:
#   DATABASE_URL="file:///Users/you/my-knowledge/.data/items.db"
#   KNOWLEDGE_BASE_PATH="/Users/you/my-knowledge"

# 4. Configure web environment (for "my tasks" filtering)
cp packages/web/.env.example packages/web/.env.local
# Edit packages/web/.env.local:
#   NEXT_PUBLIC_DEFAULT_OWNER=YourName

# 5. Start development servers
pnpm dev:all

# Or start individually
pnpm dev:server  # API server on http://localhost:3004
pnpm dev:web     # Web UI on http://localhost:3000
```

## Optional Integrations

### Gmail Integration

Read-only Gmail access for AI agents to search and summarize emails.

```bash
# 1. Create Google Cloud project and enable Gmail API
#    https://console.cloud.google.com

# 2. Create OAuth 2.0 credentials (Desktop app type)
#    Download credentials.json to your-content/.data/credentials.json

# 3. Authenticate
pnpm --filter @kw/server gmail:auth

# 4. Complete OAuth flow in browser
```

See `skills/google/SKILL.md` for usage details.

### AI Agent Skills

Skills in `skills/` provide CLI tools for AI agents (Claude Code, etc.):

| Skill | Description |
|-------|-------------|
| `task-cli` | Task management (create, list, update, complete) |
| `gmail` | Gmail search and reading (requires setup above) |
| `dates` | Date context for scheduling |
| `meetings` | Meeting note management |
| `working-memory` | Persistent context for agents |

Skills are automatically available when using Claude Code in your content directory.

## Architecture Overview

```
KnowledgeWork/
├── packages/
│   ├── web/          # Next.js 15 frontend
│   ├── server/       # Express + tRPC API server
│   └── api-types/    # Shared Zod schemas and types
├── skills/           # Skills for AI agents
├── agents/           # Agent definitions
├── templates/        # Templates for content repos
└── docs/             # Documentation
```

**Key design decisions:**
- **tRPC for type-safe APIs** - End-to-end type safety from server to client
- **Prisma ORM** - Type-safe database access with SQLite
- **Markdown as content** - Projects, meetings, and diary as files for portability
- **Server as source of truth** - Tasks/items live in database, accessed via API

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, component interactions |
| [API Reference](docs/API.md) | tRPC procedures, schemas, and usage |
| [Code Style](docs/CODE_STYLE.md) | Conventions, patterns, and best practices |
| [Testing](docs/TESTING.md) | Testing strategy, running tests, coverage |
| [Contributing](docs/CONTRIBUTING.md) | Development workflow, PR process |

## Package Documentation

| Package | Description | Docs |
|---------|-------------|------|
| [@kw/web](packages/web/) | Next.js frontend with React Query | [README](packages/web/README.md) |
| [@kw/server](packages/server/) | Express + tRPC API server | [README](packages/server/README.md) |
| [@kw/api-types](packages/api-types/) | Shared Zod schemas | [README](packages/api-types/README.md) |

## Development Rules

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full guide. Key principles:

1. **Type Safety First** - All code must be fully typed. No `any` types without justification.
2. **Documentation Required** - Update docs when changing APIs, schemas, or architecture.
3. **Test Coverage** - New features require tests. Bug fixes require regression tests.
4. **API-First Changes** - Schema changes in `api-types` before implementation.
5. **Consistent Patterns** - Follow established patterns in the codebase.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS v4, shadcn/ui
- **Backend**: Express, tRPC, Prisma, SQLite
- **Types**: TypeScript 5, Zod schemas
- **Testing**: Vitest, Testing Library
- **Tooling**: pnpm workspaces, Turbo

## License

This software is provided for personal evaluation and testing only. All other rights reserved. Commercial use, redistribution, or derivative works require explicit permission.
