/**
 * Tests for tRPC items router
 *
 * These tests verify the type-safe tRPC API which uses @kw/api-types.
 * The tRPC API is the recommended way to interact with items as it
 * provides full type safety from client to server.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createCaller } from '../trpc/index.js';
import { getPrisma } from '../prisma.js';
import type { ItemWithRelations } from '@kw/api-types';

describe('tRPC Items Router', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    const prisma = getPrisma();
    caller = createCaller({ prisma });
  });

  describe('items.list', () => {
    it('should return items with camelCase fields (type-safe)', async () => {
      const result = await caller.items.list({});

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const item: ItemWithRelations = result.items[0];

        // Verify camelCase field names (from @kw/api-types)
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('displayId');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('itemType');
        expect(item).toHaveProperty('dueDate');
        expect(item).toHaveProperty('ownerId');
        expect(item).toHaveProperty('projectId');
        expect(item).toHaveProperty('createdAt');
        expect(item).toHaveProperty('updatedAt');

        // Verify NO snake_case fields
        expect(item).not.toHaveProperty('due_date');
        expect(item).not.toHaveProperty('owner_id');
        expect(item).not.toHaveProperty('project_id');
        expect(item).not.toHaveProperty('created_at');
      }
    });

    it('should filter by status', async () => {
      const result = await caller.items.list({
        status: 'pending',
      });

      result.items.forEach((item) => {
        expect(item.status).toBe('pending');
      });
    });

    it('should filter by itemType', async () => {
      const result = await caller.items.list({
        itemType: 'task',
      });

      result.items.forEach((item) => {
        expect(item.itemType).toBe('task');
      });
    });

    it('should support pagination', async () => {
      const result = await caller.items.list({
        limit: 5,
        offset: 0,
      });

      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should include relation fields', async () => {
      const result = await caller.items.list({});

      if (result.items.length > 0) {
        const item = result.items[0];

        // Check relation fields exist (may be null)
        expect('ownerName' in item).toBe(true);
        expect('projectSlug' in item).toBe(true);
        expect('projectName' in item).toBe(true);
        expect('subtaskCount' in item).toBe(true);
      }
    });
  });

  describe('items.get', () => {
    it('should return item with full details', async () => {
      // First get an item ID
      const listResult = await caller.items.list({ limit: 1 });

      if (listResult.items.length === 0) {
        console.log('Skipping - no items in database');
        return;
      }

      const itemId = listResult.items[0].id;
      const item = await caller.items.get({ id: itemId });

      // Basic fields
      expect(item.id).toBe(itemId);
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('displayId');

      // Detail fields
      expect(item).toHaveProperty('updates');
      expect(item).toHaveProperty('attachments');
      expect(item).toHaveProperty('people');
      expect(item).toHaveProperty('subtasks');
      expect(item).toHaveProperty('checkIns');

      expect(Array.isArray(item.updates)).toBe(true);
      expect(Array.isArray(item.checkIns)).toBe(true);
    });

    it('should accept T-XXX format ID', async () => {
      const listResult = await caller.items.list({ limit: 1 });

      if (listResult.items.length === 0) return;

      const itemId = listResult.items[0].id;
      const item = await caller.items.get({ id: `T-${itemId}` });

      expect(item.id).toBe(itemId);
    });

    it('should throw NOT_FOUND for non-existent item', async () => {
      await expect(
        caller.items.get({ id: 999999 })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('items.checkins', () => {
    it('should return items with pending check-ins', async () => {
      const result = await caller.items.checkins({ includeFuture: true });

      expect(Array.isArray(result)).toBe(true);

      result.forEach((item) => {
        expect(item.isCheckin).toBe(true);
        expect(item).toHaveProperty('checkinBy');
        expect(item).toHaveProperty('checkinId');
      });
    });
  });

  describe('Type Safety Verification', () => {
    it('should validate input against CreateItemSchema', async () => {
      // This test verifies that invalid input is rejected by the schema
      // The type system should catch invalid shapes at compile time,
      // but runtime validation ensures data integrity

      await expect(
        caller.items.create({ title: '' }) // Empty title should fail min(1) at runtime
      ).rejects.toThrow();
    });

    it('should validate status values', async () => {
      const listResult = await caller.items.list({ limit: 1 });

      if (listResult.items.length === 0) return;

      const itemId = listResult.items[0].id;

      // Valid status should work
      const validUpdate = await caller.items.update({
        id: itemId,
        data: { status: 'pending' },
      });
      expect(validUpdate.status).toBe('pending');

      // Invalid status should fail
      await expect(
        caller.items.update({
          id: itemId,
          // @ts-expect-error - deliberately passing invalid status
          data: { status: 'invalid_status' },
        })
      ).rejects.toThrow();
    });

    it('should validate priority range (1-4)', async () => {
      const listResult = await caller.items.list({ limit: 1 });

      if (listResult.items.length === 0) return;

      const itemId = listResult.items[0].id;

      // Valid priorities
      for (const priority of [1, 2, 3, 4]) {
        const result = await caller.items.update({
          id: itemId,
          data: { priority },
        });
        expect(result.priority).toBe(priority);
      }

      // Invalid priority should fail
      await expect(
        caller.items.update({
          id: itemId,
          data: { priority: 5 },
        })
      ).rejects.toThrow();
    });
  });
});

describe('items.update date handling', () => {
  let caller: ReturnType<typeof createCaller>;
  let testItemId: number | null = null;

  beforeAll(async () => {
    const prisma = getPrisma();
    caller = createCaller({ prisma });
  });

  it('should clear dueDate when set to null', async () => {
    // Create item with due date
    const item = await caller.items.create({
      title: 'Test clear due date ' + Date.now(),
      dueDate: '2026-02-01',
    });

    testItemId = item.id;
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

  it('should preserve date when not included in update', async () => {
    // Create item with due date
    const item = await caller.items.create({
      title: 'Test preserve date ' + Date.now(),
      dueDate: '2026-03-15',
    });

    expect(item.dueDate).toBe('2026-03-15');

    // Update title only, not dueDate
    const updated = await caller.items.update({
      id: item.id,
      data: { title: 'Updated title' },
    });

    // Due date should be preserved
    expect(updated.dueDate).toBe('2026-03-15');

    // Cleanup
    await caller.items.update({ id: item.id, data: { status: 'cancelled' } });
  });
});

describe('items organization relation', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    const prisma = getPrisma();
    caller = createCaller({ prisma });
  });

  it('should return projectOrg from organization relation', async () => {
    const result = await caller.items.list({});

    // Find an item with a project
    const itemWithProject = result.items.find(i => i.projectId);

    if (itemWithProject && itemWithProject.projectOrg) {
      // Verify it's a valid organization slug
      const org = await caller.organizations.get({
        slug: itemWithProject.projectOrg,
      });
      expect(org.slug).toBe(itemWithProject.projectOrg);
    }
  });

  it('should filter by orgSlug correctly', async () => {
    const result = await caller.items.list({ orgSlug: 'acme-corp' });

    // All items with projects should be from acme-corp org
    result.items.forEach((item) => {
      if (item.projectId) {
        expect(item.projectOrg).toBe('acme-corp');
      }
    });
  });

  it('should return org details when project has organization', async () => {
    const result = await caller.items.list({});

    const itemWithOrg = result.items.find(i => i.projectOrg);

    if (itemWithOrg) {
      // Verify organization details are present
      expect(itemWithOrg).toHaveProperty('projectOrg');
      expect(typeof itemWithOrg.projectOrg).toBe('string');
    }
  });
});

describe('tRPC vs REST Type Comparison', () => {
  it('tRPC returns camelCase, REST returns snake_case', async () => {
    // This test documents the intentional difference between APIs
    // tRPC: type-safe, camelCase (from @kw/api-types)
    // REST: backwards compatible, snake_case (from types/index.ts)

    const prisma = getPrisma();
    const caller = createCaller({ prisma });

    const trpcResult = await caller.items.list({ limit: 1 });

    if (trpcResult.items.length === 0) return;

    const trpcItem = trpcResult.items[0];

    // tRPC uses camelCase
    expect(trpcItem).toHaveProperty('dueDate');
    expect(trpcItem).toHaveProperty('ownerId');
    expect(trpcItem).toHaveProperty('projectId');
    expect(trpcItem).toHaveProperty('itemType');
    expect(trpcItem).toHaveProperty('createdAt');
    expect(trpcItem).toHaveProperty('checkinBy');

    // Document: REST uses snake_case (not tested here but documented)
    // REST response would have: due_date, owner_id, project_id, task_type, created_at, checkin_by
  });
});
