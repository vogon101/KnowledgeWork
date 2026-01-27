/**
 * Timecard Router (tRPC)
 *
 * Read-only API for viewing timecard data from CSV.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import { resolveKBPath } from '../../services/paths.js';
import fs from 'fs';

// =============================================================================
// TYPES
// =============================================================================

export interface TimecardEntry {
  date: string;
  client: string;
  hours: number;
  tasks: string;
}

export interface ClientSummary {
  client: string;
  totalHours: number;
  entryCount: number;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  clients: ClientSummary[];
  totalHours: number;
}

// =============================================================================
// CSV PARSING
// =============================================================================

/**
 * Parse a CSV line, handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * Read and parse the timecard CSV file
 */
function readTimecardCSV(): TimecardEntry[] {
  const csvPath = resolveKBPath('personal/invoicing/timecard.csv');

  if (!fs.existsSync(csvPath)) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Timecard CSV file not found',
    });
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  // Skip header, filter empty lines
  const entries = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const [date, client, hours, tasks] = parseCSVLine(line);
      return {
        date,
        client,
        hours: parseFloat(hours) || 0,
        tasks: tasks || '',
      };
    })
    .filter((entry) => entry.date && entry.client);

  // Sort by date descending
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

// =============================================================================
// ROUTER
// =============================================================================

export const timecardRouter = router({
  /**
   * List all timecard entries with optional filters
   */
  list: publicProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          client: z.string().optional(),
          limit: z.number().optional().default(1000),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { startDate, endDate, client, limit } = input || {};

      let entries = readTimecardCSV();

      // Apply filters
      if (startDate) {
        entries = entries.filter((e) => e.date >= startDate);
      }
      if (endDate) {
        entries = entries.filter((e) => e.date <= endDate);
      }
      if (client) {
        entries = entries.filter((e) => e.client === client);
      }

      // Apply limit
      entries = entries.slice(0, limit);

      return { entries };
    }),

  /**
   * Get summary statistics
   */
  summary: publicProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { startDate, endDate } = input || {};

      let entries = readTimecardCSV();

      // Apply date filters
      if (startDate) {
        entries = entries.filter((e) => e.date >= startDate);
      }
      if (endDate) {
        entries = entries.filter((e) => e.date <= endDate);
      }

      // Calculate client totals
      const clientTotals: Record<string, { hours: number; count: number }> = {};
      for (const entry of entries) {
        if (!clientTotals[entry.client]) {
          clientTotals[entry.client] = { hours: 0, count: 0 };
        }
        clientTotals[entry.client].hours += entry.hours;
        clientTotals[entry.client].count += 1;
      }

      const clientSummaries: ClientSummary[] = Object.entries(clientTotals)
        .map(([client, data]) => ({
          client,
          totalHours: Math.round(data.hours * 10) / 10,
          entryCount: data.count,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

      // Calculate monthly breakdown
      const monthlyTotals: Record<string, Record<string, number>> = {};
      for (const entry of entries) {
        const month = entry.date.slice(0, 7); // YYYY-MM
        if (!monthlyTotals[month]) {
          monthlyTotals[month] = {};
        }
        if (!monthlyTotals[month][entry.client]) {
          monthlyTotals[month][entry.client] = 0;
        }
        monthlyTotals[month][entry.client] += entry.hours;
      }

      const monthlySummaries: MonthSummary[] = Object.entries(monthlyTotals)
        .map(([month, clients]) => {
          const clientList: ClientSummary[] = Object.entries(clients).map(
            ([client, hours]) => ({
              client,
              totalHours: Math.round(hours * 10) / 10,
              entryCount: 0, // Not tracked per month
            })
          );
          return {
            month,
            clients: clientList,
            totalHours: Math.round(clientList.reduce((sum, c) => sum + c.totalHours, 0) * 10) / 10,
          };
        })
        .sort((a, b) => b.month.localeCompare(a.month));

      // Get unique clients
      const clients = [...new Set(entries.map((e) => e.client))].sort();

      return {
        totalHours: Math.round(entries.reduce((sum, e) => sum + e.hours, 0) * 10) / 10,
        entryCount: entries.length,
        clients,
        clientSummaries,
        monthlySummaries,
      };
    }),
});

export type TimecardRouter = typeof timecardRouter;
