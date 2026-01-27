/**
 * Tests for routine-generator-prisma service
 *
 * Tests the core recurrence logic (pure functions) and database operations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isDueOnDate, getNextDueDate } from '../services/routine-generator-prisma.js';

// =============================================================================
// PURE FUNCTION TESTS: isDueOnDate
// =============================================================================

describe('isDueOnDate', () => {
  describe('daily recurrence', () => {
    it('should return true for any date', () => {
      const routine = { recurrenceRule: 'daily', recurrenceDays: null, recurrenceMonths: null };

      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-06-15'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-12-31'))).toBe(true);
    });
  });

  describe('weekly recurrence', () => {
    it('should default to Monday when no days specified', () => {
      const routine = { recurrenceRule: 'weekly', recurrenceDays: null, recurrenceMonths: null };

      // Monday Jan 6, 2025
      expect(isDueOnDate(routine, new Date('2025-01-06'))).toBe(true);
      // Tuesday Jan 7, 2025
      expect(isDueOnDate(routine, new Date('2025-01-07'))).toBe(false);
      // Sunday Jan 5, 2025
      expect(isDueOnDate(routine, new Date('2025-01-05'))).toBe(false);
    });

    it('should match specific days when provided', () => {
      const routine = {
        recurrenceRule: 'weekly',
        recurrenceDays: JSON.stringify(['mon', 'wed', 'fri']),
        recurrenceMonths: null,
      };

      // Monday Jan 6, 2025
      expect(isDueOnDate(routine, new Date('2025-01-06'))).toBe(true);
      // Tuesday Jan 7, 2025
      expect(isDueOnDate(routine, new Date('2025-01-07'))).toBe(false);
      // Wednesday Jan 8, 2025
      expect(isDueOnDate(routine, new Date('2025-01-08'))).toBe(true);
      // Thursday Jan 9, 2025
      expect(isDueOnDate(routine, new Date('2025-01-09'))).toBe(false);
      // Friday Jan 10, 2025
      expect(isDueOnDate(routine, new Date('2025-01-10'))).toBe(true);
    });

    it('should handle full day names', () => {
      const routine = {
        recurrenceRule: 'weekly',
        recurrenceDays: JSON.stringify(['monday', 'wednesday']),
        recurrenceMonths: null,
      };

      // Monday Jan 6, 2025
      expect(isDueOnDate(routine, new Date('2025-01-06'))).toBe(true);
      // Wednesday Jan 8, 2025
      expect(isDueOnDate(routine, new Date('2025-01-08'))).toBe(true);
      // Friday Jan 10, 2025
      expect(isDueOnDate(routine, new Date('2025-01-10'))).toBe(false);
    });

    it('should handle weekend days', () => {
      const routine = {
        recurrenceRule: 'weekly',
        recurrenceDays: JSON.stringify(['sat', 'sun']),
        recurrenceMonths: null,
      };

      // Saturday Jan 4, 2025
      expect(isDueOnDate(routine, new Date('2025-01-04'))).toBe(true);
      // Sunday Jan 5, 2025
      expect(isDueOnDate(routine, new Date('2025-01-05'))).toBe(true);
      // Monday Jan 6, 2025
      expect(isDueOnDate(routine, new Date('2025-01-06'))).toBe(false);
    });
  });

  describe('monthly recurrence', () => {
    it('should default to 1st of month when no days specified', () => {
      const routine = { recurrenceRule: 'monthly', recurrenceDays: null, recurrenceMonths: null };

      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-02-01'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-01-15'))).toBe(false);
    });

    it('should match specific days of month', () => {
      const routine = {
        recurrenceRule: 'monthly',
        recurrenceDays: JSON.stringify([1, 15]),
        recurrenceMonths: null,
      };

      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-01-15'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-01-10'))).toBe(false);
      expect(isDueOnDate(routine, new Date('2025-02-01'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-02-15'))).toBe(true);
    });

    it('should handle end of month days', () => {
      const routine = {
        recurrenceRule: 'monthly',
        recurrenceDays: JSON.stringify([28, 30, 31]),
        recurrenceMonths: null,
      };

      expect(isDueOnDate(routine, new Date('2025-01-28'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-01-30'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-01-31'))).toBe(true);
      // February 28 (non-leap year)
      expect(isDueOnDate(routine, new Date('2025-02-28'))).toBe(true);
    });
  });

  describe('bimonthly recurrence', () => {
    it('should default to even months on the 1st', () => {
      const routine = { recurrenceRule: 'bimonthly', recurrenceDays: null, recurrenceMonths: null };

      // January (odd) - false
      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(false);
      // February (even) on 1st - true
      expect(isDueOnDate(routine, new Date('2025-02-01'))).toBe(true);
      // February (even) on 15th - false (not 1st)
      expect(isDueOnDate(routine, new Date('2025-02-15'))).toBe(false);
      // March (odd) - false
      expect(isDueOnDate(routine, new Date('2025-03-01'))).toBe(false);
      // April (even) on 1st - true
      expect(isDueOnDate(routine, new Date('2025-04-01'))).toBe(true);
    });

    it('should match specific months', () => {
      const routine = {
        recurrenceRule: 'bimonthly',
        recurrenceDays: null,
        recurrenceMonths: JSON.stringify([1, 4, 7, 10]), // Jan, Apr, Jul, Oct
      };

      // January 1st - true
      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(true);
      // February 1st - false (not in months list)
      expect(isDueOnDate(routine, new Date('2025-02-01'))).toBe(false);
      // April 1st - true
      expect(isDueOnDate(routine, new Date('2025-04-01'))).toBe(true);
      // April 15th - false (not 1st)
      expect(isDueOnDate(routine, new Date('2025-04-15'))).toBe(false);
    });
  });

  describe('yearly recurrence', () => {
    it('should match specific month and day', () => {
      const routine = {
        recurrenceRule: 'yearly',
        recurrenceDays: JSON.stringify([1, 31]), // January 31
        recurrenceMonths: null,
      };

      expect(isDueOnDate(routine, new Date('2025-01-31'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-01-30'))).toBe(false);
      expect(isDueOnDate(routine, new Date('2025-02-28'))).toBe(false);
      expect(isDueOnDate(routine, new Date('2026-01-31'))).toBe(true);
    });

    it('should return false when no days specified', () => {
      const routine = { recurrenceRule: 'yearly', recurrenceDays: null, recurrenceMonths: null };

      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(false);
      expect(isDueOnDate(routine, new Date('2025-12-31'))).toBe(false);
    });

    it('should handle Dec 25 (Christmas)', () => {
      const routine = {
        recurrenceRule: 'yearly',
        recurrenceDays: JSON.stringify([12, 25]), // December 25
        recurrenceMonths: null,
      };

      expect(isDueOnDate(routine, new Date('2025-12-25'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-12-24'))).toBe(false);
      expect(isDueOnDate(routine, new Date('2025-12-26'))).toBe(false);
    });
  });

  describe('custom recurrence', () => {
    it('should match specific dates', () => {
      const routine = {
        recurrenceRule: 'custom',
        recurrenceDays: JSON.stringify(['2025-01-15', '2025-02-28', '2025-06-01']),
        recurrenceMonths: null,
      };

      expect(isDueOnDate(routine, new Date('2025-01-15'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-02-28'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-06-01'))).toBe(true);
      expect(isDueOnDate(routine, new Date('2025-01-16'))).toBe(false);
      expect(isDueOnDate(routine, new Date('2025-03-15'))).toBe(false);
    });

    it('should return false when no dates specified', () => {
      const routine = { recurrenceRule: 'custom', recurrenceDays: null, recurrenceMonths: null };

      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(false);
    });
  });

  describe('unknown recurrence rule', () => {
    it('should return false for unknown rules', () => {
      const routine = { recurrenceRule: 'unknown', recurrenceDays: null, recurrenceMonths: null };

      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(false);
    });

    it('should return false for null rule', () => {
      const routine = { recurrenceRule: null, recurrenceDays: null, recurrenceMonths: null };

      expect(isDueOnDate(routine, new Date('2025-01-01'))).toBe(false);
    });
  });
});

// =============================================================================
// PURE FUNCTION TESTS: getNextDueDate
// =============================================================================

describe('getNextDueDate', () => {
  describe('daily recurrence', () => {
    it('should return same day for daily routines', () => {
      const routine = { recurrenceRule: 'daily', recurrenceDays: null, recurrenceMonths: null };
      const fromDate = new Date('2025-01-15');

      const result = getNextDueDate(routine, fromDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-01-15');
    });
  });

  describe('weekly recurrence', () => {
    it('should find next Monday from a Wednesday', () => {
      const routine = { recurrenceRule: 'weekly', recurrenceDays: null, recurrenceMonths: null };
      // Wednesday Jan 8, 2025
      const fromDate = new Date('2025-01-08');

      const result = getNextDueDate(routine, fromDate);
      // Next Monday is Jan 13, 2025
      expect(result.toISOString().split('T')[0]).toBe('2025-01-13');
    });

    it('should return same day if already on a due day', () => {
      const routine = {
        recurrenceRule: 'weekly',
        recurrenceDays: JSON.stringify(['mon', 'fri']),
        recurrenceMonths: null,
      };
      // Monday Jan 6, 2025
      const fromDate = new Date('2025-01-06');

      const result = getNextDueDate(routine, fromDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-01-06');
    });

    it('should find next due day in the week', () => {
      const routine = {
        recurrenceRule: 'weekly',
        recurrenceDays: JSON.stringify(['mon', 'fri']),
        recurrenceMonths: null,
      };
      // Wednesday Jan 8, 2025
      const fromDate = new Date('2025-01-08');

      const result = getNextDueDate(routine, fromDate);
      // Next Friday is Jan 10, 2025
      expect(result.toISOString().split('T')[0]).toBe('2025-01-10');
    });
  });

  describe('monthly recurrence', () => {
    it('should find 1st of next month when past the 1st', () => {
      const routine = { recurrenceRule: 'monthly', recurrenceDays: null, recurrenceMonths: null };
      // January 15, 2025
      const fromDate = new Date('2025-01-15');

      const result = getNextDueDate(routine, fromDate);
      // February 1, 2025
      expect(result.toISOString().split('T')[0]).toBe('2025-02-01');
    });

    it('should return same day if on the 1st', () => {
      const routine = { recurrenceRule: 'monthly', recurrenceDays: null, recurrenceMonths: null };
      // February 1, 2025
      const fromDate = new Date('2025-02-01');

      const result = getNextDueDate(routine, fromDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-02-01');
    });

    it('should find next occurrence with specific days', () => {
      const routine = {
        recurrenceRule: 'monthly',
        recurrenceDays: JSON.stringify([15]),
        recurrenceMonths: null,
      };
      // January 20, 2025
      const fromDate = new Date('2025-01-20');

      const result = getNextDueDate(routine, fromDate);
      // February 15, 2025
      expect(result.toISOString().split('T')[0]).toBe('2025-02-15');
    });
  });

  describe('yearly recurrence', () => {
    it('should find next occurrence of yearly date', () => {
      const routine = {
        recurrenceRule: 'yearly',
        recurrenceDays: JSON.stringify([12, 25]), // December 25
        recurrenceMonths: null,
      };
      // January 1, 2025
      const fromDate = new Date('2025-01-01');

      const result = getNextDueDate(routine, fromDate);
      // December 25, 2025
      expect(result.toISOString().split('T')[0]).toBe('2025-12-25');
    });

    it('should return same day if on the yearly date', () => {
      const routine = {
        recurrenceRule: 'yearly',
        recurrenceDays: JSON.stringify([12, 25]),
        recurrenceMonths: null,
      };
      // December 25, 2025
      const fromDate = new Date('2025-12-25');

      const result = getNextDueDate(routine, fromDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-12-25');
    });

    it('should roll over to next year if past the date', () => {
      const routine = {
        recurrenceRule: 'yearly',
        recurrenceDays: JSON.stringify([1, 15]), // January 15
        recurrenceMonths: null,
      };
      // February 1, 2025
      const fromDate = new Date('2025-02-01');

      const result = getNextDueDate(routine, fromDate);
      // January 15, 2026
      expect(result.toISOString().split('T')[0]).toBe('2026-01-15');
    });
  });
});
