import { z } from 'zod';
import { ItemStatusSchema, ItemTypeSchema } from './enums.js';

// =============================================================================
// API RESPONSE WRAPPER
// =============================================================================

export const ApiResponseMetaSchema = z.object({
  total: z.number().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type ApiResponseMeta = z.infer<typeof ApiResponseMetaSchema>;

// Generic success response
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: ApiResponseMetaSchema.optional(),
  });
}

// Generic error response
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(z.unknown()).optional(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// Combined response type
export function createApiResultSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.discriminatedUnion('success', [
    createApiResponseSchema(dataSchema),
    ApiErrorResponseSchema,
  ]);
}

// =============================================================================
// QUERY FILTERS
// =============================================================================

export const ItemQuerySchema = z.object({
  // Status filters
  status: z.union([ItemStatusSchema, z.array(ItemStatusSchema)]).optional(),
  includeCompleted: z.boolean().optional(),

  // Owner filters
  ownerId: z.number().optional(),
  ownerName: z.string().optional(),

  // Project/org filters
  projectId: z.number().optional(),
  projectSlug: z.string().optional(),
  orgSlug: z.string().optional(),

  // Relationship filters
  parentId: z.number().optional(),
  sourceMeetingId: z.number().optional(),

  // Item type filter
  itemType: z.union([ItemTypeSchema, z.array(ItemTypeSchema)]).optional(),

  // Date filters
  hasDueDate: z.boolean().optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  targetPeriod: z.string().optional(),

  // Text search
  search: z.string().optional(),

  // Pagination
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
}).refine(
  (d) => !d.projectSlug || d.orgSlug,
  { message: "orgSlug required when filtering by project" }
);
export type ItemQuery = z.infer<typeof ItemQuerySchema>;

// Alias for backwards compatibility
export const TaskQuerySchema = ItemQuerySchema;
export type TaskQuery = ItemQuery;

// =============================================================================
// SYNC RESPONSES
// =============================================================================

export const SyncResultSchema = z.object({
  success: z.boolean(),
  created: z.number().default(0),
  updated: z.number().default(0),
  unchanged: z.number().default(0),
  errors: z.array(z.string()).default([]),
  items: z.array(z.object({
    id: z.number(),
    displayId: z.string(),
    title: z.string(),
    action: z.enum(['created', 'updated', 'unchanged', 'error']),
  })).optional(),
});
export type SyncResult = z.infer<typeof SyncResultSchema>;

export const MeetingSyncResultSchema = SyncResultSchema.extend({
  meetingId: z.number().optional(),
  meetingPath: z.string().optional(),
});
export type MeetingSyncResult = z.infer<typeof MeetingSyncResultSchema>;

export const FileSyncResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  sourceType: z.string().nullable().optional(),
  sourcePath: z.string().nullable().optional(),
  changes: z.array(z.string()).optional(),
});
export type FileSyncResult = z.infer<typeof FileSyncResultSchema>;

// =============================================================================
// STATUS CHANGE RESPONSE
// =============================================================================

export const StatusChangeResponseSchema = z.object({
  previousStatus: z.string(),
  todoistSync: z.object({
    synced: z.boolean(),
    error: z.string().nullable(),
  }),
  markdownSync: z.object({
    synced: z.boolean(),
    sourceType: z.string().nullable(),
    message: z.string(),
  }),
  diarySync: z.object({
    synced: z.boolean(),
    diaryPath: z.string(),
  }),
  unblockedTasks: z.array(z.object({
    id: z.number(),
    displayId: z.string(),
    title: z.string(),
  })),
  clearedCheckIns: z.number(),
});
export type StatusChangeResponse = z.infer<typeof StatusChangeResponseSchema>;
