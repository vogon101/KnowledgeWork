/**
 * Tests for file-sync service
 *
 * Tests status mapping functions and workstream frontmatter parsing.
 */
import { describe, it, expect } from 'vitest';
import { mapWorkstreamStatus, mapDbStatusToFile } from '../services/status-constants.js';
// =============================================================================
// TESTS: mapWorkstreamStatus (file → database)
// =============================================================================
describe('mapWorkstreamStatus', () => {
    describe('standard status mappings', () => {
        it('should map "active" to "active"', () => {
            expect(mapWorkstreamStatus('active')).toBe('active');
        });
        it('should map "paused" to "paused"', () => {
            expect(mapWorkstreamStatus('paused')).toBe('paused');
        });
        it('should map "completed" to "complete"', () => {
            expect(mapWorkstreamStatus('completed')).toBe('complete');
        });
        it('should map "complete" to "complete"', () => {
            expect(mapWorkstreamStatus('complete')).toBe('complete');
        });
        it('should map "planning" to "pending"', () => {
            expect(mapWorkstreamStatus('planning')).toBe('pending');
        });
        it('should map "maintenance" to "active"', () => {
            expect(mapWorkstreamStatus('maintenance')).toBe('active');
        });
    });
    describe('case insensitivity', () => {
        it('should handle uppercase input', () => {
            expect(mapWorkstreamStatus('ACTIVE')).toBe('active');
            expect(mapWorkstreamStatus('COMPLETED')).toBe('complete');
            expect(mapWorkstreamStatus('PLANNING')).toBe('pending');
        });
        it('should handle mixed case input', () => {
            expect(mapWorkstreamStatus('Active')).toBe('active');
            expect(mapWorkstreamStatus('Completed')).toBe('complete');
            expect(mapWorkstreamStatus('Planning')).toBe('pending');
        });
    });
    describe('unknown status handling', () => {
        it('should default to "pending" for unknown statuses', () => {
            expect(mapWorkstreamStatus('unknown')).toBe('pending');
            expect(mapWorkstreamStatus('draft')).toBe('pending');
            expect(mapWorkstreamStatus('')).toBe('pending');
            expect(mapWorkstreamStatus('foo')).toBe('pending');
        });
    });
});
// =============================================================================
// TESTS: mapDbStatusToFile (database → file)
// =============================================================================
describe('mapDbStatusToFile', () => {
    describe('standard status mappings', () => {
        it('should map "active" to "active"', () => {
            expect(mapDbStatusToFile('active')).toBe('active');
        });
        it('should map "in_progress" to "active"', () => {
            expect(mapDbStatusToFile('in_progress')).toBe('active');
        });
        it('should map "paused" to "paused"', () => {
            expect(mapDbStatusToFile('paused')).toBe('paused');
        });
        it('should map "complete" to "completed"', () => {
            expect(mapDbStatusToFile('complete')).toBe('completed');
        });
        it('should map "completed" to "completed"', () => {
            expect(mapDbStatusToFile('completed')).toBe('completed');
        });
        it('should map "pending" to "planning"', () => {
            expect(mapDbStatusToFile('pending')).toBe('planning');
        });
    });
    describe('unknown status handling', () => {
        it('should default to "active" for unknown statuses', () => {
            expect(mapDbStatusToFile('unknown')).toBe('active');
            expect(mapDbStatusToFile('blocked')).toBe('active');
            expect(mapDbStatusToFile('cancelled')).toBe('active');
            expect(mapDbStatusToFile('')).toBe('active');
        });
    });
});
// =============================================================================
// TESTS: Round-trip consistency
// =============================================================================
describe('status mapping round-trip', () => {
    it('should preserve "active" status in round-trip', () => {
        const dbStatus = mapWorkstreamStatus('active');
        const fileStatus = mapDbStatusToFile(dbStatus);
        expect(fileStatus).toBe('active');
    });
    it('should preserve "paused" status in round-trip', () => {
        const dbStatus = mapWorkstreamStatus('paused');
        const fileStatus = mapDbStatusToFile(dbStatus);
        expect(fileStatus).toBe('paused');
    });
    it('should preserve "completed" → "complete" → "completed" in round-trip', () => {
        const dbStatus = mapWorkstreamStatus('completed');
        expect(dbStatus).toBe('complete');
        const fileStatus = mapDbStatusToFile(dbStatus);
        expect(fileStatus).toBe('completed');
    });
    it('should preserve "planning" → "pending" → "planning" in round-trip', () => {
        const dbStatus = mapWorkstreamStatus('planning');
        expect(dbStatus).toBe('pending');
        const fileStatus = mapDbStatusToFile(dbStatus);
        expect(fileStatus).toBe('planning');
    });
});
