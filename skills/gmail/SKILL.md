---
name: gmail
description: Read and search Gmail emails via CLI. Use when user asks about emails, inbox, or wants to process email content. NEVER create tasks from emails without explicit user confirmation.
allowed-tools: Bash(.claude/skills/gmail/scripts/gmail-cli.sh:*)
---

# Gmail Integration

Read-only access to Gmail for searching, reading, and processing emails.

**Service:** Task Service at `http://localhost:3004`
**Script:** `.claude/skills/gmail/scripts/gmail-cli.sh`

## Critical Rules

### NEVER Auto-Create Tasks from Emails

**This is the most important rule.** When processing emails:

1. **NEVER** create tasks directly from email content without asking
2. **ALWAYS** present potential actions to the user for confirmation
3. **ALWAYS** use `AskUserQuestion` before creating any tasks
4. **SUMMARISE** emails and suggest potential actions, don't execute them

**Why:** Email contains requests, FYIs, spam, and context that the user has already seen. The user decides what becomes a task, not the AI.

### Correct Workflow

```
User: "Check my inbox for anything urgent"
    ↓
AI runs: gmail search "category:primary is:unread"
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
# Alias for convenience (or use full path)
alias gmail='.claude/skills/gmail/scripts/gmail-cli.sh'

# Check status
gmail status

# Primary inbox (DEFAULT - use this for inbox reviews)
gmail search "category:primary is:unread"

# Search specific emails
gmail search "from:john subject:budget"
gmail search "newer_than:7d has:attachment"

# Read email
gmail get MESSAGE_ID               # Full content
gmail thread THREAD_ID             # Full conversation

# Labels
gmail labels                       # List all labels

# Contacts (find email addresses)
gmail contacts "John"              # Search contacts by name
gmail contacts-list                # List recent contacts
```

## When to Use Primary Category

Use `category:primary` **only for general inbox checks** — it filters out newsletters, promotions, and social notifications.

```bash
# General inbox review - USE category:primary
gmail search "category:primary is:unread"
gmail search "category:primary newer_than:1d"

# Specific searches - DON'T use category:primary
gmail search "from:john@example.com"           # Find emails from specific person
gmail search "subject:budget report"           # Find emails about topic
gmail search "from:john newer_than:7d"         # Recent emails from person
gmail search "to:me has:attachment"            # Emails with attachments
```

**Rule of thumb:**
- Checking "what's in my inbox?" → use `category:primary`
- Searching for specific emails/people/topics → don't use it (might filter out what you're looking for)

## Using Contacts to Find Email Addresses

When searching for emails from a specific person, use contacts to find their email address first.

**Workflow:**
```
User: "Find emails from John about the budget"
    ↓
AI runs: gmail contacts "John"
    ↓
Result shows: John Smith <john.smith@company.com>
    ↓
AI runs: gmail search "from:john.smith@company.com subject:budget"
    ↓
AI presents results
```

**Commands:**

```bash
# Search contacts by name or email
gmail contacts "John"
gmail contacts "company.com"

# List recent contacts
gmail contacts-list --limit 20
```

**When to use contacts:**
- User mentions a person by name (not email)
- You need to search emails from/to someone specific
- User asks "do I have John's email?"

**Output includes:**
- Name
- Email addresses (can have multiple)
- Organization
- Phone numbers (if available)

**Example:**
```
$ gmail contacts "Sarah"
2 contacts matching "Sarah"
──────────────────────────────────────────────────────────
Sarah Chen - Acme Corp
  Email: sarah.chen@acme.com
  Other: sarah@personal.com
  Phone: +1 555-0123

Sarah Jones
  Email: sjones@example.org
```

Then use the email in your search:
```bash
gmail search "from:sarah.chen@acme.com newer_than:30d"
```

## CLI Reference

### Check Status

```bash
gmail status
```

Output:
```
Gmail: Configured and authenticated
  Account: user@gmail.com
```

### List Emails

```bash
# List recent emails (default 20)
gmail-cli list

# With search query
gmail-cli list --query "is:unread"

# With label filter
gmail-cli list --label INBOX --limit 10

# Unread only
gmail-cli list --unread
```

### Search Emails

```bash
# Search with Gmail query syntax
gmail-cli search "from:john subject:budget"

# With limit
gmail-cli search "newer_than:7d has:attachment" --limit 50
```

**Gmail Query Syntax:**
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

### Get Single Email

```bash
# Get full email content by ID
gmail-cli get 18d5a1b2c3d4e5f6

# Show HTML body instead of text
gmail-cli get 18d5a1b2c3d4e5f6 --html
```

### Get Thread

```bash
# Get all messages in a conversation
gmail-cli thread 18d5a1b2c3d4e5f6
```

### List Labels

```bash
gmail-cli labels
```

### Search Contacts

```bash
# Search by name or email
gmail-cli contacts "John"
gmail-cli contacts "company.com"

# Limit results
gmail-cli contacts "John" --limit 5
```

### List Contacts

```bash
# List recent contacts
gmail-cli contacts-list

# With limit
gmail-cli contacts-list --limit 30
```

### Inbox Shortcut

```bash
# Show unread inbox (most common use case)
gmail-cli inbox

# Show all inbox emails
gmail-cli inbox --all

# With limit
gmail-cli inbox --limit 10
```

## Common Use Cases

### 1. Morning Inbox Review

When user asks to check inbox or review emails:

```bash
gmail search "category:primary is:unread"
```

**Then:**
1. Summarise the emails found (sender, subject, snippet)
2. Group by urgency/type if helpful
3. Ask which ones need action
4. Only create tasks for confirmed items

**Note:** Always use `category:primary` to filter out newsletters and promotions.

### 2. Search for Specific Emails

```bash
# Find emails from a specific person
gmail-cli search "from:james@company.com newer_than:7d"

# Find emails about a topic
gmail-cli search "subject:budget has:attachment"
```

### 3. Read Full Email Content

When user asks about a specific email or needs details:

```bash
gmail-cli get MESSAGE_ID
```

Present the content to the user. If it contains action items, ASK before creating tasks.

### 4. Process Email Thread

```bash
gmail-cli thread THREAD_ID
```

### 5. Find Emails Needing Follow-up

```bash
gmail-cli search "from:me older_than:3d"
```

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
        "label": "Reschedule meeting with James",
        "description": "James requested moving Thursday meeting"
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

**Include in descriptions:**
- Who the email is from
- What they're asking/need
- Any deadlines mentioned
- Why it might need action

## What NOT to Do

| Don't | Instead |
|-------|---------|
| Create tasks from every email | Summarise and ask which need tasks |
| Mark emails as read automatically | Ask before modifying email state |
| Archive emails without asking | Let user decide email management |
| Assume all requests need tasks | Many emails are FYI or already handled |
| Process emails the user didn't ask about | Only look at what user requests |

## Email Summary Format

When presenting email summaries to users:

```
## Inbox Summary (5 unread)

### Needs Response
1. **John Smith** (2h ago): Budget Review Request
   → Asking for Q1 budget review by Friday

2. **Sarah Chen** (yesterday): Project Timeline Question
   → Needs clarification on Phase 2 dates

### FYI / No Action Needed
3. **HR Team** (yesterday): Holiday Schedule Update
   → Office closed Jan 26

4. **Newsletter** (2d ago): Weekly Digest
   → Industry news roundup

### Potential Follow-ups
5. **You → James** (3d ago, no reply): Meeting Agenda
   → Sent meeting agenda, no response yet

---
Would you like me to create tasks for any of these?
```

## Integration with Other Skills

Gmail integrates with daily workflows but is **optional** — only check when the user requests or context suggests it's needed.

### With /resumeday (Morning)

If user asks to check email during morning setup:
```bash
gmail search "category:primary is:unread"
```
Summarise briefly, note anything needing action, but **don't create tasks without asking**.

### With /summary or /end-day (Afternoon/Evening)

Email is generally NOT part of the standard summary/end-day flow unless:
- User explicitly asks to review email
- User mentions expecting an important reply
- There's an open task about "waiting for X's email"

If checking for expected replies:
```bash
gmail search "from:specificperson newer_than:2d"
```

### With Task System

**Never auto-create tasks from emails.** When emails suggest action:
1. Present summary to user
2. Use `AskUserQuestion` with specific options
3. Only create tasks for confirmed items
4. Include email context (sender, subject) in task title/description

Example task creation after user confirms:
```bash
.claude/skills/task-cli/scripts/task-cli.sh create task "Reply to John re: budget review" --owner Alice --due 2026-01-28
```

### When NOT to Use Gmail

- Don't proactively check email without being asked
- Don't include email in routine summaries unless requested
- Don't mark emails read or archive without explicit permission
- Don't assume unread emails need tasks — many are FYI

### When to Suggest Email Check

It's appropriate to **ask** (not assume) about email when:
- User mentions waiting for a response
- There's a task about following up with someone
- User asks "anything I'm missing?" during summary
- Morning check-in and user seems to want comprehensive status

Example prompt:
> "Would you like me to check your primary inbox for anything needing attention?"

## Setup

The CLI requires the server to be running and the lib/server symlink.

```bash
# From KnowledgeWork repo - sets up all symlinks
pnpm setup:content --path /path/to/content-repo

# Start the server
pnpm dev:server
```

The setup script creates the required symlink at `skills/gmail/lib/server`.

## Troubleshooting

### "Gmail not configured"

Run the auth script:
```bash
cd packages/server && npx tsx src/scripts/gmail-auth.ts
```

### Token Expired

Tokens auto-refresh. If issues persist:
1. Delete `~/.data/gmail-tokens.json` in content repo
2. Re-run auth script

### Rate Limits

Gmail API has quotas. For bulk operations:
- Use `--limit` to limit requests
- Add delays between requests if needed

### Contacts Not Working

If contacts commands fail with scope errors:
1. Delete `~/.data/gmail-tokens.json` in content repo
2. Re-run auth script to get the contacts scope:
   ```bash
   cd packages/server && npx tsx src/scripts/gmail-auth.ts
   ```
