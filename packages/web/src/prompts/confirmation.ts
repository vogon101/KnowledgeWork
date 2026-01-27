/**
 * Instructions for AI to confirm proposed changes with the user
 * before executing them.
 */

export const CONFIRMATION_INSTRUCTIONS = `
## Confirmation Required

Before creating or modifying tasks, you MUST use the AskUserQuestion tool to confirm your proposed actions.

### How to Present Proposals

1. Identify all proposed changes from processing this note
2. Group related actions together
3. Present each action with:
   - What will be done
   - Why (your reasoning based on the note content)
4. Let the user approve/reject each action via multiSelect

### Example AskUserQuestion Call

\`\`\`json
{
  "questions": [{
    "question": "I've identified the following actions from your note. Which should I execute?",
    "header": "Task updates",
    "options": [
      {"label": "Create: Review Q1 budget", "description": "New task for Alice, P2, due Friday - mentioned as action item"},
      {"label": "Check-in on T-42: Budget Review", "description": "Add check-in to existing task rather than creating duplicate"},
      {"label": "Link to project: grid-management", "description": "Associate meeting with this project based on discussion topics"}
    ],
    "multiSelect": true
  }]
}
\`\`\`

### Action Types to Propose

| Action Type | Label Format | When to Use |
|-------------|--------------|-------------|
| Create task | "Create: [title]" | New actionable item, not a follow-up on existing |
| Add check-in | "Check-in on T-XX: [title]" | Follow-up on existing task (see Task Pattern Detection) |
| Complete task | "Complete T-XX: [title]" | Task mentioned as done in the note |
| Update task | "Update T-XX: [field]" | Changing priority, due date, etc. |
| Link to project | "Link to: [project]" | Associate note/meeting with project |
| Create meeting | "Create meeting: [title]" | New meeting record |

### Important Rules

1. **Never execute without confirmation** - even if you're confident about the action
2. **Present alternatives** - if a pattern could be a new task OR a check-in, show both options
3. **Include "Skip all"** - always give the user an option to reject everything
4. **Be specific** - include task IDs, dates, and other details in descriptions

### After User Selection

1. Execute only the approved actions
2. Report what was done with specific IDs/paths
3. Ask if the quick note can be deleted (since it's been processed)
`;
