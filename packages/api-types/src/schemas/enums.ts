import { z } from 'zod';

// =============================================================================
// STATUS ENUMS
// =============================================================================

export const ItemStatusSchema = z.enum([
  'pending',
  'in_progress',
  'complete',
  'blocked',
  'cancelled',
  'deferred',
  'active',  // Workstream status
  'paused',  // Workstream status
]);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

// Alias for backwards compatibility
export const TaskStatusSchema = ItemStatusSchema;
export type TaskStatus = ItemStatus;

// =============================================================================
// ITEM TYPE ENUM
// =============================================================================

export const ItemTypeSchema = z.enum([
  'task',
  'workstream',
  'goal',
  'routine',
]);
export type ItemType = z.infer<typeof ItemTypeSchema>;

// =============================================================================
// ORG SCHEMAS (flexible strings, not enums)
// =============================================================================

// Organizations are flexible strings - new orgs can be added dynamically
// Common values: ya, cbp, external, personal
export const PersonOrgSchema = z.string();
export type PersonOrg = z.infer<typeof PersonOrgSchema>;

// Common values: acme-corp, example-org, consulting, personal, other
export const ProjectOrgSchema = z.string();
export type ProjectOrg = z.infer<typeof ProjectOrgSchema>;

// =============================================================================
// PROJECT STATUS
// =============================================================================

export const ProjectStatusSchema = z.enum(['active', 'planning', 'paused', 'completed', 'archived']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// =============================================================================
// RELATIONSHIP ROLES
// =============================================================================

export const ItemPersonRoleSchema = z.enum(['assignee', 'waiting_on', 'stakeholder', 'reviewer', 'cc']);
export type ItemPersonRole = z.infer<typeof ItemPersonRoleSchema>;

// Alias for backwards compatibility
export const TaskPersonRoleSchema = ItemPersonRoleSchema;
export type TaskPersonRole = ItemPersonRole;

// =============================================================================
// UPDATE TYPES
// =============================================================================

export const ActivityTypeSchema = z.enum([
  'progress',
  'status_changed',
  'blocker',
  'note',
  'attachment',
  'created',
  'updated',
]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

// Alias for backwards compatibility
export const UpdateTypeSchema = ActivityTypeSchema;
export type UpdateType = ActivityType;
