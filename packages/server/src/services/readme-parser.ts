import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import matter from 'gray-matter';

// Status emoji mappings
const STATUS_EMOJI_MAP: Record<string, string> = {
  '✅': 'completed',
  '🟢': 'active',
  '🟡': 'pending',     // on hold / waiting
  '🔴': 'blocked',
  '🔵': 'planning',
  '⏳': 'pending',     // waiting
  '❌': 'cancelled',
};

// Patterns for task extraction
const STATUS_LINE_PATTERN = /^[-*]\s*(✅|🟢|🟡|🔴|🔵|⏳|❌)\s*\*{0,2}([^*—]+)\*{0,2}\s*—?\s*(.*)$/;
const CHECKBOX_PATTERN = /^[-*]\s*\[([ xX])\]\s*(.+)$/;
const SUB_PROJECT_TABLE_PATTERN = /^\|\s*(✅|🟢|🟡|🔴|🔵|⏳|❌)\s*\|\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*\|\s*(.+)\s*\|$/;

export interface ExtractedTask {
  id: string;               // Generated ID for tracking
  title: string;
  description?: string;
  status: string;
  source_type: 'status_emoji' | 'checkbox' | 'sub_project' | 'next_steps';
  source_path: string;      // Relative path to README
  source_line: number;
  project_slug?: string;    // Extracted from path
  org?: string;             // Extracted from path
  section?: string;         // Which section it was found in
  phase?: string;           // If found in a phase section
  is_sub_project?: boolean; // If this is a sub-project reference
  linked_project?: string;  // For sub-projects, the linked project slug
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
export async function findProjectReadmes(basePath: string): Promise<string[]> {
  const readmes: string[] = [];

  async function scanDir(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (['node_modules', '.git', 'context', 'meetings', '.claude', 'knowledge-work-web'].includes(entry.name)) {
            continue;
          }
          await scanDir(fullPath);
        } else if (entry.name === 'README.md') {
          // Only include READMEs in projects directories
          const relativePath = relative(basePath, fullPath);
          if (relativePath.includes('/projects/')) {
            readmes.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Ignore permission errors etc
    }
  }

  await scanDir(basePath);
  return readmes;
}

/**
 * Parse a single README file for tasks
 */
export async function parseReadme(filePath: string, basePath: string): Promise<ParsedReadme> {
  const relativePath = relative(basePath, filePath);
  const pathParts = relativePath.split('/');

  // Extract org and project from path like "acme-corp/projects/inventory-system/README.md"
  const org = pathParts[0] || 'unknown';
  const projectIndex = pathParts.indexOf('projects');
  const project_slug = projectIndex >= 0 && pathParts[projectIndex + 1]
    ? pathParts[projectIndex + 1]
    : 'unknown';

  const result: ParsedReadme = {
    path: relativePath,
    project_slug,
    org,
    tasks: [],
    errors: [],
  };

  try {
    const content = await readFile(filePath, 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);

    result.title = frontmatter.title || project_slug;

    const lines = markdown.split('\n');
    let currentSection = '';
    let currentPhase = '';
    let taskCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1; // 1-indexed for display

      // Track current section
      if (line.startsWith('## ')) {
        currentSection = line.replace('## ', '').trim();
        currentPhase = '';
      } else if (line.startsWith('### ')) {
        const heading = line.replace('### ', '').trim();
        // Check if this is a phase heading
        if (/^Phase\s+\d+/i.test(heading)) {
          currentPhase = heading;
        }
      }

      // Try to match status emoji line
      const statusMatch = line.match(STATUS_LINE_PATTERN);
      if (statusMatch) {
        const [, emoji, title, description] = statusMatch;
        const status = STATUS_EMOJI_MAP[emoji] || 'pending';

        taskCounter++;
        result.tasks.push({
          id: `${project_slug}-readme-${taskCounter}`,
          title: title.trim(),
          description: description?.trim() || undefined,
          status,
          source_type: 'status_emoji',
          source_path: relativePath,
          source_line: lineNum,
          project_slug,
          org,
          section: currentSection || undefined,
          phase: currentPhase || undefined,
        });
        continue;
      }

      // Try to match checkbox
      const checkboxMatch = line.match(CHECKBOX_PATTERN);
      if (checkboxMatch) {
        const [, checked, title] = checkboxMatch;
        const isChecked = checked.toLowerCase() === 'x';

        taskCounter++;
        result.tasks.push({
          id: `${project_slug}-readme-${taskCounter}`,
          title: title.trim(),
          status: isChecked ? 'completed' : 'pending',
          source_type: 'checkbox',
          source_path: relativePath,
          source_line: lineNum,
          project_slug,
          org,
          section: currentSection || undefined,
          phase: currentPhase || undefined,
        });
        continue;
      }

      // Try to match sub-project table row
      const tableMatch = line.match(SUB_PROJECT_TABLE_PATTERN);
      if (tableMatch) {
        const [, emoji, linkedPath, displayName, description] = tableMatch;
        const status = STATUS_EMOJI_MAP[emoji] || 'pending';

        // Extract slug from wikilink path
        const linkedSlug = linkedPath.split('/').pop() || linkedPath;

        taskCounter++;
        result.tasks.push({
          id: `${project_slug}-readme-${taskCounter}`,
          title: displayName?.trim() || linkedSlug,
          description: description?.trim() || undefined,
          status,
          source_type: 'sub_project',
          source_path: relativePath,
          source_line: lineNum,
          project_slug,
          org,
          section: currentSection || undefined,
          is_sub_project: true,
          linked_project: linkedSlug,
        });
        continue;
      }
    }

  } catch (err) {
    result.errors.push(`Failed to parse ${relativePath}: ${err}`);
  }

  return result;
}

/**
 * Parse all README files and return extracted tasks
 */
export async function parseAllReadmes(basePath: string): Promise<{
  readmes: ParsedReadme[];
  summary: ExtractedTaskSummary;
  allTasks: ExtractedTask[];
}> {
  const readmePaths = await findProjectReadmes(basePath);
  const readmes: ParsedReadme[] = [];
  const allTasks: ExtractedTask[] = [];

  for (const path of readmePaths) {
    const parsed = await parseReadme(path, basePath);
    readmes.push(parsed);
    allTasks.push(...parsed.tasks);
  }

  // Calculate summary
  const summary: ExtractedTaskSummary = {
    total: allTasks.length,
    by_status: {},
    by_org: {},
    by_type: {},
  };

  for (const task of allTasks) {
    summary.by_status[task.status] = (summary.by_status[task.status] || 0) + 1;
    summary.by_org[task.org || 'unknown'] = (summary.by_org[task.org || 'unknown'] || 0) + 1;
    summary.by_type[task.source_type] = (summary.by_type[task.source_type] || 0) + 1;
  }

  return { readmes, summary, allTasks };
}

/**
 * Filter tasks for import (exclude completed, sub-projects that are just references)
 */
export function filterTasksForImport(tasks: ExtractedTask[]): ExtractedTask[] {
  return tasks.filter(task => {
    // Skip completed tasks
    if (task.status === 'completed') return false;

    // Skip sub-project references (these are project links, not tasks)
    if (task.is_sub_project) return false;

    return true;
  });
}
