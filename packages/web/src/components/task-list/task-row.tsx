"use client";

import {
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  MoreHorizontal,
  Loader2,
  MessageCircle,
  Info,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Task } from "@/lib/task-db";
import { useRouter } from "next/navigation";
import { formatDisplayDate, getPriorityBorderColor } from "@/lib/date-parser";
import { TaskDetailModal } from "../task-detail-popover";
import { statusConfig, formatTargetPeriod } from "./config";
import { useTaskMutations, type TaskStatus } from "./use-task-mutations";
import { Badge, PriorityBadge, StatusBadge, OrgBadge } from "../ui/badge";

export interface TaskRowProps {
  task: Task;
  showProject: boolean;
  showMeeting: boolean;
  compact: boolean;
  interactive: boolean;
  showOwnerInTitle?: boolean; // Show owner as "Owner | Task" format (for viewing others' tasks)
  onTaskUpdate?: () => void;
  onRefresh?: () => void;
}

export function TaskRow({
  task,
  showProject,
  showMeeting,
  compact,
  interactive,
  showOwnerInTitle,
  onTaskUpdate,
  onRefresh,
}: TaskRowProps) {
  const [showActions, setShowActions] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use onRefresh if provided, otherwise fall back to router.refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  }, [onRefresh, router]);

  // Use the shared mutations hook
  const {
    feedback,
    isUpdating,
    isAddingNote,
    updateStatus,
    addNote,
    rescheduleDueDate,
  } = useTaskMutations({
    onSuccess: () => {
      handleRefresh();
      onTaskUpdate?.();
    },
  });

  // Calculate reschedule dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const nextMonday = new Date(today);
  const daysUntilMonday = ((1 - today.getDay()) + 7) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  const nextMondayStr = nextMonday.toISOString().split("T")[0];

  // Check if task is overdue (due date is before today, not including today)
  const isOverdue = task.dueDate &&
    new Date(task.dueDate) < today &&
    task.status !== "complete" &&
    task.status !== "cancelled";

  const loading = isUpdating || isAddingNote;

  const config = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  const priorityBorder = getPriorityBorderColor(task.priority);

  // Close actions menu when clicking outside
  useEffect(() => {
    if (!showActions) return;
    const handleClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showActions]);

  // Handle note submission
  const handleAddNote = useCallback(() => {
    if (!noteText.trim()) return;
    addNote(task.id, noteText);
    setNoteText("");
    setShowNoteInput(false);
  }, [task.id, noteText, addNote]);

  const handleAction = (action: string) => {
    setShowActions(false);

    switch (action) {
      case "complete":
        updateStatus(task.id, "complete");
        break;
      case "start":
        updateStatus(task.id, "in_progress");
        break;
      case "block":
        updateStatus(task.id, "blocked");
        break;
      case "defer":
        updateStatus(task.id, "deferred");
        break;
      case "note":
        setShowNoteInput(true);
        break;
    }
  };

  const handleStatusClick = () => {
    if (!interactive || loading) return;
    if (task.status === "pending") {
      handleAction("start");
    } else if (task.status === "in_progress") {
      handleAction("complete");
    }
  };

  // Handle click to open task detail modal
  const handleRowClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    // Don't open modal if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    e.preventDefault();
    e.stopPropagation();
    setDetailModalOpen(true);
  };

  return (
    <div className={`${compact ? "" : "relative"}`}>
      <div
        onClick={handleRowClick}
        className={`group flex items-start gap-2 ${
          compact
            ? "py-2 px-2 bg-zinc-800/40 rounded-md border border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600/50"
            : "p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/40 hover:bg-zinc-800/50 hover:border-zinc-600/50"
        } ${
          loading ? "opacity-50" : ""
        } border-l-2 ${priorityBorder} ${interactive ? "cursor-pointer" : ""} transition-colors`}
      >
        {/* Status icon - clickable */}
        <button
          onClick={handleStatusClick}
          disabled={
            !interactive ||
            loading ||
            task.status === "complete" ||
            task.status === "cancelled"
          }
          className={`mt-0.5 flex-shrink-0 ${
            interactive &&
            !loading &&
            task.status !== "complete" &&
            task.status !== "cancelled"
              ? "cursor-pointer hover:scale-110 transition-transform"
              : ""
          }`}
          title={
            loading
              ? "Updating..."
              : task.status === "pending"
              ? "Click to start"
              : task.status === "in_progress"
              ? "Click to complete"
              : undefined
          }
        >
          {loading ? (
            <Loader2 className={`h-4 w-4 ${config.color} animate-spin`} />
          ) : (
            <Icon className={`h-4 w-4 ${config.color}`} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {/* Task ID */}
            <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">
              {task.displayId}
            </span>

            {/* Title (with optional Owner | prefix) */}
            <span
              className={`text-[13px] ${
                task.status === "complete"
                  ? "text-zinc-500 line-through"
                  : "text-zinc-200"
              }`}
            >
              {showOwnerInTitle && task.ownerName && (
                <><span className="text-zinc-400 font-medium">{task.ownerName}</span><span className="text-zinc-500 mx-1.5">|</span></>
              )}
              {task.title}
            </span>

            {/* Feedback toast */}
            {feedback && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  feedback.type === "success"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {feedback.message}
              </span>
            )}
          </div>

          {/* Meta row - smaller text */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {/* Owner (skip if already shown in title) */}
            {!showOwnerInTitle && task.ownerName && (
              <span className="text-[10px] text-zinc-500">{task.ownerName}</span>
            )}

            {/* Due date - prominent badge */}
            {task.dueDate && (
              <Badge
                variant={new Date(task.dueDate) < new Date() && task.status !== "complete" ? "danger" : "default"}
                size="md"
              >
                {formatDisplayDate(task.dueDate)}
              </Badge>
            )}

            {/* Reschedule buttons for overdue tasks */}
            {isOverdue && interactive && (
              <span className="inline-flex items-center gap-0.5 ml-1">
                <button
                  onClick={(e) => { e.stopPropagation(); rescheduleDueDate(task.id, todayStr); }}
                  disabled={loading}
                  className="px-1 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                  title="Reschedule to today"
                >
                  Today
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); rescheduleDueDate(task.id, tomorrowStr); }}
                  disabled={loading}
                  className="px-1 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                  title="Reschedule to tomorrow"
                >
                  Tmrw
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); rescheduleDueDate(task.id, nextMondayStr); }}
                  disabled={loading}
                  className="px-1 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                  title="Reschedule to next Monday"
                >
                  Mon
                </button>
              </span>
            )}

            {/* Check-in date - prominent badge */}
            {task.checkinBy && (
              <Badge variant="purple" size="md">
                Check-in: {formatDisplayDate(task.checkinBy)}
              </Badge>
            )}

            {/* Target period */}
            {task.targetPeriod && (
              <span className="text-[10px] text-zinc-600">
                {formatTargetPeriod(task.targetPeriod)}
              </span>
            )}

            {/* Project - org badge + project path (hide path for general projects) */}
            {showProject && task.projectSlug && (
              <span className="inline-flex items-center gap-1">
                <OrgBadge
                  org={task.projectOrg || "other"}
                  color={task.projectOrgColor}
                  shortName={task.projectOrgShortName}
                  size="md"
                />
                {/* Only show project path if NOT a general project */}
                {!task.projectIsGeneral && (
                  <span className="text-[10px] text-zinc-400">
                    {task.projectFullPath || task.projectSlug}
                  </span>
                )}
              </span>
            )}

            {/* Source meeting */}
            {showMeeting && task.sourceMeetingTitle && (
              <span className="text-[10px] text-zinc-600">
                {task.sourceMeetingTitle}
              </span>
            )}
          </div>
        </div>

        {/* Right side badges + actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Priority badge */}
          <PriorityBadge priority={task.priority} size="sm" />

          {/* Status badge (non-compact) */}
          {!compact && task.status !== "pending" && (
            <StatusBadge status={task.status} size="sm" />
          )}

          {/* Subtask count */}
          {task.subtaskCount > 0 && (
            <span className="text-[9px] text-zinc-500">
              {task.subtasksComplete}/{task.subtaskCount}
            </span>
          )}

          {/* Task detail button */}
          {interactive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDetailModalOpen(true);
              }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-opacity"
              title="View task details (or Alt+Click row)"
            >
              <Info className="h-3 w-3 text-zinc-400" />
            </button>
          )}

          {/* Actions menu */}
          {interactive &&
            task.status !== "complete" &&
            task.status !== "cancelled" && (
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  disabled={loading}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-opacity disabled:opacity-50"
                >
                  <MoreHorizontal className="h-3 w-3 text-zinc-400" />
                </button>

                {showActions && (
                  <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                    {task.status === "pending" && (
                      <ActionMenuItem
                        icon={Play}
                        label="Start"
                        onClick={() => handleAction("start")}
                      />
                    )}
                    {(task.status as string) !== "complete" && (
                      <ActionMenuItem
                        icon={CheckCircle2}
                        label="Complete"
                        onClick={() => handleAction("complete")}
                        color="text-emerald-400"
                      />
                    )}
                    {task.status !== "blocked" && (
                      <ActionMenuItem
                        icon={AlertCircle}
                        label="Block"
                        onClick={() => handleAction("block")}
                        color="text-red-400"
                      />
                    )}
                    <ActionMenuItem
                      icon={Pause}
                      label="Defer"
                      onClick={() => handleAction("defer")}
                    />
                    <div className="border-t border-zinc-700 my-1" />
                    <ActionMenuItem
                      icon={MessageCircle}
                      label="Add note"
                      onClick={() => handleAction("note")}
                    />
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Note input */}
      {showNoteInput && (
        <div className="ml-6 mt-2 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 px-2 py-1 text-[11px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddNote();
              if (e.key === "Escape") {
                setShowNoteInput(false);
                setNoteText("");
              }
            }}
            autoFocus
          />
          <button
            onClick={handleAddNote}
            disabled={loading || !noteText.trim()}
            className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowNoteInput(false);
              setNoteText("");
            }}
            className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Task detail modal (opened via Alt+click or info button) */}
      <TaskDetailModal
        taskId={task.id}
        displayId={task.displayId}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onUpdate={() => {
          handleRefresh();
          onTaskUpdate?.();
        }}
      />
    </div>
  );
}

// Action menu item component
function ActionMenuItem({
  icon: Icon,
  label,
  onClick,
  color = "text-zinc-300",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700 transition-colors"
    >
      <Icon className={`h-3 w-3 ${color}`} />
      {label}
    </button>
  );
}
