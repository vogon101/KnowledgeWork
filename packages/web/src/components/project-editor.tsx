"use client";

import { useCallback, useEffect, useState } from "react";
import { Editor } from "./editor";
import { useToast } from "./toast";
import {
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Calendar,
} from "lucide-react";
import matter from "gray-matter";

interface StatusItem {
  emoji: string;
  text: string;
}

interface ProjectFrontmatter {
  title?: string;
  status?: string;
  priority?: number;
  tags?: string[];
  type?: string;
  parent?: string;
}

interface ProjectEditorProps {
  path: string;
  rawContent: string;
  frontmatter: ProjectFrontmatter;
  content: string;
  onSave: (raw: string) => Promise<void>;
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "planning", label: "Planning" },
  { value: "maintenance", label: "Maintenance" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

const priorityOptions = [
  { value: 1, label: "P1 - Highest" },
  { value: 2, label: "P2 - High" },
  { value: 3, label: "P3 - Medium" },
  { value: 4, label: "P4 - Low" },
  { value: 5, label: "P5 - Lowest" },
];

const emojiOptions = [
  { value: "🟢", label: "In Progress", icon: Clock, color: "text-blue-400" },
  { value: "🟡", label: "Needs Attention", icon: Circle, color: "text-amber-400" },
  { value: "🔴", label: "Blocked", icon: AlertCircle, color: "text-red-400" },
  { value: "✅", label: "Done", icon: CheckCircle2, color: "text-emerald-400" },
  { value: "⏳", label: "Waiting", icon: Clock, color: "text-purple-400" },
];

// Extract status items from markdown content
function extractStatusItems(content: string): StatusItem[] {
  const items: StatusItem[] = [];
  const statusLineRegex = /^[-*]\s*(✅|🟢|🟡|🔴|⏳)\s*\*?\*?([^*\n]+)\*?\*?/gm;
  let match;
  while ((match = statusLineRegex.exec(content)) !== null) {
    items.push({
      emoji: match[1],
      text: match[2].trim().replace(/\*\*/g, ""),
    });
  }
  return items;
}

// Extract Last updated date from content
function extractLastUpdated(content: string): string | undefined {
  const match = content.match(/\*\*Last updated:\*\*\s*(.+)/i);
  return match ? match[1].trim() : undefined;
}

// Rebuild content with updated status items
function rebuildContent(
  originalContent: string,
  statusItems: StatusItem[],
  lastUpdated?: string
): string {
  let content = originalContent;

  // Update Last updated date
  const lastUpdatedRegex = /\*\*Last updated:\*\*\s*.+/i;
  if (lastUpdated) {
    if (lastUpdatedRegex.test(content)) {
      content = content.replace(lastUpdatedRegex, `**Last updated:** ${lastUpdated}`);
    } else {
      // Try to insert after ## Current Status heading
      const currentStatusMatch = content.match(/^(##\s*Current Status.*\n)/m);
      if (currentStatusMatch) {
        const insertPos = content.indexOf(currentStatusMatch[0]) + currentStatusMatch[0].length;
        content = content.slice(0, insertPos) + `\n**Last updated:** ${lastUpdated}\n` + content.slice(insertPos);
      }
    }
  }

  // Find the Current Status section and replace status items
  const statusSectionRegex = /(##\s*Current Status[^\n]*\n(?:\s*\n)*(?:\*\*Last updated:\*\*[^\n]*\n(?:\s*\n)*)?)(?:[-*]\s*(?:✅|🟢|🟡|🔴|⏳)\s*[^\n]+\n)*/gm;
  const statusMatch = statusSectionRegex.exec(content);

  if (statusMatch) {
    // Build new status items section
    const statusItemsText = statusItems
      .map((item) => `- ${item.emoji} **${item.text}**`)
      .join("\n");

    // Replace old status items with new ones
    content = content.replace(statusSectionRegex, `$1${statusItemsText}\n`);
  }

  return content;
}

export function ProjectEditor({
  path,
  rawContent,
  frontmatter: initialFrontmatter,
  content: initialContent,
  onSave,
}: ProjectEditorProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"form" | "markdown">("form");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [frontmatter, setFrontmatter] = useState<ProjectFrontmatter>(initialFrontmatter);
  const [statusItems, setStatusItems] = useState<StatusItem[]>(extractStatusItems(initialContent));
  const [lastUpdated, setLastUpdated] = useState<string>(
    extractLastUpdated(initialContent) || ""
  );
  const [tagInput, setTagInput] = useState("");

  // Raw markdown state (for markdown tab)
  const [rawValue, setRawValue] = useState(rawContent);

  // Track changes
  useEffect(() => {
    // Rebuild content to check for changes
    const updatedContent = rebuildContent(initialContent, statusItems, lastUpdated);
    const newRaw = matter.stringify(updatedContent, frontmatter);
    setHasChanges(newRaw !== rawContent);
  }, [frontmatter, statusItems, lastUpdated, initialContent, rawContent]);

  // Handle form save
  const handleFormSave = useCallback(async () => {
    setSaving(true);
    try {
      const updatedContent = rebuildContent(initialContent, statusItems, lastUpdated);
      const newRaw = matter.stringify(updatedContent, frontmatter);
      await onSave(newRaw);
      setHasChanges(false);
      showToast("Project saved");
    } catch (error) {
      console.error("Save failed:", error);
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }, [frontmatter, statusItems, lastUpdated, initialContent, onSave, showToast]);

  // Handle raw markdown save
  const handleMarkdownSave = useCallback(
    async (content: string) => {
      await onSave(content);
      // Update form state from new content
      const { data, content: body } = matter(content);
      setFrontmatter(data as ProjectFrontmatter);
      setStatusItems(extractStatusItems(body));
      setLastUpdated(extractLastUpdated(body) || "");
      setRawValue(content);
    },
    [onSave]
  );

  // Update frontmatter field
  const updateFrontmatter = <K extends keyof ProjectFrontmatter>(
    key: K,
    value: ProjectFrontmatter[K]
  ) => {
    setFrontmatter((prev) => ({ ...prev, [key]: value }));
  };

  // Status items handlers
  const addStatusItem = () => {
    setStatusItems((prev) => [...prev, { emoji: "🟢", text: "" }]);
  };

  const updateStatusItem = (index: number, field: keyof StatusItem, value: string) => {
    setStatusItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeStatusItem = (index: number) => {
    setStatusItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Tags handlers
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !frontmatter.tags?.includes(tag)) {
      updateFrontmatter("tags", [...(frontmatter.tags || []), tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    updateFrontmatter(
      "tags",
      (frontmatter.tags || []).filter((t) => t !== tag)
    );
  };

  // Set last updated to today
  const setToday = () => {
    const today = new Date();
    const formatted = today.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    setLastUpdated(formatted);
  };

  // Sync raw value when switching tabs
  useEffect(() => {
    if (activeTab === "markdown") {
      const updatedContent = rebuildContent(initialContent, statusItems, lastUpdated);
      const newRaw = matter.stringify(updatedContent, frontmatter);
      setRawValue(newRaw);
    }
  }, [activeTab, frontmatter, statusItems, lastUpdated, initialContent]);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-4 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === "form"
                ? "text-zinc-100 bg-zinc-800/50 border-b-2 border-blue-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setActiveTab("markdown")}
            className={`px-4 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === "markdown"
                ? "text-zinc-100 bg-zinc-800/50 border-b-2 border-blue-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Markdown
          </button>
        </div>
        {activeTab === "form" && (
          <div className="pr-2">
            <button
              onClick={handleFormSave}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${
                hasChanges
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : hasChanges ? "Save" : "Saved"}
            </button>
          </div>
        )}
      </div>

      {activeTab === "form" ? (
        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
              Basic Info
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Title */}
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Title</label>
                <input
                  type="text"
                  value={frontmatter.title || ""}
                  onChange={(e) => updateFrontmatter("title", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-[13px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  placeholder="Project title"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Status</label>
                <select
                  value={frontmatter.status || ""}
                  onChange={(e) => updateFrontmatter("status", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-[13px] text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select status</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Priority</label>
                <select
                  value={frontmatter.priority || ""}
                  onChange={(e) =>
                    updateFrontmatter(
                      "priority",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-[13px] text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">No priority</option>
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Last Updated */}
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Last Updated</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lastUpdated}
                    onChange={(e) => setLastUpdated(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-[13px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    placeholder="15 January 2026"
                  />
                  <button
                    onClick={setToday}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {(frontmatter.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-[12px] text-zinc-300"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[12px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  placeholder="Add tag"
                />
                <button
                  onClick={addTag}
                  className="p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Status Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                Status Items
              </h3>
              <button
                onClick={addStatusItem}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>
            <div className="space-y-2">
              {statusItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={item.emoji}
                    onChange={(e) => updateStatusItem(index, "emoji", e.target.value)}
                    className="px-2 py-2 bg-zinc-800 border border-zinc-700 rounded text-[14px] focus:outline-none focus:border-blue-500"
                  >
                    {emojiOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateStatusItem(index, "text", e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-[13px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    placeholder="Status item text"
                  />
                  <button
                    onClick={() => removeStatusItem(index)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {statusItems.length === 0 && (
                <p className="text-[12px] text-zinc-600 italic">
                  No status items. Add items with emojis like 🟢, 🟡, 🔴, ✅
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Editor content={rawValue} onSave={handleMarkdownSave} />
      )}
    </div>
  );
}
