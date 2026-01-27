"use client";

import { Eye, EyeOff, X } from "lucide-react";
import { useState, useCallback } from "react";
import type { Task } from "@/lib/task-db";
import { useRouter } from "next/navigation";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskRow } from "./task-list/task-row";
import { CheckInRow } from "./task-list/checkin-row";
import {
  statusConfig,
  DEFAULT_OWNER_NAME,
} from "./task-list/config";

// Re-export for backwards compatibility
export { DEFAULT_OWNER_NAME };

interface TaskListProps {
  tasks: Task[];
  showProject?: boolean;
  showMeeting?: boolean;
  compact?: boolean;
  interactive?: boolean;
  showCompletedToggle?: boolean;
  defaultShowCompleted?: boolean;
  defaultOwnerFilter?: string | null; // null = show all, string = filter to owner
  showCheckinReminders?: boolean; // Show check-in dates as separate visual items
  showCreateButton?: boolean; // Show "New Task" button in toolbar
  defaultProjectId?: number; // Default project for new tasks
  defaultOwnerId?: number; // Default owner for new tasks
  highlightOtherOwners?: boolean; // Show "Owner | Task" format for tasks owned by others (default: true)
  onRefresh?: () => void; // Callback to refresh task data (used instead of router.refresh)
}

// A display item can be either a regular task or a check-in reminder for a task
type DisplayItem =
  | { type: "task"; task: Task }
  | { type: "checkin"; task: Task };


export function TaskList({
  tasks,
  showProject = false,
  showMeeting = false,
  compact = false,
  interactive = true,
  showCompletedToggle = true,
  defaultShowCompleted = false,
  defaultOwnerFilter = null,
  showCheckinReminders = true,
  showCreateButton = false,
  defaultProjectId,
  defaultOwnerId,
  highlightOtherOwners = true,
  onRefresh,
}: TaskListProps) {
  const router = useRouter();

  // Use onRefresh if provided, otherwise fall back to router.refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  }, [onRefresh, router]);
  // If toggle is hidden, assume parent already filtered - don't filter again
  const [showCompleted, setShowCompleted] = useState(showCompletedToggle ? defaultShowCompleted : true);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(defaultOwnerFilter);

  // Filter tasks (only filter completed if we're managing the toggle ourselves)
  const filteredTasks = tasks.filter((task) => {
    // Filter by completion status
    if (!showCompleted && (task.status === "complete" || task.status === "cancelled")) {
      return false;
    }
    // Filter by owner
    if (ownerFilter && task.ownerName !== ownerFilter) {
      return false;
    }
    return true;
  });

  // Build display items: regular tasks + check-in reminders
  const displayItems: DisplayItem[] = [];

  // Track which task IDs are already shown as regular tasks
  const taskIdsInList = new Set<number>();

  for (const task of filteredTasks) {
    // Add the regular task
    displayItems.push({ type: "task", task });
    taskIdsInList.add(task.id);
  }

  // Add check-in reminders separately - these bypass owner filter since check-ins are implicitly yours
  // Note: checkin_by only contains pending (uncompleted) check-ins from the check_ins table
  // Only add check-in rows for tasks NOT already shown as regular tasks (to avoid duplication)
  if (showCheckinReminders) {
    for (const task of tasks) {
      // Skip completed/cancelled tasks - no need for check-in reminders on these
      if (task.status === "complete" || task.status === "cancelled") continue;
      // Skip if no pending check-in date
      if (!task.checkinBy) continue;
      // Skip if this task is already shown as a regular task row (it already displays check-in info)
      if (taskIdsInList.has(task.id)) continue;

      displayItems.push({ type: "checkin", task });
    }
  }

  const completedCount = tasks.filter(
    (t) => t.status === "complete" || t.status === "cancelled"
  ).length;

  if (tasks.length === 0) {
    return (
      <div className="text-[12px] text-zinc-500 italic py-2">No tasks found</div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      {(showCompletedToggle || showCreateButton) && (
        <div className="flex items-center gap-3 mb-2 text-[11px]">
          {showCreateButton && (
            <CreateTaskDialog
              defaultProjectId={defaultProjectId}
              defaultOwnerId={defaultOwnerId}
              onTaskCreated={() => handleRefresh()}
            />
          )}
          {showCompletedToggle && (
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                showCompleted
                  ? "bg-zinc-700 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {showCompleted ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {showCompleted ? "Hide" : "Show"} completed ({completedCount})
            </button>
          )}
          {ownerFilter && (
            <button
              onClick={() => setOwnerFilter(null)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 transition-colors"
            >
              <X className="h-3 w-3" />
              {ownerFilter}
            </button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {displayItems.map((item, index) =>
          item.type === "task" ? (
            <TaskRow
              key={`task-${item.task.id}`}
              task={item.task}
              showProject={showProject}
              showMeeting={showMeeting}
              compact={compact}
              interactive={interactive}
              showOwnerInTitle={highlightOtherOwners && item.task.ownerName !== DEFAULT_OWNER_NAME}
              onRefresh={handleRefresh}
            />
          ) : (
            <CheckInRow
              key={`checkin-${item.task.id}-${index}`}
              task={item.task}
              compact={compact}
              interactive={interactive}
              onRefresh={handleRefresh}
            />
          )
        )}
      </div>

      {displayItems.length === 0 && tasks.length > 0 && (
        <div className="text-[12px] text-zinc-500 italic py-2">
          No tasks match current filters
        </div>
      )}
    </div>
  );
}

// Grouped task list component
interface GroupedTaskListProps {
  tasks: Task[];
  groupBy: "status" | "owner" | "project" | "date";
  showCompletedToggle?: boolean;
  defaultShowCompleted?: boolean;
  allTasksForCheckins?: Task[]; // Pass unfiltered tasks to show check-ins regardless of owner filter
  highlightOtherOwners?: boolean; // Show "Owner | Task" format for tasks owned by others (default: true)
  onRefresh?: () => void; // Callback to refresh task data
}

// Display item for grouped list - can be a task or a check-in reminder
type GroupedDisplayItem =
  | { type: "task"; task: Task }
  | { type: "checkin"; task: Task };

export function GroupedTaskList({
  tasks,
  groupBy,
  showCompletedToggle = true,
  defaultShowCompleted = false,
  allTasksForCheckins,
  highlightOtherOwners = true,
  onRefresh,
}: GroupedTaskListProps) {
  const router = useRouter();

  // Use onRefresh if provided, otherwise fall back to router.refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  }, [onRefresh, router]);
  // If toggle is hidden, assume parent already filtered - don't filter again
  const [showCompleted, setShowCompleted] = useState(showCompletedToggle ? defaultShowCompleted : true);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // Filter completed tasks (only if we're managing the toggle ourselves)
  const filteredTasks = showCompleted
    ? tasks
    : tasks.filter((t) => t.status !== "complete" && t.status !== "cancelled");

  const completedCount = tasks.filter(
    (t) => t.status === "complete" || t.status === "cancelled"
  ).length;

  // Helper to get date group key
  const getDateGroupKey = (dateStr: string | null): string => {
    if (!dateStr) return "no-date";
    if (dateStr < today) return "overdue";
    if (dateStr === today) return "today";
    if (dateStr === tomorrow) return "tomorrow";
    const date = new Date(dateStr);
    const daysDiff = Math.ceil((date.getTime() - Date.now()) / 86400000);
    if (daysDiff <= 7) return "this-week";
    if (daysDiff <= 14) return "next-week";
    return "later";
  };

  // Build grouped display items
  const groups: Record<string, GroupedDisplayItem[]> = {};

  // Track which task IDs are in which date group (for deduplication)
  const taskIdsByGroup: Record<string, Set<number>> = {};

  // Add tasks to groups
  for (const task of filteredTasks) {
    let key: string;
    switch (groupBy) {
      case "status":
        key = task.status;
        break;
      case "owner":
        key = task.ownerName || "Unassigned";
        break;
      case "project":
        key = task.projectName || "No project";
        break;
      case "date":
        key = getDateGroupKey(task.dueDate);
        break;
    }

    if (!groups[key]) {
      groups[key] = [];
      taskIdsByGroup[key] = new Set();
    }
    groups[key].push({ type: "task", task });
    taskIdsByGroup[key].add(task.id);
  }

  // When grouping by date, also add check-in reminders based on checkin_by date
  // Use allTasksForCheckins if provided (to bypass owner filter), otherwise use tasks
  // Note: checkin_by only contains pending (uncompleted) check-ins from the check_ins table
  // Only add check-in rows for tasks NOT already in the same date group (to avoid duplication)
  if (groupBy === "date") {
    const checkinSource = allTasksForCheckins || tasks;
    for (const task of checkinSource) {
      // Skip completed/cancelled
      if (task.status === "complete" || task.status === "cancelled") continue;
      // Skip if no pending check-in date
      if (!task.checkinBy) continue;

      const checkinKey = getDateGroupKey(task.checkinBy);

      // Skip if this task is already shown as a regular task in the SAME date group
      // (the task row already displays check-in info, so showing both is redundant)
      if (taskIdsByGroup[checkinKey]?.has(task.id)) continue;

      if (!groups[checkinKey]) {
        groups[checkinKey] = [];
        taskIdsByGroup[checkinKey] = new Set();
      }
      groups[checkinKey].push({ type: "checkin", task });
    }
  }

  // Sort groups
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (groupBy === "status") {
      const order = [
        "in_progress",
        "blocked",
        "pending",
        "complete",
        "cancelled",
        "deferred",
      ];
      return order.indexOf(a) - order.indexOf(b);
    }
    if (groupBy === "date") {
      const order = [
        "overdue",
        "today",
        "tomorrow",
        "this-week",
        "next-week",
        "later",
        "no-date",
      ];
      return order.indexOf(a) - order.indexOf(b);
    }
    return a.localeCompare(b);
  });

  const dateLabels: Record<string, string> = {
    overdue: "Overdue",
    today: "Today",
    tomorrow: "Tomorrow",
    "this-week": "This Week",
    "next-week": "Next Week",
    later: "Later",
    "no-date": "No Due Date",
  };

  const dateColors: Record<string, string> = {
    overdue: "text-red-400",
    today: "text-amber-400",
    tomorrow: "text-blue-400",
    "this-week": "text-zinc-300",
    "next-week": "text-zinc-400",
    later: "text-zinc-500",
    "no-date": "text-zinc-600",
  };

  return (
    <div>
      {showCompletedToggle && completedCount > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors ${
              showCompleted
                ? "bg-zinc-700 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {showCompleted ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            {showCompleted ? "Hide" : "Show"} completed ({completedCount})
          </button>
        </div>
      )}

      <div className="space-y-4">
        {sortedKeys.map((key) => {
          const items = groups[key];
          // Extract just the tasks for counting (check-ins don't count toward total)
          const taskCount = items.filter(i => i.type === "task").length;
          const checkinCount = items.filter(i => i.type === "checkin").length;

          return (
            <div key={key}>
              <h4
                className={`text-[11px] font-medium uppercase tracking-wider mb-1.5 ${
                  groupBy === "date" ? dateColors[key] || "text-zinc-400" : "text-zinc-400"
                }`}
              >
                {groupBy === "status"
                  ? statusConfig[key as keyof typeof statusConfig]?.label || key
                  : groupBy === "date"
                  ? dateLabels[key] || key
                  : key}
                <span className="text-zinc-600 ml-1.5">
                  ({taskCount}{checkinCount > 0 ? ` + ${checkinCount} check-ins` : ""})
                </span>
              </h4>
              <div className="space-y-1.5">
                {items.map((item, index) =>
                  item.type === "task" ? (
                    <TaskRow
                      key={`task-${item.task.id}`}
                      task={item.task}
                      showProject={groupBy !== "project"}
                      showMeeting={false}
                      compact
                      interactive
                      // Don't show owner in title when grouped by owner (it's the group header)
                      showOwnerInTitle={groupBy !== "owner" && highlightOtherOwners && item.task.ownerName !== DEFAULT_OWNER_NAME}
                      onRefresh={handleRefresh}
                    />
                  ) : (
                    <CheckInRow
                      key={`checkin-${item.task.id}-${index}`}
                      task={item.task}
                      compact
                      interactive
                      onRefresh={handleRefresh}
                    />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Person-grouped task list: groups by owner first, then by date within each owner
interface PersonGroupedTaskListProps {
  tasks: Task[];
  showProject?: boolean;
  showCompletedToggle?: boolean;
  defaultShowCompleted?: boolean;
}

export function PersonGroupedTaskList({
  tasks,
  showProject = false,
  showCompletedToggle = true,
  defaultShowCompleted = false,
}: PersonGroupedTaskListProps) {
  const [showCompleted, setShowCompleted] = useState(showCompletedToggle ? defaultShowCompleted : true);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // Filter completed tasks
  const filteredTasks = showCompleted
    ? tasks
    : tasks.filter((t) => t.status !== "complete" && t.status !== "cancelled");

  const completedCount = tasks.filter(
    (t) => t.status === "complete" || t.status === "cancelled"
  ).length;

  // Group by person first
  const byPerson = filteredTasks.reduce((acc, task) => {
    const owner = task.ownerName || "Unassigned";
    if (!acc[owner]) {
      acc[owner] = [];
    }
    acc[owner].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Sort people - put "Unassigned" last
  const sortedPeople = Object.keys(byPerson).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  // Helper to get date group key
  const getDateGroup = (task: Task): string => {
    if (!task.dueDate) return "no-date";
    if (task.dueDate < today) return "overdue";
    if (task.dueDate === today) return "today";
    if (task.dueDate === tomorrow) return "tomorrow";
    const dueDate = new Date(task.dueDate);
    const daysDiff = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
    if (daysDiff <= 7) return "this-week";
    if (daysDiff <= 14) return "next-week";
    return "later";
  };

  const dateLabels: Record<string, string> = {
    overdue: "Overdue",
    today: "Today",
    tomorrow: "Tomorrow",
    "this-week": "This Week",
    "next-week": "Next Week",
    later: "Later",
    "no-date": "No Due Date",
  };

  const dateColors: Record<string, string> = {
    overdue: "text-red-400",
    today: "text-amber-400",
    tomorrow: "text-blue-400",
    "this-week": "text-zinc-300",
    "next-week": "text-zinc-400",
    later: "text-zinc-500",
    "no-date": "text-zinc-600",
  };

  const dateOrder = ["overdue", "today", "tomorrow", "this-week", "next-week", "later", "no-date"];

  return (
    <div>
      {showCompletedToggle && completedCount > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors ${
              showCompleted
                ? "bg-zinc-700 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {showCompleted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showCompleted ? "Hide" : "Show"} completed ({completedCount})
          </button>
        </div>
      )}

      <div className="space-y-5">
        {sortedPeople.map((person) => {
          const personTasks = byPerson[person];

          // Group this person's tasks by date
          const byDate = personTasks.reduce((acc, task) => {
            const dateKey = getDateGroup(task);
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(task);
            return acc;
          }, {} as Record<string, Task[]>);

          const sortedDates = Object.keys(byDate).sort(
            (a, b) => dateOrder.indexOf(a) - dateOrder.indexOf(b)
          );

          return (
            <div key={person}>
              {/* Person header */}
              <h3 className="text-[12px] font-medium text-zinc-300 mb-2 pb-1 border-b border-zinc-800">
                {person}
                <span className="text-zinc-600 ml-1.5 font-normal">({personTasks.length})</span>
              </h3>

              {/* Date groups within this person */}
              <div className="space-y-3 pl-2">
                {sortedDates.map((dateKey) => (
                  <div key={dateKey}>
                    <h4
                      className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${
                        dateColors[dateKey] || "text-zinc-400"
                      }`}
                    >
                      {dateLabels[dateKey] || dateKey}
                      <span className="text-zinc-600 ml-1">({byDate[dateKey].length})</span>
                    </h4>
                    <TaskList
                      tasks={byDate[dateKey]}
                      showProject={showProject}
                      compact
                      showCompletedToggle={false}
                      showCheckinReminders={false}
                      highlightOtherOwners={false} // Owner is already shown as group header
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
