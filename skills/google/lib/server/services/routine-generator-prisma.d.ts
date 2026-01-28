/**
 * Routine Generator Service - Prisma Version
 *
 * Migrated from routine-generator.ts to use Prisma client with unified Item model.
 */
export interface RoutineTemplate {
    id: number;
    title: string;
    description: string | null;
    priority: number | null;
    ownerId: number | null;
    projectId: number | null;
    recurrenceRule: string;
    recurrenceTime: string | null;
    recurrenceDays: string | null;
    recurrenceMonths: string | null;
}
export interface RoutineWithStatus extends RoutineTemplate {
    ownerName: string | null;
    projectSlug: string | null;
    projectName: string | null;
    projectOrg: string | null;
    projectFullPath: string | null;
    isDueToday: boolean;
    completedToday: boolean;
    lastCompleted: string | null;
    completionCount: number;
}
export interface RoutineApiFormat {
    id: number;
    title: string;
    description: string | null;
    priority: number | null;
    owner_id: number | null;
    owner_name: string | null;
    project_id: number | null;
    project_slug: string | null;
    project_name: string | null;
    project_org: string | null;
    project_full_path: string | null;
    recurrence_rule: string;
    recurrence_time: string | null;
    recurrence_days: string | null;
    recurrence_months: string | null;
    is_due_today?: boolean;
    completed_today?: boolean;
    last_completed: string | null;
    completion_count: number;
}
export declare function isDueOnDate(routine: {
    recurrenceRule: string | null;
    recurrenceDays: string | null;
    recurrenceMonths: string | null;
}, date: Date): boolean;
export declare function getRoutines(): Promise<{
    routines: RoutineApiFormat[];
}>;
export declare function getRoutinesDue(date?: Date): Promise<RoutineApiFormat[]>;
export declare function getRoutineHistory(routineId: number, limit?: number): Promise<Array<{
    id: number;
    completed_date: string;
    notes: string | null;
    completed_at: string;
}>>;
export declare function completeRoutine(routineId: number, date?: Date, notes?: string): Promise<{
    success: boolean;
    completion_id?: number;
    error?: string;
    already_completed?: boolean;
}>;
export declare function uncompleteRoutine(routineId: number, date?: Date): Promise<{
    success: boolean;
    deleted: boolean;
}>;
export declare function getNextDueDate(routine: {
    recurrenceRule: string | null;
    recurrenceDays: string | null;
    recurrenceMonths: string | null;
}, fromDate?: Date): Date;
export declare function getOverdueRoutines(asOfDate?: Date): Promise<Array<{
    routine: RoutineApiFormat;
    overdue_dates: string[];
    days_overdue: number;
}>>;
export declare function skipRoutineToNextDue(routineId: number, asOfDate?: Date): Promise<{
    success: boolean;
    skipped_count: number;
    next_due: string;
    skipped_dates: string[];
    error?: string;
}>;
export declare function completeRoutineToNextDue(routineId: number, asOfDate?: Date): Promise<{
    success: boolean;
    completed_count: number;
    next_due: string;
    completed_dates: string[];
    error?: string;
}>;
export declare function skipRoutine(routineId: number, date?: Date, notes?: string): Promise<{
    success: boolean;
    skip_id?: number;
    error?: string;
    already_skipped?: boolean;
}>;
export declare function unskipRoutine(routineId: number, date?: Date): Promise<{
    success: boolean;
    deleted: boolean;
}>;
