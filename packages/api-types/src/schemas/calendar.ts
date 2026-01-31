import { z } from 'zod';

// =============================================================================
// CALENDAR EVENT
// =============================================================================

export const CalendarAttendeeSchema = z.object({
  email: z.string(),
  displayName: z.string().nullable().optional(),
  responseStatus: z.string().nullable().optional(), // needsAction, declined, tentative, accepted
  self: z.boolean().optional(),
  organizer: z.boolean().optional(),
});
export type CalendarAttendee = z.infer<typeof CalendarAttendeeSchema>;

export const CalendarEventSchema = z.object({
  id: z.string(),
  summary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start: z.string(), // ISO datetime or date
  end: z.string(),
  startDate: z.string().nullable().optional(), // date-only for all-day events
  endDate: z.string().nullable().optional(),
  isAllDay: z.boolean().default(false),
  status: z.string().nullable().optional(), // confirmed, tentative, cancelled
  htmlLink: z.string().nullable().optional(),
  organizer: z.object({
    email: z.string(),
    displayName: z.string().nullable().optional(),
    self: z.boolean().optional(),
  }).nullable().optional(),
  attendees: z.array(CalendarAttendeeSchema).default([]),
  recurringEventId: z.string().nullable().optional(),
  calendarId: z.string().nullable().optional(),
  calendarIds: z.array(z.string()).nullable().optional(), // populated when event appears on multiple calendars
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CalendarInfoSchema = z.object({
  id: z.string(),
  summary: z.string().nullable().optional(),
  primary: z.boolean().optional(),
  accessRole: z.string().nullable().optional(),
});
export type CalendarInfo = z.infer<typeof CalendarInfoSchema>;

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const CalendarListSchema = z.object({
  timeMin: z.string().optional(), // ISO datetime
  timeMax: z.string().optional(),
  maxResults: z.number().min(1).max(250).optional().default(50),
  calendarId: z.string().optional(), // omit to query all configured calendars
  query: z.string().optional(),
});
export type CalendarList = z.infer<typeof CalendarListSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

export const CalendarEventListResponseSchema = z.object({
  events: z.array(CalendarEventSchema),
  nextPageToken: z.string().nullable().optional(),
});
export type CalendarEventListResponse = z.infer<typeof CalendarEventListResponseSchema>;

export const CalendarStatusSchema = z.object({
  configured: z.boolean(),
  authenticated: z.boolean(),
  email: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});
export type CalendarStatus = z.infer<typeof CalendarStatusSchema>;
