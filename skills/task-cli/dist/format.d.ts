/**
 * Output Formatting
 *
 * Concise, tabular output optimized for AI parsing.
 * Includes slugs and relationship data for full context.
 */
type FormattableItem = {
    displayId: string;
    title: string;
    status: string;
    itemType?: string;
    priority?: number | null;
    dueDate?: string | null;
    targetPeriod?: string | null;
    description?: string | null;
    ownerName?: string | null;
    ownerId?: number | null;
    projectId?: number | null;
    projectSlug?: string | null;
    projectName?: string | null;
    projectOrg?: string | null;
    filePath?: string | null;
    sourcePath?: string | null;
    sourceMeetingId?: number | null;
    sourceMeetingTitle?: string | null;
    sourceMeetingPath?: string | null;
    subtaskCount?: number;
    subtasksComplete?: number;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
};
export declare function formatItemLine(item: FormattableItem): string;
export declare function formatItemList(items: FormattableItem[]): string;
export declare function formatItemDetail(item: FormattableItem): string;
export declare function formatError(message: string): string;
export {};
