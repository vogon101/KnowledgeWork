/**
 * Centralized AI prompt templates for the Knowledge Work web app
 *
 * TASK SYSTEM ARCHITECTURE:
 * - Task Service API runs at localhost:3004
 * - Tasks are stored in SQLite (task-service/data/tasks.db)
 * - Meeting actions sync to tasks via POST /sync/meeting
 * - Task completions are logged to the daily diary's "## Task Activity" section
 * - Routines are virtual (calculated on the fly, not pre-generated)
 * - The web UI is at /tasks with owner filtering (defaults to Alice Smith)
 *
 * Quick actions are grouped by context type (meeting, project, action, etc.)
 */

export interface QuickAction {
  label: string;
  prompt: string;
}

export interface PromptTemplate {
  quickActions: QuickAction[];
  placeholder: string;
}

/**
 * Prompts for action items (from meeting notes)
 */
export const actionPrompts: PromptTemplate = {
  placeholder: "What would you like to do with this action?",
  quickActions: [
    {
      label: "Mark complete",
      prompt: `Mark this action as complete.

To do this:
1. Update the meeting file's Actions table - change the Status column from "Pending" to "Complete"
2. If this action was synced to the task database, also update its status via PATCH /tasks/:id/status with {"status": "complete"}
3. The task service will automatically log completion to today's diary`,
    },
    {
      label: "Create task",
      prompt: `Create a task in the task database from this action.

To do this:
1. Call POST http://localhost:3004/tasks with:
   - title: the action text
   - owner_id: look up the person by name via GET /people/by-name/:name
   - source_meeting_path: the meeting file path
   - due_date: if specified in the action
   - project_id: if the meeting has a project reference
2. The task will appear in the web UI at /tasks`,
    },
    {
      label: "Defer",
      prompt: `Defer this action to a later date.

To do this:
1. Update the meeting file's Actions table - change the Due column to a new date
2. If synced to task database, call PATCH /tasks/:id with {"due_date": "YYYY-MM-DD"}
3. Consider adding a note explaining why it was deferred`,
    },
    {
      label: "Block",
      prompt: `Mark this action as blocked.

To do this:
1. Update the meeting file's Actions table - change Status to "Blocked"
2. If synced to task database, call PATCH /tasks/:id/status with {"status": "blocked", "note": "reason for blocking"}
3. Add a note explaining what's blocking it and who/what is needed to unblock`,
    },
  ],
};

/**
 * Prompts for meeting notes
 */
export const meetingPrompts: PromptTemplate = {
  placeholder: "What would you like to do with this meeting?",
  quickActions: [
    {
      label: "Summarise",
      prompt: `Summarise this meeting's key points and outcomes.

Include:
- Main discussion topics and decisions made
- Action items assigned (who owns what)
- Any blockers or concerns raised
- Next steps or follow-up meetings planned`,
    },
    {
      label: "Extract actions",
      prompt: `Extract all action items from this meeting and format them for the Actions table.

Format each action as a table row with columns:
| Owner | Action | Due | Status | Project |

Guidelines:
- Status should be "Pending" for new actions
- Due dates should be explicit (e.g., "17 Jan") not relative ("next week")
- Project column is optional, use the meeting's project if applicable
- Look for commitments, TODOs, "I'll do X", "OWED:", "ACTION:" patterns`,
    },
    {
      label: "Sync tasks",
      prompt: `Sync this meeting's pending actions to the task database.

To do this:
1. Click the "Sync" button in the web UI, OR
2. Call POST http://localhost:3004/sync/meeting with {"meeting_path": "<path>"}

This will:
- Create tasks for any pending actions not already in the database
- Link tasks to this meeting as the source
- Assign tasks to the correct owners (creating people records if needed)
- The synced tasks will appear at /tasks in the web UI`,
    },
    {
      label: "Update diary",
      prompt: `Update today's diary entry with notes about this meeting.

Add to the diary:
1. In the "## Meetings" section, add a link: [[meeting-path|Meeting Title]] — brief outcome
2. In the "## Work Log" section, note key decisions or progress made
3. Any actions assigned to me should be reflected in my task list

Remember: Project files (README.md, next-steps.md) are the primary record; diary is secondary.`,
    },
  ],
};

/**
 * Prompts for project pages
 */
export const projectPrompts: PromptTemplate = {
  placeholder: "What would you like to know about this project?",
  quickActions: [
    {
      label: "Status update",
      prompt: `Give me a status update on this project.

Check:
1. The project's README.md for current status and goals
2. The project's next-steps.md for what's in progress
3. Task database: GET /tasks?project_slug=<slug> for pending tasks
4. Recent meetings related to this project

Summarise: current phase, recent progress, blockers, and upcoming work.`,
    },
    {
      label: "Next steps",
      prompt: `What are the next steps for this project?

Check:
1. The project's next-steps.md file (this is the primary source)
2. Pending tasks in the task database for this project
3. Any recent meeting actions related to this project

List the immediate priorities and suggest what to work on next.`,
    },
    {
      label: "My tasks",
      prompt: `Show me my pending tasks for this project.

Query the task database:
GET http://localhost:3004/tasks?project_slug=<slug>&owner_name=Alice&status=pending,in_progress,blocked

Group by status (in_progress first, then blocked, then pending) and show due dates.`,
    },
    {
      label: "Update next-steps",
      prompt: `Update this project's next-steps.md file.

The next-steps.md file should contain:
1. "## Current Status" - what phase the project is in
2. "## In Progress" - what's actively being worked on
3. "## Next Actions" - immediate next steps
4. "## Blockers" - anything blocking progress
5. "## Recent Decisions" - key decisions made recently

Update the "Last updated:" date at the top.`,
    },
  ],
};

/**
 * Prompts for diary entries
 */
export const diaryPrompts: PromptTemplate = {
  placeholder: "What would you like to do with this diary entry?",
  quickActions: [
    {
      label: "Add summary",
      prompt: `Add a summary section to this diary entry.

The summary should be 2-3 sentences covering:
- Key accomplishments or progress made
- Main meetings or discussions
- Any blockers or issues encountered

Place it in the "## Summary" section near the top of the file.`,
    },
    {
      label: "Review task activity",
      prompt: `Review the "## Task Activity" section in this diary.

This section is auto-generated when tasks are completed via the web UI. Check:
1. What tasks were completed today?
2. Are there any tasks that should have been completed but weren't?
3. Should any in-progress tasks be updated?

The format is: "- HH:MM — Completed T-XX: "Task title" (Project Name)"`,
    },
    {
      label: "Plan tomorrow",
      prompt: `Based on today's activity, suggest priorities for tomorrow.

Check:
1. Tasks due tomorrow: GET /tasks?due_date=YYYY-MM-DD
2. Overdue tasks: GET /tasks/overdue
3. Blocked tasks that might be unblocked
4. Any meetings scheduled for tomorrow

List 3-5 priorities in order of importance.`,
    },
    {
      label: "Link meetings",
      prompt: `Ensure all of today's meetings are linked in the diary.

In the "## Meetings" section, add links for any meetings not yet listed:
- [[org/meetings/YYYY/MM/YYYY-MM-DD-slug|Meeting Title]] — brief outcome

Check the meetings folder for today's date to find any that might be missing.`,
    },
  ],
};

/**
 * General prompts (no specific context)
 */
export const generalPrompts: PromptTemplate = {
  placeholder: "What would you like to do?",
  quickActions: [
    {
      label: "Today's tasks",
      prompt: `Show me my tasks for today.

Query:
1. Tasks due today: GET http://localhost:3004/tasks?due_date=<today>&owner_name=Alice
2. Overdue tasks: GET http://localhost:3004/tasks/overdue
3. Routines due today: GET http://localhost:3004/routines/due

Group by: Overdue, Due Today, In Progress. Show priority and project for each.`,
    },
    {
      label: "Pending actions",
      prompt: `Show me actions I owe to others or that others owe to me.

Check:
1. My pending tasks: tasks where I'm the owner and status is pending/in_progress
2. Tasks waiting on others: tasks where someone else is blocking or needs to do something
3. Recent meeting actions that haven't been synced yet

Use the /people/:id/tasks endpoint to see task relationships.`,
    },
    {
      label: "Weekly review",
      prompt: `Help me do a weekly review.

Check:
1. Tasks completed this week (look at diary Task Activity sections)
2. Tasks still pending that were due this week
3. Upcoming tasks for next week
4. Projects that need attention (check next-steps.md files)
5. Any routines that were missed

Summarise progress and suggest focus areas for next week.`,
    },
  ],
};

/**
 * Get prompts for a specific context type
 */
export function getPromptsForContext(
  type: "action" | "meeting" | "project" | "diary" | "general"
): PromptTemplate {
  switch (type) {
    case "action":
      return actionPrompts;
    case "meeting":
      return meetingPrompts;
    case "project":
      return projectPrompts;
    case "diary":
      return diaryPrompts;
    default:
      return generalPrompts;
  }
}

/**
 * Build context string for sending to Claude
 * This provides structured context about what the user is looking at
 */
export function buildContextString(context: {
  type: string;
  title?: string;
  filePath?: string;
  details?: Record<string, string | undefined>;
}): string {
  const lines: string[] = [];

  lines.push(`Context: ${context.type}`);

  if (context.title) {
    lines.push(`Title: ${context.title}`);
  }

  if (context.filePath) {
    lines.push(`File: ${context.filePath}`);
  }

  if (context.details) {
    for (const [key, value] of Object.entries(context.details)) {
      if (value) {
        lines.push(`${key}: ${value}`);
      }
    }
  }

  return lines.join("\n");
}
