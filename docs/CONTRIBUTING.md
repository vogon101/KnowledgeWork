# Contributing Guide

This document describes the development workflow and rules for contributing to the KnowledgeWork project.

## Development Rules

### Core Rules (Required)

1. **Type Safety First**
   - All code must be fully typed
   - No `any` types without explicit justification in a comment
   - Use Zod schemas for runtime validation
   - Let TypeScript infer where possible, but annotate exports

2. **Always Keep Docs Up to Date**
   - API changes require updating `docs/API.md`
   - Architecture changes require updating `docs/ARCHITECTURE.md`
   - New patterns require updating `docs/CODE_STYLE.md`
   - Document decisions in commit messages or PR descriptions

3. **Aim for Good Test Coverage**
   - New features require tests
   - Bug fixes require regression tests
   - Critical paths (data mutations) must have tests
   - See [TESTING.md](./TESTING.md) for guidelines

### Additional Rules (Suggested)

4. **API-First Changes**
   - Schema changes in `@kw/api-types` before implementation
   - tRPC procedure changes require input/output schema updates
   - Consider backwards compatibility for live endpoints

5. **Consistent Patterns**
   - Follow established patterns in the codebase
   - Check similar components before creating new ones
   - Use existing utilities rather than creating duplicates

6. **Minimal Dependencies**
   - Justify new dependencies in PR description
   - Prefer standard library solutions
   - Check bundle size impact for web packages

7. **Small, Focused Commits**
   - Each commit should do one thing
   - Write descriptive commit messages
   - Squash WIP commits before merge

8. **No Dead Code**
   - Remove unused imports and variables
   - Delete commented-out code
   - Clean up TODO comments before merge

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 8+

### Installation

```bash
# Clone repository
git clone <repo-url>
cd KnowledgeWork

# Install dependencies
pnpm install

# Start development servers
pnpm dev:all
```

### Environment Configuration

Copy `.env.example` files and configure:

```bash
# packages/server/.env
DATABASE_URL="file:./data/items.db"
PORT=3004

# packages/web/.env.local
TASK_SERVICE_URL="http://localhost:3004"
CONTENT_PATH="../content"
```

---

## Development Workflow

### 1. Create Branch

```bash
git checkout -b feature/task-description
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

Follow the [Code Style Guide](./CODE_STYLE.md).

### 3. Run Checks

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test

# All checks
pnpm check
```

### 4. Commit

```bash
# Stage changes
git add -A

# Commit with descriptive message
git commit -m "Add task filtering by project

- Add projectId parameter to items.list
- Update TaskList component to use project filter
- Add tests for project filtering"
```

### 5. Push & Create PR

```bash
git push origin feature/task-description
```

Create PR with:
- Clear description of changes
- Link to related issues
- Screenshots for UI changes
- Test coverage report

---

## Code Review Checklist

### For Authors

- [ ] Types are correct and complete
- [ ] Tests pass locally
- [ ] Documentation updated if needed
- [ ] No console.log or debug code
- [ ] PR description explains the "why"

### For Reviewers

- [ ] Types make sense
- [ ] Tests cover new code
- [ ] Code follows project patterns
- [ ] No security concerns
- [ ] Docs updated if needed

---

## Making Changes

### Adding a New API Endpoint

1. **Define schema** in `packages/api-types`
   ```typescript
   // packages/api-types/src/schemas/new-feature.ts
   export const NewFeatureSchema = z.object({...});
   ```

2. **Add procedure** to server router
   ```typescript
   // packages/server/src/trpc/routers/new-feature.ts
   export const newFeatureRouter = router({
     list: publicProcedure.query(...),
   });
   ```

3. **Register router**
   ```typescript
   // packages/server/src/trpc/index.ts
   export const appRouter = router({
     newFeature: newFeatureRouter,
   });
   ```

4. **Update docs**
   - Add section to `docs/API.md`

5. **Add tests**
   - Router tests in `packages/server`

### Adding a New Component

1. **Check existing components** — might already exist
2. **Create component** in `packages/web/src/components`
3. **Follow naming conventions** — kebab-case file, PascalCase export
4. **Add tests** if complex logic

### Modifying Database Schema

1. **Update Prisma schema**
   ```prisma
   // packages/server/prisma/schema.prisma
   model NewModel {
     id Int @id @default(autoincrement())
   }
   ```

2. **Generate migration**
   ```bash
   cd packages/server
   npx prisma migrate dev --name add_new_model
   ```

3. **Update types** if API-exposed

4. **Update docs** — especially `ARCHITECTURE.md`

---

## Project Structure

```
KnowledgeWork/
├── packages/
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # Next.js pages
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   ├── server/           # Express + tRPC backend
│   │   ├── src/
│   │   │   ├── trpc/     # tRPC routers
│   │   │   └── services/
│   │   ├── prisma/       # Database schema
│   │   └── package.json
│   │
│   └── api-types/        # Shared Zod schemas
│       ├── src/schemas/
│       └── package.json
│
├── content/              # Markdown content
│   └── ...
│
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── CODE_STYLE.md
│   ├── TESTING.md
│   └── CONTRIBUTING.md
│
└── README.md
```

---

## Common Tasks

### Run Single Package

```bash
pnpm --filter @kw/server dev
pnpm --filter @kw/web dev
```

### Update Dependencies

```bash
# Check outdated
pnpm outdated

# Update specific package
pnpm --filter @kw/web update react
```

### Database Operations

```bash
cd packages/server

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio

# Reset database
npx prisma migrate reset
```

### Troubleshooting

**Build errors after pulling:**
```bash
pnpm install
pnpm --filter @kw/api-types build
```

**Type errors in imports:**
```bash
# Rebuild all packages
pnpm build
```

**Database out of sync:**
```bash
cd packages/server
npx prisma migrate dev
```

---

## Release Process

1. Update version in root `package.json`
2. Run full test suite
3. Create release commit
4. Tag release
5. Deploy (manual for now)

---

## Getting Help

- Check existing documentation first
- Search closed issues and PRs
- Ask in project discussions
