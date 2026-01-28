/**
 * Todoist-style date and priority parser
 *
 * Parses natural language date expressions and priority shortcuts from task input.
 *
 * Date formats supported:
 * - "today", "tod"
 * - "tomorrow", "tom"
 * - "monday", "tue", "wednesday" etc. (next occurrence)
 * - "next monday", "next tue" etc.
 * - "jan 15", "january 15", "15 jan"
 * - "2026-01-15" (ISO format)
 * - "in 3 days", "in 1 week"
 *
 * Priority formats:
 * - "p1", "p2", "p3", "p4" or "!1", "!2", "!3", "!4"
 */

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export interface ParsedTaskInput {
  title: string;
  dueDate: string | null; // ISO date string YYYY-MM-DD
  priority: number | null; // 1-4
}

/**
 * Parse a task input string extracting date and priority
 */
export function parseTaskInput(input: string): ParsedTaskInput {
  let title = input.trim();
  let dueDate: string | null = null;
  let priority: number | null = null;

  // Extract priority (p1-p4 only - !N is now reserved for dates)
  const priorityMatch = title.match(/\bp[1-4]\b/i);
  if (priorityMatch) {
    const pValue = priorityMatch[0].toLowerCase();
    priority = parseInt(pValue.replace('p', ''), 10);
    title = title.replace(priorityMatch[0], '').trim();
  }

  // Try to extract explicit !date patterns first
  const explicitDateResult = extractExplicitDate(title);
  if (explicitDateResult.date) {
    dueDate = explicitDateResult.date;
    title = explicitDateResult.remainingText.trim();
  }

  // Clean up extra spaces
  title = title.replace(/\s+/g, ' ').trim();

  return { title, dueDate, priority };
}

interface DateExtractionResult {
  date: string | null;
  remainingText: string;
}

function extractDate(text: string): DateExtractionResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to format date
  const formatDate = (d: Date): string => d.toISOString().split('T')[0];

  // Helper to get next occurrence of weekday
  const getNextWeekday = (dayIndex: number, addWeek = false): Date => {
    const result = new Date(today);
    const currentDay = today.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0 || addWeek) {
      daysToAdd += 7;
    }
    result.setDate(result.getDate() + daysToAdd);
    return result;
  };

  // "today" or "tod"
  const todayMatch = text.match(/\b(today|tod)\b/i);
  if (todayMatch) {
    return {
      date: formatDate(today),
      remainingText: text.replace(todayMatch[0], ''),
    };
  }

  // "tomorrow" or "tom"
  const tomorrowMatch = text.match(/\b(tomorrow|tom)\b/i);
  if (tomorrowMatch) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      date: formatDate(tomorrow),
      remainingText: text.replace(tomorrowMatch[0], ''),
    };
  }

  // "next monday", "next tue", etc.
  const nextWeekdayMatch = text.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i);
  if (nextWeekdayMatch) {
    const dayName = nextWeekdayMatch[1].toLowerCase();
    let dayIndex = DAYS_OF_WEEK.indexOf(dayName);
    if (dayIndex === -1) {
      dayIndex = DAYS_SHORT.indexOf(dayName.substring(0, 3));
    }
    if (dayIndex !== -1) {
      return {
        date: formatDate(getNextWeekday(dayIndex, true)),
        remainingText: text.replace(nextWeekdayMatch[0], ''),
      };
    }
  }

  // "monday", "tuesday", etc. (next occurrence)
  const weekdayMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i);
  if (weekdayMatch) {
    const dayName = weekdayMatch[1].toLowerCase();
    let dayIndex = DAYS_OF_WEEK.indexOf(dayName);
    if (dayIndex === -1) {
      dayIndex = DAYS_SHORT.indexOf(dayName.substring(0, 3));
    }
    if (dayIndex !== -1) {
      return {
        date: formatDate(getNextWeekday(dayIndex)),
        remainingText: text.replace(weekdayMatch[0], ''),
      };
    }
  }

  // "in X days/weeks"
  const inDaysMatch = text.match(/\bin\s+(\d+)\s+(day|days|week|weeks)\b/i);
  if (inDaysMatch) {
    const amount = parseInt(inDaysMatch[1], 10);
    const unit = inDaysMatch[2].toLowerCase();
    const future = new Date(today);
    if (unit.startsWith('week')) {
      future.setDate(future.getDate() + amount * 7);
    } else {
      future.setDate(future.getDate() + amount);
    }
    return {
      date: formatDate(future),
      remainingText: text.replace(inDaysMatch[0], ''),
    };
  }

  // "jan 15" or "january 15" or "15 jan"
  const monthDayMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b/i) ||
    text.match(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);

  if (monthDayMatch) {
    let monthStr: string;
    let day: number;

    // Check which format matched
    if (isNaN(parseInt(monthDayMatch[1], 10))) {
      // "jan 15" format
      monthStr = monthDayMatch[1].toLowerCase();
      day = parseInt(monthDayMatch[2], 10);
    } else {
      // "15 jan" format
      day = parseInt(monthDayMatch[1], 10);
      monthStr = monthDayMatch[2].toLowerCase();
    }

    let monthIndex = MONTHS.indexOf(monthStr);
    if (monthIndex === -1) {
      monthIndex = MONTHS_SHORT.indexOf(monthStr.substring(0, 3));
    }

    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      const result = new Date(today.getFullYear(), monthIndex, day);
      // If the date is in the past, assume next year
      if (result < today) {
        result.setFullYear(result.getFullYear() + 1);
      }
      return {
        date: formatDate(result),
        remainingText: text.replace(monthDayMatch[0], ''),
      };
    }
  }

  // ISO date format "2026-01-15"
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return {
      date: isoMatch[1],
      remainingText: text.replace(isoMatch[0], ''),
    };
  }

  // No date found
  return { date: null, remainingText: text };
}

/**
 * Extract explicit !date patterns from text
 * Supports: !today, !tod, !tomorrow, !tom, !monday, !mon, !jan15, !15jan, !2026-01-15
 */
function extractExplicitDate(text: string): DateExtractionResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (d: Date): string => d.toISOString().split('T')[0];

  const getNextWeekday = (dayIndex: number): Date => {
    const result = new Date(today);
    const currentDay = today.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    result.setDate(result.getDate() + daysToAdd);
    return result;
  };

  // Pattern: !keyword (supports various date formats)
  const explicitMatch = text.match(/(?:^|\s)!(\S+?)(?=\s|$)/);
  if (!explicitMatch) {
    return { date: null, remainingText: text };
  }

  const keyword = explicitMatch[1].toLowerCase();
  let date: string | null = null;

  // Check simple keywords
  if (keyword === 'today' || keyword === 'tod') {
    date = formatDate(today);
  } else if (keyword === 'tomorrow' || keyword === 'tom') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = formatDate(tomorrow);
  } else {
    // Check weekdays
    const dayIndex = DAYS_OF_WEEK.indexOf(keyword);
    const shortDayIndex = dayIndex === -1 ? DAYS_SHORT.indexOf(keyword) : dayIndex;
    if (shortDayIndex !== -1) {
      date = formatDate(getNextWeekday(shortDayIndex));
    }
  }

  // Check ISO format: 2026-01-15
  if (!date && /^\d{4}-\d{2}-\d{2}$/.test(keyword)) {
    date = keyword;
  }

  // Check month-day format: jan15, 15jan
  if (!date) {
    const monthDayMatch = keyword.match(/^(\d{1,2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/) ||
      keyword.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{1,2})$/);

    if (monthDayMatch) {
      let monthStr: string;
      let day: number;

      if (isNaN(parseInt(monthDayMatch[1], 10))) {
        monthStr = monthDayMatch[1];
        day = parseInt(monthDayMatch[2], 10);
      } else {
        day = parseInt(monthDayMatch[1], 10);
        monthStr = monthDayMatch[2];
      }

      const monthIndex = MONTHS_SHORT.indexOf(monthStr);
      if (monthIndex !== -1 && day >= 1 && day <= 31) {
        const result = new Date(today.getFullYear(), monthIndex, day);
        if (result < today) {
          result.setFullYear(result.getFullYear() + 1);
        }
        date = formatDate(result);
      }
    }
  }

  if (date) {
    return {
      date,
      remainingText: text.replace(explicitMatch[0], explicitMatch[0].startsWith(' ') ? ' ' : ''),
    };
  }

  return { date: null, remainingText: text };
}

/**
 * Format a date string for display
 */
export function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today';
  }
  if (dateStr === tomorrow.toISOString().split('T')[0]) {
    return 'Tomorrow';
  }

  // Check if this week
  const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil > 0 && daysUntil <= 7) {
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Get priority color classes
 */
export function getPriorityClasses(priority: number | null): { text: string; bg: string; border: string } {
  switch (priority) {
    case 1:
      return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    case 2:
      return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
    case 3:
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    case 4:
      return { text: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' };
    default:
      return { text: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-700' };
  }
}

/**
 * Get left border color class based on priority
 */
export function getPriorityBorderColor(priority: number | null): string {
  switch (priority) {
    case 1:
      return 'border-l-red-500';
    case 2:
      return 'border-l-orange-500';
    case 3:
      return 'border-l-yellow-500';
    case 4:
      return 'border-l-zinc-500';
    default:
      return 'border-l-transparent';
  }
}
