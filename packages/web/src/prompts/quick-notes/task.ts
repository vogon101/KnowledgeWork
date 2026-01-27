/**
 * Task creation prompt instructions.
 */

import type { QuickNote } from "../index";

export function getTaskPrompt(note: QuickNote): string {
  const project = note.metadata.project || "";
  const due = note.metadata.due || "";
  const priority = note.metadata.priority || "";

  return `## Process Task Note

### Task Details
${project ? `- **Project:** ${project}` : "- **Project:** Not specified"}
${due ? `- **Due:** ${due}` : "- **Due:** Not specified"}
${priority ? `- **Priority:** ${priority}` : "- **Priority:** Not specified"}

### Instructions

1. **Check for existing similar tasks** before creating:
   \`\`\`bash
   .claude/skills/task-cli/scripts/task-cli.sh search "[key words from title]"
   \`\`\`

   If a similar task exists, consider:
   - Adding a check-in instead of creating a duplicate
   - Updating the existing task's description
   - Linking the tasks if they're related but distinct

2. **Validate project slug** (if specified):
   \`\`\`bash
   .claude/skills/projects/scripts/valid_slugs.sh --check ${project || "<slug>"}
   \`\`\`

3. **Parse due date**:
   - Use the dates skill to convert relative dates: \`.claude/skills/dates/scripts/date_context.sh\`
   - "tomorrow" → use offset +1
   - "next Monday" → use weekday Monday
   - Convert to YYYY-MM-DD format

4. **Create the task**:
   \`\`\`bash
   .claude/skills/task-cli/scripts/task-cli.sh create task "[title]" \\
     --owner Alice \\
     ${project ? `--project ${project} \\` : ""}
     ${due ? `--due [YYYY-MM-DD] \\` : ""}
     ${priority ? `--priority ${priority}` : ""}
   \`\`\`

5. **If due today**, add to diary:
   - Add to Tasks for Today section
   - Format: \`- [ ] T-XXXX: [title]\`

### Priority Guide

| Input | Priority |
|-------|----------|
| "urgent", "asap", "critical", "1" | 1 |
| "high", "important", "2" | 2 |
| "normal", "medium", "3" | 3 |
| "low", "backlog", "4" | 4 |
| Not specified | 3 (default) |

### Due Date vs Check-ins

- **Due date**: Hard deadline - task is overdue if not completed
- **Check-in**: Soft reminder - "revisit this around X" (use for periodic reviews)

If the note says "remind me about" or "revisit this", create a task and add a check-in:
\`\`\`bash
tcli create task "[title]"
tcli checkin-add T-XXX [YYYY-MM-DD]
\`\`\`
`;
}
