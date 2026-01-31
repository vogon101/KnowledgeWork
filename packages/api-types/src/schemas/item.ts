import { z } from 'zod';
import {
  ItemStatusSchema,
  ItemTypeSchema,
  ItemPersonRoleSchema,
  ActivityTypeSchema,
} from './enums.js';
import { OrgColorSchema } from './project.js';

// =============================================================================
// TARGET PERIOD
// =============================================================================

// Valid: '2026', '2026-01', '2026-Q1', '2026-H1'
export const TargetPeriodSchema = z.string().regex(
  /^(\d{4}|\d{4}-(0[1-9]|1[0-2])|\d{4}-Q[1-4]|\d{4}-H[1-2])$/,
  'Target period must be YYYY, YYYY-MM, YYYY-QN, or YYYY-HN'
).nullable().optional();
export type TargetPeriod = z.infer<typeof TargetPeriodSchema>;

// =============================================================================
// ITEM (TASK) SCHEMA - Base
// =============================================================================

export const ItemSchema = z.object({
  id: z.number(),
  displayId: z.string(), // e.g., "T-42"
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  itemType: ItemTypeSchema.default('task'),
  status: ItemStatusSchema,
  priority: z.number().min(1).max(4).nullable().optional(),

  // Timing
  dueDate: z.string().nullable().optional(), // YYYY-MM-DD
  targetPeriod: TargetPeriodSchema,

  // Relationships (IDs)
  ownerId: z.number().nullable().optional(),
  projectId: z.number().nullable().optional(),
  parentId: z.number().nullable().optional(),
  sourceMeetingId: z.number().nullable().optional(),

  // Source tracking
  sourceType: z.string().nullable().optional(),
  sourcePath: z.string().nullable().optional(),

  // File sync
  filePath: z.string().nullable().optional(),
  fileHash: z.string().nullable().optional(),

  // Routine linking
  routineParentId: z.number().nullable().optional(),

  // Extensibility
  metadata: z.record(z.unknown()).nullable().optional(),

  // Timestamps
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
});
export type Item = z.infer<typeof ItemSchema>;

// Alias for backwards compatibility
export const TaskSchema = ItemSchema;
export type Task = Item;

// =============================================================================
// ITEM WITH RELATIONS (includes joined data)
// =============================================================================

export const ItemWithRelationsSchema = ItemSchema.extend({
  // Owner
  ownerName: z.string().nullable().optional(),

  // Project
  projectSlug: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  projectOrg: z.string().nullable().optional(),
  projectOrgColor: OrgColorSchema.nullable().optional(),
  projectOrgShortName: z.string().nullable().optional(),
  projectParentSlug: z.string().nullable().optional(),
  projectFullPath: z.string().nullable().optional(), // For URLs
  projectIsGeneral: z.boolean().optional().default(false), // True for org-level general projects

  // Source meeting
  sourceMeetingTitle: z.string().nullable().optional(),
  sourceMeetingPath: z.string().nullable().optional(),

  // Subtask counts
  subtaskCount: z.number().default(0),
  subtasksComplete: z.number().default(0),

  // Check-in data (next pending check-in)
  checkinBy: z.string().nullable().optional(),
  checkinId: z.number().nullable().optional(),
});
export type ItemWithRelations = z.infer<typeof ItemWithRelationsSchema>;

// Aliases for backwards compatibility
export const TaskWithRelationsSchema = ItemWithRelationsSchema;
export type TaskWithRelations = ItemWithRelations;

// =============================================================================
// CREATE / UPDATE SCHEMAS
// =============================================================================

export const CreateItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  itemType: ItemTypeSchema.default('task'),
  status: ItemStatusSchema.default('pending'),
  priority: z.number().min(1).max(4).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  targetPeriod: TargetPeriodSchema,
  ownerId: z.number().nullable().optional(),
  projectId: z.number().nullable().optional(),
  parentId: z.number().nullable().optional(),
  sourceMeetingId: z.number().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  sourcePath: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});
export type CreateItem = z.infer<typeof CreateItemSchema>;

// Alias for backwards compatibility
export const CreateTaskSchema = CreateItemSchema;
export type CreateTask = CreateItem;

export const UpdateItemSchema = CreateItemSchema.partial();
export type UpdateItem = z.infer<typeof UpdateItemSchema>;

// Alias for backwards compatibility
export const UpdateTaskSchema = UpdateItemSchema;
export type UpdateTask = UpdateItem;

// =============================================================================
// ITEM ACTIVITY (formerly TaskUpdate)
// =============================================================================

export const ActivitySchema = z.object({
  id: z.number(),
  itemId: z.number(),
  action: ActivityTypeSchema,
  detail: z.string().nullable().optional(),
  oldValue: z.string().nullable().optional(),
  newValue: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type Activity = z.infer<typeof ActivitySchema>;

// Alias for backwards compatibility
export const TaskUpdateSchema = z.object({
  id: z.number(),
  task_id: z.number(),
  note: z.string(),
  update_type: ActivityTypeSchema.optional(),
  old_status: ItemStatusSchema.nullable().optional(),
  new_status: ItemStatusSchema.nullable().optional(),
  created_at: z.string(),
});
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;

export const CreateActivitySchema = ActivitySchema.omit({
  id: true,
  createdAt: true,
});
export type CreateActivity = z.infer<typeof CreateActivitySchema>;

// =============================================================================
// ITEM ATTACHMENT
// =============================================================================

export const ItemAttachmentSchema = z.object({
  id: z.number(),
  itemId: z.number(),
  path: z.string().min(1),
  label: z.string().nullable().optional(),
  attachmentType: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type ItemAttachment = z.infer<typeof ItemAttachmentSchema>;

export const CreateItemAttachmentSchema = ItemAttachmentSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateItemAttachment = z.infer<typeof CreateItemAttachmentSchema>;

// =============================================================================
// ITEM-PERSON RELATIONSHIP
// =============================================================================

export const ItemPersonSchema = z.object({
  id: z.number().optional(),
  itemId: z.number(),
  personId: z.number(),
  role: ItemPersonRoleSchema,
  personName: z.string().optional(),
  createdAt: z.string().optional(),
});
export type ItemPerson = z.infer<typeof ItemPersonSchema>;

// =============================================================================
// BLOCKER INFO (for many-to-many blocking via ItemLink)
// =============================================================================

export const BlockerInfoSchema = z.object({
  id: z.number(),
  displayId: z.string(),
  title: z.string(),
  status: z.string(),
  linkId: z.number().optional(), // The ItemLink ID for this blocking relationship
});
export type BlockerInfo = z.infer<typeof BlockerInfoSchema>;

// =============================================================================
// CHECK-IN
// =============================================================================

export const CheckInSchema = z.object({
  id: z.number(),
  itemId: z.number(),
  date: z.string(), // YYYY-MM-DD
  note: z.string().nullable().optional(),
  completed: z.boolean().default(false),
  createdAt: z.string().optional(),
});
export type CheckIn = z.infer<typeof CheckInSchema>;

export const CreateCheckInSchema = CheckInSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateCheckIn = z.infer<typeof CreateCheckInSchema>;

// =============================================================================
// ITEM DETAIL (full response with all related data)
// =============================================================================

export const ItemDetailSchema = ItemWithRelationsSchema.extend({
  updates: z.array(TaskUpdateSchema).default([]),
  attachments: z.array(ItemAttachmentSchema).default([]),
  people: z.array(ItemPersonSchema).default([]),
  subtasks: z.array(ItemWithRelationsSchema).default([]),
  checkIns: z.array(CheckInSchema).default([]),
  // Many-to-many blocking relationships via ItemLink
  blockers: z.array(BlockerInfoSchema).default([]), // Items that must complete before this one
  blocking: z.array(BlockerInfoSchema).default([]), // Items waiting for this one to complete
});
export type ItemDetail = z.infer<typeof ItemDetailSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatTaskId(id: number): string {
  return `T-${id}`;
}

export function parseTaskId(taskId: string): number | null {
  const match = taskId.match(/^T-(\d+)$/i);
  return match ? parseInt(match[1]) : null;
}
