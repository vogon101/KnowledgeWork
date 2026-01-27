import { z } from 'zod';

// =============================================================================
// MEETING SCHEMAS
// =============================================================================

export const MeetingSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  date: z.string(), // YYYY-MM-DD
  path: z.string().min(1),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Meeting = z.infer<typeof MeetingSchema>;

export const CreateMeetingSchema = MeetingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateMeeting = z.infer<typeof CreateMeetingSchema>;

// =============================================================================
// MEETING WITH ATTENDEES
// =============================================================================

export const MeetingAttendeeSchema = z.object({
  id: z.number(),
  personId: z.number(),
  personName: z.string(),
});
export type MeetingAttendee = z.infer<typeof MeetingAttendeeSchema>;

export const MeetingWithAttendeesSchema = MeetingSchema.extend({
  attendees: z.array(MeetingAttendeeSchema).default([]),
  taskCount: z.number().default(0),
});
export type MeetingWithAttendees = z.infer<typeof MeetingWithAttendeesSchema>;
