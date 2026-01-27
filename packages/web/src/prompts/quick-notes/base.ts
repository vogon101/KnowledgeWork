/**
 * Base instructions common to all quick note types.
 */

import type { QuickNote } from "../index";
import { formatDate, formatNotePath } from "../common/formatting";

const NOTE_TYPE_LABELS: Record<QuickNote["type"], string> = {
  meeting: "Meeting",
  "project-update": "Project Update",
  task: "Task",
  idea: "Idea",
  general: "General",
};

/**
 * Generate base instructions that appear at the start of every quick note prompt.
 */
export function getBaseInstructions(note: QuickNote): string {
  const typeLabel = NOTE_TYPE_LABELS[note.type];
  const notePath = formatNotePath(note.id);

  let prompt = `I have a quick note that needs to be processed. Please help me file this properly.

**Note Type:** ${typeLabel}
**Title:** ${note.title || "(Untitled)"}
**Created:** ${formatDate(note.createdAt)}
`;

  if (Object.keys(note.metadata).length > 0) {
    prompt += `\n**Metadata:**\n`;
    for (const [key, value] of Object.entries(note.metadata)) {
      if (value) prompt += `- ${key}: ${value}\n`;
    }
  }

  prompt += `
**Content:**
\`\`\`
${note.content}
\`\`\`

**Quick note path:** \`${notePath}\`
`;

  return prompt;
}
