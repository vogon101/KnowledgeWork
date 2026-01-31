/**
 * @kw/api-types
 *
 * Shared Zod schemas and TypeScript types for the Knowledge Work API.
 * This package is the single source of truth for all API types.
 *
 * Usage:
 *   import { ItemWithRelations, ItemQuery, formatTaskId } from '@kw/api-types';
 */

// =============================================================================
// ENUMS
// =============================================================================

export {
  ItemStatusSchema,
  ItemTypeSchema,
  PersonOrgSchema,
  ProjectOrgSchema,
  ProjectStatusSchema,
  ItemPersonRoleSchema,
  ActivityTypeSchema,
  // Backwards compatibility aliases
  TaskStatusSchema,
  TaskPersonRoleSchema,
  UpdateTypeSchema,
  // Types
  type ItemStatus,
  type ItemType,
  type PersonOrg,
  type ProjectOrg,
  type ProjectStatus,
  type ItemPersonRole,
  type ActivityType,
  type TaskStatus,
  type TaskPersonRole,
  type UpdateType,
} from './schemas/enums.js';

// =============================================================================
// PERSON
// =============================================================================

export {
  PersonSchema,
  CreatePersonSchema,
  UpdatePersonSchema,
  PersonWithStatsSchema,
  type Person,
  type CreatePerson,
  type UpdatePerson,
  type PersonWithStats,
} from './schemas/person.js';

// =============================================================================
// PROJECT
// =============================================================================

export {
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectWithParentSchema,
  ProjectPathSchema,
  OrgColorSchema,
  ORG_COLORS,
  type Project,
  type CreateProject,
  type UpdateProject,
  type ProjectWithParent,
  type ProjectPath,
  type OrgColor,
} from './schemas/project.js';

// =============================================================================
// MEETING
// =============================================================================

export {
  MeetingSchema,
  CreateMeetingSchema,
  MeetingAttendeeSchema,
  MeetingWithAttendeesSchema,
  type Meeting,
  type CreateMeeting,
  type MeetingAttendee,
  type MeetingWithAttendees,
} from './schemas/meeting.js';

// =============================================================================
// ITEM (TASK)
// =============================================================================

export {
  TargetPeriodSchema,
  ItemSchema,
  ItemWithRelationsSchema,
  CreateItemSchema,
  UpdateItemSchema,
  ActivitySchema,
  CreateActivitySchema,
  ItemAttachmentSchema,
  CreateItemAttachmentSchema,
  ItemPersonSchema,
  BlockerInfoSchema,
  CheckInSchema,
  CreateCheckInSchema,
  ItemDetailSchema,
  // Backwards compatibility aliases
  TaskSchema,
  TaskWithRelationsSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskUpdateSchema,
  // Types
  type TargetPeriod,
  type Item,
  type ItemWithRelations,
  type CreateItem,
  type UpdateItem,
  type Activity,
  type CreateActivity,
  type ItemAttachment,
  type CreateItemAttachment,
  type ItemPerson,
  type BlockerInfo,
  type CheckIn,
  type CreateCheckIn,
  type ItemDetail,
  type Task,
  type TaskWithRelations,
  type CreateTask,
  type UpdateTask,
  type TaskUpdate,
  // Helper functions
  formatTaskId,
  parseTaskId,
} from './schemas/item.js';

// =============================================================================
// ROUTINE
// =============================================================================

export {
  RecurrenceRuleSchema,
  RoutineSchema,
  CreateRoutineSchema,
  UpdateRoutineSchema,
  RoutineWithStatusSchema,
  RoutineInstanceSchema,
  RoutineDueResponseSchema,
  RoutineOverdueItemSchema,
  RoutineOverdueResponseSchema,
  type RecurrenceRule,
  type Routine,
  type CreateRoutine,
  type UpdateRoutine,
  type RoutineWithStatus,
  type RoutineInstance,
  type RoutineDueResponse,
  type RoutineOverdueItem,
  type RoutineOverdueResponse,
} from './schemas/routine.js';

// =============================================================================
// GMAIL
// =============================================================================

export {
  GmailLabelSchema,
  EmailAddressSchema,
  EmailAttachmentSchema,
  EmailSummarySchema,
  EmailDetailSchema,
  EmailThreadSchema,
  EmailQuerySchema,
  EmailSearchSchema,
  EmailListResponseSchema,
  GmailStatusSchema,
  ContactSchema,
  ContactSearchSchema,
  ContactListResponseSchema,
  type GmailLabel,
  type EmailAddress,
  type EmailAttachment,
  type EmailSummary,
  type EmailDetail,
  type EmailThread,
  type EmailQuery,
  type EmailSearch,
  type EmailListResponse,
  type GmailStatus,
  type Contact,
  type ContactSearch,
  type ContactListResponse,
} from './schemas/gmail.js';

// =============================================================================
// CALENDAR
// =============================================================================

export {
  CalendarAttendeeSchema,
  CalendarEventSchema,
  CalendarListSchema,
  CalendarEventListResponseSchema,
  CalendarStatusSchema,
  CalendarInfoSchema,
  type CalendarAttendee,
  type CalendarEvent,
  type CalendarList,
  type CalendarEventListResponse,
  type CalendarStatus,
  type CalendarInfo,
} from './schemas/calendar.js';

// =============================================================================
// API RESPONSES
// =============================================================================

export {
  ApiResponseMetaSchema,
  ApiErrorResponseSchema,
  createApiResponseSchema,
  createApiResultSchema,
  ItemQuerySchema,
  TaskQuerySchema,
  SyncResultSchema,
  MeetingSyncResultSchema,
  FileSyncResultSchema,
  StatusChangeResponseSchema,
  type ApiResponseMeta,
  type ApiErrorResponse,
  type ItemQuery,
  type TaskQuery,
  type SyncResult,
  type MeetingSyncResult,
  type FileSyncResult,
  type StatusChangeResponse,
} from './schemas/responses.js';

// =============================================================================
// FILES
// =============================================================================

export {
  FileTypeSchema,
  FileEntrySchema,
  TreeNodeSchema,
  FileSearchResultSchema,
  FileContentSchema,
  FileListInputSchema,
  FileTreeInputSchema,
  FileSearchInputSchema,
  FileGetInputSchema,
  type FileType,
  type FileEntry,
  type TreeNode,
  type FileSearchResult,
  type FileContent,
  type FileListInput,
  type FileTreeInput,
  type FileSearchInput,
  type FileGetInput,
} from './schemas/files.js';
