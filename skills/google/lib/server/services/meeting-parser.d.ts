/**
 * Meeting Parser Service
 *
 * Parses meeting markdown files from the knowledge base and extracts actions
 * for sync with the task database.
 */
export interface ParsedAction {
    owner: string;
    action: string;
    due?: string;
    status: string;
    project?: string;
}
export interface ParsedMeeting {
    path: string;
    title: string;
    date: string;
    attendees: string[];
    projects: string[];
    primaryProject?: string;
    status: string;
    actions: ParsedAction[];
}
/**
 * Parse action table from markdown
 * Supports 4-column (Owner|Action|Due|Status) or 5-column with Project
 */
export declare function parseActionTable(tableMarkdown: string, defaultProject?: string): ParsedAction[];
/**
 * Parse due date string to ISO format
 * Handles formats like "14 Jan", "14 January 2026", "2026-01-14"
 */
export declare function parseDueDate(dueStr: string | undefined): string | null;
/**
 * Parse a meeting markdown file
 */
export declare function parseMeetingFile(filePath: string): ParsedMeeting | null;
/**
 * Get all meeting files from the knowledge base
 */
export declare function getAllMeetingFiles(): string[];
/**
 * Parse all meetings and return their data
 */
export declare function parseAllMeetings(): ParsedMeeting[];
/**
 * Get meeting file by path (relative to KB_ROOT)
 */
export declare function getMeetingByPath(relativePath: string): ParsedMeeting | null;
