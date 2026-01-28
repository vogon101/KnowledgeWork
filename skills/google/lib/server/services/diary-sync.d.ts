interface TaskActivity {
    taskId: number;
    displayId: string;
    title: string;
    action: 'completed' | 'started' | 'blocked' | 'deferred' | 'cancelled';
    projectName?: string | null;
    projectSlug?: string | null;
}
/**
 * Get today's diary file path
 */
export declare function getDiaryPath(basePath: string, date?: Date): string;
/**
 * Append task activity to today's diary
 */
export declare function logTaskActivity(basePath: string, activity: TaskActivity, date?: Date): {
    success: boolean;
    diaryPath: string;
    message: string;
};
/**
 * Log routine completion to diary
 */
export declare function logRoutineCompletion(basePath: string, routineTitle: string, date?: Date): {
    success: boolean;
    diaryPath: string;
};
export {};
