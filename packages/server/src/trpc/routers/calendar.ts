/**
 * Calendar Router (tRPC)
 *
 * Type-safe API for Google Calendar operations.
 * Requires Google OAuth setup via: npx tsx src/scripts/google-auth.ts
 *
 * Supports multiple calendars via GOOGLE_CALENDAR_IDS env var (comma-separated).
 * Defaults to 'primary' if not set.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import {
  CalendarListSchema,
  CalendarInfoSchema,
  type CalendarEvent,
} from '@kw/api-types';
import {
  getCalendarClient,
  isGmailConfigured,
  hasCredentials,
  hasTokens,
  getAuthenticatedEmail,
} from '../../services/google-client.js';
import type { calendar_v3 } from 'googleapis';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get configured calendar IDs from env var, defaulting to ['primary'].
 */
function getConfiguredCalendarIds(): string[] {
  const env = process.env.GOOGLE_CALENDAR_IDS;
  if (!env) return ['primary'];
  return env.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Format a Calendar API event to CalendarEvent.
 */
function formatEvent(event: calendar_v3.Schema$Event, calendarId?: string): CalendarEvent {
  const isAllDay = !!(event.start?.date && !event.start?.dateTime);

  return {
    id: event.id || '',
    summary: event.summary || null,
    description: event.description || null,
    location: event.location || null,
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    startDate: event.start?.date || null,
    endDate: event.end?.date || null,
    isAllDay,
    status: event.status || null,
    htmlLink: event.htmlLink || null,
    organizer: event.organizer ? {
      email: event.organizer.email || '',
      displayName: event.organizer.displayName || null,
      self: event.organizer.self || false,
    } : null,
    attendees: (event.attendees || []).map(a => ({
      email: a.email || '',
      displayName: a.displayName || null,
      responseStatus: a.responseStatus || null,
      self: a.self || false,
      organizer: a.organizer || false,
    })),
    recurringEventId: event.recurringEventId || null,
    calendarId: calendarId || null,
  };
}

/**
 * Query multiple calendars in parallel and merge results sorted by start time.
 */
async function queryMultipleCalendars(
  calendar: calendar_v3.Calendar,
  calendarIds: string[],
  params: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    query?: string;
  },
): Promise<{ events: CalendarEvent[]; nextPageToken: string | null }> {
  const results = await Promise.all(
    calendarIds.map(async (calId) => {
      try {
        const response = await calendar.events.list({
          calendarId: calId,
          timeMin: params.timeMin,
          timeMax: params.timeMax,
          maxResults: params.maxResults,
          singleEvents: true,
          orderBy: 'startTime',
          q: params.query || undefined,
        });
        return (response.data.items || []).map(e => formatEvent(e, calId));
      } catch {
        // Skip calendars that fail (e.g. permission issues)
        return [];
      }
    }),
  );

  const allEvents = results
    .flat()
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Deduplicate events that appear on multiple calendars (same summary + same start time)
  const deduped: CalendarEvent[] = [];
  const seen = new Map<string, number>(); // dedup key -> index in deduped array

  for (const event of allEvents) {
    const key = `${(event.summary || '').toLowerCase()}|${event.start}`;
    const existingIdx = seen.get(key);
    if (existingIdx !== undefined) {
      // Merge calendar IDs into the existing event
      const existing = deduped[existingIdx];
      const ids = existing.calendarIds || (existing.calendarId ? [existing.calendarId] : []);
      if (event.calendarId && !ids.includes(event.calendarId)) {
        ids.push(event.calendarId);
      }
      existing.calendarIds = ids;
    } else {
      // First occurrence — set calendarIds from calendarId
      if (event.calendarId) {
        event.calendarIds = [event.calendarId];
      }
      seen.set(key, deduped.length);
      deduped.push(event);
    }
  }

  // Trim to maxResults after merging
  const limited = params.maxResults ? deduped.slice(0, params.maxResults) : deduped;

  return { events: limited, nextPageToken: null };
}

// =============================================================================
// ROUTER
// =============================================================================

export const calendarRouter = router({
  /**
   * Check Calendar configuration and authentication status.
   */
  status: publicProcedure.query(async () => {
    const configured = isGmailConfigured();
    const hasCredentialsFile = hasCredentials();
    const hasTokensFile = hasTokens();

    if (!configured) {
      return {
        configured: false,
        authenticated: false,
        email: null,
        error: !hasCredentialsFile
          ? 'Google credentials not found. Run: npx tsx src/scripts/google-auth.ts'
          : 'Google not authenticated. Run: npx tsx src/scripts/google-auth.ts',
      };
    }

    const email = await getAuthenticatedEmail();
    return {
      configured: true,
      authenticated: !!email,
      email,
      error: email ? null : 'Failed to verify Google authentication. May need to re-auth with calendar scope.',
    };
  }),

  /**
   * List calendar events in a time range.
   * When no explicit calendarId is provided, queries all configured calendars.
   */
  list: publicProcedure
    .input(CalendarListSchema)
    .query(async ({ input }) => {
      const calendar = await getCalendarClient();
      if (!calendar) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Calendar not configured. Run: npx tsx src/scripts/google-auth.ts',
        });
      }

      const { timeMin, timeMax, maxResults, calendarId, query } = input;

      try {
        // If no explicit calendarId, query all configured calendars
        if (!calendarId) {
          const configuredIds = getConfiguredCalendarIds();
          return queryMultipleCalendars(calendar, configuredIds, {
            timeMin,
            timeMax,
            maxResults,
            query,
          });
        }

        // Single calendar query
        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime',
          q: query || undefined,
        });

        const events = (response.data.items || []).map(e => formatEvent(e, calendarId));

        return {
          events,
          nextPageToken: response.data.nextPageToken || null,
        };
      } catch (err) {
        const error = err as { code?: number; message?: string };
        if (error.code === 403 || error.message?.includes('scope')) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Calendar scope not authorized. Re-run google-auth.ts to add calendar permission.',
          });
        }
        throw err;
      }
    }),

  /**
   * Search calendar events by text query.
   * When no explicit calendarId is provided, searches all configured calendars.
   */
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      maxResults: z.number().min(1).max(250).optional().default(20),
      calendarId: z.string().optional(), // omit to query all configured calendars
    }))
    .query(async ({ input }) => {
      const calendar = await getCalendarClient();
      if (!calendar) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Calendar not configured. Run: npx tsx src/scripts/google-auth.ts',
        });
      }

      try {
        // If no explicit calendarId, query all configured calendars
        if (!input.calendarId) {
          const configuredIds = getConfiguredCalendarIds();
          return queryMultipleCalendars(calendar, configuredIds, {
            timeMin: input.timeMin,
            timeMax: input.timeMax,
            maxResults: input.maxResults,
            query: input.query,
          });
        }

        const response = await calendar.events.list({
          calendarId: input.calendarId,
          q: input.query,
          timeMin: input.timeMin,
          timeMax: input.timeMax,
          maxResults: input.maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = (response.data.items || []).map(e => formatEvent(e, input.calendarId));

        return {
          events,
          nextPageToken: response.data.nextPageToken || null,
        };
      } catch (err) {
        const error = err as { code?: number; message?: string };
        if (error.code === 403 || error.message?.includes('scope')) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Calendar scope not authorized. Re-run google-auth.ts to add calendar permission.',
          });
        }
        throw err;
      }
    }),

  /**
   * Get a single calendar event by ID.
   */
  get: publicProcedure
    .input(z.object({
      id: z.string().min(1),
      calendarId: z.string().optional().default('primary'),
    }))
    .query(async ({ input }) => {
      const calendar = await getCalendarClient();
      if (!calendar) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Calendar not configured. Run: npx tsx src/scripts/google-auth.ts',
        });
      }

      try {
        const response = await calendar.events.get({
          calendarId: input.calendarId,
          eventId: input.id,
        });

        return formatEvent(response.data, input.calendarId);
      } catch (err) {
        if ((err as { code?: number }).code === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Calendar event ${input.id} not found`,
          });
        }
        throw err;
      }
    }),

  /**
   * List all calendars the authenticated user has access to.
   */
  calendars: publicProcedure.query(async () => {
    const calendar = await getCalendarClient();
    if (!calendar) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Calendar not configured. Run: npx tsx src/scripts/google-auth.ts',
      });
    }

    try {
      const response = await calendar.calendarList.list();
      const items = response.data.items || [];

      return {
        calendars: items.map(cal => CalendarInfoSchema.parse({
          id: cal.id || '',
          summary: cal.summary || null,
          primary: cal.primary || false,
          accessRole: cal.accessRole || null,
        })),
        configuredIds: getConfiguredCalendarIds(),
      };
    } catch (err) {
      const error = err as { code?: number; message?: string };
      if (error.code === 403 || error.message?.includes('scope')) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Calendar scope not authorized. Re-run google-auth.ts to add calendar permission.',
        });
      }
      throw err;
    }
  }),
});

export type CalendarRouter = typeof calendarRouter;
