---
keep-coding-instructions: true
---

# KnowledgeWork

Monorepo for personal task management: web UI, API server, and markdown content.

## Two Agents, Two Repos

| Agent | Repo | Instructions |
|-------|------|--------------|
| **Coding Agent** | This repo (KnowledgeWork) | This file + `docs/CODING-AGENTS.md` |
| **Knowledge Agent** | Content repo (separate) | Content repo's `CLAUDE.md` |

**Coding agents**: Read `docs/CODING-AGENTS.md` for all development guidance (patterns, architecture, anti-patterns, common tasks).

## Repository Structure

```
KnowledgeWork/                    # Framework (this repo)
├── packages/
│   ├── web/          # Next.js frontend (port 3000)
│   ├── server/       # tRPC API server (port 3004)
│   └── api-types/    # Shared Zod schemas
├── agents/           # Knowledge Agent subagents (symlinked to content)
├── skills/           # Knowledge Agent skills (symlinked to content)
├── templates/        # CLAUDE.md template for content repos
├── scripts/          # Setup scripts
└── docs/             # Documentation

Content Repo/                     # Your data (separate repo)
├── .claude/
│   ├── agents/       # Symlinks to framework agents (+ local overrides)
│   ├── skills/       # Symlinks to framework skills (+ local skills)
│   └── context/      # Working memory, background
├── .data/
│   └── items.db      # Database
├── diary/            # Daily logs
├── [org]/            # Organization content
└── CLAUDE.md         # Knowledge Agent instructions
```

## Content Repo Setup

```bash
# From this repo, set up a content directory:
pnpm setup:content --path /path/to/your-content

# Update .env to point to your content:
# packages/server/.env
DATABASE_URL="file:/path/to/your-content/.data/items.db"
KNOWLEDGE_BASE_PATH="/path/to/your-content"
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev:all` | Start both web and server |
| `pnpm dev:web` | Start web only |
| `pnpm dev:server` | Start server only |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |

## Documentation

| Document | Purpose |
|----------|---------|
| **[docs/CODING-AGENTS.md](docs/CODING-AGENTS.md)** | **All coding guidance — read this for development** |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [docs/API.md](docs/API.md) | tRPC API reference |
| [docs/CODE_STYLE.md](docs/CODE_STYLE.md) | Coding conventions |
| [docs/TESTING.md](docs/TESTING.md) | Testing guide |
