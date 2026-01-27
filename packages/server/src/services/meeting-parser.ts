/**
 * Meeting Parser Service
 *
 * Parses meeting markdown files from the knowledge base and extracts actions
 * for sync with the task database.
 */

import fs from 'fs';
import path from 'path';
import { getKnowledgeBasePath, resolveKBPath, getRelativeKBPath } from './paths.js';

// Organisation folders
const ORGS = ['acme-corp', 'example-org', 'consulting', 'personal', 'other'];

// ============================================================================
// TYPES
// ============================================================================

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

interface Frontmatter {
  title?: string;
  date?: string | Date;
  attendees?: string[];
  project?: string;
  projects?: string[];
  status?: string;
  location?: string;
  tags?: string[];
}

// ============================================================================
// PARSING HELPERS
// ============================================================================

/**
 * Simple YAML frontmatter parser (avoids external dependency)
 */
function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  // Simple YAML parser for our use case
  const frontmatter: Frontmatter = {};
  const lines = yamlContent.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] = [];
  let inArray = false;

  for (const line of lines) {
    // Array item
    if (line.match(/^\s+-\s+(.+)$/)) {
      const itemMatch = line.match(/^\s+-\s+(.+)$/);
      if (itemMatch && inArray) {
        currentArray.push(itemMatch[1].trim());
      }
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      // Save previous array if we were building one
      if (inArray && currentKey) {
        (frontmatter as Record<string, unknown>)[currentKey] = currentArray;
      }

      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === '' || value === '[]') {
        // Start of array
        inArray = true;
        currentArray = [];
      } else {
        inArray = false;
        // Handle inline arrays like [a, b, c]
        if (value.startsWith('[') && value.endsWith(']')) {
          const items = value.slice(1, -1).split(',').map(s => s.trim());
          (frontmatter as Record<string, unknown>)[currentKey] = items;
        } else {
          // Simple value
          (frontmatter as Record<string, unknown>)[currentKey] = value;
        }
      }
    }
  }

  // Don't forget last array
  if (inArray && currentKey) {
    (frontmatter as Record<string, unknown>)[currentKey] = currentArray;
  }

  return { frontmatter, body };
}

/**
 * Extract sections from markdown by heading
 */
function extractSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.split('\n');
  let currentSection: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = h2Match[1];
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

/**
 * Parse action table from markdown
 * Supports 4-column (Owner|Action|Due|Status) or 5-column with Project
 */
export function parseActionTable(tableMarkdown: string, defaultProject?: string): ParsedAction[] {
  const allLines = tableMarkdown.split('\n');

  // Detect if table has Project column by checking header row
  const headerLine = allLines.find(row =>
    row.startsWith('|') && row.toLowerCase().includes('owner')
  );
  const hasProjectColumn = headerLine?.toLowerCase().includes('project') ?? false;

  const lines = allLines.filter(row =>
    row.startsWith('|') && !row.includes('---') && !row.toLowerCase().includes('owner')
  );

  return lines.map(row => {
    const cells = row.split('|').map(c => c.trim());
    // Skip first and last empty elements from leading/trailing |
    const owner = cells[1] || '';
    const action = cells[2] || '';
    const due = cells[3] || undefined;
    const status = cells[4] || 'Pending';
    const project = hasProjectColumn && cells[5] ? cells[5] : defaultProject;

    return {
      owner,
      action,
      due: due || undefined,
      status,
      project: project || undefined,
    };
  }).filter(a => a.owner && a.action);
}

/**
 * Parse due date string to ISO format
 * Handles formats like "14 Jan", "14 January 2026", "2026-01-14"
 */
export function parseDueDate(dueStr: string | undefined): string | null {
  if (!dueStr || dueStr.trim() === '') return null;

  const trimmed = dueStr.trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Try to parse various formats
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  // "14 Jan" or "14 January" or "14 Jan 2026"
  const dayMonthMatch = trimmed.match(/^(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?$/i);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthStr = dayMonthMatch[2].toLowerCase();
    const month = months[monthStr];
    const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : new Date().getFullYear();

    if (month !== undefined) {
      const date = new Date(year, month, day);
      return date.toISOString().slice(0, 10);
    }
  }

  // "Jan 14" or "January 14, 2026"
  const monthDayMatch = trimmed.match(/^(\w+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i);
  if (monthDayMatch) {
    const monthStr = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const month = months[monthStr];
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : new Date().getFullYear();

    if (month !== undefined) {
      const date = new Date(year, month, day);
      return date.toISOString().slice(0, 10);
    }
  }

  return null;
}

// ============================================================================
// MEETING PARSING
// ============================================================================

/**
 * Parse a meeting markdown file
 */
export function parseMeetingFile(filePath: string): ParsedMeeting | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // Get relative path from KB_ROOT
    const relativePath = getRelativeKBPath(filePath);

    // Handle date - could be string or Date object
    let dateStr = '';
    if (frontmatter.date) {
      if (frontmatter.date instanceof Date) {
        dateStr = frontmatter.date.toISOString().slice(0, 10);
      } else {
        dateStr = String(frontmatter.date);
      }
    }

    // Normalize project/projects
    let projects: string[] = [];
    let primaryProject: string | undefined;

    if (frontmatter.projects && Array.isArray(frontmatter.projects) && frontmatter.projects.length > 0) {
      projects = frontmatter.projects;
      primaryProject = frontmatter.projects[0];
    } else if (frontmatter.project) {
      primaryProject = frontmatter.project;
      projects = [frontmatter.project];
    }

    // Extract sections and parse actions
    const sections = extractSections(body);
    const actionsSection = sections['Actions'];
    const actions = actionsSection ? parseActionTable(actionsSection, primaryProject) : [];

    return {
      path: relativePath,
      title: frontmatter.title || path.basename(filePath, '.md'),
      date: dateStr,
      attendees: frontmatter.attendees || [],
      projects,
      primaryProject,
      status: frontmatter.status || 'completed',
      actions,
    };
  } catch (error) {
    console.error(`Error parsing meeting file ${filePath}:`, error);
    return null;
  }
}

/**
 * Get all meeting files from the knowledge base
 */
export function getAllMeetingFiles(): string[] {
  const files: string[] = [];

  for (const org of ORGS) {
    const meetingsDir = resolveKBPath(path.join(org, 'meetings'));
    if (!fs.existsSync(meetingsDir)) continue;

    try {
      const years = fs.readdirSync(meetingsDir).filter(f => /^\d{4}$/.test(f));

      for (const year of years) {
        const yearDir = path.join(meetingsDir, year);
        const months = fs.readdirSync(yearDir).filter(f => /^\d{2}$/.test(f));

        for (const month of months) {
          const monthDir = path.join(yearDir, month);
          const meetingFiles = fs.readdirSync(monthDir).filter(f => f.endsWith('.md'));

          for (const file of meetingFiles) {
            files.push(path.join(monthDir, file));
          }
        }
      }
    } catch {
      // Directory might not exist or be readable
      continue;
    }
  }

  return files;
}

/**
 * Parse all meetings and return their data
 */
export function parseAllMeetings(): ParsedMeeting[] {
  const files = getAllMeetingFiles();
  const meetings: ParsedMeeting[] = [];

  for (const file of files) {
    const meeting = parseMeetingFile(file);
    if (meeting) {
      meetings.push(meeting);
    }
  }

  return meetings;
}

/**
 * Get meeting file by path (relative to KB_ROOT)
 */
export function getMeetingByPath(relativePath: string): ParsedMeeting | null {
  const fullPath = resolveKBPath(relativePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return parseMeetingFile(fullPath);
}
