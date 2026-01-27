/**
 * General note prompt instructions.
 */

import type { QuickNote } from "../index";

export function getGeneralPrompt(note: QuickNote): string {
  return `## Process General Note

This note doesn't have a specific type. Analyze the content to determine how to file it.

### Instructions

1. **Analyze the content** to determine what type of note this is:

   | Content Pattern | Likely Type | Action |
   |-----------------|-------------|--------|
   | Names + discussion points | Meeting notes | Create meeting file |
   | Action items, todos, "need to" | Task(s) | Create task(s) |
   | "What if", "idea:", speculation | Idea | File as idea |
   | Project status, progress update | Project update | Update project README |
   | Personal reflection, diary-like | Diary | Add to today's diary |
   | Reference info, facts to remember | Context note | Save to relevant context/ |

2. **If it contains multiple types**, propose handling each part:
   - "This note contains both meeting notes and action items"
   - Offer to create meeting file AND create tasks

3. **If unclear**, ask the user:
   \`\`\`json
   {
     "questions": [{
       "question": "How should I file this note?",
       "header": "Note type",
       "options": [
         {"label": "Meeting notes", "description": "Create a meeting file with attendees and actions"},
         {"label": "Task(s)", "description": "Extract and create actionable tasks"},
         {"label": "Diary entry", "description": "Add to today's diary"},
         {"label": "Context note", "description": "Save as reference material"}
       ],
       "multiSelect": false
     }]
   }
   \`\`\`

4. **Always offer to add to diary**:
   - Even if filed elsewhere, general notes often warrant a diary mention
   - "Also add summary to today's diary?"

### Content Analysis Hints

**Meeting indicators:**
- Multiple people's names
- "discussed", "agreed", "decided"
- Time/date references to a past event
- "call with", "met with"

**Task indicators:**
- "need to", "should", "must", "TODO"
- Future-oriented action language
- Deadlines or timeframes
- Assigned responsibilities

**Idea indicators:**
- "what if", "could we", "maybe"
- Speculative language
- No concrete deadline or assignment
- Exploratory questions

**Update indicators:**
- "finished", "completed", "done"
- Progress language
- Status descriptions
- "now working on"
`;
}
