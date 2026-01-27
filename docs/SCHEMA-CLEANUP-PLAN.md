# Schema Cleanup Plan

## Problem Summary

The database has duplicative and nullable fields that lead to data inconsistency:

1. **Duplicative org fields**: Both `org` (string) and `org_id` (foreign key) exist on `Project` and `Person` tables
2. **Nullable foreign keys**: `org_id` is nullable when it should be required for projects
3. **Data inconsistency**: Some records have the string `org` but not the `org_id` foreign key

## Current State

### Projects Table
| Field | Type | Current | Should Be |
|-------|------|---------|-----------|
| `org_id` | FK to organizations | Optional | **Required** |
| `org` | String | Optional (legacy) | **Remove** |

### People Table
| Field | Type | Current | Should Be |
|-------|------|---------|-----------|
| `org_id` | FK to organizations | Optional | Optional (some people are cross-org) |
| `org` | String | Optional (legacy) | **Remove** |

## Migration Plan

### Phase 1: Data Cleanup (Immediate)

**1.1 Fix People with org string but no org_id**
```sql
-- Find the issue
SELECT name, org, org_id FROM people WHERE org IS NOT NULL AND org_id IS NULL;

-- Fix by mapping org string to org_id
UPDATE people SET org_id = (SELECT id FROM organizations WHERE slug = people.org)
WHERE org IS NOT NULL AND org_id IS NULL;
```

**1.2 Delete orphan test data**
```sql
DELETE FROM projects WHERE org LIKE 'auto-created%';
DELETE FROM projects WHERE slug LIKE 'test-%';
```

**1.3 Verify all projects have org_id**
```sql
SELECT slug FROM projects WHERE org_id IS NULL;
-- Should return empty
```

### Phase 2: Code Migration (Next Session)

**2.1 Update all code using `project.org` string**

Files to update:
- `packages/server/src/trpc/routers/projects.ts` - Replace `project.org` with `project.organization?.slug`
- `packages/server/src/trpc/routers/items.ts` - Same
- `packages/web/src/lib/knowledge-base.ts` - Same
- All other files referencing the `org` string field

**2.2 Update API responses**

Current pattern (bad):
```typescript
return {
  org: project.org,  // Using legacy string
  // ...
};
```

New pattern (good):
```typescript
return {
  org: project.organization?.slug || 'other',  // Using relation
  // ...
};
```

### Phase 3: Schema Migration (After Code Migration)

**3.1 Create Prisma migration**

Update `schema.prisma`:
```prisma
model Project {
  // Remove these lines:
  // org String?

  // Change this to required:
  orgId        Int          @map("org_id")
  organization Organization @relation(fields: [orgId], references: [id])
}

model Person {
  // Remove this line:
  // org String?

  // Keep optional for cross-org people:
  orgId        Int?          @map("org_id")
  organization Organization? @relation(fields: [orgId], references: [id])
}
```

**3.2 Run migration**
```bash
cd packages/server
npx prisma migrate dev --name remove-legacy-org-strings
```

### Phase 4: Verification

**4.1 Run tests**
```bash
pnpm test
```

**4.2 Manual verification**
- [ ] All projects show correct org on web UI
- [ ] All people show correct org affiliation
- [ ] Creating new projects requires valid org
- [ ] API returns consistent org data

## Immediate Actions Taken

1. ✅ Deleted test projects with auto-created orgs
2. ✅ Removed `orgs-find-or-create` auto-creation functionality
3. ✅ Updated project/org mutations to require existing orgs

## Pending Actions

1. [ ] Fix people with org string but no org_id
2. [ ] Audit all code using `project.org` or `person.org` strings
3. [ ] Update code to use relations
4. [ ] Remove legacy `org` columns from schema
5. [ ] Run migration
6. [ ] Update documentation

## Risk Assessment

- **Low Risk**: Data cleanup (Phase 1) - can be done now
- **Medium Risk**: Code migration (Phase 2) - needs thorough testing
- **Medium Risk**: Schema migration (Phase 3) - needs backup and testing

## Rollback Plan

If issues arise:
1. Restore database from backup
2. Revert code changes
3. Re-add legacy columns if needed
