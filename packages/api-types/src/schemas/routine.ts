import { z } from 'zod';

// =============================================================================
// RECURRENCE RULES
// =============================================================================

export const RecurrenceRuleSchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'bimonthly',
  'yearly',
  'custom',
]);
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;

// =============================================================================
// ROUTINE TEMPLATE
// =============================================================================

export const RoutineSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  recurrenceRule: RecurrenceRuleSchema,
  recurrenceTime: z.string().nullable().optional(), // HH:MM
  recurrenceDays: z.array(z.number()).nullable().optional(), // For custom patterns (0=Sun, 6=Sat)
  projectId: z.number().nullable().optional(),
  ownerId: z.number().nullable().optional(),
  priority: z.number().min(1).max(4).nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Routine = z.infer<typeof RoutineSchema>;

export const CreateRoutineSchema = RoutineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateRoutine = z.infer<typeof CreateRoutineSchema>;

export const UpdateRoutineSchema = CreateRoutineSchema.partial();
export type UpdateRoutine = z.infer<typeof UpdateRoutineSchema>;

// =============================================================================
// ROUTINE WITH COMPLETION STATUS (for daily view)
// =============================================================================

export const RoutineWithStatusSchema = RoutineSchema.extend({
  completedToday: z.boolean().default(false),
  skippedToday: z.boolean().default(false),
  lastCompleted: z.string().nullable().optional(),
  instanceId: z.number().nullable().optional(), // ID of today's instance if exists
});
export type RoutineWithStatus = z.infer<typeof RoutineWithStatusSchema>;

// =============================================================================
// ROUTINE INSTANCE (generated for a specific date)
// =============================================================================

export const RoutineInstanceSchema = z.object({
  id: z.number(),
  routineId: z.number(),
  date: z.string(), // YYYY-MM-DD
  completed: z.boolean().default(false),
  skipped: z.boolean().default(false),
  completedAt: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type RoutineInstance = z.infer<typeof RoutineInstanceSchema>;

// =============================================================================
// ROUTINE DUE RESPONSE (from /routines/due)
// =============================================================================

export const RoutineDueResponseSchema = z.object({
  date: z.string(),
  total: z.number(),
  pendingCount: z.number(),
  completedCount: z.number(),
  pending: z.array(RoutineWithStatusSchema),
  completed: z.array(RoutineWithStatusSchema),
});
export type RoutineDueResponse = z.infer<typeof RoutineDueResponseSchema>;

// =============================================================================
// ROUTINE OVERDUE RESPONSE
// =============================================================================

export const RoutineOverdueItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  recurrenceRule: RecurrenceRuleSchema,
  overdueDates: z.array(z.string()),
  daysOverdue: z.number(),
});
export type RoutineOverdueItem = z.infer<typeof RoutineOverdueItemSchema>;

export const RoutineOverdueResponseSchema = z.object({
  totalOverdue: z.number(),
  totalMissedInstances: z.number(),
  routines: z.array(RoutineOverdueItemSchema),
});
export type RoutineOverdueResponse = z.infer<typeof RoutineOverdueResponseSchema>;
