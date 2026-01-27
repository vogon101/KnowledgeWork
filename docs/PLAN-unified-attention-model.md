# Implementation Plan: Unified Attention Model

> **STATUS: SUPERSEDED (2026-01-26)**
>
> This plan was not implemented. Instead, we simplified the model:
> - **Removed attention date** entirely from the system
> - Tasks now have just **due dates** (hard deadlines) and **check-ins** (soft reminders/periodic reviews)
> - The "today" query returns only items due today
> - Check-ins remain a separate query (`items.checkins`)
>
> The complexity of a unified attention model wasn't justified. Check-ins serve the "soft reminder" use case that attention dates were meant to fill.

---

## Original Overview (Not Implemented)

Treat check-ins as an "attention reason" alongside due dates, attention dates, and overdue status. From the API consumer's perspective, check-ins are just another reason a task surfaces, not a separate entity.

## Goals

1. **Single query** - Get all items needing attention (tasks + check-ins) in one call
2. **Clear tagging** - Each item has `attentionReasons` explaining why it's surfacing
3. **Default inclusion** - Check-ins included by default, opt-out with `excludeCheckins`
4. **Consistent across queries** - Same behavior for `list`, `today`, `overdue`, project filters
5. **No lost functionality** - Can still query check-ins specifically if needed

---

## Phase 1: API Types (packages/api-types)

### 1.1 Add AttentionReason schema

**File**: `packages/api-types/src/schemas/item.ts`

```typescript
export const AttentionReasonTypeSchema = z.enum([
  'due',           // Task has due date on/before target date
  'attention',     // Task has attention date on/before target date
  'checkin',       // Task has check-in due on/before target date
  'overdue',       // Task is past due date
]);

export const AttentionReasonSchema = z.object({
  type: AttentionReasonTypeSchema,
  date: z.string(),              // ISO date string
  checkinId: z.number().optional(),  // Only for checkin type
  note: z.string().optional(),       // Check-in note if any
});

export type AttentionReason = z.infer<typeof AttentionReasonSchema>;
export type AttentionReasonType = z.infer<typeof AttentionReasonTypeSchema>;
```

### 1.2 Add to Item response type

```typescript
// Extended item type with attention reasons
export const ItemWithAttentionSchema = ItemSchema.extend({
  attentionReasons: z.array(AttentionReasonSchema).default([]),
});
```

---

## Phase 2: Server Router Updates (packages/server)

### 2.1 Create shared attention helper

**File**: `packages/server/src/trpc/utils/attention.ts` (new file)

```typescript
import type { PrismaClient, Item, CheckIn } from '../../generated/prisma/index.js';

export interface AttentionReason {
  type: 'due' | 'attention' | 'checkin' | 'overdue';
  date: string;
  checkinId?: number;
  note?: string;
}

export interface AttentionOptions {
  targetDate?: Date;           // Default: today
  includeCheckins?: boolean;   // Default: true
  includeFuture?: boolean;     // Include items due after targetDate
}

/**
 * Compute attention reasons for an item
 */
export function computeAttentionReasons(
  item: Item & { checkIns?: CheckIn[] },
  options: AttentionOptions = {}
): AttentionReason[] {
  const { targetDate = new Date(), includeCheckins = true } = options;
  const today = targetDate.toISOString().split('T')[0];
  const reasons: AttentionReason[] = [];

  // Check due date
  if (item.dueDate) {
    const dueStr = item.dueDate.toISOString().split('T')[0];
    if (dueStr < today) {
      reasons.push({ type: 'overdue', date: dueStr });
    } else if (dueStr === today) {
      reasons.push({ type: 'due', date: dueStr });
    }
  }

  // Check attention date
  if (item.attentionDate) {
    const attStr = item.attentionDate.toISOString().split('T')[0];
    if (attStr <= today) {
      reasons.push({ type: 'attention', date: attStr });
    }
  }

  // Check check-ins
  if (includeCheckins && item.checkIns) {
    for (const checkin of item.checkIns) {
      if (checkin.completed) continue;
      const checkinStr = checkin.date.toISOString().split('T')[0];
      if (checkinStr <= today) {
        reasons.push({
          type: 'checkin',
          date: checkinStr,
          checkinId: checkin.id,
          note: checkin.note || undefined,
        });
      }
    }
  }

  return reasons;
}

/**
 * Build Prisma where clause to include items with pending check-ins
 */
export function buildAttentionWhereClause(
  baseWhere: any,
  options: AttentionOptions = {}
): any {
  const { targetDate = new Date(), includeCheckins = true } = options;
  const todayStr = targetDate.toISOString().split('T')[0];

  if (!includeCheckins) {
    return baseWhere;
  }

  // OR condition: base criteria OR has pending check-in
  return {
    AND: [
      { deletedAt: null },
      { status: { notIn: ['complete', 'cancelled'] } },
      {
        OR: [
          baseWhere,
          {
            checkIns: {
              some: {
                completed: false,
                date: { lte: new Date(todayStr + 'T23:59:59Z') },
              },
            },
          },
        ],
      },
    ],
  };
}
```

### 2.2 Update items.list endpoint

**File**: `packages/server/src/trpc/routers/items.ts`

Add input parameter:
```typescript
list: publicProcedure
  .input(z.object({
    // ... existing params
    includeCheckins: z.boolean().default(true),  // NEW
    excludeCheckins: z.boolean().default(false), // NEW (alternative)
  }).optional())
```

Update query logic:
```typescript
// Include check-ins in the response
const itemIncludes = {
  // ... existing includes
  checkIns: {
    where: { completed: false },
    orderBy: { date: 'asc' as const },
  },
};

// Build where clause that includes items with pending check-ins
const where = input?.includeCheckins !== false
  ? buildAttentionWhereClause(baseWhere, { targetDate: new Date() })
  : baseWhere;

// Add attentionReasons to response
const itemsWithReasons = items.map(item => ({
  ...item,
  attentionReasons: computeAttentionReasons(item, {
    includeCheckins: input?.includeCheckins !== false
  }),
}));
```

### 2.3 Update query.today endpoint

**File**: `packages/server/src/trpc/routers/query.ts`

```typescript
today: publicProcedure
  .input(z.object({
    includeCheckins: z.boolean().default(true),  // NEW
    projectSlug: z.string().optional(),
    ownerId: z.number().optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Base query: items due today OR attention date today
    const baseWhere = {
      deletedAt: null,
      status: { notIn: ['complete', 'cancelled'] },
      OR: [
        { dueDate: { gte: new Date(todayStr), lt: new Date(todayStr + 'T23:59:59Z') } },
        { attentionDate: { gte: new Date(todayStr), lt: new Date(todayStr + 'T23:59:59Z') } },
      ],
    };

    // Extend to include check-ins if requested (default: yes)
    const where = input?.includeCheckins !== false
      ? buildAttentionWhereClause(baseWhere, { targetDate: today })
      : baseWhere;

    const items = await ctx.prisma.item.findMany({
      where,
      include: itemIncludes,
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });

    return {
      date: todayStr,
      items: items.map(item => ({
        ...formatItem(item),
        attentionReasons: computeAttentionReasons(item),
      })),
      counts: {
        total: items.length,
        withDue: items.filter(i => i.dueDate).length,
        withCheckin: items.filter(i => i.checkIns?.some(c => !c.completed)).length,
      },
    };
  }),
```

### 2.4 Update query.overdue endpoint

Similar pattern - include items with overdue check-ins.

### 2.5 Deprecate items.checkins endpoint

Mark as deprecated but keep for backwards compatibility:
```typescript
/**
 * @deprecated Use items.list with includeCheckins: true instead
 */
checkins: publicProcedure
  // ... existing implementation
```

---

## Phase 3: CLI Updates (content/.claude/skills/task-cli)

### 3.1 Update list command

**File**: `content/.claude/skills/task-cli/src/cli.ts`

```typescript
// Add --no-checkins flag
.option('--no-checkins', 'Exclude items with only check-ins due')

// Update query
const result = await trpc.items.list.query({
  ...filters,
  includeCheckins: !options.noCheckins,
});
```

### 3.2 Update today command

```typescript
program
  .command('today')
  .description('Show items needing attention today')
  .option('--no-checkins', 'Exclude check-ins')
  .action(async (options) => {
    const result = await trpc.query.today.query({
      includeCheckins: !options.noCheckins,
    });

    // Format output showing attention reasons
    for (const item of result.items) {
      const reasons = item.attentionReasons
        .map(r => formatReason(r))
        .join(', ');
      console.log(`${formatId(item.id)} ${item.title} [${reasons}]`);
    }
  });
```

### 3.3 Update format.ts for attention reasons

**File**: `content/.claude/skills/task-cli/src/format.ts`

```typescript
export function formatAttentionReason(reason: AttentionReason): string {
  switch (reason.type) {
    case 'due':
      return `due ${formatDate(reason.date)}`;
    case 'overdue':
      return `OVERDUE ${formatDate(reason.date)}`;
    case 'attention':
      return `attention ${formatDate(reason.date)}`;
    case 'checkin':
      return `✓ check-in ${formatDate(reason.date)}`;
  }
}

export function formatItemWithReasons(item: ItemWithAttention): string {
  const id = formatTaskId(item.id);
  const title = item.title;
  const reasons = item.attentionReasons.map(formatAttentionReason).join(' · ');
  const owner = item.owner?.name ? `@${item.owner.name}` : '';

  return `${id}  ${title.padEnd(40)}  ${reasons}  ${owner}`;
}
```

### 3.4 Deprecate checkins command

Keep for backwards compatibility but suggest using `today` or `list`:
```typescript
program
  .command('checkins')
  .description('[DEPRECATED] Use "today" or "list" instead - shows items with check-ins')
```

---

## Phase 4: Web Updates (packages/web)

### 4.1 Update task-db.ts

**File**: `packages/web/src/lib/task-db.ts`

Update the Task type and queries to include attentionReasons.

### 4.2 Simplify tasks-dashboard.tsx

**File**: `packages/web/src/app/tasks/tasks-dashboard.tsx`

Replace 3 separate queries with single unified query:
```typescript
// BEFORE (3 queries)
const tasksQuery = trpc.items.list.useQuery({...});
const overdueQuery = trpc.query.overdue.useQuery({});
const checkinsQuery = trpc.items.checkins.useQuery({...});

// AFTER (1 query)
const itemsQuery = trpc.query.today.useQuery({
  includeCheckins: true,
});

// Items already have attentionReasons - no client-side merge needed
```

### 4.3 Update task-list.tsx

Update to use `attentionReasons` instead of separate check-in fields:
```typescript
// Show attention indicators based on reasons
{item.attentionReasons.map(reason => (
  <AttentionBadge key={reason.type} reason={reason} />
))}
```

### 4.4 Create AttentionBadge component

**File**: `packages/web/src/components/attention-badge.tsx`

```typescript
export function AttentionBadge({ reason }: { reason: AttentionReason }) {
  const styles = {
    due: 'bg-blue-500/20 text-blue-400',
    overdue: 'bg-red-500/20 text-red-400',
    attention: 'bg-amber-500/20 text-amber-400',
    checkin: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${styles[reason.type]}`}>
      {reason.type === 'checkin' ? '✓' : ''} {reason.type}
    </span>
  );
}
```

---

## Phase 5: Testing

### 5.1 Add unit tests for attention helper

**File**: `packages/server/src/test/attention.test.ts`

```typescript
describe('computeAttentionReasons', () => {
  it('returns due reason for item due today', () => {...});
  it('returns overdue reason for past due items', () => {...});
  it('returns checkin reason for pending check-ins', () => {...});
  it('returns multiple reasons when applicable', () => {...});
  it('excludes check-ins when includeCheckins is false', () => {...});
});
```

### 5.2 Add integration tests

Test the full flow from API to response.

---

## Migration Path

### Breaking Changes: None

All changes are additive:
- New `attentionReasons` field added to responses
- New `includeCheckins` param with default `true`
- Existing endpoints continue to work

### Deprecations

- `items.checkins` endpoint - suggest using `list` or `today`
- CLI `checkins` command - suggest using `today`

---

## Implementation Order

1. **Phase 1**: API types (small, foundational)
2. **Phase 2.1**: Create attention helper utility
3. **Phase 2.2-2.4**: Update server endpoints one at a time
4. **Phase 5.1**: Add tests as we go
5. **Phase 3**: CLI updates
6. **Phase 4**: Web updates (can be parallel with CLI)

---

## Estimated Effort

| Phase | Scope | Complexity |
|-------|-------|------------|
| Phase 1 | 1 file, ~30 lines | Low |
| Phase 2 | 4 files, ~200 lines | Medium |
| Phase 3 | 2 files, ~100 lines | Low |
| Phase 4 | 4 files, ~150 lines | Medium |
| Phase 5 | 2 files, ~100 lines | Low |

---

## Open Questions

1. **Deduplication**: If an item has both due date today AND check-in today, show as one item with two reasons (proposed) or two separate rows?
   - **Proposed**: One item, multiple reasons

2. **Sorting**: How to sort items with multiple attention reasons?
   - **Proposed**: By earliest attention date, then by type priority (overdue > due > checkin > attention)

3. **Completed check-ins**: Should completed check-ins still show in history?
   - **Proposed**: Yes, via separate `listCheckins` endpoint (keep existing)

4. **Performance**: Will including check-ins in all queries impact performance?
   - **Mitigation**: Add index on `check_ins.completed, check_ins.date`
