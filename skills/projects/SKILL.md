---
name: projects
description: Project slug validation and discovery. Use to validate project references in meetings and actions.
allowed-tools: Bash(.claude/skills/projects/scripts/*:*), Grep, Glob
---

# Project Utilities

Helpers for working with project structure.

## Valid Project Slugs

Discover valid project references (folders + workstreams) for use in meeting frontmatter, actions tables, etc.

```bash
.claude/skills/projects/scripts/valid_slugs.sh [options]
```

### Options

| Option | Description |
|--------|-------------|
| (none) | Show all valid slugs |
| `folders` | Show only project folders |
| `workstreams` | Show only workstreams |
| `--org ORG` | Filter by organisation |
| `--check SLUG` | Check if a slug is valid |

### Examples

```bash
# List all valid project slugs
.claude/skills/projects/scripts/valid_slugs.sh

# Only project folders
.claude/skills/projects/scripts/valid_slugs.sh folders

# Only workstreams
.claude/skills/projects/scripts/valid_slugs.sh workstreams

# Filter by organisation
.claude/skills/projects/scripts/valid_slugs.sh --org example-org

# Check if a slug is valid (useful before creating/editing meetings)
.claude/skills/projects/scripts/valid_slugs.sh --check nuclear
.claude/skills/projects/scripts/valid_slugs.sh --check invalid-slug
```

### When to Use

- **Before creating meetings**: Check valid slugs for `project:` field
- **When converting to multi-project**: Verify all slugs in `projects:` array
- **In actionreview**: Validate project references in Actions tables
- **When unsure**: Use `--check` to verify a specific slug

---

## Creating New Projects

**CRITICAL**: Projects must exist in BOTH places:
1. **Filesystem** — folder at `{org}/projects/{slug}/` with README.md
2. **Task database** — row in `projects` table

When creating a new project folder, you **MUST** also add it to the task database. Without this sync, the system breaks.

### Steps to Create a New Project

1. **Create the folder structure**:
   ```bash
   mkdir -p {org}/projects/{slug}
   ```

2. **Create README.md** with proper frontmatter (see DOCUMENT-FORMATS.md)

3. **Add to the task database** via the task CLI:
   ```bash
   .claude/skills/task-cli/scripts/task-cli.sh create project "Project Name" --org ORG --slug SLUG --description "Description"
   ```

4. **Update the org README.md** to include the new project in the Projects table

### Valid Organisations

- `acme-corp` - Acme Corp
- `example-org` - Centre for Example Org
- `personal` - Personal projects
- `consulting` - Consulting work

---

## Validating Project References

Use this when auditing meetings, Actions tables, or any content that references projects.

### Quick Validation

```bash
# Check a single slug
.claude/skills/projects/scripts/valid_slugs.sh --check analytics-dashboard
# Output: ✓ analytics-dashboard (example-org/projects/analytics-dashboard)

.claude/skills/projects/scripts/valid_slugs.sh --check nuclear
# Output: ✗ nuclear is not a valid slug
#         Did you mean: analytics-dashboard?
```

### Bulk Validation for Meetings

When auditing meetings for invalid project references:

```bash
# Step 1: Get all valid slugs
VALID_SLUGS=$(.claude/skills/projects/scripts/valid_slugs.sh)

# Step 2: Find frontmatter project references
grep -rh "^project:" */meetings/**/*.md | sed 's/project: //' | sort -u

# Step 3: Find projects array references
grep -rh -A5 "^projects:" */meetings/**/*.md | grep "^  - " | sed 's/  - //' | sort -u

# Step 4: Find Actions table Project column values
grep -rh "| T-[0-9]" */meetings/**/*.md | awk -F'|' '{print $4}' | tr -d ' ' | sort -u
```

### Common Invalid Patterns

| Invalid | Correct | Why |
|---------|---------|-----|
| `acme-corp` | (omit or use specific project) | Org name, not project |
| `example-org` | (omit or use specific project) | Org name, not project |
| `nuclear` | `analytics-dashboard` | Abbreviated name |
| `sv-usa` | `inventory-system` | Abbreviated name |
| `Street Votes USA` | `inventory-system` | Display name, not slug |

### What to Check

1. **Frontmatter `project:`** — must be a valid slug or omitted
2. **Frontmatter `projects:` array** — each item must be a valid slug
3. **Actions table Project column** — each value must be a valid slug or empty
