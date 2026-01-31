---
name: airtable
description: Rules and patterns for reading/writing Airtable bases via the MCP tool. Load this skill before any Airtable operation to avoid common API errors.
---

# Airtable

Reference guide for using the Airtable MCP. Airtable's API has non-obvious gotchas — follow this skill to avoid trial-and-error cycles.

---

## Pre-Flight Checklist (Before Every Write)

Run these steps **every time** before creating or updating records. Do not skip any.

1. **Check the project README** for the base ID and any CRM-specific conventions (field mappings, naming rules, workflow notes). Base IDs and table schemas live in project READMEs.
2. **`describe_table`** with full detail on the target table. Read the response carefully.
3. **Identify computed fields** — lookups, rollups, formulas, `aiText`. List them and do not include them in your payload. If a field looks writable but isn't (e.g. "Next steps", "Full name"), it's probably a lookup.
4. **Check select option values** — note the exact names and cases of all `singleSelect` / `multipleSelect` options. You'll need exact matches.
5. **Search before creating** — check for existing records before creating new ones to avoid duplicates. This applies to both primary records and linked records.

---

## Field Type Reference

| Field Type | Format | Example | Notes |
|------------|--------|---------|-------|
| `singleLineText` | String | `"Hello"` | |
| `multilineText` | String | `"Line 1\nLine 2"` | |
| `richText` | Markdown string | `"**bold** text"` | |
| `number` | Number | `42` | |
| `currency` | Number | `99.50` | |
| `percent` | Decimal (0–1) | `0.75` for 75% | |
| `date` | ISO string | `"2026-01-29"` | |
| `dateTime` | ISO string | `"2026-01-29T14:00:00.000Z"` | |
| `checkbox` | Boolean | `true` | |
| `singleSelect` | Exact option name | `"Todo"` | Case-sensitive, must match exactly |
| `multipleSelect` | Array of names | `["Tag A", "Tag B"]` | Case-sensitive |
| `multipleRecordLinks` | Array of record IDs | `["recXXXXX"]` | Always an array, even for one link |
| `email` | String | `"a@b.com"` | |
| `url` | String | `"https://..."` | |
| `phone` | String | `"+44..."` | |
| `singleCollaborator` | — | — | **Cannot set via API** without user ID. Skip — note in a text field instead. |
| `lookup` | — | — | **Read-only.** Never write. |
| `rollup` | — | — | **Read-only.** Never write. |
| `formula` | — | — | **Read-only.** Never write. |
| `aiText` | — | — | **Read-only.** Never write. |

---

## Common Mistakes

### Select fields: wrong value format
Select fields require the **exact option name as a plain string**, case-sensitive.

```jsonc
// ✅ Correct
{"Status": "Todo"}
{"Tags": ["Urgent", "Client-facing"]}

// ❌ Wrong — don't use {"name": ...} objects
{"Status": {"name": "Todo"}}

// ❌ Wrong — case mismatch
{"Status": "todo"}  // when the option is "Todo"
```

If a select write fails, re-run `describe_table` and check the exact option names before retrying.

### Linked records: not using arrays
Linked record fields always take arrays of record IDs, even for a single link.

```jsonc
// ✅ Correct
{"Company": ["recABC123"]}

// ❌ Wrong
{"Company": "recABC123"}
```

### Writing to computed fields
If a write returns a 422 error mentioning a field, check whether it's a lookup/rollup/formula. Remove it from the payload and retry.

---

## Error Recovery

**When a write fails:**

1. **Do not guess at a fix.** Re-run `describe_table` on the target table.
2. Compare your payload field-by-field against the schema.
3. Check: are you writing to a computed field? Is a select value misspelled? Is a linked record not wrapped in an array?
4. Fix the specific issue and retry.

**Never retry more than twice** on the same error. If it still fails after two informed retries, report the error to the user with the field name, your value, and the schema's expected type.

---

## Workflow Patterns

### Batch reads before writes
When updating multiple records, search/list them all first in one call, then write. Don't interleave reads and writes.

### One interaction per event
When logging meetings/interactions, create one record and link all attendees — don't create separate records per person.

### Deduplication
Before creating any record:
1. Search by the most unique field (email, name, title)
2. If a match exists, update it instead of creating a duplicate
3. For linked records, search for the target record first and use its ID

---

## Project-Specific Setup

Each project that uses Airtable should document in its README:

- **Base ID** (`appXXXXXX`)
- **Key table names** and their purposes
- **Non-obvious field mappings** (e.g. "the 'Owner' field is a lookup from Projects, not directly writable")
- **Workflow conventions** (e.g. "always set Status to 'Todo' on new actions, never 'In Progress'")
