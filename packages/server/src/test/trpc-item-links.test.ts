/**
 * Tests for tRPC item links (blocking/related relationships)
 *
 * These tests verify the link functionality that allows tasks to be
 * connected with blocks, related, or duplicate relationships.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCaller } from '../trpc/index.js';
import { getPrisma } from '../prisma.js';

describe('tRPC Item Links', () => {
  let caller: ReturnType<typeof createCaller>;
  let testItem1Id: number;
  let testItem2Id: number;
  let testItem3Id: number;

  beforeAll(async () => {
    const prisma = getPrisma();
    caller = createCaller({ prisma });

    // Create test items for linking
    const item1 = await caller.items.create({
      title: 'Test Link Item 1 ' + Date.now(),
    });
    const item2 = await caller.items.create({
      title: 'Test Link Item 2 ' + Date.now(),
    });
    const item3 = await caller.items.create({
      title: 'Test Link Item 3 ' + Date.now(),
    });

    testItem1Id = item1.id;
    testItem2Id = item2.id;
    testItem3Id = item3.id;
  });

  afterAll(async () => {
    // Clean up test items
    if (testItem1Id) {
      await caller.items.update({ id: testItem1Id, data: { status: 'cancelled' } });
    }
    if (testItem2Id) {
      await caller.items.update({ id: testItem2Id, data: { status: 'cancelled' } });
    }
    if (testItem3Id) {
      await caller.items.update({ id: testItem3Id, data: { status: 'cancelled' } });
    }
  });

  describe('items.addLink', () => {
    it('should create a blocks relationship', async () => {
      const result = await caller.items.addLink({
        fromId: testItem1Id,
        toId: testItem2Id,
        linkType: 'blocks',
      });

      expect(result.fromId).toBe(testItem1Id);
      expect(result.toId).toBe(testItem2Id);
      expect(result.linkType).toBe('blocks');
      expect(result.fromDisplayId).toBe(`T-${testItem1Id}`);
      expect(result.toDisplayId).toBe(`T-${testItem2Id}`);
    });

    it('should create a related relationship', async () => {
      const result = await caller.items.addLink({
        fromId: testItem1Id,
        toId: testItem3Id,
        linkType: 'related',
      });

      expect(result.fromId).toBe(testItem1Id);
      expect(result.toId).toBe(testItem3Id);
      expect(result.linkType).toBe('related');
    });

    it('should create a duplicate relationship', async () => {
      const result = await caller.items.addLink({
        fromId: testItem2Id,
        toId: testItem3Id,
        linkType: 'duplicate',
      });

      expect(result.fromId).toBe(testItem2Id);
      expect(result.toId).toBe(testItem3Id);
      expect(result.linkType).toBe('duplicate');
    });

    it('should accept T-XXX format IDs', async () => {
      // Create a new link with string IDs
      const result = await caller.items.addLink({
        fromId: `T-${testItem3Id}`,
        toId: `T-${testItem1Id}`,
        linkType: 'related',
      });

      expect(result.fromId).toBe(testItem3Id);
      expect(result.toId).toBe(testItem1Id);
    });

    it('should throw CONFLICT for duplicate links', async () => {
      // First link was already created in first test
      await expect(
        caller.items.addLink({
          fromId: testItem1Id,
          toId: testItem2Id,
          linkType: 'blocks',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('should throw NOT_FOUND for non-existent source item', async () => {
      await expect(
        caller.items.addLink({
          fromId: 999999,
          toId: testItem2Id,
          linkType: 'blocks',
        })
      ).rejects.toThrow(/not found/i);
    });

    it('should throw NOT_FOUND for non-existent target item', async () => {
      await expect(
        caller.items.addLink({
          fromId: testItem1Id,
          toId: 999999,
          linkType: 'blocks',
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('items.getLinks', () => {
    it('should return outgoing links', async () => {
      const result = await caller.items.getLinks({ id: testItem1Id });

      expect(result.itemId).toBe(testItem1Id);
      expect(result.displayId).toBe(`T-${testItem1Id}`);
      expect(Array.isArray(result.outgoing)).toBe(true);

      // Should have the blocks link to item2 and related link to item3
      const blocksLink = result.outgoing.find(l => l.linkType === 'blocks' && l.targetId === testItem2Id);
      expect(blocksLink).toBeDefined();
      expect(blocksLink?.targetDisplayId).toBe(`T-${testItem2Id}`);

      const relatedLink = result.outgoing.find(l => l.linkType === 'related' && l.targetId === testItem3Id);
      expect(relatedLink).toBeDefined();
    });

    it('should return incoming links', async () => {
      const result = await caller.items.getLinks({ id: testItem2Id });

      expect(Array.isArray(result.incoming)).toBe(true);

      // Should have the incoming blocks link from item1
      const blocksLink = result.incoming.find(l => l.linkType === 'blocks' && l.sourceId === testItem1Id);
      expect(blocksLink).toBeDefined();
      expect(blocksLink?.sourceDisplayId).toBe(`T-${testItem1Id}`);
    });

    it('should accept T-XXX format ID', async () => {
      const result = await caller.items.getLinks({ id: `T-${testItem1Id}` });

      expect(result.itemId).toBe(testItem1Id);
    });

    it('should return empty arrays for item with no links', async () => {
      // Create a fresh item with no links
      const newItem = await caller.items.create({
        title: 'Test No Links ' + Date.now(),
      });

      const result = await caller.items.getLinks({ id: newItem.id });

      expect(result.outgoing).toEqual([]);
      expect(result.incoming).toEqual([]);

      // Cleanup
      await caller.items.update({ id: newItem.id, data: { status: 'cancelled' } });
    });
  });

  describe('items.removeLink', () => {
    it('should remove an existing link', async () => {
      // First verify the link exists
      const before = await caller.items.getLinks({ id: testItem1Id });
      const blocksLinkExists = before.outgoing.some(l => l.linkType === 'blocks' && l.targetId === testItem2Id);
      expect(blocksLinkExists).toBe(true);

      // Remove it
      const result = await caller.items.removeLink({
        fromId: testItem1Id,
        toId: testItem2Id,
        linkType: 'blocks',
      });

      expect(result.deleted).toBe(true);
      expect(result.fromId).toBe(testItem1Id);
      expect(result.toId).toBe(testItem2Id);
      expect(result.linkType).toBe('blocks');

      // Verify it's gone
      const after = await caller.items.getLinks({ id: testItem1Id });
      const linkStillExists = after.outgoing.some(l => l.linkType === 'blocks' && l.targetId === testItem2Id);
      expect(linkStillExists).toBe(false);
    });

    it('should return deleted: false for non-existent link', async () => {
      const result = await caller.items.removeLink({
        fromId: testItem1Id,
        toId: testItem2Id,
        linkType: 'blocks', // Already removed above
      });

      expect(result.deleted).toBe(false);
    });

    it('should accept T-XXX format IDs', async () => {
      // Create a link to remove
      await caller.items.addLink({
        fromId: testItem1Id,
        toId: testItem2Id,
        linkType: 'related',
      });

      // Remove with string IDs
      const result = await caller.items.removeLink({
        fromId: `T-${testItem1Id}`,
        toId: `T-${testItem2Id}`,
        linkType: 'related',
      });

      expect(result.deleted).toBe(true);
    });
  });

  describe('Link type validation', () => {
    it('should only accept valid link types', async () => {
      await expect(
        caller.items.addLink({
          fromId: testItem1Id,
          toId: testItem2Id,
          // @ts-expect-error - deliberately passing invalid link type
          linkType: 'invalid_type',
        })
      ).rejects.toThrow();
    });
  });

  describe('Blocking relationship semantics', () => {
    it('should allow multiple items to block the same item', async () => {
      // Both item1 and item3 can block item2
      await caller.items.addLink({
        fromId: testItem1Id,
        toId: testItem2Id,
        linkType: 'blocks',
      });

      await caller.items.addLink({
        fromId: testItem3Id,
        toId: testItem2Id,
        linkType: 'blocks',
      });

      const result = await caller.items.getLinks({ id: testItem2Id });
      const blockers = result.incoming.filter(l => l.linkType === 'blocks');

      expect(blockers.length).toBe(2);
      expect(blockers.map(b => b.sourceId).sort()).toEqual([testItem1Id, testItem3Id].sort());

      // Cleanup
      await caller.items.removeLink({ fromId: testItem1Id, toId: testItem2Id, linkType: 'blocks' });
      await caller.items.removeLink({ fromId: testItem3Id, toId: testItem2Id, linkType: 'blocks' });
    });

    it('should allow an item to block multiple items', async () => {
      // item1 blocks both item2 and item3
      await caller.items.addLink({
        fromId: testItem1Id,
        toId: testItem2Id,
        linkType: 'blocks',
      });

      await caller.items.addLink({
        fromId: testItem1Id,
        toId: testItem3Id,
        linkType: 'blocks',
      });

      const result = await caller.items.getLinks({ id: testItem1Id });
      const blocking = result.outgoing.filter(l => l.linkType === 'blocks');

      expect(blocking.length).toBe(2);
      expect(blocking.map(b => b.targetId).sort()).toEqual([testItem2Id, testItem3Id].sort());

      // Cleanup
      await caller.items.removeLink({ fromId: testItem1Id, toId: testItem2Id, linkType: 'blocks' });
      await caller.items.removeLink({ fromId: testItem1Id, toId: testItem3Id, linkType: 'blocks' });
    });
  });
});
