/**
 * Tests for tRPC routines router
 *
 * Tests the routine API endpoints for listing routines,
 * checking due routines, completing, and skipping.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createCaller } from '../trpc/index.js';
import { getPrisma } from '../prisma.js';
describe('tRPC Routines Router', () => {
    let caller;
    beforeAll(async () => {
        const prisma = getPrisma();
        caller = createCaller({ prisma });
    });
    describe('routines.list', () => {
        it('should return all routines', async () => {
            const result = await caller.routines.list();
            expect(result).toHaveProperty('routines');
            expect(result).toHaveProperty('count');
            expect(Array.isArray(result.routines)).toBe(true);
        });
        it('should include routine-specific fields', async () => {
            const result = await caller.routines.list();
            if (result.routines.length > 0) {
                const routine = result.routines[0];
                // Check required routine fields
                expect(routine).toHaveProperty('id');
                expect(routine).toHaveProperty('title');
                expect(routine).toHaveProperty('recurrenceRule');
                expect(routine).toHaveProperty('completionCount');
                // Check optional fields exist (may be null)
                expect('ownerName' in routine).toBe(true);
                expect('projectSlug' in routine).toBe(true);
                expect('recurrenceTime' in routine).toBe(true);
                expect('lastCompleted' in routine).toBe(true);
            }
        });
        it('should return count matching routines length', async () => {
            const result = await caller.routines.list();
            expect(result.count).toBe(result.routines.length);
        });
        it('should return routines with project relationships', async () => {
            const result = await caller.routines.list();
            // Check routines have project fields
            result.routines.forEach((routine) => {
                expect('projectId' in routine).toBe(true);
                expect('projectSlug' in routine).toBe(true);
                expect('projectName' in routine).toBe(true);
            });
        });
    });
    describe('routines.due', () => {
        it('should return routines due today', async () => {
            const result = await caller.routines.due({});
            expect(result).toHaveProperty('date');
            expect(result).toHaveProperty('pending');
            expect(result).toHaveProperty('completed');
            expect(Array.isArray(result.pending)).toBe(true);
            expect(Array.isArray(result.completed)).toBe(true);
        });
        it('should accept a specific date', async () => {
            const today = new Date().toISOString().split('T')[0];
            const result = await caller.routines.due({ date: today });
            expect(result.date).toBe(today);
        });
        it('should separate pending and completed routines', async () => {
            const result = await caller.routines.due({});
            // All pending should not be completed today
            result.pending.forEach((routine) => {
                expect(routine.completedToday).toBeFalsy();
            });
            // All completed should be completed today
            result.completed.forEach((routine) => {
                expect(routine.completedToday).toBe(true);
            });
        });
    });
    describe('routines.overdue', () => {
        it('should return overdue routines', async () => {
            const result = await caller.routines.overdue();
            expect(result).toHaveProperty('routines');
            expect(Array.isArray(result.routines)).toBe(true);
        });
        it('should include overdue metadata', async () => {
            const result = await caller.routines.overdue();
            result.routines.forEach((routine) => {
                expect(routine).toHaveProperty('id');
                expect(routine).toHaveProperty('title');
                expect(routine).toHaveProperty('overdueDates');
                expect(routine).toHaveProperty('daysOverdue');
                expect(Array.isArray(routine.overdueDates)).toBe(true);
                expect(typeof routine.daysOverdue).toBe('number');
            });
        });
    });
    describe('routines.get', () => {
        it('should return a single routine by ID with history', async () => {
            const listResult = await caller.routines.list();
            if (listResult.routines.length === 0) {
                console.log('Skipping - no routines in database');
                return;
            }
            const routineId = listResult.routines[0].id;
            const routine = await caller.routines.get({ id: routineId });
            expect(routine.id).toBe(routineId);
            expect(routine).toHaveProperty('title');
            expect(routine).toHaveProperty('recurrenceRule');
            expect(routine).toHaveProperty('history');
            expect(Array.isArray(routine.history)).toBe(true);
        });
        it('should include timestamps in response', async () => {
            const listResult = await caller.routines.list();
            if (listResult.routines.length === 0)
                return;
            const routine = await caller.routines.get({ id: listResult.routines[0].id });
            expect(routine).toHaveProperty('createdAt');
            expect(routine).toHaveProperty('updatedAt');
            expect(routine.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
        it('should throw NOT_FOUND for non-existent routine', async () => {
            await expect(caller.routines.get({ id: 999999 })).rejects.toThrow(/not found/i);
        });
    });
    describe('Type Safety', () => {
        it('should validate recurrence rule values', async () => {
            const listResult = await caller.routines.list();
            listResult.routines.forEach((routine) => {
                // recurrenceRule should be a string (custom patterns are allowed)
                expect(typeof routine.recurrenceRule).toBe('string');
            });
        });
        it('should have numeric completionCount', async () => {
            const listResult = await caller.routines.list();
            listResult.routines.forEach((routine) => {
                expect(typeof routine.completionCount).toBe('number');
                expect(routine.completionCount).toBeGreaterThanOrEqual(0);
            });
        });
    });
});
