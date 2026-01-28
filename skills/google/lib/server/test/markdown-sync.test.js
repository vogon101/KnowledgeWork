/**
 * Tests for status-constants service
 *
 * Tests status mappings for markdown file sync.
 */
import { describe, it, expect } from 'vitest';
import { STATUS_TO_EMOJI, STATUS_TO_ACTION_STATUS } from '../services/status-constants.js';
// =============================================================================
// TESTS: STATUS_TO_EMOJI
// =============================================================================
describe('STATUS_TO_EMOJI', () => {
    describe('all known statuses have emoji mappings', () => {
        it('should map pending to yellow circle', () => {
            expect(STATUS_TO_EMOJI['pending']).toBe('🟡');
        });
        it('should map in_progress to green circle', () => {
            expect(STATUS_TO_EMOJI['in_progress']).toBe('🟢');
        });
        it('should map active to green circle', () => {
            expect(STATUS_TO_EMOJI['active']).toBe('🟢');
        });
        it('should map blocked to red circle', () => {
            expect(STATUS_TO_EMOJI['blocked']).toBe('🔴');
        });
        it('should map complete to checkmark', () => {
            expect(STATUS_TO_EMOJI['complete']).toBe('✅');
        });
        it('should map completed to checkmark', () => {
            expect(STATUS_TO_EMOJI['completed']).toBe('✅');
        });
        it('should map cancelled to X', () => {
            expect(STATUS_TO_EMOJI['cancelled']).toBe('❌');
        });
        it('should map planning to blue circle', () => {
            expect(STATUS_TO_EMOJI['planning']).toBe('🔵');
        });
    });
    describe('consistency', () => {
        it('should return same emoji for complete and completed', () => {
            expect(STATUS_TO_EMOJI['complete']).toBe(STATUS_TO_EMOJI['completed']);
        });
        it('should return same emoji for in_progress and active', () => {
            expect(STATUS_TO_EMOJI['in_progress']).toBe(STATUS_TO_EMOJI['active']);
        });
    });
    describe('unknown statuses', () => {
        it('should return undefined for unknown statuses', () => {
            expect(STATUS_TO_EMOJI['unknown']).toBeUndefined();
            expect(STATUS_TO_EMOJI['draft']).toBeUndefined();
            expect(STATUS_TO_EMOJI['foo']).toBeUndefined();
        });
    });
});
// =============================================================================
// TESTS: STATUS_TO_ACTION_STATUS
// =============================================================================
describe('STATUS_TO_ACTION_STATUS', () => {
    describe('all known statuses have action status mappings', () => {
        it('should map pending to Pending', () => {
            expect(STATUS_TO_ACTION_STATUS['pending']).toBe('Pending');
        });
        it('should map in_progress to In Progress', () => {
            expect(STATUS_TO_ACTION_STATUS['in_progress']).toBe('In Progress');
        });
        it('should map active to In Progress', () => {
            expect(STATUS_TO_ACTION_STATUS['active']).toBe('In Progress');
        });
        it('should map blocked to Blocked', () => {
            expect(STATUS_TO_ACTION_STATUS['blocked']).toBe('Blocked');
        });
        it('should map complete to Complete', () => {
            expect(STATUS_TO_ACTION_STATUS['complete']).toBe('Complete');
        });
        it('should map completed to Complete', () => {
            expect(STATUS_TO_ACTION_STATUS['completed']).toBe('Complete');
        });
        it('should map cancelled to Cancelled', () => {
            expect(STATUS_TO_ACTION_STATUS['cancelled']).toBe('Cancelled');
        });
    });
    describe('consistency', () => {
        it('should return same status for complete and completed', () => {
            expect(STATUS_TO_ACTION_STATUS['complete']).toBe(STATUS_TO_ACTION_STATUS['completed']);
        });
        it('should return same status for in_progress and active', () => {
            expect(STATUS_TO_ACTION_STATUS['in_progress']).toBe(STATUS_TO_ACTION_STATUS['active']);
        });
    });
    describe('title case formatting', () => {
        it('should use title case for all statuses', () => {
            for (const value of Object.values(STATUS_TO_ACTION_STATUS)) {
                // Check first letter is uppercase
                expect(value[0]).toBe(value[0].toUpperCase());
            }
        });
    });
    describe('unknown statuses', () => {
        it('should return undefined for unknown statuses', () => {
            expect(STATUS_TO_ACTION_STATUS['unknown']).toBeUndefined();
            expect(STATUS_TO_ACTION_STATUS['planning']).toBeUndefined(); // Not in action status map
            expect(STATUS_TO_ACTION_STATUS['foo']).toBeUndefined();
        });
    });
});
// =============================================================================
// TESTS: Mapping consistency between emoji and action status
// =============================================================================
describe('status mapping consistency', () => {
    it('should have matching keys between emoji and action status (except planning)', () => {
        const emojiKeys = Object.keys(STATUS_TO_EMOJI);
        const actionKeys = Object.keys(STATUS_TO_ACTION_STATUS);
        // Planning is only in emoji map, not action status map
        const emojiKeysWithoutPlanning = emojiKeys.filter(k => k !== 'planning');
        // All action status keys should be in emoji keys
        for (const key of actionKeys) {
            expect(emojiKeysWithoutPlanning).toContain(key);
        }
    });
    it('should cover all database statuses used in the system', () => {
        const commonStatuses = ['pending', 'in_progress', 'active', 'complete', 'blocked', 'cancelled'];
        for (const status of commonStatuses) {
            expect(STATUS_TO_EMOJI[status]).toBeDefined();
            expect(STATUS_TO_ACTION_STATUS[status]).toBeDefined();
        }
    });
});
