"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  StickyNote,
  X,
  Plus,
  Trash2,
  Send,
  Users,
  FileText,
  Lightbulb,
  ClipboardList,
  Check,
  Sparkles,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { useQuickNotes } from "./quick-notes-provider";
import { useToast } from "./toast";
import { useTerminal } from "./terminal-sidebar";
import { generatePrompt, type QuickNote as PromptQuickNote } from "@/prompts";

// Clickable tag that navigates to full page with filter
function MetadataTag({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const router = useRouter();
  const { close } = useQuickNotes();

  const values = value.split(/,\s*/).filter(Boolean);

  const handleClick = (v: string) => {
    close();
    router.push(`/quick-notes?filter=${encodeURIComponent(label.toLowerCase())}:${encodeURIComponent(v.trim())}`);
  };

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(v);
          }}
          className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50 hover:text-zinc-200 transition-colors"
        >
          {v.trim()}
        </button>
      ))}
    </div>
  );
}

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
    fields: { key: string; label: string; placeholder: string }[];
    defaultContent: string;
  }
> = {
  meeting: {
    label: "Meeting",
    icon: Users,
    color: "text-blue-400",
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
    fields: [
      { key: "category", label: "Category", placeholder: "feature, process, research" },
    ],
    defaultContent: "## The idea\n\n\n## Why it matters\n\n\n## Next steps to explore\n\n- ",
  },
  general: {
    label: "General",
    icon: StickyNote,
    color: "text-zinc-400",
    fields: [],
    defaultContent: "",
  },
};

/**
 * Generate a Claude prompt for processing a quick note.
 * Uses centralized prompt templates from @/prompts.
 */
function generateClaudePrompt(note: QuickNote): string {
  return generatePrompt({ note: note as PromptQuickNote });
}

export function QuickNotes() {
  const { isOpen, toggle, close } = useQuickNotes();
  const { showToast } = useToast();
  const terminal = useTerminal();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [activeNote, setActiveNote] = useState<QuickNote | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  // Load notes on mount
  useEffect(() => {
    fetchNotes();
  }, []);

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
      showToast("Note saved");
    } catch (err) {
      console.error("Failed to save note:", err);
      showToast("Failed to save note", "error");
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/quick-notes?id=${id}`, { method: "DELETE" });
      await fetchNotes();
      if (activeNote?.id === id) {
        setActiveNote(null);
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
    setActiveNote(newNote);
    setShowNewNote(false);
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
    close(); // Close quick notes panel after sending
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-900 shadow-lg transition-colors"
        title="Quick Notes (⌘.)"
      >
        <StickyNote className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] flex flex-col bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-zinc-200">Quick Notes</span>
          <span className="text-xs text-zinc-500">({notes.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewNote(true)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            title="New Note"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={close}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            title="Close (⌘.)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New Note Type Selector */}
      {showNewNote && (
        <div className="p-3 border-b border-zinc-800 bg-zinc-800/50">
          <div className="text-xs text-zinc-500 mb-2">Select note type:</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(NOTE_TEMPLATES) as [QuickNote["type"], typeof NOTE_TEMPLATES["meeting"]][]).map(
              ([type, template]) => {
                const Icon = template.icon;
                return (
                  <button
                    key={type}
                    onClick={() => createNewNote(type)}
                    className="flex flex-col items-center gap-1 p-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    <Icon className={`h-4 w-4 ${template.color}`} />
                    <span className="text-[10px] text-zinc-400">{template.label}</span>
                  </button>
                );
              }
            )}
          </div>
          <button
            onClick={() => setShowNewNote(false)}
            className="mt-2 text-xs text-zinc-500 hover:text-zinc-400"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Active Note Editor */}
      {activeNote && (
        <div className="flex-1 overflow-auto p-3 border-b border-zinc-800">
          <div className="space-y-3">
            {/* Type indicator */}
            <div className="flex items-center gap-2">
              {(() => {
                const template = NOTE_TEMPLATES[activeNote.type];
                const Icon = template.icon;
                return (
                  <>
                    <Icon className={`h-3.5 w-3.5 ${template.color}`} />
                    <span className="text-xs text-zinc-500">{template.label}</span>
                  </>
                );
              })()}
            </div>

            {/* Title */}
            <input
              type="text"
              placeholder="Title..."
              value={activeNote.title}
              onChange={(e) =>
                setActiveNote({ ...activeNote, title: e.target.value })
              }
              className="w-full px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />

            {/* Metadata fields */}
            {NOTE_TEMPLATES[activeNote.type].fields.map((field) => (
              <div key={field.key}>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {field.label}
                </label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={activeNote.metadata[field.key] || ""}
                  onChange={(e) =>
                    setActiveNote({
                      ...activeNote,
                      metadata: { ...activeNote.metadata, [field.key]: e.target.value },
                    })
                  }
                  className="w-full px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>
            ))}

            {/* Content */}
            <textarea
              placeholder="Note content..."
              value={activeNote.content}
              onChange={(e) =>
                setActiveNote({ ...activeNote, content: e.target.value })
              }
              className="w-full h-32 px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none font-mono"
            />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  saveNote(activeNote);
                  setActiveNote(null);
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded font-medium transition-colors"
              >
                Save Note
              </button>
              <button
                onClick={() => setActiveNote(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-auto min-h-0">
        {notes.length === 0 && !activeNote ? (
          <div className="p-4 text-center text-xs text-zinc-500">
            No quick notes yet. Click + to create one.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {notes.map((note) => {
              const template = NOTE_TEMPLATES[note.type];
              const Icon = template.icon;
              const hasMetadata = Object.keys(note.metadata).some(k => note.metadata[k]);
              return (
                <div
                  key={note.id}
                  className="p-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setActiveNote(note)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-3 w-3 ${template.color}`} />
                        <span className="text-xs font-medium text-zinc-300">
                          {note.title || "Untitled"}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 line-clamp-2">
                        {note.content.slice(0, 100)}
                      </div>
                      {/* Clickable metadata tags */}
                      {hasMetadata && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(note.metadata).map(([key, value]) =>
                            value ? (
                              <MetadataTag key={key} label={key} value={value} />
                            ) : null
                          )}
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-600 mt-1">
                        {format(new Date(note.createdAt), "d MMM HH:mm")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => sendToTerminal(note)}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-purple-400 transition-colors"
                        title="Send to AI"
                      >
                        {sentId === note.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => copyPrompt(note)}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-amber-400 transition-colors"
                        title="Copy prompt"
                      >
                        {copiedId === note.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
