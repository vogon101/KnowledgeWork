"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  RefreshCcw,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Folder,
  Calendar,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  CalendarClock,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { trpc } from "@/lib/trpc";

interface Routine {
  id: number;
  title: string;
  description: string | null;
  priority: number | null;
  recurrenceRule: string;
  recurrenceTime: string | null;
  recurrenceDays: string | null;
  ownerName: string | null;
  projectId: number | null;
  projectSlug: string | null;
  projectName: string | null;
  projectOrg: string | null;
  projectFullPath: string | null;
  lastCompleted: string | null;
  completionCount: number;
}

// Calculate the next due date for a routine
function getNextDueDate(routine: Routine): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Parse lastCompleted if exists
  let lastCompleted: Date | null = null;
  if (routine.lastCompleted) {
    lastCompleted = new Date(routine.lastCompleted);
  }

  // Parse recurrenceDays if exists
  let days: (string | number)[] = [];
  if (routine.recurrenceDays) {
    try {
      days = JSON.parse(routine.recurrenceDays);
    } catch {
      // Ignore parse errors
    }
  }

  switch (routine.recurrenceRule) {
    case "daily": {
      // Daily: next due is today if not completed today, else tomorrow
      if (lastCompleted && lastCompleted >= today) {
        return new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }
      return today;
    }

    case "weekly": {
      // Weekly: find next matching day
      const dayMap: Record<string, number> = {
        sunday: 0, sun: 0,
        monday: 1, mon: 1,
        tuesday: 2, tue: 2,
        wednesday: 3, wed: 3,
        thursday: 4, thu: 4,
        friday: 5, fri: 5,
        saturday: 6, sat: 6,
      };

      const targetDays = days
        .map((d) => dayMap[String(d).toLowerCase()])
        .filter((d) => d !== undefined)
        .sort((a, b) => a - b);

      if (targetDays.length === 0) {
        // No specific days, treat as weekly from last completed
        if (lastCompleted) {
          const next = new Date(lastCompleted);
          next.setDate(next.getDate() + 7);
          return next > today ? next : today;
        }
        return today;
      }

      // Find next target day
      const currentDay = today.getDay();
      for (const targetDay of targetDays) {
        if (targetDay > currentDay) {
          const next = new Date(today);
          next.setDate(today.getDate() + (targetDay - currentDay));
          // Check if already completed this week
          if (!lastCompleted || next > lastCompleted) {
            return next;
          }
        }
      }
      // If we're past all target days this week, get first day next week
      const daysUntilNext = 7 - currentDay + targetDays[0];
      const next = new Date(today);
      next.setDate(today.getDate() + daysUntilNext);
      return next;
    }

    case "monthly": {
      // Monthly: find next matching day of month
      const targetDates = days
        .map((d) => Number(d))
        .filter((d) => !isNaN(d) && d >= 1 && d <= 31)
        .sort((a, b) => a - b);

      if (targetDates.length === 0) {
        // No specific dates, use 1st of next month
        const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return next;
      }

      const currentDate = today.getDate();

      // Find next target date this month
      for (const targetDate of targetDates) {
        if (targetDate > currentDate) {
          const next = new Date(today.getFullYear(), today.getMonth(), targetDate);
          if (!lastCompleted || next > lastCompleted) {
            return next;
          }
        } else if (targetDate === currentDate) {
          // Check if already completed today
          if (!lastCompleted || lastCompleted < today) {
            return today;
          }
        }
      }

      // Move to next month
      const next = new Date(today.getFullYear(), today.getMonth() + 1, targetDates[0]);
      return next;
    }

    case "bimonthly": {
      // Every 2 months from last completed
      if (lastCompleted) {
        const next = new Date(lastCompleted);
        next.setMonth(next.getMonth() + 2);
        return next > today ? next : today;
      }
      return today;
    }

    case "yearly": {
      // Yearly from last completed
      if (lastCompleted) {
        const next = new Date(lastCompleted);
        next.setFullYear(next.getFullYear() + 1);
        return next > today ? next : today;
      }
      return today;
    }

    default:
      return today;
  }
}

// Format relative date
function formatNextDue(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  if (date <= today) {
    return "Today";
  }
  if (date <= tomorrow) {
    return "Tomorrow";
  }

  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 7) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return dayNames[date.getDay()];
  }

  // Format as "Jan 15" or "Feb 3"
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

interface Project {
  id: number;
  slug: string;
  name: string;
  org: string;
}

export default function RoutinesPage() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<number, Array<{ completedDate: string; notes: string | null }>>>({});
  const { showToast } = useToast();

  // tRPC queries
  const routinesQuery = trpc.routines.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();

  // tRPC mutations
  const createMutation = trpc.routines.create.useMutation({
    onSuccess: () => {
      routinesQuery.refetch();
      setShowCreate(false);
    },
    onError: () => showToast("Failed to create routine", "error"),
  });

  const updateMutation = trpc.routines.update.useMutation({
    onSuccess: () => {
      routinesQuery.refetch();
      setEditingId(null);
    },
    onError: () => showToast("Failed to update routine", "error"),
  });

  const deleteMutation = trpc.routines.delete.useMutation({
    onSuccess: () => routinesQuery.refetch(),
    onError: () => showToast("Failed to delete routine", "error"),
  });

  // Extract data from queries
  const routines: Routine[] = routinesQuery.data?.routines || [];
  const projects: Project[] = projectsQuery.data?.projects || [];

  // Sort routines by next due date
  const sortedRoutines = useMemo(() => {
    return [...routines].sort((a, b) => {
      const dateA = getNextDueDate(a);
      const dateB = getNextDueDate(b);
      return dateA.getTime() - dateB.getTime();
    });
  }, [routines]);

  // Use tRPC utils for imperative fetch
  const utils = trpc.useUtils();

  async function fetchHistory(routineId: number) {
    try {
      const data = await utils.routines.get.fetch({ id: routineId });
      if (data?.history) {
        const historyData = data.history.map((h) => ({
          completedDate: h.completed_date,
          notes: h.notes,
        }));
        setHistory((prev) => ({ ...prev, [routineId]: historyData }));
      }
    } catch {
      // Ignore
    }
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this routine?")) return;
    deleteMutation.mutate({ id });
  }

  function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!history[id]) {
        fetchHistory(id);
      }
    }
  }

  if (routinesQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (routinesQuery.isError) {
    return (
      <div className="min-h-screen p-6">
        <div className="text-red-400">Could not load routines</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <RefreshCcw className="h-6 w-6 text-purple-400" />
              Routines
            </h1>
            <p className="text-[13px] text-zinc-500 mt-1">
              {routines.length} routine templates
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[13px] bg-purple-600 hover:bg-purple-500 rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Routine
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mx-6 mt-6">
          <RoutineForm
            projects={projects}
            onSave={(data) => {
              createMutation.mutate(data as Parameters<typeof createMutation.mutate>[0]);
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Routines List */}
      <div className="p-6 space-y-3">
        {sortedRoutines.map((routine) => (
          <div
            key={routine.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden"
          >
            {editingId === routine.id ? (
              <div className="p-4">
                <RoutineForm
                  routine={routine}
                  projects={projects}
                  onSave={(data) => {
                    updateMutation.mutate({
                      id: routine.id,
                      data: data as Parameters<typeof updateMutation.mutate>[0]["data"],
                    });
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <>
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium">{routine.title}</span>
                      <span className="px-2 py-0.5 text-[11px] rounded bg-purple-500/20 text-purple-300 capitalize">
                        {routine.recurrenceRule}
                      </span>
                      {(() => {
                        const nextDue = getNextDueDate(routine);
                        const nextDueText = formatNextDue(nextDue);
                        const isToday = nextDueText === "Today";
                        return (
                          <span
                            className={`px-2 py-0.5 text-[11px] rounded flex items-center gap-1 ${
                              isToday
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-zinc-700/50 text-zinc-400"
                            }`}
                          >
                            <CalendarClock className="h-3 w-3" />
                            {nextDueText}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-[12px] text-zinc-500">
                      {routine.recurrenceTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {routine.recurrenceTime}
                        </span>
                      )}
                      {routine.recurrenceDays && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDays(routine.recurrenceRule, routine.recurrenceDays)}
                        </span>
                      )}
                      {routine.projectName && routine.projectOrg && (
                        <Link
                          href={`/projects/${routine.projectOrg}/${routine.projectFullPath || routine.projectSlug}`}
                          className="flex items-center gap-1 hover:text-zinc-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Folder className="h-3 w-3" />
                          {routine.projectName}
                        </Link>
                      )}
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {routine.completionCount} completions
                      </span>
                    </div>

                    {routine.description && (
                      <p className="mt-2 text-[13px] text-zinc-400">{routine.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleExpand(routine.id)}
                      className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                      title="View history"
                    >
                      {expandedId === routine.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingId(routine.id)}
                      className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(routine.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded History */}
                {expandedId === routine.id && (
                  <div className="border-t border-zinc-800 bg-zinc-950/50 p-4">
                    <h4 className="text-[12px] text-zinc-500 uppercase tracking-wider mb-2">
                      Recent Completions
                    </h4>
                    {history[routine.id]?.length > 0 ? (
                      <div className="space-y-1">
                        {history[routine.id].slice(0, 10).map((h, i) => (
                          <div key={i} className="text-[13px] text-zinc-400">
                            {h.completedDate}
                            {h.notes && <span className="text-zinc-500"> — {h.notes}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[13px] text-zinc-500">No completions yet</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {routines.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No routines yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 text-purple-400 hover:text-purple-300"
            >
              Create your first routine
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDays(rule: string, daysJson: string): string {
  try {
    const days = JSON.parse(daysJson);
    if (rule === "weekly") {
      return days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ");
    }
    if (rule === "monthly") {
      return days.map((d: number) => ordinal(d)).join(", ");
    }
    return daysJson;
  } catch {
    return daysJson;
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface RoutineFormProps {
  routine?: Routine;
  projects: Project[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

function RoutineForm({ routine, projects, onSave, onCancel }: RoutineFormProps) {
  const [title, setTitle] = useState(routine?.title || "");
  const [description, setDescription] = useState(routine?.description || "");
  const [recurrenceRule, setRecurrenceRule] = useState(routine?.recurrenceRule || "daily");
  const [recurrenceTime, setRecurrenceTime] = useState(routine?.recurrenceTime || "");
  const [recurrenceDays, setRecurrenceDays] = useState(routine?.recurrenceDays || "");
  const [projectId, setProjectId] = useState<number | null>(routine?.projectId || null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);

    let parsedDays = null;
    if (recurrenceDays.trim()) {
      try {
        parsedDays = JSON.parse(recurrenceDays);
      } catch {
        // Try parsing as comma-separated
        if (recurrenceRule === "weekly") {
          parsedDays = recurrenceDays.split(",").map((d) => d.trim().toLowerCase());
        } else if (recurrenceRule === "monthly") {
          parsedDays = recurrenceDays.split(",").map((d) => parseInt(d.trim()));
        }
      }
    }

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      recurrenceRule: recurrenceRule,
      recurrenceTime: recurrenceTime || undefined,
      recurrenceDays: parsedDays || undefined,
      projectId: projectId || undefined,
    });

    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] text-zinc-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-[14px] focus:outline-none focus:border-purple-500"
            placeholder="Routine name"
            required
          />
        </div>

        <div>
          <label className="block text-[12px] text-zinc-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-[14px] focus:outline-none focus:border-purple-500"
            placeholder="Optional description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-zinc-400 mb-1">Recurrence</label>
            <select
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-[14px] focus:outline-none focus:border-purple-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="bimonthly">Bimonthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] text-zinc-400 mb-1">Time (optional)</label>
            <input
              type="time"
              value={recurrenceTime}
              onChange={(e) => setRecurrenceTime(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-[14px] focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {(recurrenceRule === "weekly" || recurrenceRule === "monthly") && (
          <div>
            <label className="block text-[12px] text-zinc-400 mb-1">
              {recurrenceRule === "weekly" ? "Days (e.g., mon, wed, fri)" : "Days of month (e.g., 1, 15)"}
            </label>
            <input
              type="text"
              value={recurrenceDays}
              onChange={(e) => setRecurrenceDays(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-[14px] focus:outline-none focus:border-purple-500"
              placeholder={recurrenceRule === "weekly" ? "mon, wed, fri" : "1, 15"}
            />
          </div>
        )}

        <div>
          <label className="block text-[12px] text-zinc-400 mb-1">Project (optional)</label>
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-[14px] focus:outline-none focus:border-purple-500"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.org} / {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="px-3 py-1.5 text-[13px] bg-purple-600 hover:bg-purple-500 rounded-md transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : routine ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
