/**
 * Routine Generator Service - Prisma Version
 *
 * Migrated from routine-generator.ts to use Prisma client with unified Item model.
 */
import { getPrisma } from '../prisma.js';
// -----------------------------------------------------------------------------
// Helper: Convert Prisma result to API format
// -----------------------------------------------------------------------------
function toApiFormat(item, lastCompleted, completionCount, isDueToday, completedToday) {
    const projectFullPath = item.project?.parent?.slug
        ? `${item.project.parent.slug}/${item.project.slug}`
        : item.project?.slug || null;
    return {
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        owner_id: item.ownerId,
        owner_name: item.owner?.name || null,
        project_id: item.projectId,
        project_slug: item.project?.slug || null,
        project_name: item.project?.name || null,
        // Always use organization relation, not legacy org column
        project_org: item.project?.organization?.slug || null,
        project_full_path: projectFullPath,
        recurrence_rule: item.recurrenceRule || 'daily',
        recurrence_time: item.recurrenceTime,
        recurrence_days: item.recurrenceDays,
        recurrence_months: item.recurrenceMonths,
        is_due_today: isDueToday,
        completed_today: completedToday,
        last_completed: lastCompleted,
        completion_count: completionCount,
    };
}
// -----------------------------------------------------------------------------
// isDueOnDate - Check if a routine is due on a given date
// -----------------------------------------------------------------------------
export function isDueOnDate(routine, date) {
    const days = routine.recurrenceDays ? JSON.parse(routine.recurrenceDays) : null;
    const months = routine.recurrenceMonths ? JSON.parse(routine.recurrenceMonths) : null;
    switch (routine.recurrenceRule) {
        case 'daily':
            return true;
        case 'weekly':
            if (days) {
                const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const currentDay = dayNames[date.getDay()];
                return days.map((d) => d.toLowerCase().substring(0, 3)).includes(currentDay);
            }
            // Default: Monday only for weekly without specific days
            return date.getDay() === 1;
        case 'monthly':
            if (days) {
                return days.includes(date.getDate());
            }
            // Default to 1st of month
            return date.getDate() === 1;
        case 'bimonthly': {
            const monthNum = date.getMonth() + 1;
            if (months) {
                return months.includes(monthNum) && date.getDate() === 1;
            }
            // Default: even months on the 1st
            return (monthNum % 2 === 0) && date.getDate() === 1;
        }
        case 'yearly':
            // days = [month, day] like [1, 31] for Jan 31
            if (days && days.length === 2) {
                return (date.getMonth() + 1) === days[0] && date.getDate() === days[1];
            }
            return false;
        case 'custom':
            if (days) {
                const dateStr = date.toISOString().split('T')[0];
                return days.includes(dateStr);
            }
            return false;
        default:
            return false;
    }
}
// -----------------------------------------------------------------------------
// getRoutines - List all routine templates
// -----------------------------------------------------------------------------
export async function getRoutines() {
    const prisma = getPrisma();
    const items = await prisma.item.findMany({
        where: {
            itemType: 'routine',
            deletedAt: null,
        },
        include: {
            owner: { select: { name: true } },
            project: {
                select: {
                    slug: true,
                    name: true,
                    // Always use organization relation, not legacy org column
                    parent: { select: { slug: true } },
                    organization: { select: { slug: true } },
                },
            },
            routineCompletions: {
                orderBy: { completedDate: 'desc' },
                take: 1,
                select: { completedDate: true },
            },
            _count: {
                select: { routineCompletions: true },
            },
        },
        orderBy: { title: 'asc' },
    });
    const routines = items.map((item) => {
        const lastCompleted = item.routineCompletions[0]?.completedDate
            ? item.routineCompletions[0].completedDate.toISOString().split('T')[0]
            : null;
        return toApiFormat(item, lastCompleted, item._count.routineCompletions);
    });
    return { routines };
}
// -----------------------------------------------------------------------------
// getRoutinesDue - Get routines due on a specific date
// -----------------------------------------------------------------------------
export async function getRoutinesDue(date = new Date()) {
    const prisma = getPrisma();
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setDate(endOfDay.getDate() + 1);
    // Get all routine templates
    const items = await prisma.item.findMany({
        where: {
            itemType: 'routine',
            recurrenceRule: { not: null },
            deletedAt: null,
        },
        include: {
            owner: { select: { name: true } },
            project: {
                select: {
                    slug: true,
                    name: true,
                    // Always use organization relation, not legacy org column
                    parent: { select: { slug: true } },
                    organization: { select: { slug: true } },
                },
            },
            routineCompletions: {
                orderBy: { completedDate: 'desc' },
                take: 1,
                select: { completedDate: true },
            },
            _count: {
                select: { routineCompletions: true },
            },
        },
        orderBy: [{ recurrenceTime: 'asc' }, { title: 'asc' }],
    });
    // Get completions for the specific date
    const completions = await prisma.routineCompletion.findMany({
        where: {
            completedDate: {
                gte: startOfDay,
                lt: endOfDay,
            },
        },
        select: { routineId: true },
    });
    const completedIds = new Set(completions.map((c) => c.routineId));
    // Filter to routines due on the given date
    const result = [];
    for (const item of items) {
        if (isDueOnDate({
            recurrenceRule: item.recurrenceRule,
            recurrenceDays: item.recurrenceDays,
            recurrenceMonths: item.recurrenceMonths,
        }, date)) {
            const lastCompleted = item.routineCompletions[0]?.completedDate
                ? item.routineCompletions[0].completedDate.toISOString().split('T')[0]
                : null;
            result.push(toApiFormat(item, lastCompleted, item._count.routineCompletions, true, completedIds.has(item.id)));
        }
    }
    return result;
}
// -----------------------------------------------------------------------------
// getRoutineHistory - Get completion history for a routine
// -----------------------------------------------------------------------------
export async function getRoutineHistory(routineId, limit = 30) {
    const prisma = getPrisma();
    const completions = await prisma.routineCompletion.findMany({
        where: { routineId },
        orderBy: { completedDate: 'desc' },
        take: limit,
    });
    return completions.map((c) => ({
        id: c.id,
        completed_date: c.completedDate.toISOString().split('T')[0],
        notes: c.notes,
        completed_at: c.completedAt.toISOString(),
    }));
}
// -----------------------------------------------------------------------------
// completeRoutine - Mark a routine as complete for a specific date
// -----------------------------------------------------------------------------
export async function completeRoutine(routineId, date = new Date(), notes) {
    const prisma = getPrisma();
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setDate(endOfDay.getDate() + 1);
    // Verify routine exists
    const routine = await prisma.item.findFirst({
        where: {
            id: routineId,
            itemType: 'routine',
            deletedAt: null,
        },
    });
    if (!routine) {
        return { success: false, error: 'Routine not found' };
    }
    // Check if already completed
    const existing = await prisma.routineCompletion.findFirst({
        where: {
            routineId,
            completedDate: {
                gte: startOfDay,
                lt: endOfDay,
            },
        },
    });
    if (existing) {
        return { success: true, completion_id: existing.id, already_completed: true };
    }
    // Create completion record
    const completion = await prisma.routineCompletion.create({
        data: {
            routineId,
            completedDate: startOfDay,
            notes: notes || null,
        },
    });
    return {
        success: true,
        completion_id: completion.id,
    };
}
// -----------------------------------------------------------------------------
// uncompleteRoutine - Remove completion for a specific date
// -----------------------------------------------------------------------------
export async function uncompleteRoutine(routineId, date = new Date()) {
    const prisma = getPrisma();
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const result = await prisma.routineCompletion.deleteMany({
        where: {
            routineId,
            completedDate: {
                gte: startOfDay,
                lt: endOfDay,
            },
        },
    });
    return {
        success: true,
        deleted: result.count > 0,
    };
}
// -----------------------------------------------------------------------------
// Helper: Normalize date to YYYY-MM-DD string (local timezone)
// -----------------------------------------------------------------------------
function toDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// -----------------------------------------------------------------------------
// getNextDueDate - Calculate the next date a routine is due (today or later)
// -----------------------------------------------------------------------------
export function getNextDueDate(routine, fromDate = new Date()) {
    // Start checking from today
    const checkDate = new Date(fromDate);
    checkDate.setHours(0, 0, 0, 0);
    // Check up to 365 days ahead to find next due date
    for (let i = 0; i < 365; i++) {
        if (isDueOnDate(routine, checkDate)) {
            return new Date(checkDate);
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }
    // Fallback: return today if no due date found
    return fromDate;
}
// -----------------------------------------------------------------------------
// getOverdueRoutines - Routines that were due but not completed/skipped
// Only checks dates AFTER the routine was created and BEFORE today
// -----------------------------------------------------------------------------
export async function getOverdueRoutines(asOfDate = new Date()) {
    const prisma = getPrisma();
    const result = [];
    // Normalize asOfDate to start of day in local timezone
    const today = new Date(asOfDate);
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);
    // Get all routine templates
    const items = await prisma.item.findMany({
        where: {
            itemType: 'routine',
            recurrenceRule: { not: null },
            deletedAt: null,
        },
        include: {
            owner: { select: { name: true } },
            project: {
                select: {
                    slug: true,
                    name: true,
                    // Always use organization relation, not legacy org column
                    parent: { select: { slug: true } },
                    organization: { select: { slug: true } },
                },
            },
            routineCompletions: {
                orderBy: { completedDate: 'desc' },
                take: 1,
                select: { completedDate: true },
            },
            _count: {
                select: { routineCompletions: true },
            },
        },
    });
    // Get all completions and skips for the last 30 days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const completions = await prisma.routineCompletion.findMany({
        where: {
            completedDate: { gte: thirtyDaysAgo },
        },
        select: { routineId: true, completedDate: true },
    });
    const skips = await prisma.routineSkip.findMany({
        where: {
            skipDate: { gte: thirtyDaysAgo },
        },
        select: { routineId: true, skipDate: true },
    });
    // Build lookup sets for fast checking (using local date strings)
    const completionSet = new Set(completions.map((c) => `${c.routineId}-${toDateStr(c.completedDate)}`));
    const skipSet = new Set(skips.map((s) => `${s.routineId}-${toDateStr(s.skipDate)}`));
    // Check each routine for overdue dates
    for (const item of items) {
        const overdueDates = [];
        // Get routine creation date (only check dates after it was created)
        const createdAt = new Date(item.createdAt);
        createdAt.setHours(0, 0, 0, 0);
        const createdAtStr = toDateStr(createdAt);
        // Check each day in the past 30 days (excluding today - today is "due", not "overdue")
        for (let i = 1; i <= 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = toDateStr(checkDate);
            // Skip dates before the routine was created
            if (dateStr < createdAtStr) {
                continue;
            }
            if (isDueOnDate({
                recurrenceRule: item.recurrenceRule,
                recurrenceDays: item.recurrenceDays,
                recurrenceMonths: item.recurrenceMonths,
            }, checkDate)) {
                const key = `${item.id}-${dateStr}`;
                // Not completed and not skipped = overdue
                if (!completionSet.has(key) && !skipSet.has(key)) {
                    overdueDates.push(dateStr);
                }
            }
        }
        if (overdueDates.length > 0) {
            const lastCompleted = item.routineCompletions[0]?.completedDate
                ? toDateStr(item.routineCompletions[0].completedDate)
                : null;
            result.push({
                routine: toApiFormat(item, lastCompleted, item._count.routineCompletions),
                overdue_dates: overdueDates,
                days_overdue: overdueDates.length,
            });
        }
    }
    return result;
}
// -----------------------------------------------------------------------------
// skipRoutineToNextDue - Skip all overdue instances, advancing to next due date
// If routine is 3 days overdue (daily), skips those 3 days
// If routine is 2 weeks overdue (weekly on Monday), skips those Mondays up to today
// -----------------------------------------------------------------------------
export async function skipRoutineToNextDue(routineId, asOfDate = new Date()) {
    const prisma = getPrisma();
    // Get the routine
    const routine = await prisma.item.findFirst({
        where: {
            id: routineId,
            itemType: 'routine',
            deletedAt: null,
        },
    });
    if (!routine) {
        return { success: false, skipped_count: 0, next_due: '', skipped_dates: [], error: 'Routine not found' };
    }
    const today = new Date(asOfDate);
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);
    // Find the next due date that is today or later
    const nextDue = getNextDueDate({
        recurrenceRule: routine.recurrenceRule,
        recurrenceDays: routine.recurrenceDays,
        recurrenceMonths: routine.recurrenceMonths,
    }, today);
    const nextDueStr = toDateStr(nextDue);
    // Get routine creation date
    const createdAt = new Date(routine.createdAt);
    createdAt.setHours(0, 0, 0, 0);
    const createdAtStr = toDateStr(createdAt);
    // Get existing skips
    const existingSkips = await prisma.routineSkip.findMany({
        where: { routineId },
        select: { skipDate: true },
    });
    const skipSet = new Set(existingSkips.map((s) => toDateStr(s.skipDate)));
    // Get existing completions
    const existingCompletions = await prisma.routineCompletion.findMany({
        where: { routineId },
        select: { completedDate: true },
    });
    const completionSet = new Set(existingCompletions.map((c) => toDateStr(c.completedDate)));
    // Find all due dates from creation to today (exclusive of next due if it's today)
    const datesToSkip = [];
    const checkDate = new Date(createdAt);
    while (toDateStr(checkDate) < nextDueStr) {
        const dateStr = toDateStr(checkDate);
        // Only skip if:
        // 1. The date is due according to recurrence rule
        // 2. Not already skipped
        // 3. Not already completed
        if (isDueOnDate({
            recurrenceRule: routine.recurrenceRule,
            recurrenceDays: routine.recurrenceDays,
            recurrenceMonths: routine.recurrenceMonths,
        }, checkDate) &&
            !skipSet.has(dateStr) &&
            !completionSet.has(dateStr)) {
            datesToSkip.push(dateStr);
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }
    // Create skip records for all dates
    let skippedCount = 0;
    for (const dateStr of datesToSkip) {
        try {
            await prisma.routineSkip.create({
                data: {
                    routineId,
                    skipDate: new Date(dateStr),
                    notes: 'Skipped to advance to next due date',
                },
            });
            skippedCount++;
        }
        catch (e) {
            // Ignore duplicate errors
        }
    }
    return {
        success: true,
        skipped_count: skippedCount,
        next_due: nextDueStr,
        skipped_dates: datesToSkip,
    };
}
// -----------------------------------------------------------------------------
// completeRoutineToNextDue - Complete all overdue instances, advancing to next due date
// Similar to skipRoutineToNextDue but marks dates as completed instead of skipped
// -----------------------------------------------------------------------------
export async function completeRoutineToNextDue(routineId, asOfDate = new Date()) {
    const prisma = getPrisma();
    // Get the routine
    const routine = await prisma.item.findFirst({
        where: {
            id: routineId,
            itemType: 'routine',
            deletedAt: null,
        },
    });
    if (!routine) {
        return { success: false, completed_count: 0, next_due: '', completed_dates: [], error: 'Routine not found' };
    }
    const today = new Date(asOfDate);
    today.setHours(0, 0, 0, 0);
    // Find the next due date that is today or later
    const nextDue = getNextDueDate({
        recurrenceRule: routine.recurrenceRule,
        recurrenceDays: routine.recurrenceDays,
        recurrenceMonths: routine.recurrenceMonths,
    }, today);
    const nextDueStr = toDateStr(nextDue);
    // Get routine creation date
    const createdAt = new Date(routine.createdAt);
    createdAt.setHours(0, 0, 0, 0);
    // Get existing skips
    const existingSkips = await prisma.routineSkip.findMany({
        where: { routineId },
        select: { skipDate: true },
    });
    const skipSet = new Set(existingSkips.map((s) => toDateStr(s.skipDate)));
    // Get existing completions
    const existingCompletions = await prisma.routineCompletion.findMany({
        where: { routineId },
        select: { completedDate: true },
    });
    const completionSet = new Set(existingCompletions.map((c) => toDateStr(c.completedDate)));
    // Find all due dates from creation to today (exclusive of next due if it's today)
    const datesToComplete = [];
    const checkDate = new Date(createdAt);
    while (toDateStr(checkDate) < nextDueStr) {
        const dateStr = toDateStr(checkDate);
        // Only complete if:
        // 1. The date is due according to recurrence rule
        // 2. Not already skipped
        // 3. Not already completed
        if (isDueOnDate({
            recurrenceRule: routine.recurrenceRule,
            recurrenceDays: routine.recurrenceDays,
            recurrenceMonths: routine.recurrenceMonths,
        }, checkDate) &&
            !skipSet.has(dateStr) &&
            !completionSet.has(dateStr)) {
            datesToComplete.push(dateStr);
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }
    // Create completion records for all dates
    let completedCount = 0;
    for (const dateStr of datesToComplete) {
        try {
            await prisma.routineCompletion.create({
                data: {
                    routineId,
                    completedDate: new Date(dateStr),
                    notes: 'Completed retroactively',
                },
            });
            completedCount++;
        }
        catch (e) {
            // Ignore duplicate errors
        }
    }
    return {
        success: true,
        completed_count: completedCount,
        next_due: nextDueStr,
        completed_dates: datesToComplete,
    };
}
// -----------------------------------------------------------------------------
// skipRoutine - Mark a routine as intentionally skipped
// -----------------------------------------------------------------------------
export async function skipRoutine(routineId, date = new Date(), notes) {
    const prisma = getPrisma();
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setDate(endOfDay.getDate() + 1);
    // Verify routine exists
    const routine = await prisma.item.findFirst({
        where: {
            id: routineId,
            itemType: 'routine',
            deletedAt: null,
        },
    });
    if (!routine) {
        return { success: false, error: 'Routine not found' };
    }
    // Check if already skipped
    const existing = await prisma.routineSkip.findFirst({
        where: {
            routineId,
            skipDate: {
                gte: startOfDay,
                lt: endOfDay,
            },
        },
    });
    if (existing) {
        return { success: true, skip_id: existing.id, already_skipped: true };
    }
    // Create skip record
    const skip = await prisma.routineSkip.create({
        data: {
            routineId,
            skipDate: startOfDay,
            notes: notes || null,
        },
    });
    return {
        success: true,
        skip_id: skip.id,
    };
}
// -----------------------------------------------------------------------------
// unskipRoutine - Remove skip for a specific date
// -----------------------------------------------------------------------------
export async function unskipRoutine(routineId, date = new Date()) {
    const prisma = getPrisma();
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const result = await prisma.routineSkip.deleteMany({
        where: {
            routineId,
            skipDate: {
                gte: startOfDay,
                lt: endOfDay,
            },
        },
    });
    return {
        success: true,
        deleted: result.count > 0,
    };
}
