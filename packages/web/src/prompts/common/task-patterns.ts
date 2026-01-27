/**
 * Instructions for detecting when to add check-ins to existing tasks
 * vs creating new tasks.
 */

export const TASK_PATTERN_DETECTION = `
## Smart Task Detection

When processing notes, detect patterns that indicate follow-ups on existing work rather than new tasks.

### Patterns That Suggest Check-ins (Not New Tasks)

| Pattern | Example | Action |
|---------|---------|--------|
| "Discuss X with Y" | "Discuss budget with James" | Search for existing task about "budget", propose check-in |
| "Follow up on X" | "Follow up on proposal" | Search for existing task about "proposal" |
| "Waiting on Y for X" | "Waiting on Sarah for report" | Search for task about "report", add waiting_on |
| "Chase Y about X" | "Chase vendor about delivery" | Search for task about "vendor" or "delivery" |
| "Check on X" | "Check on nuclear tracker progress" | Search for task about "nuclear tracker" |
| "Remind Y about X" | "Remind James about review" | Search for task about "review" with James |
| "Check in with Y" | "Check in with John" | Search for task owned by John, add check-in reminder |

### Patterns That Create New Tasks (Assigned to Others)

| Pattern | Example | Action |
|---------|---------|--------|
| "Y to do X" | "James to review doc" | Create task assigned to James |
| "Ask Y to X" | "Ask Sarah to send report" | Create task assigned to Sarah |
| "Get X from Y" | "Get feedback from John" | Create task assigned to John |

**Key distinction**: "Check in with Y" = add a check-in reminder to chase Y's existing task. "Y to do X" = create new task for Y.

### How to Handle These Patterns

1. **Search for existing tasks** matching the topic:
   \`\`\`bash
   .claude/skills/task-cli/scripts/task-cli.sh search "budget"
   .claude/skills/task-cli/scripts/task-cli.sh list --owner James
   \`\`\`

2. **If matching task found**: Propose a CHECK-IN instead of a new task
   - Use \`tcli checkin-add T-XX YYYY-MM-DD --note "Follow-up note"\`
   - Include the existing task title in the confirmation option

3. **If no matching task found**: Propose creating a new task
   - But mention in the description that no existing task was found

4. **When in doubt**: Present BOTH options to the user
   - "Create: Discuss budget with James" (new task)
   - "Check-in on T-42: Q1 Budget Review" (add to existing)

### Create New Task When

- No matching existing task found after searching
- User explicitly says "create task" or "new task"
- The action is a distinct deliverable, not a follow-up
- The note describes something net-new (project kick-off, new initiative)

### Search Strategy

When searching for existing tasks:

1. Extract the core topic (e.g., "budget", "nuclear tracker", "website redesign")
2. Search by title: \`tcli search "[topic]"\`
3. If a person is mentioned, also search by owner: \`tcli list --owner [person]\`
4. Consider project context: \`tcli list --project [project-slug]\`

### Example Workflow

Note content: "Follow up with James on the nuclear report next week"

1. Search for existing tasks:
   \`\`\`bash
   tcli search "nuclear report"
   tcli list --owner James
   \`\`\`

2. Found T-1234: "James to complete nuclear report" (status: pending)

3. Propose to user:
   \`\`\`json
   {
     "options": [
       {"label": "Check-in on T-1234: Nuclear report", "description": "Add check-in for next week to existing task owned by James"},
       {"label": "Create: Follow up on nuclear report", "description": "Create new task (no existing match found was incorrect - T-1234 exists)"}
     ]
   }
   \`\`\`

4. If user selects check-in:
   \`\`\`bash
   tcli checkin-add T-1234 2026-01-27 --note "Follow up with James"
   \`\`\`

### Example: "Check in with John"

Note content: "Check in with John next week"

1. Search for tasks owned by John:
   \`\`\`bash
   tcli list --owner John
   \`\`\`

2. Found tasks:
   - T-42: "John to review Q1 budget" (pending)
   - T-55: "John to send contract" (pending)

3. Propose to user - ask WHICH task to add check-in to:
   \`\`\`json
   {
     "options": [
       {"label": "Check-in on T-42: Review Q1 budget", "description": "Add reminder to chase John about budget review"},
       {"label": "Check-in on T-55: Send contract", "description": "Add reminder to chase John about contract"},
       {"label": "Create new task for John", "description": "If none of these match, create a new task"}
     ]
   }
   \`\`\`

4. User selects T-42, execute:
   \`\`\`bash
   tcli checkin-add T-42 2026-02-03 --note "Check in with John"
   \`\`\`
`;
