"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  StickyNote,
  Trash2,
  Users,
  FileText,
  Lightbulb,
  ClipboardList,
  Check,
  Copy,
  X,
  Filter,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { useTerminal } from "@/components/terminal-sidebar";

interface QuickNote {
  id: string;
  type: "meeting" | "project-update" | "task" | "idea" | "general";
  title: string;
  content: string;
  metadata: Record<string, string>;
  createdAt: string;
}

const NOTE_TEMPLATES: Record<
  QuickNote["type"],
  {
    label: string;
    icon: typeof StickyNote;
    color: string;
    bgColor: string;
    fields: { key: string; label: string; placeholder: string }[];
    defaultContent: string;
  }
> = {
  meeting: {
    label: "Meeting",
    icon: Users,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    fields: [
      { key: "date", label: "Date", placeholder: "today, yesterday, 14 Jan" },
      { key: "attendees", label: "Attendees", placeholder: "John, Sarah, Mike" },
      { key: "location", label: "Location", placeholder: "Office, Online, etc." },
      { key: "projects", label: "Projects", placeholder: "grid-management, map" },
    ],
    defaultContent: "## Discussion\n\n- \n\n## Decisions\n\n- \n\n## Actions\n\n- ",
  },
  "project-update": {
    label: "Project Update",
    icon: FileText,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    fields: [
      { key: "project", label: "Project", placeholder: "grid-management" },
      { key: "status", label: "Status", placeholder: "in-progress / blocked / done" },
    ],
    defaultContent: "## What happened\n\n\n## Next steps\n\n- ",
  },
  task: {
    label: "Task",
    icon: ClipboardList,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    fields: [
      { key: "project", label: "Project", placeholder: "CBP / Nuclear" },
      { key: "due", label: "Due", placeholder: "tomorrow, next Monday" },
      { key: "priority", label: "Priority", placeholder: "1-4" },
    ],
    defaultContent: "",
  },
  idea: {
    label: "Idea",
    icon: Lightbulb,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    fields: [
      { key: "category", label: "Category", placeholder: "feature, process, research" },
    ],
    defaultContent: "## The idea\n\n\n## Why it matters\n\n\n## Next steps to explore\n\n- ",
  },
  general: {
    label: "General",
    icon: StickyNote,
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10",
    fields: [],
    defaultContent: "",
  },
};

function generateClaudePrompt(note: QuickNote): string {
  const template = NOTE_TEMPLATES[note.type];
  const today = format(new Date(), "yyyy-MM-dd");

  let prompt = `I have a quick note that needs to be processed. Please help me file this properly.\n\n`;
  prompt += `**Note Type:** ${template.label}\n`;
  prompt += `**Title:** ${note.title}\n`;
  prompt += `**Created:** ${format(new Date(note.createdAt), "d MMM yyyy HH:mm")}\n`;

  if (Object.keys(note.metadata).length > 0) {
    prompt += `\n**Metadata:**\n`;
    for (const [key, value] of Object.entries(note.metadata)) {
      if (value) prompt += `- ${key}: ${value}\n`;
    }
  }

  prompt += `\n**Content:**\n\`\`\`\n${note.content}\n\`\`\`\n\n`;

  const notePath = `_quick-notes/${note.id}.json`;

  switch (note.type) {
    case "meeting":
      const meetingDate = note.metadata.date || today;
      const meetingLocation = note.metadata.location ? `, location: ${note.metadata.location}` : "";
      const meetingProjects = note.metadata.projects ? `, projects: [${note.metadata.projects}]` : "";
      prompt += `**Instructions:**
1. Create a proper meeting note file at the appropriate location
2. Use the meeting note format from DOCUMENT-FORMATS.md
3. Add proper frontmatter (title, date: ${meetingDate}, attendees${meetingLocation}${meetingProjects}, status: completed)
4. Extract any action items into the Actions table (use 5-column format with Project column if multiple projects)
5. Link from the diary entry for ${meetingDate}`;
      break;

    case "project-update":
      prompt += `**Instructions:**
1. Update the project's README.md with this status update
2. Add to the Current Status section with appropriate emoji (🟢/🟡/🔴)
3. Update the "Last updated" date
4. Add any new todos to the checklist
5. Note this in today's diary Work Log`;
      break;

    case "task":
      prompt += `**Instructions:**
1. Create this task in Todoist using the todoist skill
2. Use the project specified (or ask if unclear)
3. Set the due date and priority as specified
4. Add to today's diary Tasks for Today section if due today`;
      break;

    case "idea":
      prompt += `**Instructions:**
1. Decide where this idea belongs:
   - If it's actionable soon → create Todoist task in "Backlog & Ideas"
   - If it needs research → create a note in the relevant project's context/ folder
   - If it's a feature idea → add to the relevant project's README or a dedicated ideas section`;
      break;

    case "general":
      prompt += `**Instructions:**
1. Read the content and determine what type of note this is
2. File it appropriately based on content (diary, project, meeting, etc.)
3. Ask me if you're unsure where it should go`;
      break;
  }

  prompt += `\n\n**After processing:** Use the AskUserQuestion tool to confirm the quick note has been processed correctly and ask if it can be deleted.`;
  prompt += `\n\n**Quick note path:** \`${notePath}\``;

  return prompt;
}

interface ActiveFilter {
  key: string;
  value: string;
}

// Clickable tag component
function MetadataTag({
  label,
  value,
  onFilter,
  isActive
}: {
  label: string;
  value: string;
  onFilter: (key: string, value: string) => void;
  isActive?: boolean;
}) {
  // Split comma-separated values into individual tags
  const values = value.split(/,\s*/).filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onFilter(label.toLowerCase(), v.trim());
          }}
          className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
            isActive
              ? "bg-amber-500/30 text-amber-300"
              : "bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-200"
          }`}
        >
          {v.trim()}
        </button>
      ))}
    </div>
  );
}

function QuickNotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const terminal = useTerminal();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<QuickNote | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActiveFilter | null>(null);

  // Parse filter from URL on mount
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam) {
      const [key, value] = filterParam.split(":");
      if (key && value) {
        setFilter({ key: decodeURIComponent(key), value: decodeURIComponent(value) });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNotes();
  }, []);

  // Filter notes based on active filter
  const filteredNotes = useMemo(() => {
    if (!filter) return notes;

    return notes.filter((note) => {
      // Check metadata fields
      const metadataValue = note.metadata[filter.key];
      if (metadataValue) {
        const values = metadataValue.split(/,\s*/).map(v => v.trim().toLowerCase());
        if (values.includes(filter.value.toLowerCase())) {
          return true;
        }
      }

      // Check note type
      if (filter.key === "type" && note.type === filter.value) {
        return true;
      }

      return false;
    });
  }, [notes, filter]);

  const handleFilter = (key: string, value: string) => {
    // Toggle filter off if clicking same filter
    if (filter?.key === key && filter?.value === value) {
      setFilter(null);
      router.push("/quick-notes");
    } else {
      setFilter({ key, value });
      router.push(`/quick-notes?filter=${encodeURIComponent(key)}:${encodeURIComponent(value)}`);
    }
  };

  const clearFilter = () => {
    setFilter(null);
    router.push("/quick-notes");
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/quick-notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
  };

  const saveNote = async (note: QuickNote) => {
    try {
      await fetch("/api/quick-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
      await fetchNotes();
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/quick-notes?id=${id}`, { method: "DELETE" });
      await fetchNotes();
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const createNewNote = (type: QuickNote["type"]) => {
    const template = NOTE_TEMPLATES[type];
    const newNote: QuickNote = {
      id: `note-${Date.now()}`,
      type,
      title: "",
      content: template.defaultContent,
      metadata: {},
      createdAt: new Date().toISOString(),
    };
    setSelectedNote(newNote);
  };

  const copyPrompt = async (note: QuickNote) => {
    const prompt = generateClaudePrompt(note);
    await navigator.clipboard.writeText(prompt);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendToTerminal = (note: QuickNote) => {
    const prompt = generateClaudePrompt(note);
    terminal.sendPrompt(prompt, {
      type: note.type === "meeting" ? "meeting" : "general",
      title: note.title || "Quick Note",
    });
    setSentId(note.id);
    setTimeout(() => setSentId(null), 2000);
  };

  const updateSelectedNote = (updates: Partial<QuickNote>) => {
    if (selectedNote) {
      setSelectedNote({ ...selectedNote, ...updates });
    }
  };

  return (
    <div className="h-screen flex">
      {/* Notes List - Left Panel */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950/50">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-400" />
              <h1 className="text-lg font-semibold text-zinc-100">Quick Notes</h1>
            </div>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
              {filter ? `${filteredNotes.length}/${notes.length}` : notes.length} notes
            </span>
          </div>

          {/* Active Filter */}
          {filter && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <Filter className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-amber-300">
                {filter.key}: <strong>{filter.value}</strong>
              </span>
              <button
                onClick={clearFilter}
                className="ml-auto p-0.5 rounded hover:bg-amber-500/20 text-amber-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* New Note Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(NOTE_TEMPLATES) as [QuickNote["type"], typeof NOTE_TEMPLATES["meeting"]][]).map(
              ([type, template]) => {
                const Icon = template.icon;
                return (
                  <button
                    key={type}
                    onClick={() => createNewNote(type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded ${template.bgColor} hover:opacity-80 transition-opacity`}
                  >
                    <Icon className={`h-4 w-4 ${template.color}`} />
                    <span className="text-[10px] text-zinc-400">{template.label}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">
              {filter ? (
                <>
                  No notes match this filter.<br />
                  <button onClick={clearFilter} className="text-amber-400 hover:text-amber-300 mt-1">
                    Clear filter
                  </button>
                </>
              ) : (
                <>
                  No quick notes yet.<br />
                  Click a type above to create one.
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {filteredNotes.map((note) => {
                const template = NOTE_TEMPLATES[note.type];
                const Icon = template.icon;
                const isSelected = selectedNote?.id === note.id;
                const hasMetadata = Object.keys(note.metadata).some(k => note.metadata[k]);
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-zinc-800"
                        : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFilter("type", note.type);
                        }}
                        className={`p-1.5 rounded ${template.bgColor} hover:opacity-80 transition-opacity`}
                        title={`Filter by ${template.label}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${template.color}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">
                          {note.title || "Untitled"}
                        </div>
                        <div className="text-xs text-zinc-500 truncate mt-0.5">
                          {note.content.slice(0, 60).replace(/\n/g, " ")}
                        </div>
                        {/* Clickable metadata tags */}
                        {hasMetadata && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {Object.entries(note.metadata).map(([key, value]) =>
                              value ? (
                                <MetadataTag
                                  key={key}
                                  label={key}
                                  value={value}
                                  onFilter={handleFilter}
                                  isActive={filter?.key === key && value.toLowerCase().includes(filter.value.toLowerCase())}
                                />
                              ) : null
                            )}
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-600 mt-1">
                          {format(new Date(note.createdAt), "d MMM HH:mm")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor - Right Panel */}
      <div className="flex-1 flex flex-col bg-zinc-900">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                {(() => {
                  const template = NOTE_TEMPLATES[selectedNote.type];
                  const Icon = template.icon;
                  return (
                    <>
                      <div className={`p-2 rounded-lg ${template.bgColor}`}>
                        <Icon className={`h-5 w-5 ${template.color}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-300">{template.label}</div>
                        <div className="text-xs text-zinc-500">
                          Created {format(new Date(selectedNote.createdAt), "d MMM yyyy HH:mm")}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => sendToTerminal(selectedNote)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm"
                >
                  {sentId === selectedNote.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      Sent!
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Send to AI
                    </>
                  )}
                </button>
                <button
                  onClick={() => copyPrompt(selectedNote)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors text-sm"
                >
                  {copiedId === selectedNote.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Prompt
                    </>
                  )}
                </button>
                <button
                  onClick={() => deleteNote(selectedNote.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-3xl space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Note title..."
                    value={selectedNote.title}
                    onChange={(e) => updateSelectedNote({ title: e.target.value })}
                    className="w-full px-4 py-3 text-lg bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  />
                </div>

                {/* Metadata fields */}
                {NOTE_TEMPLATES[selectedNote.type].fields.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {NOTE_TEMPLATES[selectedNote.type].fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                          {field.label}
                        </label>
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={selectedNote.metadata[field.key] || ""}
                          onChange={(e) =>
                            updateSelectedNote({
                              metadata: { ...selectedNote.metadata, [field.key]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                        />
                        {/* Show clickable tags below input if value exists */}
                        {selectedNote.metadata[field.key] && (
                          <div className="mt-2">
                            <MetadataTag
                              label={field.key}
                              value={selectedNote.metadata[field.key]}
                              onFilter={handleFilter}
                              isActive={filter?.key === field.key}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                    Content
                  </label>
                  <textarea
                    placeholder="Note content..."
                    value={selectedNote.content}
                    onChange={(e) => updateSelectedNote({ content: e.target.value })}
                    className="w-full h-96 px-4 py-3 text-sm bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none font-mono leading-relaxed"
                  />
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      saveNote(selectedNote);
                    }}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-lg font-medium transition-colors"
                  >
                    Save Note
                  </button>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="px-4 py-2.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <StickyNote className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-sm">
                Select a note to edit or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main export wrapped in Suspense for useSearchParams
export default function QuickNotesPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <StickyNote className="h-12 w-12 text-zinc-700 mx-auto mb-4 animate-pulse" />
          <p className="text-zinc-500 text-sm">Loading quick notes...</p>
        </div>
      </div>
    }>
      <QuickNotesContent />
    </Suspense>
  );
}
