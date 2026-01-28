/**
 * Output Formatting
 *
 * Concise, tabular output optimized for AI parsing.
 * Includes slugs and relationship data for full context.
 */

// Minimal type for formatting - allows any object that has at least these fields.
// This is more permissive than ItemWithRelations to handle tRPC type inference mismatches.
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
  checkinBy?: string | null;
  checkinId?: number | null;
  [key: string]: unknown; // Allow extra properties from tRPC
};

// Column widths
const ID_WIDTH = 8;
const STATUS_WIDTH = 10;
const PRIORITY_WIDTH = 4;
const OWNER_WIDTH = 10;
const TITLE_WIDTH = 40;
const PROJECT_WIDTH = 20;

// Pad or truncate string to width
function pad(str: string, width: number, alignRight = false): string {
  if (str.length > width) {
    return str.slice(0, width - 1) + '…';
  }
  return alignRight ? str.padStart(width) : str.padEnd(width);
}

// Format status with abbreviation
function formatStatus(status: string): string {
  const abbrevs: Record<string, string> = {
    pending: 'pending',
    in_progress: 'in_prog',
    complete: 'complete',
    blocked: 'blocked',
    cancelled: 'canceld',
    deferred: 'deferred',
    active: 'active',
    paused: 'paused',
  };
  return abbrevs[status] || status;
}

// Format priority
function formatPriority(priority: number | null | undefined): string {
  if (!priority) return '  ';
  return `p${priority}`;
}

// Format due date
function formatDue(dueDate: string | null | undefined): string {
  if (!dueDate) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `OVERDUE:${Math.abs(diffDays)}d`;
  } else if (diffDays === 0) {
    return 'due:today';
  } else if (diffDays === 1) {
    return 'due:tmrw';
  } else if (diffDays <= 7) {
    return `due:${diffDays}d`;
  } else {
    const month = due.toLocaleString('en-GB', { month: 'short' });
    const day = due.getDate();
    return `due:${day} ${month}`;
  }
}

// Format check-in date
function formatCheckin(checkinBy: string | null | undefined): string {
  if (!checkinBy) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkin = new Date(checkinBy);
  checkin.setHours(0, 0, 0, 0);

  const diffDays = Math.round((checkin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `CHECKIN:${Math.abs(diffDays)}d ago`;
  } else if (diffDays === 0) {
    return 'checkin:today';
  } else if (diffDays === 1) {
    return 'checkin:tmrw';
  } else if (diffDays <= 7) {
    return `checkin:${diffDays}d`;
  } else {
    const month = checkin.toLocaleString('en-GB', { month: 'short' });
    const day = checkin.getDate();
    return `checkin:${day} ${month}`;
  }
}

// Format project path (org/slug) for context
function formatProjectPath(item: FormattableItem): string {
  if (!item.projectSlug) return '';
  if (item.projectOrg) {
    return `${item.projectOrg}/${item.projectSlug}`;
  }
  return item.projectSlug;
}

// Format a single item as a line (includes project context)
export function formatItemLine(item: FormattableItem): string {
  const id = pad(item.displayId, ID_WIDTH);
  const status = pad(formatStatus(item.status), STATUS_WIDTH);
  const priority = pad(formatPriority(item.priority), PRIORITY_WIDTH);
  const owner = pad(item.ownerName || '', OWNER_WIDTH);
  const title = pad(item.title, TITLE_WIDTH);
  const project = pad(formatProjectPath(item), PROJECT_WIDTH);
  const due = formatDue(item.dueDate);
  const checkin = formatCheckin(item.checkinBy);

  return `${id}  ${status}  ${priority}  ${owner}  ${title}  ${project}  ${due}${checkin ? `  ${checkin}` : ''}`;
}

// Format a list of items
export function formatItemList(items: FormattableItem[]): string {
  if (items.length === 0) {
    return 'No items found.';
  }

  const lines = items.map(formatItemLine);

  // Add separator
  const separator = '─'.repeat(80);

  // Count stats
  const overdue = items.filter(i => {
    if (!i.dueDate) return false;
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const highPriority = items.filter(i => i.priority && i.priority <= 2).length;

  const summary = `${items.length} items | ${overdue} overdue | ${highPriority} high priority`;

  return [...lines, separator, summary].join('\n');
}

// Format item detail with full relationship context
export function formatItemDetail(item: FormattableItem): string {
  const lines: string[] = [
    `${item.displayId}: ${item.title}`,
    '',
    `Type:     ${item.itemType}`,
    `Status:   ${item.status}`,
    `Priority: ${item.priority ? `P${item.priority}` : '-'}`,
  ];

  // Owner with ID for reference
  if (item.ownerName) {
    lines.push(`Owner:    ${item.ownerName}${item.ownerId ? ` (id:${item.ownerId})` : ''}`);
  } else {
    lines.push(`Owner:    -`);
  }

  // Project with full path (org/slug)
  if (item.projectSlug) {
    const projectPath = item.projectOrg ? `${item.projectOrg}/${item.projectSlug}` : item.projectSlug;
    lines.push(`Project:  ${item.projectName || item.projectSlug} (${projectPath})${item.projectId ? ` [id:${item.projectId}]` : ''}`);
  } else {
    lines.push(`Project:  -`);
  }

  // Dates
  if (item.dueDate) {
    lines.push(`Due:      ${item.dueDate}`);
  }
  if (item.targetPeriod) {
    lines.push(`Target:   ${item.targetPeriod}`);
  }

  // Check-in
  if (item.checkinBy) {
    lines.push(`Check-in: ${item.checkinBy} (${formatCheckin(item.checkinBy)})`);
  }

  // Relationships
  if (item.parentId) {
    lines.push(`Parent:   T-${item.parentId}`);
  }
  // Display blockers from ItemLink system
  const blockers = (item as typeof item & { blockers?: Array<{ id: number; displayId: string; title: string }> }).blockers ?? [];
  if (blockers.length > 0) {
    const blockerInfo = blockers.map(b => `${b.displayId} (${b.title.slice(0, 30)})`).join(', ');
    lines.push(`Blocked by: ${blockerInfo}`);
  }

  // Source meeting
  if (item.sourceMeetingId) {
    lines.push(`Source meeting: ${item.sourceMeetingTitle || `id:${item.sourceMeetingId}`}${item.sourceMeetingPath ? ` [${item.sourceMeetingPath}]` : ''}`);
  }

  // Subtasks
  if (item.subtaskCount && item.subtaskCount > 0) {
    lines.push(`Subtasks: ${item.subtasksComplete}/${item.subtaskCount} complete`);
  }

  // Description
  if (item.description) {
    lines.push('', 'Description:', item.description);
  }

  // File paths
  if (item.sourcePath) {
    lines.push('', `Source file: ${item.sourcePath}`);
  }
  if (item.filePath && item.filePath !== item.sourcePath) {
    lines.push(`File path: ${item.filePath}`);
  }

  return lines.join('\n');
}

// Format error
export function formatError(message: string): string {
  return `Error: ${message}`;
}
