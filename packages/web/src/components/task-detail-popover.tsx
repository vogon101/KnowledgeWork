"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  X,
  Calendar,
  Flag,
  Folder,
  User,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageCircle,
  Play,
  Pause,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ListTree,
  Sparkles,
  Trash2,
  Unlock,
  Plus,
  Link as LinkIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseTaskInput, formatDisplayDate, getPriorityBorderColor } from "@/lib/date-parser";
import { useTerminal } from "./terminal-sidebar";
import { buildContextString } from "@/lib/prompts";
import { MeetingLink } from "./meeting-link";
import { Combobox } from "@/components/ui/combobox";
import { trpc } from "@/lib/trpc";
import { SmartTaskInput, type SmartTaskInputRef } from "@/components/smart-task-input";

// Blocker info for many-to-many blocking relationships
interface BlockerInfo {
  id: number;
  displayId: string;
  title: string;
  status: string;
  linkId?: number;
}

// Task detail from API includes updates and relationships (camelCase)
interface TaskDetail {
  id: number;
  displayId: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | null;
  dueDate: string | null;
  checkinBy: string | null;
  checkinId: number | null;
  targetPeriod: string | null;
  ownerId: number | null;
  ownerName: string | null;
  projectId: number | null;
  projectSlug: string | null;
  projectName: string | null;
  projectOrg: string | null;
  projectFullPath: string | null;
  workstreamId: number | null;
  workstreamName: string | null;
  sourceMeetingId: number | null;
  sourceMeetingTitle: string | null;
  sourceMeetingPath?: string | null;
  dueMeetingId: number | null;
  dueMeetingTitle: string | null;
  parentId: number | null;
  parentTask?: { id: number; displayId: string; title: string } | null;
  checkIns?: Array<{
    id: number;
    date: string;
    note: string | null;
    completed: boolean;
  }>;
  // Blocking relationships via ItemLink
  blockers?: BlockerInfo[];
  blocking?: BlockerInfo[];
  subtaskCount: number;
  subtasksComplete: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  updates?: TaskUpdate[];
  subtasks?: TaskDetail[];
  relatedTasks?: TaskDetail[];
}

interface TaskUpdate {
  id: number;
  taskId: number;
  note: string;
  updateType: string;
  oldStatus: string | null;
  newStatus: string | null;
  createdAt: string;
}

interface TaskDetailModalProps {
  taskId: number;
  displayId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function TaskDetailModal({
  taskId,
  displayId,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailModalProps) {
  // Fetch full task details when modal opens
  const taskQuery = trpc.items.get.useQuery(
    { id: taskId },
    { enabled: open }
  );

  // Transform tRPC response to TaskDetail (now both use camelCase)
  const task: TaskDetail | null = taskQuery.data ? {
    id: taskQuery.data.id,
    displayId: taskQuery.data.displayId,
    title: taskQuery.data.title,
    description: taskQuery.data.description ?? null,
    status: taskQuery.data.status,
    priority: taskQuery.data.priority ?? null,
    dueDate: taskQuery.data.dueDate ?? null,
    checkinBy: taskQuery.data.checkinBy ?? null,
    checkinId: taskQuery.data.checkinId ?? null,
    targetPeriod: taskQuery.data.targetPeriod ?? null,
    ownerId: taskQuery.data.ownerId ?? null,
    ownerName: taskQuery.data.ownerName ?? null,
    projectId: taskQuery.data.projectId ?? null,
    projectSlug: taskQuery.data.projectSlug ?? null,
    projectName: taskQuery.data.projectName ?? null,
    projectOrg: taskQuery.data.projectOrg ?? null,
    projectFullPath: taskQuery.data.projectFullPath ?? null,
    workstreamId: null,
    workstreamName: null,
    sourceMeetingId: taskQuery.data.sourceMeetingId ?? null,
    sourceMeetingTitle: taskQuery.data.sourceMeetingTitle ?? null,
    sourceMeetingPath: taskQuery.data.sourceMeetingPath ?? null,
    dueMeetingId: null,
    dueMeetingTitle: null,
    parentId: taskQuery.data.parentId ?? null,
    parentTask: null,
    blockers: taskQuery.data.blockers ?? [],
    blocking: taskQuery.data.blocking ?? [],
    subtaskCount: taskQuery.data.subtaskCount ?? 0,
    subtasksComplete: taskQuery.data.subtasksComplete ?? 0,
    createdAt: taskQuery.data.createdAt,
    updatedAt: taskQuery.data.updatedAt,
    completedAt: taskQuery.data.completedAt ?? null,
    updates: taskQuery.data.updates?.map(u => ({
      id: u.id,
      taskId: u.task_id,
      note: u.note,
      updateType: u.update_type,
      oldStatus: u.old_status,
      newStatus: u.new_status,
      createdAt: u.created_at,
    })),
    checkIns: taskQuery.data.checkIns?.map(c => ({
      id: c.id,
      date: c.date,
      note: c.note,
      completed: c.completed,
    })),
    subtasks: taskQuery.data.subtasks?.map((s) => ({
      id: s.id,
      displayId: s.displayId,
      title: s.title,
      description: s.description ?? null,
      status: s.status,
      priority: s.priority ?? null,
      dueDate: s.dueDate ?? null,
      checkinBy: null,
      checkinId: null,
      targetPeriod: s.targetPeriod ?? null,
      ownerId: s.ownerId ?? null,
      ownerName: s.ownerName ?? null,
      projectId: s.projectId ?? null,
      projectSlug: s.projectSlug ?? null,
      projectName: s.projectName ?? null,
      projectOrg: s.projectOrg ?? null,
      projectFullPath: s.projectFullPath ?? null,
      workstreamId: null,
      workstreamName: null,
      sourceMeetingId: s.sourceMeetingId ?? null,
      sourceMeetingTitle: s.sourceMeetingTitle ?? null,
      sourceMeetingPath: s.sourceMeetingPath ?? null,
      dueMeetingId: null,
      dueMeetingTitle: null,
      parentId: s.parentId ?? null,
      parentTask: null,
      blockers: (s as typeof s & { blockers?: BlockerInfo[] }).blockers ?? [],
      blocking: (s as typeof s & { blocking?: BlockerInfo[] }).blocking ?? [],
      subtaskCount: s.subtaskCount ?? 0,
      subtasksComplete: s.subtasksComplete ?? 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      completedAt: s.completedAt ?? null,
    })),
    relatedTasks: undefined,
  } : null;

  const handleUpdate = () => {
    taskQuery.refetch();
    onUpdate?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 max-h-[85vh] overflow-hidden bg-zinc-900 border-zinc-700">
        <DialogTitle className="sr-only">{displayId}: Task Details</DialogTitle>
        {taskQuery.isLoading && !task && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        )}
        {taskQuery.isError && (
          <div className="p-6 text-center">
            <p className="text-[12px] text-red-400">{taskQuery.error.message || "Failed to load task"}</p>
            <button
              onClick={() => taskQuery.refetch()}
              className="mt-2 text-[11px] text-blue-400 hover:text-blue-300"
            >
              Retry
            </button>
          </div>
        )}
        {task && (
          <TaskDetailContent
            task={task}
            onClose={() => onOpenChange(false)}
            onUpdate={handleUpdate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Legacy wrapper for backwards compatibility with trigger-based usage
interface TaskDetailPopoverProps {
  taskId: number;
  displayId: string;
  children: React.ReactNode;
  onUpdate?: () => void;
}

export function TaskDetailPopover({
  taskId,
  displayId,
  children,
  onUpdate,
}: TaskDetailPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </span>
      <TaskDetailModal
        taskId={taskId}
        displayId={displayId}
        open={open}
        onOpenChange={setOpen}
        onUpdate={onUpdate}
      />
    </>
  );
}

interface TaskDetailContentProps {
  task: TaskDetail;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailContent({ task, onClose, onUpdate }: TaskDetailContentProps) {
  const [activeTab, setActiveTab] = useState<"details" | "edit" | "activity">("details");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [askAIOpen, setAskAIOpen] = useState(false);
  const [askAIPrompt, setAskAIPrompt] = useState("");
  const terminal = useTerminal();

  // tRPC mutations
  const updateMutation = trpc.items.update.useMutation({
    onSuccess: (_, variables) => {
      setFeedback({ type: "success", message: `Marked as ${String(variables.data.status).replace("_", " ")}` });
      onUpdate();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message || "Failed to update" });
    },
  });

  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      onUpdate();
      onClose();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message || "Failed to delete" });
      setConfirmingDelete(false);
    },
  });

  const completeCheckinMutation = trpc.items.completeCheckin.useMutation({
    onSuccess: () => {
      setFeedback({ type: "success", message: "Check-in completed" });
      onUpdate();
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message || "Failed to complete check-in" });
    },
  });

  const actionLoading = updateMutation.isPending || deleteMutation.isPending || completeCheckinMutation.isPending;

  // Clear feedback after 3s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const updateStatus = useCallback(
    (newStatus: string) => {
      updateMutation.mutate({
        id: task.id,
        data: { status: newStatus as 'pending' | 'in_progress' | 'complete' | 'blocked' | 'cancelled' | 'deferred' },
      });
    },
    [task.id, updateMutation]
  );

  // Remove all blockers using ItemLink API and set status to pending
  const unblockTaskMutation = trpc.items.removeBlocker.useMutation();
  const unblockTask = useCallback(async () => {
    // Remove all blockers via ItemLink API
    const blockers = task.blockers ?? [];
    for (const blocker of blockers) {
      await unblockTaskMutation.mutateAsync({ itemId: task.id, blockerId: blocker.id });
    }
    // Set status to pending
    await updateMutation.mutateAsync({
      id: task.id,
      data: { status: 'pending' },
    });
    onUpdate();
  }, [task.id, task.blockers, updateMutation, unblockTaskMutation, onUpdate]);

  const deleteTask = useCallback(() => {
    deleteMutation.mutate({ id: task.id });
  }, [task.id, deleteMutation]);

  const handleAskAISubmit = useCallback(() => {
    if (!askAIPrompt.trim()) return;

    const contextStr = buildContextString({
      type: "action",
      title: task.title,
      filePath: task.sourceMeetingPath || undefined,
      details: {
        "Task ID": task.displayId,
        Status: task.status,
        Owner: task.ownerName || undefined,
        Project: task.projectName || undefined,
        "Due Date": task.dueDate || undefined,
        "Source Meeting": task.sourceMeetingTitle || undefined,
      },
    });

    terminal.sendPrompt(`${askAIPrompt.trim()}\n\n---\n${contextStr}`, {
      type: "action",
      title: task.title,
    });
    setAskAIOpen(false);
    setAskAIPrompt("");
    onClose();
  }, [askAIPrompt, task, terminal, onClose]);

  // Reschedule due date
  const rescheduleDueDate = useCallback(
    (newDate: string) => {
      updateMutation.mutate({
        id: task.id,
        data: { dueDate: newDate },
      });
    },
    [task.id, updateMutation]
  );

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

  const priorityBorder = getPriorityBorderColor(task.priority);

  return (
    <div className="flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className={`border-l-4 ${priorityBorder} px-4 py-3 border-b border-zinc-800`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-zinc-500 font-mono">{task.displayId}</span>
              <StatusBadge status={task.status} />
              {task.priority && <PriorityBadge priority={task.priority} />}
            </div>
            <h3 className="text-[14px] font-medium text-zinc-100 leading-tight">{task.title}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Due date section with reschedule buttons - shown for all tasks with due dates */}
        {task.dueDate && task.status !== "complete" && task.status !== "cancelled" && (
          <div className={`mt-2 p-2 rounded ${isOverdue ? "bg-red-900/20 border border-red-800/50" : "bg-zinc-800/50 border border-zinc-700/50"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className={`h-3 w-3 ${isOverdue ? "text-red-400" : "text-zinc-400"}`} />
                <span className={`text-[11px] font-medium ${isOverdue ? "text-red-400" : "text-zinc-300"}`}>
                  {isOverdue ? "Overdue: " : "Due: "}{formatDisplayDate(task.dueDate)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-zinc-500 mr-1">Reschedule:</span>
                <button
                  onClick={() => rescheduleDueDate(todayStr)}
                  disabled={actionLoading}
                  className="px-1.5 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                >
                  Today
                </button>
                <button
                  onClick={() => rescheduleDueDate(tomorrowStr)}
                  disabled={actionLoading}
                  className="px-1.5 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => rescheduleDueDate(nextMondayStr)}
                  disabled={actionLoading}
                  className="px-1.5 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                >
                  Monday
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Check-ins section */}
        {task.checkIns && task.checkIns.filter(c => !c.completed).length > 0 && (
          <div className="mt-2 p-2 bg-purple-900/20 border border-purple-800/50 rounded">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calendar className="h-3 w-3 text-purple-400" />
              <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wide">Check-ins</span>
            </div>
            <div className="space-y-1">
              {task.checkIns.filter(c => !c.completed).map((checkin) => {
                const isOverdue = new Date(checkin.date) <= new Date();
                return (
                  <div key={checkin.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] ${isOverdue ? 'text-purple-300 font-medium' : 'text-zinc-400'}`}>
                        {formatDisplayDate(checkin.date)}
                        {isOverdue && <span className="ml-1 text-purple-400">(overdue)</span>}
                      </span>
                      {checkin.note && (
                        <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">{checkin.note}</span>
                      )}
                    </div>
                    <button
                      onClick={() => completeCheckinMutation.mutate({ id: task.id, checkinId: checkin.id })}
                      disabled={completeCheckinMutation.isPending}
                      className="px-2 py-0.5 text-[9px] bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50"
                    >
                      {completeCheckinMutation.isPending ? "..." : "Done"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 mt-3">
          {task.status === "pending" && (
            <QuickActionButton
              icon={Play}
              label="Start"
              onClick={() => updateStatus("in_progress")}
              loading={actionLoading}
            />
          )}
          {task.status !== "complete" && task.status !== "cancelled" && (
            <QuickActionButton
              icon={CheckCircle2}
              label="Complete"
              onClick={() => updateStatus("complete")}
              loading={actionLoading}
              color="text-emerald-400"
            />
          )}
          {task.status !== "blocked" && task.status !== "complete" && (
            <QuickActionButton
              icon={AlertCircle}
              label="Block"
              onClick={() => updateStatus("blocked")}
              loading={actionLoading}
              color="text-red-400"
            />
          )}
          {task.status === "blocked" && (
            <QuickActionButton
              icon={Unlock}
              label="Unblock"
              onClick={unblockTask}
              loading={actionLoading}
              color="text-amber-400"
            />
          )}
          {task.status !== "complete" && (
            <QuickActionButton
              icon={Pause}
              label="Defer"
              onClick={() => updateStatus("deferred")}
              loading={actionLoading}
            />
          )}
          <Popover open={askAIOpen} onOpenChange={setAskAIOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1 px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-zinc-300">Ask AI</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-400 font-medium">
                  Ask about this task
                </label>
                <textarea
                  value={askAIPrompt}
                  onChange={(e) => setAskAIPrompt(e.target.value)}
                  placeholder="e.g., Help me break this down into steps..."
                  rows={3}
                  className="w-full px-2 py-1.5 text-[12px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleAskAISubmit();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-500">
                    Task context will be included
                  </span>
                  <button
                    onClick={handleAskAISubmit}
                    disabled={!askAIPrompt.trim()}
                    className="px-3 py-1 text-[11px] bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex-1" />
          {!confirmingDelete ? (
            <QuickActionButton
              icon={Trash2}
              label="Delete"
              onClick={() => setConfirmingDelete(true)}
              loading={actionLoading}
              color="text-zinc-500 hover:text-red-400"
            />
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={deleteTask}
                disabled={actionLoading}
                className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Confirm
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {feedback && (
          <div
            className={`mt-2 text-[11px] px-2 py-1 rounded ${
              feedback.type === "success"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <TabButton active={activeTab === "details"} onClick={() => setActiveTab("details")}>
          Details
        </TabButton>
        <TabButton active={activeTab === "edit"} onClick={() => setActiveTab("edit")}>
          Edit
        </TabButton>
        <TabButton
          active={activeTab === "activity"}
          onClick={() => setActiveTab("activity")}
          badge={task.updates?.length}
        >
          Activity
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "details" && <DetailsTab task={task} onUpdate={onUpdate} />}
        {activeTab === "edit" && <EditTab task={task} onClose={onClose} onUpdate={onUpdate} />}
        {activeTab === "activity" && <ActivityTab task={task} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

// Details Tab
function DetailsTab({ task, onUpdate }: { task: TaskDetail; onUpdate: () => void }) {
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showRelated, setShowRelated] = useState(false);
  const [showBlocking, setShowBlocking] = useState(true);
  const [showBlockers, setShowBlockers] = useState(true);
  const [selectedBlockerTaskId, setSelectedBlockerTaskId] = useState<number | null>(null);
  const [showAddBlocker, setShowAddBlocker] = useState(false);

  // Blockers from ItemLink system
  const blockers = task.blockers ?? [];

  const blockingTasks = task.blocking ?? [];

  // Fetch all tasks for the add blocker dropdown
  const allTasksQuery = trpc.items.list.useQuery(
    { includeCompleted: false, limit: 200 },
    { enabled: showAddBlocker }
  );
  const availableBlockers = (allTasksQuery.data?.items || [])
    .filter(t => t.id !== task.id && !blockers.some(b => b.id === t.id));

  // tRPC mutations for check-in operations
  const completeCheckinMutation = trpc.items.completeCheckin.useMutation({
    onSuccess: () => onUpdate(),
  });

  const rescheduleCheckinMutation = trpc.items.rescheduleCheckin.useMutation({
    onSuccess: () => onUpdate(),
  });

  // tRPC mutations for blocker operations
  const addBlockerMutation = trpc.items.addBlocker.useMutation({
    onSuccess: () => {
      setShowAddBlocker(false);
      onUpdate();
    },
  });

  const removeBlockerMutation = trpc.items.removeBlocker.useMutation({
    onSuccess: () => onUpdate(),
  });

  const checkinLoading = completeCheckinMutation.isPending || rescheduleCheckinMutation.isPending;

  const handleCompleteCheckin = (clear: boolean = true) => {
    if (checkinLoading) return;
    completeCheckinMutation.mutate({
      id: task.id,
      checkinId: task.checkinId ?? undefined,
      clear,
    });
  };

  const handleRescheduleCheckin = (daysOffset: number) => {
    if (checkinLoading) return;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + daysOffset);
    const dateStr = newDate.toISOString().split("T")[0];

    rescheduleCheckinMutation.mutate({
      itemId: task.id,
      newDate: dateStr,
      clearCompleted: true,
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Description */}
      {task.description && (
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
            Description
          </label>
          <p className="text-[12px] text-zinc-300 whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-3">
        {/* Owner */}
        {task.ownerName && (
          <MetaItem icon={User} label="Owner">
            <Link
              href={`/people/${task.ownerId}`}
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              {task.ownerName}
            </Link>
          </MetaItem>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <MetaItem icon={Calendar} label="Due Date">
            <span
              className={
                new Date(task.dueDate) < new Date() && task.status !== "complete"
                  ? "text-red-400"
                  : "text-zinc-300"
              }
            >
              {formatDisplayDate(task.dueDate)}
            </span>
          </MetaItem>
        )}

        {/* Priority */}
        {task.priority && (
          <MetaItem icon={Flag} label="Priority">
            <PriorityBadge priority={task.priority} />
          </MetaItem>
        )}

        {/* Target Period */}
        {task.targetPeriod && (
          <MetaItem icon={Clock} label="Target">
            {task.targetPeriod}
          </MetaItem>
        )}

        {/* Completed At */}
        {task.completedAt && (
          <MetaItem icon={CheckCircle2} label="Completed">
            <span className="text-emerald-400">
              {formatDisplayDate(task.completedAt)}
            </span>
          </MetaItem>
        )}

        {/* Check-in Date */}
        {task.checkinBy && (
          <MetaItem icon={Calendar} label="Check In By">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={
                    new Date(task.checkinBy) <= new Date()
                      ? "text-purple-400"
                      : "text-zinc-300"
                  }
                >
                  {formatDisplayDate(task.checkinBy)}
                </span>
                <button
                  onClick={() => handleCompleteCheckin(true)}
                  disabled={checkinLoading}
                  className="px-1.5 py-0.5 text-[9px] bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50"
                  title="Mark check-in as done and clear the date"
                >
                  {checkinLoading ? "..." : "Done & Clear"}
                </button>
              </div>
              {/* Reschedule buttons */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-zinc-500 mr-1">Reschedule:</span>
                <button
                  onClick={() => handleRescheduleCheckin(7)}
                  disabled={checkinLoading}
                  className="px-1.5 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                  title="Reschedule check-in to 1 week from now"
                >
                  +1w
                </button>
                <button
                  onClick={() => handleRescheduleCheckin(14)}
                  disabled={checkinLoading}
                  className="px-1.5 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                  title="Reschedule check-in to 2 weeks from now"
                >
                  +2w
                </button>
                <button
                  onClick={() => handleRescheduleCheckin(30)}
                  disabled={checkinLoading}
                  className="px-1.5 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
                  title="Reschedule check-in to 1 month from now"
                >
                  +1m
                </button>
              </div>
            </div>
          </MetaItem>
        )}

        {/* Project */}
        {task.projectName && (
          <MetaItem icon={Folder} label="Project">
            <Link
              href={`/projects/${task.projectOrg}/${task.projectFullPath || task.projectSlug}`}
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              {task.projectName}
            </Link>
          </MetaItem>
        )}

        {/* Source Meeting */}
        {task.sourceMeetingTitle && task.sourceMeetingPath && (
          <MetaItem icon={FileText} label="From Meeting">
            <MeetingLink
              path={task.sourceMeetingPath}
              title={task.sourceMeetingTitle}
              className="text-blue-400 hover:text-blue-300 hover:underline text-[11px]"
            >
              {task.sourceMeetingTitle}
              <ExternalLink className="h-3 w-3 inline ml-1" />
            </MeetingLink>
          </MetaItem>
        )}

        {/* Parent Task */}
        {task.parentTask && (
          <MetaItem icon={ListTree} label="Parent Task">
            <span className="text-zinc-300 text-[11px]">
              {task.parentTask.displayId}: {task.parentTask.title}
            </span>
          </MetaItem>
        )}

      </div>

      {/* Blockers Section (many-to-many) */}
      {(blockers.length > 0 || task.status !== "complete") && (
        <div className="border-t border-zinc-800 pt-3">
          <button
            onClick={() => setShowBlockers(!showBlockers)}
            className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-200 mb-2"
          >
            {showBlockers ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span className={blockers.length > 0 ? "text-red-400" : ""}>
              Blocked By {blockers.length > 0 ? `(${blockers.length})` : ""}
            </span>
          </button>
          {showBlockers && (
            <div className="space-y-1 pl-2">
              {blockers.map((blocker) => (
                <div
                  key={blocker.id}
                  className="flex items-center gap-2 text-[11px] py-0.5 group"
                >
                  <button
                    onClick={() => setSelectedBlockerTaskId(blocker.id)}
                    className="flex items-center gap-2 flex-1 hover:bg-zinc-800 rounded px-1 -ml-1 text-left"
                  >
                    <StatusIcon status={blocker.status} size={12} />
                    <span className="text-red-400 truncate">
                      {blocker.displayId}: {blocker.title}
                    </span>
                  </button>
                  <button
                    onClick={() => removeBlockerMutation.mutate({ itemId: task.id, blockerId: blocker.id })}
                    disabled={removeBlockerMutation.isPending}
                    className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:opacity-50 p-0.5"
                    title="Remove blocker"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {/* Add blocker button/dropdown */}
              {task.status !== "complete" && task.status !== "cancelled" && (
                <div className="mt-2">
                  {showAddBlocker ? (
                    <div className="flex flex-col gap-1">
                      <Combobox
                        options={availableBlockers.map((t) => ({
                          value: String(t.id),
                          label: `${t.displayId}: ${t.title}`,
                        }))}
                        value=""
                        onValueChange={(value) => {
                          if (value) {
                            addBlockerMutation.mutate({
                              itemId: task.id,
                              blockerId: parseInt(value, 10),
                            });
                          }
                        }}
                        placeholder="Select task..."
                        searchPlaceholder="Search tasks..."
                        emptyText="No tasks available"
                      />
                      <button
                        onClick={() => setShowAddBlocker(false)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddBlocker(true)}
                      className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                    >
                      <Plus className="h-3 w-3" />
                      Add blocker
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subtasks */}
      {task.subtaskCount > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-200 mb-2"
          >
            {showSubtasks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Subtasks ({task.subtasksComplete}/{task.subtaskCount})
          </button>
          {showSubtasks && task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-1 pl-2">
              {task.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2 text-[11px] py-0.5"
                >
                  <StatusIcon status={subtask.status} size={12} />
                  <span
                    className={
                      subtask.status === "complete" ? "text-zinc-500 line-through" : "text-zinc-300"
                    }
                  >
                    {subtask.displayId}: {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Related Tasks */}
      {task.relatedTasks && task.relatedTasks.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <button
            onClick={() => setShowRelated(!showRelated)}
            className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-200 mb-2"
          >
            {showRelated ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Related Tasks ({task.relatedTasks.length})
          </button>
          {showRelated && (
            <div className="space-y-1 pl-2">
              {task.relatedTasks.map((related) => (
                <div key={related.id} className="flex items-center gap-2 text-[11px] py-0.5">
                  <StatusIcon status={related.status} size={12} />
                  <span className="text-zinc-300">
                    {related.displayId}: {related.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks This One is Blocking */}
      {blockingTasks.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <button
            onClick={() => setShowBlocking(!showBlocking)}
            className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-200 mb-2"
          >
            {showBlocking ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span className="text-amber-400">
              <LinkIcon className="h-3 w-3 inline mr-1" />
              Blocking {blockingTasks.length} task{blockingTasks.length > 1 ? "s" : ""}
            </span>
          </button>
          {showBlocking && (
            <div className="space-y-1 pl-2">
              {blockingTasks.map((blocked) => (
                <button
                  key={blocked.id}
                  onClick={() => setSelectedBlockerTaskId(blocked.id)}
                  className="flex items-center gap-2 text-[11px] py-0.5 hover:bg-zinc-800 rounded px-1 -ml-1 w-full text-left"
                >
                  <StatusIcon status={blocked.status} size={12} />
                  <span className="text-zinc-300 truncate">
                    {blocked.displayId}: {blocked.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t border-zinc-800 pt-3 text-[10px] text-zinc-600">
        <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
        <div>Updated: {new Date(task.updatedAt).toLocaleString()}</div>
        {task.completedAt && <div>Completed: {new Date(task.completedAt).toLocaleString()}</div>}
      </div>

      {/* Nested Task Modal */}
      {selectedBlockerTaskId && (
        <TaskDetailModal
          taskId={selectedBlockerTaskId}
          displayId={`T-${selectedBlockerTaskId}`}
          open={true}
          onOpenChange={(open) => !open && setSelectedBlockerTaskId(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

// Edit Tab
function EditTab({
  task,
  onClose,
  onUpdate,
}: {
  task: TaskDetail;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [newCheckinDate, setNewCheckinDate] = useState("");
  const [priority, setPriority] = useState<string>(task.priority ? String(task.priority) : "_none");
  const [projectId, setProjectId] = useState<string>(task.projectId ? String(task.projectId) : "_none");
  const [ownerId, setOwnerId] = useState<string>(task.ownerId ? String(task.ownerId) : "_none");
  const [additionalAssignees, setAdditionalAssignees] = useState<number[]>([]);
  // Multi-blocker state - initialize from task.blockers
  const [blockerIds, setBlockerIds] = useState<number[]>(
    task.blockers?.map(b => b.id) || []
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showTokenWarning, setShowTokenWarning] = useState(false);
  const smartInputRef = useRef<SmartTaskInputRef>(null);

  // Clear saved feedback after 3 seconds
  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  // tRPC queries
  const projectsQuery = trpc.projects.list.useQuery({});
  const peopleQuery = trpc.people.list.useQuery({});
  const tasksQuery = trpc.items.list.useQuery({ includeCompleted: false, limit: 200 });
  const taskDetailQuery = trpc.items.get.useQuery({ id: task.id });

  const projects = projectsQuery.data?.projects || [];
  const people = peopleQuery.data?.people || [];
  const allTasks = (tasksQuery.data?.items || [])
    .filter((t) => t.id !== task.id)
    .map((t) => ({ id: t.id, displayId: t.displayId, title: t.title }));

  // Initialize additional assignees from task detail
  useEffect(() => {
    if (taskDetailQuery.data?.people) {
      const assignees = taskDetailQuery.data.people
        .filter((p: { role: string; personId: number }) => p.role === "assignee" && p.personId !== task.ownerId)
        .map((p: { personId: number }) => p.personId);
      setAdditionalAssignees(assignees);
    }
  }, [taskDetailQuery.data, task.ownerId]);

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // tRPC mutations
  const updateMutation = trpc.items.update.useMutation();
  const addPersonMutation = trpc.items.addPerson.useMutation();
  const removePersonMutation = trpc.items.removePerson.useMutation();
  const addBlockerMutation = trpc.items.addBlocker.useMutation();
  const removeBlockerMutation = trpc.items.removeBlocker.useMutation();
  const addCheckinMutation = trpc.items.addCheckin.useMutation({
    onSuccess: (data) => {
      console.log("Check-in added successfully:", data);
      setNewCheckinDate("");
      // Invalidate the query cache to ensure fresh data
      utils.items.get.invalidate({ id: task.id });
      onUpdate();
    },
    onError: (error) => {
      console.error("Failed to add check-in:", error);
      alert(`Failed to add check-in: ${error.message}`);
    },
  });
  const deleteCheckinMutation = trpc.items.deleteCheckin.useMutation({
    onSuccess: () => {
      utils.items.get.invalidate({ id: task.id });
      onUpdate();
    },
  });

  const loading = updateMutation.isPending || addPersonMutation.isPending || removePersonMutation.isPending || addBlockerMutation.isPending || removeBlockerMutation.isPending;
  const checkinLoading = addCheckinMutation.isPending || deleteCheckinMutation.isPending;

  const handleTitleBlur = () => {
    const parsed = parseTaskInput(title);
    if (parsed.dueDate && !dueDate) {
      setDueDate(parsed.dueDate);
    }
    if (parsed.priority && !priority) {
      setPriority(String(parsed.priority));
    }
    if (parsed.title !== title) {
      setTitle(parsed.title);
    }
  };

  const handleSave = async (force = false) => {
    // Check for unactioned tokens
    if (!force && smartInputRef.current?.hasUnactionedToken()) {
      setShowTokenWarning(true);
      return;
    }

    setError(null);
    setShowTokenWarning(false);

    try {
      // Save main task fields (no longer includes blockedByItemId - use ItemLink API instead)
      await updateMutation.mutateAsync({
        id: task.id,
        data: {
          title,
          description: description || null,
          status: status as 'pending' | 'in_progress' | 'complete' | 'blocked' | 'cancelled' | 'deferred',
          dueDate: dueDate || null,
          priority: priority && priority !== "_none" ? parseInt(priority, 10) : null,
          projectId: projectId && projectId !== "_none" ? parseInt(projectId, 10) : null,
          ownerId: ownerId && ownerId !== "_none" ? parseInt(ownerId, 10) : null,
        },
      });

      // If a check-in date was entered but not added, add it on save
      if (newCheckinDate) {
        await addCheckinMutation.mutateAsync({ itemId: task.id, date: newCheckinDate });
        setNewCheckinDate("");
      }

      // Handle blocker changes using ItemLink API
      const currentBlockers = new Set<number>(
        task.blockers?.map(b => b.id) || []
      );

      // Remove blockers that were removed
      for (const blockerId of currentBlockers) {
        if (!blockerIds.includes(blockerId)) {
          await removeBlockerMutation.mutateAsync({
            itemId: task.id,
            blockerId,
          });
        }
      }

      // Add new blockers
      for (const blockerId of blockerIds) {
        if (!currentBlockers.has(blockerId)) {
          await addBlockerMutation.mutateAsync({
            itemId: task.id,
            blockerId,
          });
        }
      }

      // Get current assignees to compare
      const currentAssignees = new Set<number>(
        (taskDetailQuery.data?.people || [])
          .filter((p: { role: string }) => p.role === "assignee")
          .map((p: { personId: number }) => p.personId)
      );

      // Remove assignees that were removed
      for (const personId of currentAssignees) {
        if (!additionalAssignees.includes(personId)) {
          await removePersonMutation.mutateAsync({
            itemId: task.id,
            personId,
            role: "assignee",
          });
        }
      }

      // Add new assignees
      for (const personId of additionalAssignees) {
        if (!currentAssignees.has(personId)) {
          await addPersonMutation.mutateAsync({
            itemId: task.id,
            personId,
            role: "assignee",
          });
        }
      }

      onUpdate();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message || "Failed to save");
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Title */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
          Title
        </label>
        <SmartTaskInput
          ref={smartInputRef}
          value={title}
          onChange={(newTitle) => {
            setTitle(newTitle);
            setShowTokenWarning(false);
          }}
          onBlur={handleTitleBlur}
          placeholder="Task title... (try '@person', '#project', 'p1', 'tomorrow')"
          people={people}
          projects={projects}
          onPersonSelect={(personId) => setOwnerId(personId ? String(personId) : "_none")}
          onProjectSelect={(projectIdValue) => setProjectId(projectIdValue ? String(projectIdValue) : "_none")}
          onPrioritySelect={(p) => setPriority(p ? String(p) : "_none")}
          onDateSelect={(date) => setDueDate(date || "")}
        />
        <p className="text-[9px] text-zinc-600 mt-0.5">
          @person, #project, p1-p4 for priority, tomorrow/monday for dates
        </p>
      </div>

      {/* Status */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Status
        </label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              <span className="text-amber-400">Pending</span>
            </SelectItem>
            <SelectItem value="in_progress">
              <span className="text-blue-400">In Progress</span>
            </SelectItem>
            <SelectItem value="complete">
              <span className="text-emerald-400">Complete</span>
            </SelectItem>
            <SelectItem value="blocked">
              <span className="text-red-400">Blocked</span>
            </SelectItem>
            <SelectItem value="deferred">
              <span className="text-zinc-400">Deferred</span>
            </SelectItem>
            <SelectItem value="cancelled">
              <span className="text-zinc-500">Cancelled</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details..."
          rows={3}
          className="w-full px-2 py-1.5 text-[12px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Due Date & Priority row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Due Date
          </label>
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder="Set due date"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Flag className="h-3 w-3" />
            Priority
          </label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              <SelectItem value="1">
                <span className="text-red-400">P1 - Urgent</span>
              </SelectItem>
              <SelectItem value="2">
                <span className="text-orange-400">P2 - High</span>
              </SelectItem>
              <SelectItem value="3">
                <span className="text-yellow-400">P3 - Medium</span>
              </SelectItem>
              <SelectItem value="4">
                <span className="text-zinc-400">P4 - Low</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Check-ins (for following up on tasks) */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Check-ins
        </label>

        {/* Existing check-ins */}
        {task.checkIns && task.checkIns.length > 0 && (
          <div className="space-y-1 mb-2">
            {task.checkIns.map((checkin) => {
              const isOverdue = !checkin.completed && new Date(checkin.date) <= new Date();
              return (
                <div
                  key={checkin.id}
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px] ${
                    checkin.completed
                      ? "bg-zinc-800/50 text-zinc-500 line-through"
                      : isOverdue
                      ? "bg-purple-900/30 border border-purple-700/50"
                      : "bg-zinc-800 border border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={checkin.completed ? "text-zinc-500" : isOverdue ? "text-purple-300" : "text-zinc-300"}>
                      {formatDisplayDate(checkin.date)}
                    </span>
                    {isOverdue && !checkin.completed && (
                      <span className="text-[9px] text-purple-400">(overdue)</span>
                    )}
                    {checkin.completed && (
                      <span className="text-[9px] text-zinc-600">(done)</span>
                    )}
                    {checkin.note && (
                      <span className="text-zinc-500 truncate max-w-[100px]">{checkin.note}</span>
                    )}
                  </div>
                  {!checkin.completed && (
                    <button
                      type="button"
                      onClick={() => deleteCheckinMutation.mutate({ id: checkin.id })}
                      disabled={checkinLoading}
                      className="text-zinc-500 hover:text-red-400 disabled:opacity-50"
                      title="Delete check-in"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add new check-in */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DatePicker
              value={newCheckinDate}
              onChange={setNewCheckinDate}
              placeholder="Add check-in date"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (newCheckinDate) {
                console.log("Adding check-in:", { itemId: task.id, date: newCheckinDate });
                addCheckinMutation.mutate({ itemId: task.id, date: newCheckinDate });
              } else {
                console.log("No date selected, newCheckinDate:", newCheckinDate);
              }
            }}
            disabled={!newCheckinDate || checkinLoading}
            className="px-2 py-1.5 text-[10px] bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50"
          >
            {checkinLoading ? "..." : "Add"}
          </button>
        </div>

        {/* Quick add buttons */}
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[9px] text-zinc-500">Quick add:</span>
          {[
            { label: "+1w", days: 7 },
            { label: "+2w", days: 14 },
            { label: "+1m", days: 30 },
          ].map(({ label, days }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const date = new Date();
                date.setDate(date.getDate() + days);
                addCheckinMutation.mutate({ itemId: task.id, date: date.toISOString().split("T")[0] });
              }}
              disabled={checkinLoading}
              className="px-1.5 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-zinc-600 mt-1">
          Reminder dates to follow up on this task
        </p>
      </div>

      {/* Project & Owner row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Folder className="h-3 w-3" />
            Project
          </label>
          <Combobox
            options={[
              { value: "_none", label: "No project" },
              // Sort projects: general projects first within each org, then alphabetically
              ...projects
                .slice()
                .sort((a, b) => {
                  // Same org: general first, then alphabetical
                  if (a.org === b.org) {
                    if (a.isGeneral && !b.isGeneral) return -1;
                    if (!a.isGeneral && b.isGeneral) return 1;
                    return a.name.localeCompare(b.name);
                  }
                  // Different orgs: alphabetical by org
                  return (a.org || "").localeCompare(b.org || "");
                })
                .map((p) => {
                  const orgLabel = p.org === "example-org" ? "ExOrg" : p.org === "acme-corp" ? "YA" : p.org;
                  return {
                    value: String(p.id),
                    // General projects show as "Org (General)" to make them obvious
                    label: p.isGeneral ? `${orgLabel} (General)` : p.name,
                    group: orgLabel,
                  };
                }),
            ]}
            value={projectId}
            onValueChange={setProjectId}
            placeholder="Select project..."
            searchPlaceholder="Search projects..."
            emptyText="No projects found"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <User className="h-3 w-3" />
            Owner
          </label>
          <Combobox
            options={[
              { value: "_none", label: "Unassigned" },
              ...people.map((p) => ({
                value: String(p.id),
                label: p.name,
              })),
            ]}
            value={ownerId}
            onValueChange={setOwnerId}
            placeholder="Select owner..."
            searchPlaceholder="Search people..."
            emptyText="No people found"
          />
        </div>
      </div>

      {/* Additional Assignees */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
          <User className="h-3 w-3" />
          Additional Assignees
        </label>
        <div className="flex flex-wrap gap-1 mb-2">
          {additionalAssignees.map((personId) => {
            const person = people.find((p) => p.id === personId);
            return person ? (
              <span
                key={personId}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-zinc-800 rounded-full text-zinc-300"
              >
                {person.name}
                <button
                  onClick={() =>
                    setAdditionalAssignees((prev) => prev.filter((id) => id !== personId))
                  }
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null;
          })}
        </div>
        <Combobox
          options={people
            .filter((p) => !additionalAssignees.includes(p.id) && String(p.id) !== ownerId)
            .map((p) => ({
              value: String(p.id),
              label: p.name,
            }))}
          value=""
          onValueChange={(value) => {
            const personId = parseInt(value, 10);
            if (personId && !additionalAssignees.includes(personId) && String(personId) !== ownerId) {
              setAdditionalAssignees((prev) => [...prev, personId]);
            }
          }}
          placeholder="Add assignee..."
          searchPlaceholder="Search people..."
          emptyText="No more people to add"
        />
      </div>

      {/* Blocked By Tasks (Multiple) */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Blocked By Tasks
        </label>
        {/* Current blockers list */}
        <div className="flex flex-wrap gap-1 mb-2">
          {blockerIds.map((blockerId) => {
            const blockerTask = allTasks.find((t) => t.id === blockerId);
            return blockerTask ? (
              <span
                key={blockerId}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-red-900/30 border border-red-800/50 rounded-full text-red-300"
              >
                {blockerTask.displayId}: {blockerTask.title.slice(0, 30)}{blockerTask.title.length > 30 ? '...' : ''}
                <button
                  onClick={() =>
                    setBlockerIds((prev) => prev.filter((id) => id !== blockerId))
                  }
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null;
          })}
        </div>
        <Combobox
          options={allTasks
            .filter((t) => !blockerIds.includes(t.id) && t.id !== task.id)
            .map((t) => ({
              value: String(t.id),
              label: `${t.displayId}: ${t.title}`,
            }))}
          value=""
          onValueChange={(value) => {
            const taskId = parseInt(value, 10);
            if (taskId && !blockerIds.includes(taskId) && taskId !== task.id) {
              setBlockerIds((prev) => [...prev, taskId]);
            }
          }}
          placeholder="Add blocking task..."
          searchPlaceholder="Search tasks..."
          emptyText="No tasks available"
        />
        <p className="text-[9px] text-zinc-600 mt-0.5">Tasks that must complete before this one can proceed</p>
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {saved && (
        <p className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
          Saved
        </p>
      )}

      {showTokenWarning && (
        <div className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded border border-amber-500/30">
          <p className="font-medium mb-1">Unfinished mention detected</p>
          <p className="text-amber-300/80">
            You have a {smartInputRef.current?.getUnactionedTokenType() === "person" ? "@person" : "#project"} mention that hasn&apos;t been selected.
            Select from the dropdown or remove the token.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowTokenWarning(false)}
              className="px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded"
            >
              Go back
            </button>
            <button
              onClick={() => handleSave(true)}
              className="px-2 py-1 text-[10px] bg-amber-600 hover:bg-amber-500 text-white rounded"
            >
              Save anyway
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200">
          Close
        </button>
        <button
          onClick={() => handleSave()}
          disabled={loading}
          className="px-3 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

// Activity Tab
function ActivityTab({ task, onUpdate }: { task: TaskDetail; onUpdate: () => void }) {
  const [noteText, setNoteText] = useState("");

  const addNoteMutation = trpc.items.addNote.useMutation({
    onSuccess: () => {
      setNoteText("");
      onUpdate();
    },
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNoteMutation.mutate({
      id: task.id,
      note: noteText,
      updateType: "note",
    });
  };

  const addingNote = addNoteMutation.isPending;

  const updates = task.updates || [];

  return (
    <div className="p-4">
      {/* Add note */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 px-2 py-1.5 text-[12px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddNote();
            }}
          />
          <button
            onClick={handleAddNote}
            disabled={addingNote || !noteText.trim()}
            className="px-3 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </button>
        </div>
      </div>

      {/* Activity log */}
      {updates.length === 0 ? (
        <p className="text-[12px] text-zinc-500 italic text-center py-4">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {updates.map((update) => (
            <div key={update.id} className="flex gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {update.updateType === "status_change" ? (
                  <StatusIcon status={update.newStatus || "pending"} size={14} />
                ) : (
                  <MessageCircle className="h-3.5 w-3.5 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-zinc-300">{update.note}</p>
                {update.updateType === "status_change" && (
                  <p className="text-[10px] text-zinc-500">
                    {update.oldStatus} → {update.newStatus}
                  </p>
                )}
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {new Date(update.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper components
function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  loading = false,
  color = "text-zinc-300",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  loading?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className={`h-3 w-3 ${color}`} />
      )}
      <span className="text-zinc-300">{label}</span>
    </button>
  );
}

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-4 py-2 text-[11px] font-medium transition-colors ${
        active
          ? "text-zinc-100 border-b-2 border-blue-500"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="text-[9px] bg-zinc-700 text-zinc-400 px-1 rounded">{badge}</span>
      )}
    </button>
  );
}

function MetaItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-0.5">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-[12px]">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Pending" },
    in_progress: { color: "text-blue-400", bg: "bg-blue-500/10", label: "In Progress" },
    complete: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Complete" },
    blocked: { color: "text-red-400", bg: "bg-red-500/10", label: "Blocked" },
    cancelled: { color: "text-zinc-500", bg: "bg-zinc-500/10", label: "Cancelled" },
    deferred: { color: "text-zinc-400", bg: "bg-zinc-500/10", label: "Deferred" },
  };
  const config = configs[status] || configs.pending;

  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const colors: Record<number, string> = {
    1: "text-red-400 bg-red-500/10",
    2: "text-orange-400 bg-orange-500/10",
    3: "text-yellow-400 bg-yellow-500/10",
    4: "text-zinc-400 bg-zinc-500/10",
  };
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${colors[priority] || ""}`}>
      P{priority}
    </span>
  );
}

function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  const icons: Record<string, { Icon: React.ComponentType<{ className?: string }>; color: string }> = {
    pending: { Icon: CheckCircle2, color: "text-amber-400" },
    in_progress: { Icon: Clock, color: "text-blue-400" },
    complete: { Icon: CheckCircle2, color: "text-emerald-400" },
    blocked: { Icon: AlertCircle, color: "text-red-400" },
    cancelled: { Icon: X, color: "text-zinc-500" },
    deferred: { Icon: Pause, color: "text-zinc-400" },
  };
  const { Icon, color } = icons[status] || icons.pending;
  const sizeClass = size <= 12 ? "h-3 w-3" : size <= 14 ? "h-3.5 w-3.5" : "h-4 w-4";
  return <Icon className={`${color} ${sizeClass}`} />;
}
