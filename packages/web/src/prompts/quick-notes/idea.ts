/**
 * Idea prompt instructions.
 */

import type { QuickNote } from "../index";

export function getIdeaPrompt(note: QuickNote): string {
  const category = note.metadata.category || "";

  return `## Process Idea Note

### Idea Details
${category ? `- **Category:** ${category}` : "- **Category:** Not specified"}

### Instructions

Decide where this idea belongs based on its nature:

1. **If actionable soon** → Create a task
   - Use project "backlog-ideas" or the relevant project
   - Set priority 4 (low) unless marked urgent
   - \`tcli create task "[idea title]" --priority 4\`

2. **If needs research/exploration** → Create a context note
   - Put in relevant project's \`context/\` folder
   - File name: \`idea-[slug].md\`
   - Include the original idea, why it matters, and exploration questions

3. **If it's a feature idea for a product** → Add to project README
   - Find the relevant project's README.md
   - Add to a "Future Ideas" or "Backlog" section
   - Or create a dedicated \`ideas.md\` in the project folder

4. **If unclear where it belongs** → Ask the user
   - Use AskUserQuestion with options:
     - "Create as backlog task"
     - "Save as research note in [project]"
     - "Add to [project] ideas section"
     - "Just note in diary for now"

### Category Hints

| Category | Likely Destination |
|----------|-------------------|
| feature | Project README or product backlog |
| process | Personal or team process notes |
| research | Project context/ folder |
| tool | Personal tools/scripts |
| content | Content calendar or writing ideas |
| business | Relevant org's strategy docs |

### Format for Research Notes

If creating a context note:

\`\`\`markdown
# Idea: [Title]

**Date:** [today]
**Category:** ${category || "[category]"}

## The Idea

[Original idea content]

## Why It Matters

[Potential impact/value]

## Questions to Explore

- [Question 1]
- [Question 2]

## Next Steps

- [ ] [First exploration step]
\`\`\`
`;
}
