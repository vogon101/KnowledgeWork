/**
 * Focus Router (tRPC)
 *
 * API for tracking daily focus ratings with CSV backing.
 */
import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { resolveKBPath } from '../../services/paths.js';
import fs from 'fs';
// =============================================================================
// CSV HANDLING
// =============================================================================
const FOCUS_CSV_PATH = 'personal/invoicing/focus.csv';
const CSV_HEADER = 'date,user_rating,ai_rating,user_notes,ai_notes';
/**
 * Parse a CSV line, handling quoted fields with commas
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
/**
 * Escape a field for CSV output
 */
function escapeCSVField(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
/**
 * Get the path to the focus CSV file
 */
function getFocusCSVPath() {
    return resolveKBPath(FOCUS_CSV_PATH);
}
/**
 * Ensure the focus CSV file exists with header
 */
function ensureFocusCSV() {
    const csvPath = getFocusCSVPath();
    const dir = csvPath.substring(0, csvPath.lastIndexOf('/'));
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    // Create file with header if it doesn't exist
    if (!fs.existsSync(csvPath)) {
        fs.writeFileSync(csvPath, CSV_HEADER + '\n', 'utf-8');
    }
}
/**
 * Read and parse the focus CSV file
 */
function readFocusCSV() {
    const csvPath = getFocusCSVPath();
    if (!fs.existsSync(csvPath)) {
        return [];
    }
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');
    // Skip header, filter empty lines
    const entries = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
        const [date, userRating, aiRating, userNotes, aiNotes] = parseCSVLine(line);
        return {
            date,
            userRating: userRating ? parseFloat(userRating) : null,
            aiRating: aiRating ? parseFloat(aiRating) : null,
            userNotes: userNotes || '',
            aiNotes: aiNotes || '',
        };
    })
        .filter((entry) => entry.date);
    // Sort by date descending
    return entries.sort((a, b) => b.date.localeCompare(a.date));
}
/**
 * Write entries to the focus CSV file
 */
function writeFocusCSV(entries) {
    ensureFocusCSV();
    const csvPath = getFocusCSVPath();
    // Sort by date ascending for file storage
    const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const lines = [CSV_HEADER];
    for (const entry of sortedEntries) {
        const userRating = entry.userRating !== null ? entry.userRating.toString() : '';
        const aiRating = entry.aiRating !== null ? entry.aiRating.toString() : '';
        lines.push([
            entry.date,
            userRating,
            aiRating,
            escapeCSVField(entry.userNotes),
            escapeCSVField(entry.aiNotes),
        ].join(','));
    }
    fs.writeFileSync(csvPath, lines.join('\n') + '\n', 'utf-8');
}
// =============================================================================
// ROUTER
// =============================================================================
export const focusRouter = router({
    /**
     * List all focus entries with optional date range filter
     */
    list: publicProcedure
        .input(z
        .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().optional().default(100),
    })
        .optional())
        .query(async ({ input }) => {
        const { startDate, endDate, limit } = input || {};
        let entries = readFocusCSV();
        // Apply filters
        if (startDate) {
            entries = entries.filter((e) => e.date >= startDate);
        }
        if (endDate) {
            entries = entries.filter((e) => e.date <= endDate);
        }
        // Apply limit
        entries = entries.slice(0, limit);
        return { entries };
    }),
    /**
     * Get a focus entry for a specific date
     */
    get: publicProcedure
        .input(z.object({
        date: z.string(),
    }))
        .query(async ({ input }) => {
        const entries = readFocusCSV();
        const entry = entries.find((e) => e.date === input.date);
        return { entry: entry || null };
    }),
    /**
     * Create or update a focus entry for a date
     */
    upsert: publicProcedure
        .input(z.object({
        date: z.string(),
        userRating: z.number().min(1).max(5).optional(),
        aiRating: z.number().min(1).max(5).optional(),
        userNotes: z.string().optional(),
        aiNotes: z.string().optional(),
    }))
        .mutation(async ({ input }) => {
        ensureFocusCSV();
        const entries = readFocusCSV();
        const existingIndex = entries.findIndex((e) => e.date === input.date);
        if (existingIndex >= 0) {
            // Update existing entry
            const existing = entries[existingIndex];
            entries[existingIndex] = {
                date: input.date,
                userRating: input.userRating ?? existing.userRating,
                aiRating: input.aiRating ?? existing.aiRating,
                userNotes: input.userNotes ?? existing.userNotes,
                aiNotes: input.aiNotes ?? existing.aiNotes,
            };
        }
        else {
            // Create new entry
            entries.push({
                date: input.date,
                userRating: input.userRating ?? null,
                aiRating: input.aiRating ?? null,
                userNotes: input.userNotes || '',
                aiNotes: input.aiNotes || '',
            });
        }
        writeFocusCSV(entries);
        return {
            date: input.date,
            created: existingIndex < 0,
            updated: existingIndex >= 0,
        };
    }),
    /**
     * Get summary statistics for a time period
     */
    summary: publicProcedure
        .input(z
        .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        period: z.enum(['week', 'month', 'all']).optional().default('month'),
    })
        .optional())
        .query(async ({ input }) => {
        let { startDate, endDate } = input || {};
        const period = input?.period || 'month';
        // Calculate default date ranges based on period
        const today = new Date();
        if (!startDate && !endDate) {
            if (period === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                startDate = weekAgo.toISOString().split('T')[0];
            }
            else if (period === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                startDate = monthAgo.toISOString().split('T')[0];
            }
            endDate = today.toISOString().split('T')[0];
        }
        let entries = readFocusCSV();
        // Apply date filters
        if (startDate) {
            entries = entries.filter((e) => e.date >= startDate);
        }
        if (endDate) {
            entries = entries.filter((e) => e.date <= endDate);
        }
        // Calculate averages
        const userRatings = entries.filter((e) => e.userRating !== null).map((e) => e.userRating);
        const aiRatings = entries.filter((e) => e.aiRating !== null).map((e) => e.aiRating);
        const avgUserRating = userRatings.length > 0
            ? Math.round((userRatings.reduce((a, b) => a + b, 0) / userRatings.length) * 10) / 10
            : null;
        const avgAiRating = aiRatings.length > 0
            ? Math.round((aiRatings.reduce((a, b) => a + b, 0) / aiRatings.length) * 10) / 10
            : null;
        // Calculate weekly breakdown
        const weeklyBreakdown = [];
        // Group entries by week
        const weekGroups = {};
        for (const entry of entries) {
            const date = new Date(entry.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!weekGroups[weekKey]) {
                weekGroups[weekKey] = [];
            }
            weekGroups[weekKey].push(entry);
        }
        for (const [weekStart, weekEntries] of Object.entries(weekGroups)) {
            const weekUserRatings = weekEntries.filter((e) => e.userRating !== null).map((e) => e.userRating);
            const weekAiRatings = weekEntries.filter((e) => e.aiRating !== null).map((e) => e.aiRating);
            weeklyBreakdown.push({
                weekStart,
                avgUserRating: weekUserRatings.length > 0
                    ? Math.round((weekUserRatings.reduce((a, b) => a + b, 0) / weekUserRatings.length) * 10) / 10
                    : null,
                avgAiRating: weekAiRatings.length > 0
                    ? Math.round((weekAiRatings.reduce((a, b) => a + b, 0) / weekAiRatings.length) * 10) / 10
                    : null,
                entryCount: weekEntries.length,
            });
        }
        // Sort weekly breakdown by date descending
        weeklyBreakdown.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
        return {
            avgUserRating,
            avgAiRating,
            entryCount: entries.length,
            period: startDate && endDate ? `${startDate} to ${endDate}` : period,
            weeklyBreakdown,
            entries, // Include recent entries for display
        };
    }),
});
