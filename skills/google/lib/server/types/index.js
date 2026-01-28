import { z } from 'zod';
// =============================================================================
// TARGET PERIOD
// =============================================================================
// Constrained format for target periods
// Valid: '2026', '2026-01', '2026-Q1', '2026-H1'
export const TargetPeriodSchema = z.string().regex(/^(\d{4}|\d{4}-(0[1-9]|1[0-2])|\d{4}-Q[1-4]|\d{4}-H[1-2])$/, 'Target period must be YYYY, YYYY-MM, YYYY-QN, or YYYY-HN').nullable().optional();
// Helper to parse and get date range for a target period
export function getTargetPeriodRange(period) {
    const yearMatch = period.match(/^(\d{4})$/);
    if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        return {
            start: new Date(year, 0, 1),
            end: new Date(year, 11, 31)
        };
    }
    const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
        const year = parseInt(monthMatch[1]);
        const month = parseInt(monthMatch[2]) - 1;
        return {
            start: new Date(year, month, 1),
            end: new Date(year, month + 1, 0) // Last day of month
        };
    }
    const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
    if (quarterMatch) {
        const year = parseInt(quarterMatch[1]);
        const quarter = parseInt(quarterMatch[2]);
        const startMonth = (quarter - 1) * 3;
        return {
            start: new Date(year, startMonth, 1),
            end: new Date(year, startMonth + 3, 0)
        };
    }
    const halfMatch = period.match(/^(\d{4})-H([1-2])$/);
    if (halfMatch) {
        const year = parseInt(halfMatch[1]);
        const half = parseInt(halfMatch[2]);
        const startMonth = (half - 1) * 6;
        return {
            start: new Date(year, startMonth, 1),
            end: new Date(year, startMonth + 6, 0)
        };
    }
    throw new Error(`Invalid target period format: ${period}`);
}
// =============================================================================
// ENUMS
// =============================================================================
export const TaskStatusSchema = z.enum([
    'pending',
    'in_progress',
    'complete',
    'blocked',
    'cancelled',
    'deferred',
    'active', // Workstream status
    'paused', // Workstream status
]);
// Organizations are flexible strings - new orgs can be added dynamically
export const PersonOrgSchema = z.string();
export const ProjectOrgSchema = z.string();
export const ProjectStatusSchema = z.enum(['active', 'planning', 'paused', 'completed', 'archived']);
export const TaskPersonRoleSchema = z.enum(['assignee', 'waiting_on', 'stakeholder', 'reviewer', 'cc']);
export const UpdateTypeSchema = z.enum(['progress', 'status_change', 'blocker', 'note', 'attachment']);
// =============================================================================
// PEOPLE
// =============================================================================
export const PersonSchema = z.object({
    id: z.number(),
    name: z.string().min(1),
    email: z.string().email().nullable().optional(),
    org: PersonOrgSchema.nullable().optional(),
    airtable_ya_id: z.string().nullable().optional(),
    airtable_sv_id: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
export const CreatePersonSchema = PersonSchema.omit({ id: true, created_at: true, updated_at: true });
export const UpdatePersonSchema = CreatePersonSchema.partial();
// =============================================================================
// PROJECTS
// =============================================================================
export const ProjectSchema = z.object({
    id: z.number(),
    slug: z.string().min(1),
    name: z.string().min(1),
    org: ProjectOrgSchema,
    status: ProjectStatusSchema.nullable().optional(),
    priority: z.number().min(1).max(4).nullable().optional(),
    parent_id: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
export const CreateProjectSchema = ProjectSchema.omit({ id: true, created_at: true, updated_at: true });
export const UpdateProjectSchema = CreateProjectSchema.partial();
// =============================================================================
// WORKSTREAMS
// =============================================================================
export const WorkstreamSchema = z.object({
    id: z.number(),
    project_id: z.number(),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    target_period: TargetPeriodSchema,
    status: ProjectStatusSchema.nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
export const CreateWorkstreamSchema = WorkstreamSchema.omit({ id: true, created_at: true, updated_at: true });
// =============================================================================
// MEETINGS
// =============================================================================
export const MeetingSchema = z.object({
    id: z.number(),
    title: z.string().min(1),
    date: z.string(), // YYYY-MM-DD
    path: z.string().min(1),
    location: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
export const CreateMeetingSchema = MeetingSchema.omit({ id: true, created_at: true, updated_at: true });
// =============================================================================
// TASKS
// =============================================================================
export const TaskSchema = z.object({
    id: z.number(),
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    status: TaskStatusSchema,
    priority: z.number().min(1).max(4).nullable().optional(),
    // Timing
    due_date: z.string().nullable().optional(), // YYYY-MM-DD
    checkin_by: z.string().nullable().optional(), // YYYY-MM-DD - for following up on others' tasks
    target_period: TargetPeriodSchema,
    // Relationships (IDs)
    owner_id: z.number().nullable().optional(),
    project_id: z.number().nullable().optional(),
    workstream_id: z.number().nullable().optional(),
    parent_task_id: z.number().nullable().optional(),
    blocked_by_task_id: z.number().nullable().optional(), // Task that is blocking this one
    source_meeting_id: z.number().nullable().optional(),
    due_meeting_id: z.number().nullable().optional(),
    // Extensibility
    metadata: z.record(z.unknown()).nullable().optional(),
    // Timestamps
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    completed_at: z.string().nullable().optional(),
});
export const CreateTaskSchema = TaskSchema
    .omit({ id: true, created_at: true, updated_at: true, completed_at: true })
    .extend({
    status: TaskStatusSchema.optional().default('pending'),
});
export const UpdateTaskSchema = CreateTaskSchema.partial();
// Extended task type with joined data (from v_tasks view)
export const TaskWithRelationsSchema = TaskSchema.extend({
    owner_name: z.string().nullable().optional(),
    project_slug: z.string().nullable().optional(),
    project_name: z.string().nullable().optional(),
    project_org: z.string().nullable().optional(),
    workstream_name: z.string().nullable().optional(),
    source_meeting_title: z.string().nullable().optional(),
    source_meeting_path: z.string().nullable().optional(),
    due_meeting_title: z.string().nullable().optional(),
    blocked_by_task_title: z.string().nullable().optional(),
    subtask_count: z.number().optional(),
    subtasks_complete: z.number().optional(),
});
// =============================================================================
// TASK UPDATES
// =============================================================================
export const TaskUpdateSchema = z.object({
    id: z.number(),
    task_id: z.number(),
    note: z.string().min(1),
    update_type: UpdateTypeSchema.optional(),
    old_status: TaskStatusSchema.nullable().optional(),
    new_status: TaskStatusSchema.nullable().optional(),
    created_at: z.string().optional(),
});
export const CreateTaskUpdateSchema = TaskUpdateSchema.omit({ id: true, created_at: true });
// =============================================================================
// TASK ATTACHMENTS
// =============================================================================
export const TaskAttachmentSchema = z.object({
    id: z.number(),
    task_id: z.number(),
    path: z.string().min(1),
    label: z.string().nullable().optional(),
    attachment_type: z.string().nullable().optional(),
    created_at: z.string().optional(),
});
export const CreateTaskAttachmentSchema = TaskAttachmentSchema.omit({ id: true, created_at: true });
// =============================================================================
// TASK-PEOPLE RELATIONSHIPS
// =============================================================================
export const TaskPersonSchema = z.object({
    task_id: z.number(),
    person_id: z.number(),
    role: TaskPersonRoleSchema,
    created_at: z.string().optional(),
});
// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================
// Task query filters
export const TaskQuerySchema = z.object({
    status: z.union([TaskStatusSchema, z.array(TaskStatusSchema)]).optional(),
    owner_id: z.number().optional(),
    owner_name: z.string().optional(),
    project_id: z.number().optional(),
    project_slug: z.string().optional(),
    workstream_id: z.number().optional(),
    parent_task_id: z.number().optional(),
    source_meeting_id: z.number().optional(),
    has_due_date: z.boolean().optional(),
    due_before: z.string().optional(),
    due_after: z.string().optional(),
    target_period: z.string().optional(),
    search: z.string().optional(),
    include_completed: z.boolean().optional(),
    limit: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional(),
});
// Human-friendly task ID
export function formatTaskId(id) {
    return `T-${id}`;
}
export function parseTaskId(taskId) {
    const match = taskId.match(/^T-(\d+)$/i);
    return match ? parseInt(match[1]) : null;
}
