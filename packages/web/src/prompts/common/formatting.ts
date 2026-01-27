/**
 * Common formatting instructions and output helpers.
 */

export const FORMAT_INSTRUCTIONS = `
## Output Formatting

When reporting results back to the user:

### Task Operations
- Created: "Created T-1234: [title]"
- Updated: "Updated T-1234: [what changed]"
- Completed: "Completed T-1234: [title]"
- Check-in added: "Added check-in to T-1234 for [date]"

### File Operations
- Created: "Created [path]"
- Updated: "Updated [path]"
- Synced: "Synced [path] to database"

### Meeting Operations
- Created meeting: "Created meeting at [path]"
- Synced attendees: "Linked meeting to [N] attendees"
- Created actions: "Created [N] tasks from meeting actions"

### Summary Format

After completing operations, provide a brief summary:

\`\`\`
Processed quick note: [title]

Actions taken:
- Created T-1234: Review budget proposal
- Added check-in to T-1235 for 2026-01-25
- Created meeting at acme-corp/meetings/2026/01/2026-01-20-team-sync.md

Quick note can be deleted: [path]
\`\`\`
`;

/**
 * Format a date for display in prompts.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a note path for display.
 */
export function formatNotePath(noteId: string): string {
  return `_quick-notes/${noteId}.json`;
}
