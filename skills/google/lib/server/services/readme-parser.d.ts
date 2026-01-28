export interface ExtractedTask {
    id: string;
    title: string;
    description?: string;
    status: string;
    source_type: 'status_emoji' | 'checkbox' | 'sub_project' | 'next_steps';
    source_path: string;
    source_line: number;
    project_slug?: string;
    org?: string;
    section?: string;
    phase?: string;
    is_sub_project?: boolean;
    linked_project?: string;
}
export interface ParsedReadme {
    path: string;
    project_slug: string;
    org: string;
    title?: string;
    tasks: ExtractedTask[];
    errors: string[];
}
export interface ExtractedTaskSummary {
    total: number;
    by_status: Record<string, number>;
    by_org: Record<string, number>;
    by_type: Record<string, number>;
}
/**
 * Find all project README files in the knowledge base
 */
export declare function findProjectReadmes(basePath: string): Promise<string[]>;
/**
 * Parse a single README file for tasks
 */
export declare function parseReadme(filePath: string, basePath: string): Promise<ParsedReadme>;
/**
 * Parse all README files and return extracted tasks
 */
export declare function parseAllReadmes(basePath: string): Promise<{
    readmes: ParsedReadme[];
    summary: ExtractedTaskSummary;
    allTasks: ExtractedTask[];
}>;
/**
 * Filter tasks for import (exclude completed, sub-projects that are just references)
 */
export declare function filterTasksForImport(tasks: ExtractedTask[]): ExtractedTask[];
