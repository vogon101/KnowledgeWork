/**
 * Tests for hash-utils service
 *
 * Tests content hashing and conflict detection.
 */
import { describe, it, expect } from 'vitest';
import { computeContentHash, hasContentChanged, detectConflict, } from '../services/hash-utils.js';
// =============================================================================
// TESTS: computeContentHash
// =============================================================================
describe('computeContentHash', () => {
    it('should produce consistent hashes for same content', () => {
        const content = 'Hello, World!';
        const hash1 = computeContentHash(content);
        const hash2 = computeContentHash(content);
        expect(hash1).toBe(hash2);
    });
    it('should produce different hashes for different content', () => {
        const hash1 = computeContentHash('Hello, World!');
        const hash2 = computeContentHash('Hello, World');
        expect(hash1).not.toBe(hash2);
    });
    it('should handle empty string', () => {
        const hash = computeContentHash('');
        expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
    it('should handle unicode content', () => {
        const hash1 = computeContentHash('Hello 世界 🌍');
        const hash2 = computeContentHash('Hello 世界 🌍');
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });
    it('should handle multiline content', () => {
        const content = `---
title: Test
status: active
---

# Content

- Item 1
- Item 2
`;
        const hash = computeContentHash(content);
        expect(hash).toHaveLength(64);
    });
    it('should be sensitive to whitespace', () => {
        const hash1 = computeContentHash('Hello World');
        const hash2 = computeContentHash('Hello  World');
        const hash3 = computeContentHash('Hello World ');
        expect(hash1).not.toBe(hash2);
        expect(hash1).not.toBe(hash3);
        expect(hash2).not.toBe(hash3);
    });
});
// =============================================================================
// TESTS: hasContentChanged
// =============================================================================
describe('hasContentChanged', () => {
    it('should return false when content matches hash', () => {
        const content = 'Hello, World!';
        const hash = computeContentHash(content);
        expect(hasContentChanged(content, hash)).toBe(false);
    });
    it('should return true when content differs from hash', () => {
        const originalContent = 'Hello, World!';
        const hash = computeContentHash(originalContent);
        expect(hasContentChanged('Modified content', hash)).toBe(true);
    });
    it('should return true when storedHash is null', () => {
        expect(hasContentChanged('Any content', null)).toBe(true);
    });
    it('should return true when storedHash is empty string', () => {
        const content = 'Hello, World!';
        expect(hasContentChanged(content, '')).toBe(true);
    });
});
// =============================================================================
// TESTS: detectConflict
// =============================================================================
describe('detectConflict', () => {
    const sampleContent = `---
title: Test Workstream
status: active
---

# Test

Some content here.
`;
    describe('no conflict scenarios', () => {
        it('should detect no conflict when neither file nor DB changed', () => {
            const hash = computeContentHash(sampleContent);
            const dbUpdated = new Date('2025-01-01T10:00:00');
            const lastSynced = new Date('2025-01-01T12:00:00'); // synced after DB update
            const result = detectConflict(sampleContent, hash, dbUpdated, lastSynced);
            expect(result.hasConflict).toBe(false);
            expect(result.fileChanged).toBe(false);
            expect(result.dbChanged).toBe(false);
        });
        it('should detect no conflict when only file changed', () => {
            const originalHash = computeContentHash('original content');
            const dbUpdated = new Date('2025-01-01T10:00:00');
            const lastSynced = new Date('2025-01-01T12:00:00');
            const result = detectConflict(sampleContent, originalHash, dbUpdated, lastSynced);
            expect(result.hasConflict).toBe(false);
            expect(result.fileChanged).toBe(true);
            expect(result.dbChanged).toBe(false);
        });
        it('should detect no conflict when only DB changed', () => {
            const hash = computeContentHash(sampleContent);
            const dbUpdated = new Date('2025-01-01T14:00:00'); // DB updated after sync
            const lastSynced = new Date('2025-01-01T12:00:00');
            const result = detectConflict(sampleContent, hash, dbUpdated, lastSynced);
            expect(result.hasConflict).toBe(false);
            expect(result.fileChanged).toBe(false);
            expect(result.dbChanged).toBe(true);
        });
    });
    describe('conflict scenarios', () => {
        it('should detect conflict when both file and DB changed', () => {
            const originalHash = computeContentHash('original content');
            const dbUpdated = new Date('2025-01-01T14:00:00'); // DB updated after sync
            const lastSynced = new Date('2025-01-01T12:00:00');
            const result = detectConflict(sampleContent, originalHash, dbUpdated, lastSynced);
            expect(result.hasConflict).toBe(true);
            expect(result.fileChanged).toBe(true);
            expect(result.dbChanged).toBe(true);
        });
    });
    describe('edge cases', () => {
        it('should handle null storedFileHash', () => {
            const dbUpdated = new Date('2025-01-01T14:00:00');
            const lastSynced = new Date('2025-01-01T12:00:00');
            const result = detectConflict(sampleContent, null, dbUpdated, lastSynced);
            expect(result.fileChanged).toBe(true); // null hash means file is considered changed
            expect(result.storedFileHash).toBe(null);
        });
        it('should handle null dbUpdatedAt', () => {
            const hash = computeContentHash(sampleContent);
            const lastSynced = new Date('2025-01-01T12:00:00');
            const result = detectConflict(sampleContent, hash, null, lastSynced);
            expect(result.dbChanged).toBe(false);
            expect(result.hasConflict).toBe(false);
        });
        it('should handle null lastSyncedAt', () => {
            const hash = computeContentHash(sampleContent);
            const dbUpdated = new Date('2025-01-01T14:00:00');
            const result = detectConflict(sampleContent, hash, dbUpdated, null);
            expect(result.dbChanged).toBe(false); // can't determine if changed without last sync time
        });
        it('should handle both dates being null', () => {
            const hash = computeContentHash(sampleContent);
            const result = detectConflict(sampleContent, hash, null, null);
            expect(result.dbChanged).toBe(false);
            expect(result.hasConflict).toBe(false);
        });
    });
    describe('result structure', () => {
        it('should include current file hash in result', () => {
            const hash = computeContentHash(sampleContent);
            const result = detectConflict(sampleContent, hash, null, null);
            expect(result.currentFileHash).toBe(hash);
        });
        it('should include stored file hash in result', () => {
            const storedHash = 'abc123';
            const result = detectConflict(sampleContent, storedHash, null, null);
            expect(result.storedFileHash).toBe(storedHash);
        });
    });
});
