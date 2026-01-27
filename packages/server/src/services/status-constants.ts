/**
 * Status Constants
 *
 * Mappings between database statuses and their markdown representations.
 * Used by markdown-sync and file-sync services.
 */

// Status to emoji mappings for markdown display
export const STATUS_TO_EMOJI: Record<string, string> = {
  'pending': '🟡',
  'in_progress': '🟢',
  'active': '🟢',
  'blocked': '🔴',
  'complete': '✅',
  'completed': '✅',
  'cancelled': '❌',
  'planning': '🔵',
};

// Status to action table status mappings (for meeting notes)
export const STATUS_TO_ACTION_STATUS: Record<string, string> = {
  'pending': 'Pending',
  'in_progress': 'In Progress',
  'active': 'In Progress',
  'blocked': 'Blocked',
  'complete': 'Complete',
  'completed': 'Complete',
  'cancelled': 'Cancelled',
};

/**
 * Map workstream file status to database Item status
 */
export function mapWorkstreamStatus(status: string): string {
  const lower = status.toLowerCase();
  switch (lower) {
    case 'active':
      return 'active';
    case 'paused':
      return 'paused';
    case 'completed':
    case 'complete':
      return 'complete';
    case 'planning':
      return 'pending';
    case 'maintenance':
      return 'active'; // maintenance is a form of active
    default:
      return 'pending';
  }
}

/**
 * Map database Item status to workstream file status
 */
export function mapDbStatusToFile(dbStatus: string): string {
  switch (dbStatus) {
    case 'active':
    case 'in_progress':
      return 'active';
    case 'paused':
      return 'paused';
    case 'complete':
    case 'completed':
      return 'completed';
    case 'pending':
      return 'planning';
    default:
      return 'active';
  }
}
