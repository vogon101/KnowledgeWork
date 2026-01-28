/**
 * Type consistency tests
 *
 * These tests verify that our type definitions are consistent across:
 * - Prisma schema
 * - @kw/api-types
 * - REST API responses
 * - tRPC API responses
 */
import { describe, it, expect } from 'vitest';
import { ItemSchema, ItemWithRelationsSchema, CheckInSchema, CreateItemSchema, UpdateItemSchema, } from '@kw/api-types';
// Import the REST route types to check consistency
import { TaskSchema, } from '../types/index.js';
describe('Type Consistency', () => {
    describe('Schema field naming conventions', () => {
        it('api-types should use camelCase', () => {
            const itemShape = ItemSchema.shape;
            // Check that api-types uses camelCase (not snake_case)
            expect(itemShape).toHaveProperty('dueDate');
            expect(itemShape).toHaveProperty('targetPeriod');
            expect(itemShape).toHaveProperty('ownerId');
            expect(itemShape).toHaveProperty('projectId');
            expect(itemShape).toHaveProperty('sourceMeetingId');
            expect(itemShape).toHaveProperty('itemType');
            // Should NOT have snake_case
            expect(itemShape).not.toHaveProperty('due_date');
            expect(itemShape).not.toHaveProperty('target_period');
            expect(itemShape).not.toHaveProperty('owner_id');
        });
        it('old types (types/index.ts) use snake_case', () => {
            const taskShape = TaskSchema.shape;
            // Old types use snake_case
            expect(taskShape).toHaveProperty('due_date');
            expect(taskShape).toHaveProperty('target_period');
            expect(taskShape).toHaveProperty('owner_id');
            expect(taskShape).toHaveProperty('checkin_by');
        });
    });
    describe('Required fields match between schemas', () => {
        it('ItemWithRelationsSchema should have checkin fields', () => {
            const shape = ItemWithRelationsSchema.shape;
            // Check-in computed fields should exist
            expect(shape).toHaveProperty('checkinBy');
            expect(shape).toHaveProperty('checkinId');
        });
        it('CheckInSchema should have required fields', () => {
            const shape = CheckInSchema.shape;
            expect(shape).toHaveProperty('id');
            expect(shape).toHaveProperty('itemId');
            expect(shape).toHaveProperty('date');
            expect(shape).toHaveProperty('completed');
        });
    });
    describe('Schema validation', () => {
        it('ItemSchema should validate a proper item', () => {
            const validItem = {
                id: 1,
                displayId: 'T-1',
                title: 'Test task',
                description: null,
                itemType: 'task',
                status: 'pending',
                priority: 2,
                dueDate: '2026-01-20',
                targetPeriod: null,
                ownerId: 1,
                projectId: null,
                sourceType: null,
                sourcePath: null,
                sourceMeetingId: null,
                createdAt: '2026-01-18T00:00:00Z',
                updatedAt: '2026-01-18T00:00:00Z',
                completedAt: null,
                deletedAt: null,
            };
            const result = ItemSchema.safeParse(validItem);
            expect(result.success).toBe(true);
        });
        it('CheckInSchema should validate a proper check-in', () => {
            const validCheckIn = {
                id: 1,
                itemId: 1,
                date: '2026-01-20',
                note: null,
                completed: false,
                createdAt: '2026-01-18T00:00:00Z',
            };
            const result = CheckInSchema.safeParse(validCheckIn);
            expect(result.success).toBe(true);
        });
        it('CreateItemSchema should not require id or timestamps', () => {
            const createData = {
                title: 'New task',
            };
            const result = CreateItemSchema.safeParse(createData);
            expect(result.success).toBe(true);
        });
        it('UpdateItemSchema should allow partial updates', () => {
            const updateData = {
                title: 'Updated title',
            };
            const result = UpdateItemSchema.safeParse(updateData);
            expect(result.success).toBe(true);
        });
    });
    describe('Field type consistency', () => {
        it('status field should accept valid statuses', () => {
            const validStatuses = ['pending', 'in_progress', 'complete', 'blocked', 'cancelled', 'deferred', 'active', 'paused'];
            for (const status of validStatuses) {
                const item = {
                    id: 1,
                    displayId: 'T-1',
                    title: 'Test',
                    itemType: 'task',
                    status,
                    createdAt: '2026-01-18T00:00:00Z',
                    updatedAt: '2026-01-18T00:00:00Z',
                };
                const result = ItemSchema.safeParse(item);
                expect(result.success, `Status '${status}' should be valid`).toBe(true);
            }
        });
        it('itemType field should accept valid types', () => {
            const validTypes = ['task', 'workstream', 'goal', 'routine'];
            for (const itemType of validTypes) {
                const item = {
                    id: 1,
                    displayId: 'T-1',
                    title: 'Test',
                    itemType,
                    status: 'pending',
                    createdAt: '2026-01-18T00:00:00Z',
                    updatedAt: '2026-01-18T00:00:00Z',
                };
                const result = ItemSchema.safeParse(item);
                expect(result.success, `Type '${itemType}' should be valid`).toBe(true);
            }
        });
        it('priority should be 1-4 or null', () => {
            // Valid priorities
            for (const priority of [1, 2, 3, 4, null]) {
                const item = {
                    id: 1,
                    displayId: 'T-1',
                    title: 'Test',
                    itemType: 'task',
                    status: 'pending',
                    priority,
                    createdAt: '2026-01-18T00:00:00Z',
                    updatedAt: '2026-01-18T00:00:00Z',
                };
                const result = ItemSchema.safeParse(item);
                expect(result.success, `Priority ${priority} should be valid`).toBe(true);
            }
            // Invalid priorities
            for (const priority of [0, 5, -1]) {
                const item = {
                    id: 1,
                    displayId: 'T-1',
                    title: 'Test',
                    itemType: 'task',
                    status: 'pending',
                    priority,
                    createdAt: '2026-01-18T00:00:00Z',
                    updatedAt: '2026-01-18T00:00:00Z',
                };
                const result = ItemSchema.safeParse(item);
                expect(result.success, `Priority ${priority} should be invalid`).toBe(false);
            }
        });
    });
});
describe('API Response Type Consistency', () => {
    // These tests verify the actual API responses match expected schemas
    // by testing against mock data that represents real API responses
    it('tRPC items.list response should match ItemWithRelationsSchema', () => {
        // Simulated tRPC response (camelCase)
        const trpcResponse = {
            id: 1,
            displayId: 'T-1',
            title: 'Test task',
            description: null,
            itemType: 'task',
            status: 'pending',
            priority: 2,
            dueDate: '2026-01-20',
            targetPeriod: null,
            ownerId: 1,
            ownerName: 'Test User',
            projectId: 1,
            projectSlug: 'test-project',
            projectName: 'Test Project',
            projectOrg: 'acme-corp',
            projectParentSlug: null,
            projectFullPath: 'test-project',
            parentId: null,
            sourceType: null,
            sourcePath: null,
            sourceMeetingId: null,
            sourceMeetingTitle: null,
            sourceMeetingPath: null,
            filePath: null,
            fileHash: null,
            routineParentId: null,
            createdAt: '2026-01-18T00:00:00Z',
            updatedAt: '2026-01-18T00:00:00Z',
            completedAt: null,
            deletedAt: null,
            subtaskCount: 0,
            subtasksComplete: 0,
            checkinBy: null,
            checkinId: null,
        };
        const result = ItemWithRelationsSchema.safeParse(trpcResponse);
        expect(result.success).toBe(true);
    });
    it('REST tasks response should be transformable to ItemWithRelationsSchema', () => {
        // Simulated REST response (snake_case)
        const restResponse = {
            id: 1,
            displayId: 'T-1',
            title: 'Test task',
            description: null,
            task_type: 'task',
            status: 'pending',
            priority: 2,
            due_date: '2026-01-20',
            target_period: null,
            owner_id: 1,
            owner_name: 'Test User',
            project_id: 1,
            project_slug: 'test-project',
            project_name: 'Test Project',
            project_org: 'acme-corp',
            parent_task_id: null,
            source_type: null,
            source_path: null,
            source_meeting_id: null,
            created_at: '2026-01-18T00:00:00Z',
            updated_at: '2026-01-18T00:00:00Z',
            completed_at: null,
            deleted_at: null,
            checkin_by: null,
            checkin_id: null,
        };
        // Transform snake_case to camelCase
        const transformed = {
            id: restResponse.id,
            displayId: restResponse.displayId,
            title: restResponse.title,
            description: restResponse.description,
            itemType: restResponse.task_type,
            status: restResponse.status,
            priority: restResponse.priority,
            dueDate: restResponse.due_date,
            targetPeriod: restResponse.target_period,
            ownerId: restResponse.owner_id,
            ownerName: restResponse.owner_name,
            projectId: restResponse.project_id,
            projectSlug: restResponse.project_slug,
            projectName: restResponse.project_name,
            projectOrg: restResponse.project_org,
            projectParentSlug: null,
            projectFullPath: restResponse.project_slug,
            parentId: restResponse.parent_task_id,
            sourceType: restResponse.source_type,
            sourcePath: restResponse.source_path,
            sourceMeetingId: restResponse.source_meeting_id,
            sourceMeetingTitle: null,
            sourceMeetingPath: null,
            filePath: null,
            fileHash: null,
            routineParentId: null,
            createdAt: restResponse.created_at,
            updatedAt: restResponse.updated_at,
            completedAt: restResponse.completed_at,
            deletedAt: restResponse.deleted_at,
            subtaskCount: 0,
            subtasksComplete: 0,
            checkinBy: restResponse.checkin_by,
            checkinId: restResponse.checkin_id,
        };
        const result = ItemWithRelationsSchema.safeParse(transformed);
        expect(result.success).toBe(true);
    });
});
