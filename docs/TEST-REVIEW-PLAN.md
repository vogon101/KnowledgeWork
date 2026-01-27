# Test Suite Review Plan

> **Note (2026-01-26)**: Some tests in this plan reference `attentionDate` which has been removed from the system. Check-ins are now used for soft reminders instead. Tests related to `attentionDate` have been removed.

## Current State

- **Test Framework**: Vitest
- **Location**: `packages/server/src/test/`
- **Test Files**: 10 files, 177 tests total
- **Status**: 1 failing test (auto-create org behavior changed)

## Changes Requiring Test Updates

### 1. Database Normalization (org → orgId Migration)

**Changed Files:**
- `packages/server/src/trpc/routers/projects.ts` - Filters by `organization.slug` instead of `org`
- `packages/server/src/trpc/routers/people.ts` - Uses `orgId` FK, includes organization relation
- `packages/server/src/trpc/routers/items.ts` - Uses organization relation for projectOrg
- `packages/server/src/trpc/routers/query.ts` - Same changes as items router
- `packages/server/src/trpc/routers/routines.ts` - Uses organization relation
- `packages/server/src/services/project-sync.ts` - Uses `orgId` FK
- `packages/server/src/services/routine-generator-prisma.ts` - Uses organization relation

**Test Updates Needed:**

| File | Change | Action |
|------|--------|--------|
| `trpc-organizations.test.ts` | Auto-create behavior removed | **FIX**: Update test - organizations must be created explicitly before projects |
| `trpc-projects.test.ts` | Filters now use organization relation | **VERIFY**: Existing tests should pass (API unchanged) |
| `trpc-people.test.ts` | org now comes from organization.slug | **ADD**: Test that org field reflects organization relation |
| `trpc-items.test.ts` | projectOrg from organization relation | **ADD**: Test projectOrg is sourced from organization |

### 2. CLI Due Date Clearing Feature

**Changed Files:**
- `content/.claude/skills/task-cli/src/cli.ts` - Added `--due none` and `--attention none` support

**Test Updates Needed:**

| Area | Action |
|------|--------|
| Server API | **ADD**: Test that `items.update` accepts `null` for `dueDate` |
| Server API | **ADD**: Test that `items.update` accepts `null` for `attentionDate` |

Note: CLI itself doesn't have tests (it's in content/, not packages/). Server-side validation should be tested.

### 3. Recent Major Changes (from commits)

**Commit: tRPC Migration (fbfc607)**
- Most changes are UI/web related (not tested)
- orgSlug filter added to items.list - **VERIFY** existing tests cover this

**Commit: Organizations Table (93eca9e)**
- Organizations router added - tests exist and mostly pass
- Auto-create behavior removed - **FIX** failing test

## Detailed Test Changes

### Fix: trpc-organizations.test.ts

The test "should auto-create organization when creating project with new org" now fails because we intentionally removed auto-creation.

**Current Test (lines ~200-220):**
```typescript
it('should auto-create organization when creating project with new org', async () => {
  const newOrgSlug = `auto-created-org-${Date.now()}`;

  // Create project with new org (should auto-create)
  const project = await caller.projects.create({
    slug: `test-project-${Date.now()}`,
    name: 'Test Project',
    org: newOrgSlug,
  });

  // Org should exist now
  const org = await caller.organizations.get({ slug: newOrgSlug });
  expect(org.slug).toBe(newOrgSlug);
});
```

**New Test:**
```typescript
it('should require organization to exist before creating project', async () => {
  const newOrgSlug = `non-existent-org-${Date.now()}`;

  // Creating project with non-existent org should fail
  await expect(
    caller.projects.create({
      slug: `test-project-${Date.now()}`,
      name: 'Test Project',
      org: newOrgSlug,
    })
  ).rejects.toThrow(/not found|Create the organization first/i);
});

it('should create project when organization exists', async () => {
  const orgSlug = `test-org-${Date.now()}`;

  // Create organization first
  await caller.organizations.create({
    slug: orgSlug,
    name: 'Test Organization',
  });

  // Now create project
  const project = await caller.projects.create({
    slug: `test-project-${Date.now()}`,
    name: 'Test Project',
    org: orgSlug,
  });

  expect(project.org).toBe(orgSlug);

  // Cleanup
  await caller.projects.delete({ id: project.id });
  await caller.organizations.delete({ slug: orgSlug });
});
```

### Add: trpc-items.test.ts - Date Clearing Tests

**New Tests to Add:**
```typescript
describe('items.update date handling', () => {
  it('should clear dueDate when set to null', async () => {
    // Create item with due date
    const item = await caller.items.create({
      title: 'Test clear due date',
      dueDate: '2026-02-01',
    });

    expect(item.dueDate).toBe('2026-02-01');

    // Clear due date
    const updated = await caller.items.update({
      id: item.id,
      data: { dueDate: null },
    });

    expect(updated.dueDate).toBeNull();

    // Cleanup
    await caller.items.update({ id: item.id, data: { status: 'cancelled' } });
  });

  it('should clear attentionDate when set to null', async () => {
    const item = await caller.items.create({
      title: 'Test clear attention date',
      attentionDate: '2026-02-01',
    });

    expect(item.attentionDate).toBe('2026-02-01');

    const updated = await caller.items.update({
      id: item.id,
      data: { attentionDate: null },
    });

    expect(updated.attentionDate).toBeNull();

    // Cleanup
    await caller.items.update({ id: item.id, data: { status: 'cancelled' } });
  });
});
```

### Add: trpc-items.test.ts - Organization Relation Tests

**New Tests to Add:**
```typescript
describe('items organization relation', () => {
  it('should return projectOrg from organization relation', async () => {
    const result = await caller.items.list({});

    // Find an item with a project
    const itemWithProject = result.items.find(i => i.projectId);

    if (itemWithProject && itemWithProject.projectOrg) {
      // Verify it's a valid organization slug
      const org = await caller.organizations.get({
        slug: itemWithProject.projectOrg
      });
      expect(org.slug).toBe(itemWithProject.projectOrg);
    }
  });

  it('should filter by orgSlug correctly', async () => {
    const result = await caller.items.list({ orgSlug: 'acme-corp' });

    result.items.forEach(item => {
      // All items should be from acme-corp org
      expect(item.projectOrg).toBe('acme-corp');
    });
  });
});
```

### Verify: trpc-people.test.ts - Organization Relation

**New Tests to Add:**
```typescript
describe('people organization relation', () => {
  it('should return org from organization relation', async () => {
    const result = await caller.people.list({});

    // Find a person with an org
    const personWithOrg = result.people.find(p => p.org);

    if (personWithOrg) {
      // Verify it's a valid organization slug
      const org = await caller.organizations.get({
        slug: personWithOrg.org!
      });
      expect(org.slug).toBe(personWithOrg.org);
    }
  });

  it('should create person with orgId when org provided', async () => {
    // Get an existing org
    const orgs = await caller.organizations.list();
    const testOrg = orgs.organizations[0];

    const person = await caller.people.create({
      name: `Test Person ${Date.now()}`,
      org: testOrg.slug,
    });

    expect(person.org).toBe(testOrg.slug);

    // Cleanup
    await caller.people.delete({ id: person.id });
  });
});
```

## Implementation Order

1. **Fix failing test** - Update auto-create test in trpc-organizations.test.ts
2. **Add date clearing tests** - Verify server accepts null for dates
3. **Add organization relation tests** - Verify data comes from relations not legacy columns
4. **Run full test suite** - Ensure all 177+ tests pass

## Commands

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm --filter @kw/server exec vitest run src/test/trpc-organizations.test.ts

# Run tests in watch mode
pnpm --filter @kw/server exec vitest

# Run with coverage
pnpm --filter @kw/server exec vitest run --coverage
```

## Out of Scope

- CLI tests (CLI is in content/, not tested)
- Web/UI tests (no tests exist for web package)
- Integration tests with filesystem (would require mocking)
