"use client";

/**
 * TaskListConnected - SSR-hydrated task list with real-time updates
 *
 * This component bridges SSR-rendered pages with real-time data updates:
 * 1. Server passes initialTasks (from SQLite direct read)
 * 2. Component uses initialData for instant hydration (no loading state)
 * 3. useRealtimeSync invalidates cache when mutations emit events
 * 4. tRPC refetches data automatically
 *
 * Usage:
 *   <TaskListConnected
 *     filter={{ ownerName: "John" }}
 *     initialTasks={tasksFromServer}
 *     showProject
 *   />
 */

import { trpc } from "@/lib/trpc";
import { TaskList, GroupedTaskList, PersonGroupedTaskList } from "../task-list";
import type { Task } from "@/lib/task-db";
import type { ItemWithRelations, ItemStatus } from "@kw/api-types";

// =============================================================================
// TYPES
// =============================================================================

export interface TaskFilter {
  ownerName?: string;
  projectSlug?: string;
  sourceMeetingId?: number;
  orgSlug?: string;
  includeCompleted?: boolean;
  status?: ItemStatus | ItemStatus[];
}

interface TaskListConnectedBaseProps {
  filter: TaskFilter;
  initialTasks?: Task[];

  // Display options (passed to TaskList)
  showProject?: boolean;
  showMeeting?: boolean;
  compact?: boolean;
  interactive?: boolean;
  showCompletedToggle?: boolean;
  defaultShowCompleted?: boolean;
  showCheckinReminders?: boolean;
  showCreateButton?: boolean;
  defaultProjectId?: number;
  defaultOwnerId?: number;
  highlightOtherOwners?: boolean;
}

interface FlatTaskListProps extends TaskListConnectedBaseProps {
  variant?: "flat";
  groupBy?: never;
}

interface GroupedTaskListProps extends TaskListConnectedBaseProps {
  variant: "grouped";
  groupBy: "status" | "owner" | "project" | "date";
  allTasksForCheckins?: Task[];
}

interface PersonGroupedTaskListProps extends TaskListConnectedBaseProps {
  variant: "person-grouped";
  groupBy?: never;
}

export type TaskListConnectedProps =
  | FlatTaskListProps
  | GroupedTaskListProps
  | PersonGroupedTaskListProps;

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

/**
 * Transform Task (SQLite type) to ItemWithRelations (tRPC type)
 * Used to provide initialData to tRPC query
 */
function taskToItem(task: Task): ItemWithRelations {
  return {
    id: task.id,
    displayId: task.displayId,
    title: task.title,
    description: task.description,
    itemType: "task",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    targetPeriod: task.targetPeriod,
    ownerId: task.ownerId,
    projectId: task.projectId,
    parentId: task.parentId,
    sourceMeetingId: task.sourceMeetingId,
    sourceType: null,
    sourcePath: null,
    filePath: null,
    fileHash: null,
    routineParentId: null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    deletedAt: null,
    ownerName: task.ownerName,
    projectSlug: task.projectSlug,
    projectName: task.projectName,
    projectOrg: task.projectOrg,
    projectOrgColor: task.projectOrgColor,
    projectOrgShortName: task.projectOrgShortName,
    projectParentSlug: task.projectParentSlug,
    projectFullPath: task.projectFullPath,
    projectIsGeneral: task.projectIsGeneral,
    sourceMeetingTitle: task.sourceMeetingTitle,
    sourceMeetingPath: null,
    subtaskCount: task.subtaskCount,
    subtasksComplete: task.subtasksComplete,
    checkinBy: task.checkinBy,
    checkinId: task.checkinId,
  };
}

/**
 * Transform ItemWithRelations (tRPC type) to Task (for TaskList component)
 */
function itemToTask(item: ItemWithRelations): Task {
  return {
    id: item.id,
    displayId: item.displayId,
    title: item.title,
    description: item.description ?? null,
    status: item.status as Task["status"],
    priority: item.priority ?? null,
    dueDate: item.dueDate ?? null,
    checkinBy: item.checkinBy ?? null,
    checkinId: item.checkinId ?? null,
    targetPeriod: item.targetPeriod ?? null,
    ownerId: item.ownerId ?? null,
    ownerName: item.ownerName ?? null,
    projectId: item.projectId ?? null,
    projectSlug: item.projectSlug ?? null,
    projectName: item.projectName ?? null,
    projectOrg: item.projectOrg ?? null,
    projectOrgColor: item.projectOrgColor ?? null,
    projectOrgShortName: item.projectOrgShortName ?? null,
    projectParentSlug: item.projectParentSlug ?? null,
    projectFullPath: item.projectFullPath ?? null,
    projectIsGeneral: item.projectIsGeneral ?? false,
    sourceMeetingId: item.sourceMeetingId ?? null,
    sourceMeetingTitle: item.sourceMeetingTitle ?? null,
    parentId: item.parentId ?? null,
    subtaskCount: item.subtaskCount ?? 0,
    subtasksComplete: item.subtasksComplete ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt ?? null,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TaskListConnected(props: TaskListConnectedProps) {
  const {
    filter,
    initialTasks,
    variant = "flat",
    showProject = false,
    showMeeting = false,
    compact = false,
    interactive = true,
    showCompletedToggle = true,
    defaultShowCompleted = false,
    showCheckinReminders = true,
    showCreateButton = false,
    defaultProjectId,
    defaultOwnerId,
    highlightOtherOwners = true,
  } = props;

  // Build tRPC query with initialData from server
  const { data, refetch } = trpc.items.list.useQuery(
    {
      ownerName: filter.ownerName,
      projectSlug: filter.projectSlug,
      sourceMeetingId: filter.sourceMeetingId,
      orgSlug: filter.orgSlug,
      includeCompleted: filter.includeCompleted ?? true,
      status: filter.status,
      itemType: "task",
      limit: 500,
    },
    {
      // Use initial tasks from server for instant hydration
      initialData: initialTasks
        ? {
            items: initialTasks.map(taskToItem),
            total: initialTasks.length,
            limit: 500,
            offset: 0,
          }
        : undefined,
      // Keep data fresh but don't refetch immediately if we have initialData
      staleTime: initialTasks ? 30_000 : 0,
    }
  );

  // Transform tRPC response to Task[] for TaskList components
  const tasks = data?.items.map(itemToTask) ?? initialTasks ?? [];

  // Common display props
  const displayProps = {
    showProject,
    showMeeting,
    compact,
    interactive,
    showCompletedToggle,
    defaultShowCompleted,
    showCheckinReminders,
    showCreateButton,
    defaultProjectId,
    defaultOwnerId,
    highlightOtherOwners,
    onRefresh: () => refetch(),
  };

  // Render based on variant
  if (variant === "grouped" && "groupBy" in props && props.groupBy) {
    return (
      <GroupedTaskList
        tasks={tasks}
        groupBy={props.groupBy}
        showCompletedToggle={showCompletedToggle}
        defaultShowCompleted={defaultShowCompleted}
        allTasksForCheckins={props.allTasksForCheckins}
        highlightOtherOwners={highlightOtherOwners}
        onRefresh={() => refetch()}
      />
    );
  }

  if (variant === "person-grouped") {
    return (
      <PersonGroupedTaskList
        tasks={tasks}
        showProject={showProject}
        showCompletedToggle={showCompletedToggle}
        defaultShowCompleted={defaultShowCompleted}
      />
    );
  }

  // Default: flat list
  return <TaskList tasks={tasks} {...displayProps} />;
}
