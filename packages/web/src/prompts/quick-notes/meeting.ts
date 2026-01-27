/**
 * Meeting-specific prompt instructions.
 */

import type { QuickNote } from "../index";

export function getMeetingPrompt(note: QuickNote): string {
  const meetingDate = note.metadata.date || "today";
  const attendees = note.metadata.attendees || "Not specified";
  const location = note.metadata.location || "Not specified";
  const projects = note.metadata.projects || "";

  return `## Process Meeting Note

### Meeting Details
- **Date:** ${meetingDate}
- **Attendees:** ${attendees}
- **Location:** ${location}
${projects ? `- **Projects:** ${projects}` : ""}

### Instructions

1. **Create meeting file** at the appropriate location:
   - Path format: \`{org}/meetings/YYYY/MM/YYYY-MM-DD-slug.md\`
   - Use proper frontmatter (title, date, attendees, status: completed)
   - See DOCUMENT-FORMATS.md for the full specification

2. **Extract action items** into an Actions table:
   - Use 2-column format initially: \`| Owner | Action |\`
   - Look for patterns like "ACTION:", "OWED:", task assignments
   - Convert "OWED: X to send Y" into action with X as owner

3. **Link attendees** to people in the system:
   - After creating the meeting file, sync it to the database
   - This ensures the meeting appears on each attendee's People page

4. **Sync to database** (CRITICAL):
   \`\`\`bash
   .claude/skills/task-cli/scripts/task-cli.sh sync meeting <path-to-meeting.md>
   \`\`\`
   This creates tasks from actions and links attendees.

5. **Update meeting with task IDs** after sync:
   - Add Task column with returned IDs
   - Rename "Action" to "Excerpt"
   - Format: \`| Owner | Excerpt | Task |\`

6. **Add diary entry** for the meeting date:
   - Link from \`diary/YYYY/MM/DD-DOW.md\` Meetings section
   - Format: \`[[path/to/meeting|Title]] — brief outcome\`

### Multi-Project Meetings

If the discussion spans multiple projects:
- Use \`projects: [slug1, slug2]\` in frontmatter instead of single \`project:\`
- Add Project column to Actions table: \`| Owner | Action | Project |\`
- Group Discussion section by project with headers

### Project Slug Validation

Before using project references, validate they exist:
\`\`\`bash
.claude/skills/projects/scripts/valid_slugs.sh --check <slug>
\`\`\`
`;
}
