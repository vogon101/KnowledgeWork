import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getOrganizationsServer } from './organizations-server';

// Path to the knowledge base - from environment variable or default
const KB_ROOT = process.env.KNOWLEDGE_BASE_PATH || path.join(process.cwd(), '../../content');

// Get organisation slugs from database (cached for performance)
function getOrgSlugs(): string[] {
  const orgs = getOrganizationsServer();
  if (orgs.length > 0) {
    return orgs.map(org => org.slug);
  }
  // Fallback: scan directories if DB not available
  if (!fs.existsSync(KB_ROOT)) return [];
  return fs.readdirSync(KB_ROOT)
    .filter(f => {
      const fullPath = path.join(KB_ROOT, f);
      return fs.statSync(fullPath).isDirectory() &&
             !f.startsWith('.') &&
             f !== 'diary' &&
             f !== '.obsidian' &&
             f !== '.claude';
    });
}

// Document types
export type DocumentType = 'diary' | 'meeting' | 'project-readme' | 'next-steps' | 'org-readme' | 'document';

export interface DiaryEntry {
  type: 'diary';
  path: string;
  date: Date;
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;
  frontmatter: Record<string, unknown>;
  content: string;
  sections: {
    summary?: string;
    workLog?: string;
    tasksForToday?: string;
    tasksCompleted?: string;
    meetings?: string;
    reflections?: string;
  };
}

export interface MeetingNote {
  type: 'meeting';
  path: string;
  org: string;
  slug: string;
  frontmatter: {
    title: string;
    date: string;
    attendees: string[];
    location?: string;
    tags?: string[];
    project?: string;           // Single project (backward compat)
    projects?: string[];        // Multiple projects
    status: 'completed' | 'ongoing' | 'cancelled';
  };
  content: string;
  sections: {
    summary?: string;
    discussion?: string;
    decisions?: string;
    actions?: string;
    related?: string;
  };
  actions: Action[];
}

export interface Action {
  owner: string;
  action: string;
  due?: string;
  status: string;
  project?: string;             // Optional per-action project
}

export interface ProjectTodo {
  done: boolean;
  text: string;
}

export interface ProjectStatusItem {
  status: 'done' | 'in-progress' | 'blocked' | 'pending';
  text: string;
}

export interface WorkstreamRef {
  name: string;
  status?: string;
  description?: string;
  path: string; // wikilink path
  slug: string;
}

// Backwards compatibility alias
export type SubProjectRef = WorkstreamRef;

export interface Project {
  type: 'project';
  path: string;
  org: string;
  slug: string;
  name: string;
  frontmatter: {
    title?: string;
    status?: string;
    priority?: number;
    tags?: string[];
    parent?: string; // For hierarchical grouping
    type?: string; // 'workstream' or 'sub-project' (deprecated)
  };
  content: string;
  hasNextSteps: boolean;
  nextStepsPath?: string;
  isFile: boolean; // true if standalone file, false if folder with README
  isWorkstream: boolean; // true if this is a workstream within a project
  isSubProject: boolean; // deprecated alias for isWorkstream
  parentSlug?: string; // slug of parent project (if workstream)
  workstreams: WorkstreamRef[]; // parsed from ## Workstreams or ## Sub-Projects table
  subProjects: SubProjectRef[]; // deprecated alias for workstreams
  // Extracted structured data
  extracted: {
    currentPhase?: string;
    lastUpdated?: string;
    statusItems: ProjectStatusItem[];
    todos: ProjectTodo[];
    overview?: string;
    externalLinks: ExternalLink[];
    aiStatusSummary?: string;
    aiStatusDate?: string;
  };
}

export interface OrgReadme {
  type: 'org-readme';
  path: string;
  org: string;
  content: string;
  projects: { name: string; status: string; description: string; path: string }[];
}

// Detect document type from path
export function detectDocumentType(filePath: string): DocumentType {
  const relativePath = path.relative(KB_ROOT, filePath);

  if (relativePath.match(/^diary\/\d{4}\/\d{2}\/\d{2}-\w{3}\.md$/)) {
    return 'diary';
  }
  if (relativePath.includes('/meetings/') && relativePath.match(/\d{4}-\d{2}-\d{2}/)) {
    return 'meeting';
  }
  if (relativePath.endsWith('/next-steps.md')) {
    return 'next-steps';
  }
  if (relativePath.endsWith('/README.md')) {
    const parts = relativePath.split('/');
    // Org READMEs are at org/README.md (2 parts)
    return parts.length === 2 ? 'org-readme' : 'project-readme';
  }
  return 'document';
}

// Extract sections from markdown by heading
export function extractSections(content: string): Record<string, string> {
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

// Parse action table from markdown
// Supports 4-column (Owner|Action|Due|Status) or 5-column (Owner|Action|Due|Status|Project) format
export function parseActionTable(tableMarkdown: string, defaultProject?: string): Action[] {
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
    // Split by | but keep empty cells (don't filter(Boolean))
    // Row format: | Owner | Action | Due | Status | [Project] |
    // Split gives: ['', 'Owner', 'Action', 'Due', 'Status', '[Project]', '']
    const cells = row.split('|').map(c => c.trim());
    // Skip first and last empty elements from leading/trailing |
    const owner = cells[1] || '';
    const action = cells[2] || '';
    const due = cells[3] || undefined;
    const status = cells[4] || 'Pending';
    // Project column (5th) if present, otherwise use default
    const project = hasProjectColumn && cells[5] ? cells[5] : defaultProject;

    return {
      owner,
      action,
      due: due || undefined, // Convert empty string to undefined
      status,
      project: project || undefined,
    };
  }).filter(a => a.owner && a.action);
}

// Parse wikilinks
export function parseWikilinks(content: string): { path: string; display: string; raw: string }[] {
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  return [...content.matchAll(wikilinkRegex)].map(match => ({
    path: match[1],
    display: match[2] || match[1].split('/').pop() || match[1],
    raw: match[0],
  }));
}

// Parse workstream/sub-project table from markdown content
// Expects format: | [[path|Name]] | Status | Description |
export function parseWorkstreamTable(content: string): WorkstreamRef[] {
  const workstreams: WorkstreamRef[] = [];

  // Find the Workstreams or Sub-Projects section (workstreams takes precedence)
  const sections = extractSections(content);
  const workstreamSection = sections['Workstreams'] || sections['Sub-Projects'] || sections['Subprojects'];

  if (!workstreamSection) return workstreams;

  // Parse table rows containing wikilinks
  // Skip header rows (containing 'workstream' or 'sub-project')
  const lines = workstreamSection.split('\n').filter(row =>
    row.startsWith('|') && !row.includes('---') &&
    !row.toLowerCase().includes('workstream') && !row.toLowerCase().includes('sub-project')
  );

  for (const row of lines) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 1) continue;

    // First cell should contain wikilink
    const wikilinkMatch = cells[0].match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (!wikilinkMatch) continue;

    const linkPath = wikilinkMatch[1];
    const displayName = wikilinkMatch[2] || linkPath.split('/').pop() || linkPath;

    // Extract slug from path (last segment)
    const slug = linkPath.split('/').pop()?.replace(/\.md$/, '') || '';

    workstreams.push({
      name: displayName,
      status: cells[1] || undefined,
      description: cells[2] || undefined,
      path: linkPath,
      slug,
    });
  }

  return workstreams;
}

// Backwards compatibility alias
export const parseSubProjectTable = parseWorkstreamTable;

// External link extracted from ## Links table
export interface ExternalLink {
  title: string;
  url: string;
  icon?: 'github' | 'globe' | 'docs' | 'figma' | 'notion' | 'airtable' | 'external';
}

// Extract structured data from project content
export function extractProjectData(content: string): {
  currentPhase?: string;
  lastUpdated?: string;
  statusItems: ProjectStatusItem[];
  todos: ProjectTodo[];
  overview?: string;
  externalLinks: ExternalLink[];
  aiStatusSummary?: string;
  aiStatusDate?: string;
} {
  const statusItems: ProjectStatusItem[] = [];
  const todos: ProjectTodo[] = [];
  const externalLinks: ExternalLink[] = [];

  // Extract "Last updated:" date
  const lastUpdatedMatch = content.match(/\*\*Last updated:\*\*\s*(.+)/i);
  const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : undefined;

  // Extract current phase from headings like "### Phase 1: Build & Design (Now)"
  const phaseMatch = content.match(/###?\s*(Phase\s*\d+[^(\n]*)\s*\(([^)]*[Nn]ow[^)]*)\)/);
  const currentPhase = phaseMatch ? `${phaseMatch[1].trim()} (${phaseMatch[2].trim()})` : undefined;

  // Extract status items with emoji indicators
  // ✅ = done, 🟢 = in-progress, 🟡 = pending/needs attention, 🔴 = blocked
  const statusLineRegex = /^[-*]\s*(✅|🟢|🟡|🔴|⏳)\s*(.+)$/gm;
  let match;
  while ((match = statusLineRegex.exec(content)) !== null) {
    const emoji = match[1];
    // Clean up the text - remove bold markers and normalize
    let text = match[2].trim()
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\s+/g, ' '); // Normalize whitespace

    let status: ProjectStatusItem['status'];
    switch (emoji) {
      case '✅': status = 'done'; break;
      case '🟢': status = 'in-progress'; break;
      case '🟡':
      case '⏳': status = 'pending'; break;
      case '🔴': status = 'blocked'; break;
      default: status = 'pending';
    }
    statusItems.push({ status, text });
  }

  // Extract todos from markdown checklists
  const todoRegex = /^[-*]\s*\[([ xX])\]\s*(.+)$/gm;
  while ((match = todoRegex.exec(content)) !== null) {
    const done = match[1].toLowerCase() === 'x';
    const text = match[2].trim();
    // Skip if it's a blocker marker
    if (!text.includes('BLOCKER')) {
      todos.push({ done, text });
    }
  }

  // For overview extraction, strip HTML comments (including AI_STATUS blocks)
  // This prevents raw comment markers from appearing in the overview
  const contentWithoutComments = content.replace(/<!--[\s\S]*?-->/g, '');

  // Extract overview from first paragraph after first heading
  const overviewMatch = contentWithoutComments.match(/^#[^#].*\n+(?:(?!\n#|\n\*\*|\n-|\n\|)[^\n]+\n?)*/m);
  let overview: string | undefined;
  if (overviewMatch) {
    // Get text after the heading, skip empty lines and frontmatter-like content
    const afterHeading = overviewMatch[0].replace(/^#[^#].*\n+/, '').trim();
    const firstPara = afterHeading.split(/\n\n/)[0];
    if (firstPara && firstPara.length > 20 && !firstPara.startsWith('**') && !firstPara.startsWith('-')) {
      overview = firstPara.slice(0, 200) + (firstPara.length > 200 ? '...' : '');
    }
  }

  // Extract external links from ## Links table
  const linksSectionMatch = content.match(/##\s*Links\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (linksSectionMatch) {
    const linksContent = linksSectionMatch[1];
    // Parse markdown table rows: | Title | [text](url) |
    const tableRowRegex = /\|\s*([^|]+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|/g;
    let linkMatch;
    while ((linkMatch = tableRowRegex.exec(linksContent)) !== null) {
      const title = linkMatch[2].trim(); // Use link text as title
      const url = linkMatch[3].trim();

      // Skip header row
      if (title.toLowerCase() === 'link' || url.includes('---')) continue;

      // Infer icon from URL
      let icon: ExternalLink['icon'] = 'external';
      if (url.includes('github.com')) icon = 'github';
      else if (url.includes('figma.com')) icon = 'figma';
      else if (url.includes('notion.so') || url.includes('notion.site')) icon = 'notion';
      else if (url.includes('airtable.com')) icon = 'airtable';
      else if (url.includes('docs.') || url.includes('/docs')) icon = 'docs';
      else icon = 'globe';

      externalLinks.push({ title, url, icon });
    }
  }

  // Extract AI status summary from HTML comments
  let aiStatusSummary: string | undefined;
  let aiStatusDate: string | undefined;
  const aiStatusMatch = content.match(/<!--\s*AI_STATUS_START\s*-->([\s\S]*?)<!--\s*AI_STATUS_END\s*-->/);
  if (aiStatusMatch) {
    aiStatusSummary = aiStatusMatch[1].trim();
    // Try to extract date from format like "**Status Summary** (15 January 2026)"
    const dateMatch = aiStatusSummary.match(/\((\d{1,2}\s+\w+\s+\d{4})\)/);
    if (dateMatch) {
      aiStatusDate = dateMatch[1];
    }
  }

  return { currentPhase, lastUpdated, statusItems, todos, overview, externalLinks, aiStatusSummary, aiStatusDate };
}

// Get all diary entries
export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  const diaryDir = path.join(KB_ROOT, 'diary');
  const entries: DiaryEntry[] = [];

  if (!fs.existsSync(diaryDir)) return entries;

  const years = fs.readdirSync(diaryDir).filter(f => /^\d{4}$/.test(f));

  for (const year of years) {
    const yearDir = path.join(diaryDir, year);
    const months = fs.readdirSync(yearDir).filter(f => /^\d{2}$/.test(f));

    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      const files = fs.readdirSync(monthDir).filter(f => /^\d{2}-\w{3}\.md$/.test(f));

      for (const file of files) {
        const filePath = path.join(monthDir, file);
        const entry = await parseDiaryEntry(filePath);
        if (entry) entries.push(entry);
      }
    }
  }

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Parse a single diary entry
export async function parseDiaryEntry(filePath: string): Promise<DiaryEntry | null> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // Extract date from filename: DD-DOW.md
    const fileName = path.basename(filePath, '.md');
    const [dayStr, dow] = fileName.split('-');
    const monthDir = path.basename(path.dirname(filePath));
    const yearDir = path.basename(path.dirname(path.dirname(filePath)));

    const year = parseInt(yearDir, 10);
    const month = parseInt(monthDir, 10);
    const day = parseInt(dayStr, 10);
    const date = new Date(year, month - 1, day);

    const sections = extractSections(content);

    return {
      type: 'diary',
      path: path.relative(KB_ROOT, filePath),
      date,
      year,
      month,
      day,
      dayOfWeek: dow,
      frontmatter,
      content,
      sections: {
        summary: sections['Summary'],
        workLog: sections['Work Log'],
        tasksForToday: sections['Tasks for Today'],
        tasksCompleted: sections['Tasks Completed'],
        meetings: sections['Meetings'],
        reflections: sections['Reflections'],
      },
    };
  } catch {
    return null;
  }
}

// Get diary entry for a specific date
export async function getDiaryEntry(year: number, month: number, day: number): Promise<DiaryEntry | null> {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date(year, month - 1, day);
  const dow = daysOfWeek[date.getDay()];

  const filePath = path.join(
    KB_ROOT,
    'diary',
    year.toString(),
    month.toString().padStart(2, '0'),
    `${day.toString().padStart(2, '0')}-${dow}.md`
  );

  if (!fs.existsSync(filePath)) return null;
  return parseDiaryEntry(filePath);
}

// Get all meetings
export async function getMeetings(): Promise<MeetingNote[]> {
  const meetings: MeetingNote[] = [];
  const orgSlugs = getOrgSlugs();

  for (const org of orgSlugs) {
    const meetingsDir = path.join(KB_ROOT, org, 'meetings');
    if (!fs.existsSync(meetingsDir)) continue;

    const years = fs.readdirSync(meetingsDir).filter(f => /^\d{4}$/.test(f));

    for (const year of years) {
      const yearDir = path.join(meetingsDir, year);
      const months = fs.readdirSync(yearDir).filter(f => /^\d{2}$/.test(f));

      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.md'));

        for (const file of files) {
          const filePath = path.join(monthDir, file);
          const meeting = await parseMeetingNote(filePath, org);
          if (meeting) meetings.push(meeting);
        }
      }
    }
  }

  return meetings.sort((a, b) =>
    new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
  );
}

// Parse a single meeting note
export async function parseMeetingNote(filePath: string, org: string): Promise<MeetingNote | null> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    const fileName = path.basename(filePath, '.md');
    const slug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '');

    // Normalize project/projects: support both single project and array
    // Priority: projects array > single project
    let projects: string[] | undefined;
    let primaryProject: string | undefined;

    if (frontmatter.projects && Array.isArray(frontmatter.projects) && frontmatter.projects.length > 0) {
      projects = frontmatter.projects;
      primaryProject = frontmatter.projects[0];
    } else if (frontmatter.project) {
      primaryProject = frontmatter.project;
      projects = [frontmatter.project];
    }

    const sections = extractSections(content);
    // Pass primary project as default for actions without explicit project
    const actions = sections['Actions'] ? parseActionTable(sections['Actions'], primaryProject) : [];

    // Handle date - gray-matter may parse it as Date object
    let dateStr = '';
    if (frontmatter.date) {
      if (frontmatter.date instanceof Date) {
        dateStr = frontmatter.date.toISOString().slice(0, 10);
      } else {
        dateStr = String(frontmatter.date);
      }
    }

    return {
      type: 'meeting',
      path: path.relative(KB_ROOT, filePath),
      org,
      slug,
      frontmatter: {
        title: frontmatter.title || slug,
        date: dateStr,
        attendees: frontmatter.attendees || [],
        location: frontmatter.location,
        tags: frontmatter.tags,
        project: primaryProject,
        projects,
        status: frontmatter.status || 'completed',
      },
      content,
      sections: {
        summary: sections['Summary'],
        discussion: sections['Discussion'],
        decisions: sections['Decisions'],
        actions: sections['Actions'],
        related: sections['Related'],
      },
      actions,
    };
  } catch {
    return null;
  }
}

// Get all projects
export async function getProjects(): Promise<Project[]> {
  const projects: Project[] = [];
  const orgSlugs = getOrgSlugs();

  for (const org of orgSlugs) {
    const projectsDir = path.join(KB_ROOT, org, 'projects');
    if (!fs.existsSync(projectsDir)) continue;

    const entries = fs.readdirSync(projectsDir);

    for (const entry of entries) {
      const fullPath = path.join(projectsDir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Folder project - look for README.md
        const readmePath = path.join(fullPath, 'README.md');
        if (fs.existsSync(readmePath)) {
          const project = await parseProject(readmePath, org, entry, false, false);
          if (project) {
            projects.push(project);

            // Scan for workstreams within this folder
            // Workstreams are subdirectories with README.md containing `type: workstream` frontmatter
            // Also support legacy file-based workstreams (.md files with type: workstream)
            const folderEntries = fs.readdirSync(fullPath);
            for (const subEntry of folderEntries) {
              // Skip README.md, next-steps.md, context folder, and hidden files
              if (subEntry === 'README.md' || subEntry === 'next-steps.md') continue;
              if (subEntry === 'context' || subEntry.startsWith('.')) continue;

              const subPath = path.join(fullPath, subEntry);
              const subStat = fs.statSync(subPath);

              // Check for folder-based workstream (preferred)
              if (subStat.isDirectory()) {
                const workstreamReadme = path.join(subPath, 'README.md');
                if (!fs.existsSync(workstreamReadme)) continue;

                try {
                  const subContent = fs.readFileSync(workstreamReadme, 'utf-8');
                  const { data: subFrontmatter } = matter(subContent);
                  const itemType = subFrontmatter.type;
                  if (itemType !== 'workstream' && itemType !== 'sub-project') continue;
                } catch {
                  continue;
                }

                const workstream = await parseProject(workstreamReadme, org, subEntry, false, true, entry);
                if (workstream) projects.push(workstream);
                continue;
              }

              // Legacy: file-based workstream (.md file with type: workstream)
              if (!subEntry.endsWith('.md')) continue;
              if (subEntry.includes('research-prompt')) continue;
              if (!subStat.isFile()) continue;

              try {
                const subContent = fs.readFileSync(subPath, 'utf-8');
                const { data: subFrontmatter } = matter(subContent);
                const itemType = subFrontmatter.type;
                if (itemType !== 'workstream' && itemType !== 'sub-project') continue;
              } catch {
                continue;
              }

              const subSlug = subEntry.replace(/\.md$/, '');
              const workstream = await parseProject(subPath, org, subSlug, true, true, entry);
              if (workstream) projects.push(workstream);
            }
          }
        }
      } else if (entry.endsWith('.md') && !entry.includes('research-prompt')) {
        // Standalone file project (exclude research prompts)
        const slug = entry.replace(/\.md$/, '');
        const project = await parseProject(fullPath, org, slug, true, false);
        if (project) projects.push(project);
      }
    }
  }

  return projects.sort((a, b) => {
    // Sort by priority (lower is higher priority), then alphabetically
    // Sub-projects sort after their parent
    const aPriority = a.frontmatter.priority || 99;
    const bPriority = b.frontmatter.priority || 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });
}

// Parse a single project
export async function parseProject(
  filePath: string,
  org: string,
  slug: string,
  isFile: boolean,
  isSubProject: boolean = false,
  parentSlug?: string
): Promise<Project | null> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // Check for next-steps.md (for folder-based projects and workstreams)
    let hasNextSteps = false;
    let nextStepsRelPath: string | undefined;
    if (!isFile) {
      const nextStepsPath = path.join(path.dirname(filePath), 'next-steps.md');
      hasNextSteps = fs.existsSync(nextStepsPath);
      if (hasNextSteps) {
        nextStepsRelPath = path.relative(KB_ROOT, nextStepsPath);
      }
    }

    // Extract name from first heading or frontmatter
    const nameMatch = content.match(/^# (.+)$/m);
    const name = frontmatter.title || (nameMatch ? nameMatch[1] : slug.replace(/-/g, ' '));

    // Extract structured data from content
    const extracted = extractProjectData(content);

    // Parse workstream table (only for non-workstream items)
    const workstreams = isSubProject ? [] : parseWorkstreamTable(content);

    // Determine parent - either from function arg or frontmatter
    const effectiveParentSlug = parentSlug || frontmatter.parent;

    // Determine if this is a workstream (check both new and deprecated types)
    const itemType = frontmatter.type;
    const isWorkstream = isSubProject || itemType === 'workstream' || itemType === 'sub-project';

    return {
      type: 'project',
      path: path.relative(KB_ROOT, filePath),
      org,
      slug,
      name,
      frontmatter: {
        title: frontmatter.title,
        status: frontmatter.status,
        priority: frontmatter.priority,
        tags: frontmatter.tags,
        parent: frontmatter.parent,
        type: frontmatter.type,
      },
      content,
      hasNextSteps,
      nextStepsPath: nextStepsRelPath,
      isFile,
      isWorkstream,
      isSubProject: isWorkstream, // deprecated alias
      parentSlug: effectiveParentSlug,
      workstreams,
      subProjects: workstreams, // deprecated alias
      extracted,
    };
  } catch {
    return null;
  }
}

// Read a file by path
export async function readFile(relativePath: string): Promise<{ frontmatter: Record<string, unknown>; content: string } | null> {
  try {
    const fullPath = path.join(KB_ROOT, relativePath);
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    return { frontmatter, content };
  } catch {
    return null;
  }
}

// Get today's diary entry
export async function getTodaysDiary(): Promise<DiaryEntry | null> {
  const today = new Date();
  return getDiaryEntry(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

// Get recent diary entries
export async function getRecentDiaryEntries(limit: number = 7): Promise<DiaryEntry[]> {
  const entries = await getDiaryEntries();
  return entries.slice(0, limit);
}

// Get upcoming meetings (next N days)
export async function getUpcomingMeetings(days: number = 7): Promise<MeetingNote[]> {
  const meetings = await getMeetings();
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return meetings.filter(m => {
    const meetingDate = new Date(m.frontmatter.date);
    return meetingDate >= now && meetingDate <= future;
  });
}

// Get recent meetings (past N days)
export async function getRecentMeetings(days: number = 7): Promise<MeetingNote[]> {
  const meetings = await getMeetings();
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return meetings.filter(m => {
    const meetingDate = new Date(m.frontmatter.date);
    return meetingDate >= past && meetingDate <= now;
  });
}

// Project file entry types
export interface ProjectFileEntry {
  name: string;
  path: string; // relative to KB_ROOT
  type: 'file' | 'folder';
  isContext: boolean; // true if in context/ folder
  isWorkstream: boolean; // true if has type: workstream frontmatter
  isSubProject: boolean; // deprecated alias for isWorkstream
}

// Get files and folders in a project directory
export async function getProjectFiles(projectPath: string): Promise<ProjectFileEntry[]> {
  const entries: ProjectFileEntry[] = [];
  const projectDir = path.join(KB_ROOT, path.dirname(projectPath));

  if (!fs.existsSync(projectDir)) return entries;

  const items = fs.readdirSync(projectDir);

  for (const item of items) {
    // Skip hidden files, README.md, next-steps.md
    if (item.startsWith('.')) continue;
    if (item === 'README.md' || item === 'next-steps.md') continue;

    const itemPath = path.join(projectDir, item);
    const stat = fs.statSync(itemPath);
    const relativePath = path.relative(KB_ROOT, itemPath);
    const isContext = item === 'context';

    if (stat.isDirectory()) {
      // Check if this folder is a workstream (has README.md with type: workstream)
      let isWorkstream = false;
      const folderReadme = path.join(itemPath, 'README.md');
      if (fs.existsSync(folderReadme)) {
        try {
          const content = fs.readFileSync(folderReadme, 'utf-8');
          const { data: frontmatter } = matter(content);
          isWorkstream = frontmatter.type === 'workstream' || frontmatter.type === 'sub-project';
        } catch {
          // Ignore parse errors
        }
      }

      entries.push({
        name: item,
        path: relativePath,
        type: 'folder',
        isContext,
        isWorkstream,
        isSubProject: isWorkstream, // deprecated alias
      });
    } else if (item.endsWith('.md')) {
      // Check if it's a legacy file-based workstream (or deprecated sub-project)
      let isWorkstream = false;
      try {
        const content = fs.readFileSync(itemPath, 'utf-8');
        const { data: frontmatter } = matter(content);
        isWorkstream = frontmatter.type === 'workstream' || frontmatter.type === 'sub-project';
      } catch {
        // Ignore parse errors
      }

      entries.push({
        name: item.replace(/\.md$/, ''),
        path: relativePath,
        type: 'file',
        isContext: false,
        isWorkstream,
        isSubProject: isWorkstream, // deprecated alias
      });
    }
  }

  // Sort: folders first, then files, context folder last among folders
  return entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    if (a.type === 'folder') {
      if (a.isContext !== b.isContext) return a.isContext ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
}

// Get meetings for a specific project
// Checks both single project and projects array
export async function getMeetingsForProject(projectSlug: string): Promise<MeetingNote[]> {
  const meetings = await getMeetings();
  return meetings.filter(m =>
    m.frontmatter.project === projectSlug ||
    m.frontmatter.projects?.includes(projectSlug)
  );
}
