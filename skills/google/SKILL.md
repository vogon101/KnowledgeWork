---
name: google
description: Access Gmail, Contacts, and Calendar via CLI. Use when user asks about emails, inbox, calendar, schedule, or contacts. NEVER create tasks from emails without explicit user confirmation.
allowed-tools: Bash(.claude/skills/google/scripts/google-cli.sh:*)
---

# Google Integration

Read-only access to Gmail, Google Contacts, and Google Calendar.

**Script:** `.claude/skills/google/scripts/google-cli.sh`

## Commands Overview

The CLI uses subcommands grouped by service:

```bash
google-cli.sh gmail <command>      # Email operations
google-cli.sh contacts <command>   # Contact lookup
google-cli.sh calendar <command>   # Calendar operations
```

## Gmail Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `gmail search` | Find emails | `google-cli.sh gmail search "category:primary in:inbox newer_than:2d"` |
| `gmail get` | Read one email by ID | `google-cli.sh gmail get MESSAGE_ID` |
| `gmail thread` | Read full conversation | `google-cli.sh gmail thread THREAD_ID` |
| `gmail inbox` | Show unread inbox | `google-cli.sh gmail inbox` |
| `gmail list` | List with filters | `google-cli.sh gmail list --unread` |
| `gmail labels` | List labels | `google-cli.sh gmail labels` |
| `gmail status` | Check auth status | `google-cli.sh gmail status` |

**Common mistake:** There is NO `message` command. Use `gmail get` to read an email.

### Typical Email Workflow

```bash
# 1. Search for emails
.claude/skills/google/scripts/google-cli.sh gmail search "category:primary in:inbox newer_than:2d"

# 2. Get the MESSAGE_ID from search results, then read the email
.claude/skills/google/scripts/google-cli.sh gmail get 19c045fbdcd5119d
```

## Contacts Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `contacts search` | Find contacts by name/email | `google-cli.sh contacts search "John"` |
| `contacts list` | List recent contacts | `google-cli.sh contacts list --limit 20` |

### Using Contacts to Find Email Addresses

```bash
# Search contacts by name
.claude/skills/google/scripts/google-cli.sh contacts search "John"
# Then use the email in Gmail search
.claude/skills/google/scripts/google-cli.sh gmail search "from:john.smith@company.com"
```

## Calendar Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `calendar today` | Today's events | `google-cli.sh calendar today` |
| `calendar upcoming` | Next 7 days | `google-cli.sh calendar upcoming --days 14` |
| `calendar search` | Search events | `google-cli.sh calendar search "standup"` |
| `calendar get` | Event details | `google-cli.sh calendar get EVENT_ID` |
| `calendar calendars` | List available calendars | `google-cli.sh calendar calendars` |
| `calendar status` | Check auth status | `google-cli.sh calendar status` |

### Calendar Workflows

```bash
# Morning: check today's schedule
.claude/skills/google/scripts/google-cli.sh calendar today

# Meeting prep: find recent meetings with someone
.claude/skills/google/scripts/google-cli.sh calendar search "John" --days 14

# Check upcoming week
.claude/skills/google/scripts/google-cli.sh calendar upcoming --days 7
```

## Multiple Calendars

By default, calendar commands query only the primary calendar. To aggregate events from shared/team calendars, configure `GOOGLE_CALENDAR_IDS`. The auth script (`google-auth.ts`) sets this automatically via interactive calendar selection, saving it to `{content}/.data/kw.env`.

You can also set it manually:

```bash
# In {content}/.data/kw.env (preferred) or packages/server/.env
GOOGLE_CALENDAR_IDS=primary,team@group.calendar.google.com,project@group.calendar.google.com
```

Use `calendar calendars` to discover available calendar IDs. When multiple calendars are configured, `today`, `upcoming`, and `search` commands automatically query all of them and merge results sorted by time. Events from non-primary calendars show a `[calendar-name]` prefix.

## Critical Rules

### PROPOSE Changes, Don't Make Them

**This is the most important rule.** When processing emails or calendar:

1. **NEVER** create, update, or complete tasks based on emails without asking
2. **ALWAYS** present potential actions to the user for confirmation
3. **ALWAYS** use `AskUserQuestion` before making ANY task changes
4. **SUMMARISE** emails and **PROPOSE** actions, don't execute them

**The workflow is:** Read emails/calendar → Summarise findings → Propose changes → Wait for user confirmation → Only then make changes

**Why:** Email contains requests, FYIs, spam, and context that the user has already seen. The user decides what becomes a task, not the AI.

### Correct Workflow

```
User: "Check my inbox for anything urgent"
    ↓
AI runs: google-cli.sh gmail search "category:primary is:unread"
    ↓
AI summarises findings
    ↓
AI identifies potential actions
    ↓
AI uses AskUserQuestion:
  "I found 3 emails that may need action:
   1. From John: Budget review request (due Fri)
   2. From Sarah: Question about project timeline
   3. From James: Meeting reschedule request

   Which would you like me to create tasks for?"
    ↓
User selects options
    ↓
AI creates only the confirmed tasks
```

### Wrong Workflow (DO NOT DO THIS)

```
User: "Check my inbox"
    ↓
AI reads emails
    ↓
AI creates 5 tasks automatically  ← WRONG
    ↓
User now has unwanted tasks
```

## Quick Reference

```bash
# Alias for convenience
alias gcli='.claude/skills/google/scripts/google-cli.sh'

# --- Gmail ---
gcli gmail status
gcli gmail search "category:primary in:inbox newer_than:2d"
gcli gmail search "from:john subject:budget"
gcli gmail get MESSAGE_ID
gcli gmail thread THREAD_ID
gcli gmail labels
gcli gmail inbox

# --- Contacts ---
gcli contacts search "John"
gcli contacts list

# --- Calendar ---
gcli calendar today
gcli calendar upcoming
gcli calendar search "standup"
gcli calendar get EVENT_ID
gcli calendar calendars
```

## When to Use Primary Category

Use `category:primary in:inbox` **for general inbox checks** — it filters out newsletters, promotions, social notifications, AND archived emails.

```bash
# General inbox review - USE category:primary in:inbox
gcli gmail search "category:primary in:inbox newer_than:2d"

# Specific searches - DON'T use category:primary
gcli gmail search "from:john@example.com"
gcli gmail search "subject:budget report"
```

**Rule of thumb:**
- Checking "what's in my inbox?" → use `category:primary`
- Searching for specific emails/people/topics → don't use it (might filter out what you're looking for)

## Gmail Query Syntax

- `is:unread` — Unread emails
- `is:starred` — Starred emails
- `from:email@example.com` — From specific sender
- `to:me` — Sent directly to you
- `subject:keyword` — Subject contains keyword
- `has:attachment` — Has attachments
- `after:2026/01/01` — After date
- `before:2026/01/31` — Before date
- `newer_than:7d` — Last 7 days
- `older_than:1m` — Older than 1 month
- `label:work` — Has specific label
- `in:inbox` — In inbox
- `category:primary` — In primary category

Combine with AND (space) or OR:
- `from:john subject:budget` — Both conditions
- `from:john OR from:sarah` — Either condition
- `from:john -subject:spam` — Exclude term

## Suggesting Tasks from Emails

When you identify potential actions in emails, use this format with `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "I found these potential action items in your emails. Which should become tasks?",
    "header": "Email actions",
    "options": [
      {
        "label": "Budget review for John",
        "description": "Email from John requesting Q1 budget review by Friday"
      },
      {
        "label": "Reply to Sarah",
        "description": "Sarah asked about project timeline - needs response"
      },
      {
        "label": "Skip all",
        "description": "Don't create any tasks"
      }
    ],
    "multiSelect": true
  }]
}
```

## What NOT to Do

| Don't | Instead |
|-------|---------|
| Create tasks from every email | Summarise and ask which need tasks |
| Mark emails as read automatically | Ask before modifying email state |
| Archive emails without asking | Let user decide email management |
| Assume all requests need tasks | Many emails are FYI or already handled |
| Process emails the user didn't ask about | Only look at what user requests |

## When to Check Email / Calendar

### Proactively Check When:

1. **Working on a project** — search for recent correspondence about that project
2. **Asked about a topic** — check if there's relevant email context
3. **Before meetings** — check recent correspondence with attendees, check calendar for context
4. **Daily reviews** — /resumeday, /summary, /end-day all include email and calendar checking
5. **Meeting prep** — check calendar for upcoming meetings, search emails for related context

```bash
# When working on a project
gcli gmail search "subject:project-name OR from:stakeholder newer_than:14d"

# Before a meeting - check calendar and related emails
gcli calendar today
gcli gmail search "from:attendee newer_than:7d"
```

## Setup

The CLI requires the server to be running and the lib/server symlink.

```bash
# From KnowledgeWork repo - sets up all symlinks
pnpm setup:content --path /path/to/content-repo

# Start the server
pnpm dev:server
```

The setup script creates the required symlink at `skills/google/lib/server`.

## Troubleshooting

### "Gmail not configured" / "Calendar not configured"

Run the auth script (opens browser automatically for OAuth):
```bash
cd packages/server && npx tsx src/scripts/google-auth.ts
```

### Token Expired

Tokens auto-refresh. If issues persist:
1. Delete `~/.data/gmail-tokens.json` in content repo
2. Re-run auth script

### Calendar Not Working

If calendar commands fail with scope errors, you need to re-authenticate to get the calendar scope:
1. Delete `~/.data/gmail-tokens.json` in content repo
2. Re-run auth script:
   ```bash
   cd packages/server && npx tsx src/scripts/google-auth.ts
   ```

### Rate Limits

Google APIs have quotas. For bulk operations:
- Use `--limit` to limit requests
- Add delays between requests if needed

### Contacts Not Working

If contacts commands fail with scope errors:
1. Delete `~/.data/gmail-tokens.json` in content repo
2. Re-run auth script
