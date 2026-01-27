/**
 * Project update prompt instructions.
 */

import type { QuickNote } from "../index";

export function getProjectUpdatePrompt(note: QuickNote): string {
  const project = note.metadata.project || "Not specified";
  const status = note.metadata.status || "Not specified";

  return `## Process Project Update

### Update Details
- **Project:** ${project}
- **Status:** ${status}

### Instructions

1. **Locate the project README**:
   - Find the project folder: \`{org}/projects/{project}/README.md\`
   - Validate project exists: \`.claude/skills/projects/scripts/valid_slugs.sh --check ${project}\`

2. **Update the README**:
   - Add/update the Current Status section
   - Use appropriate status emoji:
     - \`🟢\` Active/On track
     - \`🟡\` Needs attention/Slow
     - \`🔴\` Blocked/At risk
   - Update the "Last updated" date

3. **Update next-steps.md** (if exists):
   - Reflect current state and immediate next actions
   - Remove completed items
   - Add any new blockers or pending decisions

4. **Create/update tasks** as needed:
   - If update mentions new todos, propose creating tasks
   - If update mentions completed work, propose completing existing tasks
   - Search for existing tasks first: \`tcli list --project ${project}\`

5. **Add to diary**:
   - Note the project update in today's Work Log section
   - Format: "Updated [project] status: [brief summary]"

### Status Mapping

| Input | Interpretation | README Status |
|-------|----------------|---------------|
| "done", "complete", "finished" | Work completed | \`🟢 Complete\` or update completion |
| "in-progress", "active", "ongoing" | Work continuing | \`🟢 Active\` |
| "blocked", "stuck", "waiting" | Cannot proceed | \`🔴 Blocked: [reason]\` |
| "slow", "delayed" | Behind schedule | \`🟡 Delayed: [reason]\` |
`;
}
