---
name: dates
description: Date calculations and context. Use instead of mental date math.
allowed-tools: Bash(.claude/skills/dates/scripts/date_context.sh:*)
---

# Date Context Skill

Simple date helper to avoid mental date calculations. Use at session start and whenever working with dates.

## Quick Start

```bash
.claude/skills/dates/scripts/date_context.sh
```

Output:
```
Current time: 14:32 GMT

Today: Monday 12 January 2026
Yesterday: Sunday 11 January 2026
Tomorrow: Tuesday 13 January 2026
```

**Late night warning**: If run between midnight and 3am, shows a warning that "today" might mean yesterday from the user's perspective.

## Commands

### Basic (default)
```bash
.claude/skills/dates/scripts/date_context.sh basic
# Today, yesterday, tomorrow
```

### Week View
```bash
.claude/skills/dates/scripts/date_context.sh week
# This week Mon-Sun
```

### Offset
```bash
.claude/skills/dates/scripts/date_context.sh offset +3   # 3 days from now
.claude/skills/dates/scripts/date_context.sh offset -7   # 7 days ago
```

### Find Weekday
```bash
.claude/skills/dates/scripts/date_context.sh weekday Friday
# This Friday: Friday 17 January 2026
# Next Friday: Friday 24 January 2026
```

### Month Boundaries
```bash
.claude/skills/dates/scripts/date_context.sh month
# First and last day of current month
```

### Diary Paths
```bash
.claude/skills/dates/scripts/date_context.sh diary       # Today's diary path
.claude/skills/dates/scripts/date_context.sh diary -1    # Yesterday's diary path
.claude/skills/dates/scripts/date_context.sh diary -5    # Last 5 days with existence check
.claude/skills/dates/scripts/date_context.sh diary last  # Most recent existing diary
```

Example output for `-5`:
```
Recent diary entries (last 5 days):
  ✓ diary/2026/01/12-Mon.md (Monday 12 Jan)
  ✓ diary/2026/01/11-Sun.md (Sunday 11 Jan)
  ✗ diary/2026/01/10-Sat.md (Saturday 10 Jan) [MISSING]
  ✗ diary/2026/01/09-Fri.md (Friday 09 Jan) [MISSING]
  ✓ diary/2026/01/08-Thu.md (Thursday 08 Jan)
```

## Usage Notes

- **Always use this instead of calculating dates mentally**
- Run at session start to establish date context
- Use `offset` for scheduling tasks N days out
- Use `diary` to get correct diary file paths
