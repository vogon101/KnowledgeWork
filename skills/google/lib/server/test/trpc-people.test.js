/**
 * Tests for tRPC people router
 *
 * Tests the people API endpoints for listing, searching,
 * and retrieving person details with task associations.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createCaller } from '../trpc/index.js';
import { getPrisma } from '../prisma.js';
describe('tRPC People Router', () => {
    let caller;
    beforeAll(async () => {
        const prisma = getPrisma();
        caller = createCaller({ prisma });
    });
    describe('people.list', () => {
        it('should return all people with task counts', async () => {
            const result = await caller.people.list({});
            expect(result).toHaveProperty('people');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.people)).toBe(true);
        });
        it('should include person fields with camelCase', async () => {
            const result = await caller.people.list({});
            if (result.people.length > 0) {
                const person = result.people[0];
                // Check required fields
                expect(person).toHaveProperty('id');
                expect(person).toHaveProperty('name');
                expect(person).toHaveProperty('createdAt');
                expect(person).toHaveProperty('updatedAt');
                // Check optional fields exist (may be null)
                expect('email' in person).toBe(true);
                expect('org' in person).toBe(true);
                expect('notes' in person).toBe(true);
                // Verify NO snake_case fields
                expect(person).not.toHaveProperty('created_at');
                expect(person).not.toHaveProperty('updated_at');
                expect(person).not.toHaveProperty('airtable_ya_id');
            }
        });
        it('should include task counts', async () => {
            const result = await caller.people.list({});
            if (result.people.length > 0) {
                const person = result.people[0];
                // Check task count fields
                expect(person).toHaveProperty('ownedTasks');
                expect(person).toHaveProperty('waitingOnTasks');
                expect(typeof person.ownedTasks).toBe('number');
                expect(typeof person.waitingOnTasks).toBe('number');
            }
        });
        it('should support pagination', async () => {
            const result = await caller.people.list({ limit: 5, offset: 0 });
            expect(result.limit).toBe(5);
            expect(result.offset).toBe(0);
            expect(result.people.length).toBeLessThanOrEqual(5);
        });
        it('should filter by search term', async () => {
            const allPeople = await caller.people.list({});
            if (allPeople.people.length === 0) {
                console.log('Skipping - no people in database');
                return;
            }
            // Search for first person's name
            const searchName = allPeople.people[0].name.substring(0, 3);
            const filtered = await caller.people.list({ search: searchName });
            filtered.people.forEach((person) => {
                const matchesName = person.name.toLowerCase().includes(searchName.toLowerCase());
                const matchesEmail = person.email?.toLowerCase().includes(searchName.toLowerCase());
                expect(matchesName || matchesEmail).toBe(true);
            });
        });
        it('should filter by org', async () => {
            const allPeople = await caller.people.list({});
            // Find a person with an org
            const personWithOrg = allPeople.people.find(p => p.org);
            if (personWithOrg) {
                const filtered = await caller.people.list({ org: personWithOrg.org });
                filtered.people.forEach((person) => {
                    expect(person.org).toBe(personWithOrg.org);
                });
            }
        });
    });
    describe('people.get', () => {
        it('should return a single person by ID', async () => {
            const listResult = await caller.people.list({ limit: 1 });
            if (listResult.people.length === 0) {
                console.log('Skipping - no people in database');
                return;
            }
            const personId = listResult.people[0].id;
            const person = await caller.people.get({ id: personId });
            expect(person.id).toBe(personId);
            expect(person).toHaveProperty('name');
        });
        it('should include owned tasks in response', async () => {
            const listResult = await caller.people.list({ limit: 1 });
            if (listResult.people.length === 0)
                return;
            const person = await caller.people.get({ id: listResult.people[0].id });
            expect(person).toHaveProperty('ownedTasks');
            expect(Array.isArray(person.ownedTasks)).toBe(true);
            person.ownedTasks.forEach((task) => {
                expect(task).toHaveProperty('id');
                expect(task).toHaveProperty('displayId');
                expect(task).toHaveProperty('title');
                expect(task).toHaveProperty('status');
            });
        });
        it('should include waiting on tasks in response', async () => {
            const listResult = await caller.people.list({ limit: 1 });
            if (listResult.people.length === 0)
                return;
            const person = await caller.people.get({ id: listResult.people[0].id });
            expect(person).toHaveProperty('waitingOnTasks');
            expect(Array.isArray(person.waitingOnTasks)).toBe(true);
            person.waitingOnTasks.forEach((task) => {
                expect(task).toHaveProperty('id');
                expect(task).toHaveProperty('title');
            });
        });
        it('should throw NOT_FOUND for non-existent person', async () => {
            await expect(caller.people.get({ id: 999999 })).rejects.toThrow(/not found/i);
        });
    });
    describe('people.findByName', () => {
        it('should find a person by partial name match', async () => {
            const listResult = await caller.people.list({ limit: 1 });
            if (listResult.people.length === 0) {
                console.log('Skipping - no people in database');
                return;
            }
            const searchName = listResult.people[0].name.substring(0, 3);
            const person = await caller.people.findByName({ name: searchName });
            if (person) {
                expect(person.name.toLowerCase()).toContain(searchName.toLowerCase());
            }
        });
        it('should return null for non-existent name', async () => {
            const person = await caller.people.findByName({ name: 'xyz-non-existent-name-123' });
            expect(person).toBeNull();
        });
    });
    describe('Type Safety', () => {
        it('should have ISO date strings for timestamps', async () => {
            const result = await caller.people.list({ limit: 1 });
            if (result.people.length > 0) {
                const person = result.people[0];
                // createdAt and updatedAt should be ISO strings
                expect(person.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
                expect(person.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
            }
        });
        it('should have non-negative task counts', async () => {
            const result = await caller.people.list({});
            result.people.forEach((person) => {
                expect(person.ownedTasks).toBeGreaterThanOrEqual(0);
                expect(person.waitingOnTasks).toBeGreaterThanOrEqual(0);
            });
        });
    });
});
describe('people organization relation', () => {
    let caller;
    beforeAll(async () => {
        const prisma = getPrisma();
        caller = createCaller({ prisma });
    });
    it('should return org from organization relation', async () => {
        const result = await caller.people.list({});
        // Find a person with an org
        const personWithOrg = result.people.find(p => p.org);
        if (personWithOrg) {
            // Verify it's a valid organization slug
            const org = await caller.organizations.get({
                slug: personWithOrg.org,
            });
            expect(org.slug).toBe(personWithOrg.org);
        }
    });
    it('should create person with orgId when org provided', async () => {
        // Get an existing org
        const orgs = await caller.organizations.list();
        const testOrg = orgs.organizations[0];
        if (!testOrg) {
            console.log('Skipping - no organizations in database');
            return;
        }
        const personName = 'Test Person Org Relation ' + Date.now();
        const person = await caller.people.create({
            name: personName,
            org: testOrg.slug,
        });
        expect(person.org).toBe(testOrg.slug);
        // Cleanup
        await caller.people.delete({ id: person.id });
    });
    it('should update person org via organization relation', async () => {
        // Get existing orgs
        const orgs = await caller.organizations.list();
        if (orgs.organizations.length < 2) {
            console.log('Skipping - need at least 2 organizations');
            return;
        }
        const org1 = orgs.organizations[0];
        const org2 = orgs.organizations[1];
        // Create person with first org
        const person = await caller.people.create({
            name: 'Test Person Update Org ' + Date.now(),
            org: org1.slug,
        });
        expect(person.org).toBe(org1.slug);
        // Update to second org
        const updated = await caller.people.update({
            id: person.id,
            data: { org: org2.slug },
        });
        expect(updated.org).toBe(org2.slug);
        // Cleanup
        await caller.people.delete({ id: person.id });
    });
    it('should handle null org correctly', async () => {
        // Create person without org
        const person = await caller.people.create({
            name: 'Test Person No Org ' + Date.now(),
        });
        expect(person.org).toBeNull();
        // Cleanup
        await caller.people.delete({ id: person.id });
    });
});
