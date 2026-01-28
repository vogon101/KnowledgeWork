/**
 * Calendar Router (tRPC)
 *
 * Type-safe API for Google Calendar operations.
 * Requires Google OAuth setup via: npx tsx src/scripts/google-auth.ts
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import {
  CalendarListSchema,
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
 * Format a Calendar API event to CalendarEvent.
 */
function formatEvent(event: calendar_v3.Schema$Event): CalendarEvent {
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
  };
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
        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime',
          q: query || undefined,
        });

        const events = (response.data.items || []).map(formatEvent);

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
   */
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      maxResults: z.number().min(1).max(250).optional().default(20),
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
        const response = await calendar.events.list({
          calendarId: input.calendarId,
          q: input.query,
          timeMin: input.timeMin,
          timeMax: input.timeMax,
          maxResults: input.maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = (response.data.items || []).map(formatEvent);

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

        return formatEvent(response.data);
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
});

export type CalendarRouter = typeof calendarRouter;
