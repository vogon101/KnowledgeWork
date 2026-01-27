"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TaskList, GroupedTaskList, DEFAULT_OWNER_NAME } from "@/components/task-list";
import { RoutinesSection } from "@/components/routines-section";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { SyncConfirmationModal } from "@/components/sync-confirmation-modal";
import type { Task } from "@/lib/task-db";
import { trpc, type ItemWithRelations } from "@/lib/trpc";
import {
  AlertCircle,
  User,
  Users,
  Folder,
  RefreshCw,
  CheckCircle,
  RefreshCcw,
  Clock,
  UserX,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// Transform tRPC response to Task format (both use camelCase now)
type TaskStatus = "pending" | "in_progress" | "complete" | "blocked" | "cancelled" | "deferred";

/**
 * Transform ItemWithRelations to Task. Types are now aligned so this is mostly pass-through.
 */
function transformItem(item: ItemWithRelations): Task {
  return {
    ...item,
    description: item.description || null,
    status: item.status as TaskStatus,
    priority: item.priority || null,
    dueDate: item.dueDate || null,
    checkinBy: item.checkinBy || null,
    checkinId: item.checkinId || null,
    targetPeriod: item.targetPeriod || null,
    ownerId: item.ownerId || null,
    ownerName: item.ownerName || null,
    projectId: item.projectId || null,
    projectSlug: item.projectSlug || null,
    projectName: item.projectName || null,
    projectOrg: item.projectOrg || null,
    projectOrgColor: item.projectOrgColor || null,
    projectOrgShortName: item.projectOrgShortName || null,
    projectParentSlug: item.projectParentSlug || null,
    projectFullPath: item.projectFullPath || item.projectSlug || null,
    sourceMeetingId: item.sourceMeetingId || null,
    sourceMeetingTitle: item.sourceMeetingTitle || null,
    parentId: item.parentId || null,
    subtaskCount: item.subtaskCount || 0,
    subtasksComplete: item.subtasksComplete || 0,
    completedAt: item.completedAt || null,
  };
}

interface TasksDashboardProps {
  allTasks?: Task[];
  overdueTasks?: Task[];
}

type ViewMode = "by-date" | "by-status" | "by-owner" | "by-project";
type FilterStatus = "all" | "pending" | "in_progress" | "blocked" | "unowned";
type OwnerFilter = "me" | "all";

export function TasksDashboard({ allTasks: initialAllTasks = [], overdueTasks: initialOverdueTasks = [] }: TasksDashboardProps) {
  const searchParams = useSearchParams();

  // Read initial values from URL params
  const urlStatus = searchParams.get("status") as FilterStatus | null;
  const urlView = searchParams.get("view") as ViewMode | null;
  const urlOwner = searchParams.get("owner") as OwnerFilter | null;
  const urlOrg = searchParams.get("org");
  const urlProject = searchParams.get("project");

  const [viewMode, setViewMode] = useState<ViewMode>(urlView || "by-date");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(urlStatus || "all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>(urlOwner || "me"); // Default to "me" (Alice)
  const [orgFilter, setOrgFilter] = useState<string | null>(urlOrg);
  const [projectFilter, setProjectFilter] = useState<string | null>(urlProject);
  const [showCompleted, setShowCompleted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncAllModalOpen, setSyncAllModalOpen] = useState(false);

  // Update state when URL params change
  useEffect(() => {
    if (urlStatus) setFilterStatus(urlStatus);
    if (urlView) setViewMode(urlView);
    if (urlOwner) setOwnerFilter(urlOwner);
    setOrgFilter(urlOrg);
    setProjectFilter(urlProject);
  }, [urlStatus, urlView, urlOwner, urlOrg, urlProject]);

  // tRPC utilities for cache invalidation
  const utils = trpc.useUtils();

  // Fetch all tasks using tRPC (type-safe!)
  // Filter to 'task' type only - routines have their own dedicated section
  const tasksQuery = trpc.items.list.useQuery({
    itemType: 'task',
    includeCompleted: true,
    limit: 500,
  });

  // Fetch overdue tasks using tRPC (type-safe!)
  const overdueQuery = trpc.query.overdue.useQuery({});

  // Fetch check-ins using tRPC (type-safe!)
  const checkinsQuery = trpc.items.checkins.useQuery({ includeFuture: true });

  // Transform tRPC data to Task[] for components
  const allTasks: Task[] = tasksQuery.data?.items
    ? tasksQuery.data.items.map(transformItem)
    : initialAllTasks;

  const overdueTasks: Task[] = overdueQuery.data?.items
    ? overdueQuery.data.items.map(transformItem)
    : initialOverdueTasks;

  // Merge check-in data into tasks
  const allTasksWithCheckins: Task[] = allTasks.map(task => {
    const checkinInfo = checkinsQuery.data?.find(c => c.id === task.id);
    if (checkinInfo) {
      return {
        ...task,
        checkinBy: checkinInfo.checkinBy || null,
        checkinId: checkinInfo.checkinId || null,
      };
    }
    return task;
  });

  // Refresh function that invalidates tRPC cache
  const refreshTasks = useCallback(async () => {
    await utils.items.list.invalidate();
    await utils.query.overdue.invalidate();
    await utils.items.checkins.invalidate();
  }, [utils]);

  const lastRefreshed = tasksQuery.dataUpdatedAt
    ? new Date(tasksQuery.dataUpdatedAt)
    : new Date();
  const refreshing = tasksQuery.isFetching;
  const initialLoading = tasksQuery.isLoading && initialAllTasks.length === 0;

  // First filter by completed status
  const activeTasks = showCompleted
    ? allTasksWithCheckins
    : allTasksWithCheckins.filter(t => t.status !== "complete" && t.status !== "cancelled");

  // Then filter by status type (or unowned)
  const statusFilteredTasks = filterStatus === "all"
    ? activeTasks
    : filterStatus === "unowned"
    ? activeTasks.filter(t => !t.ownerId && !t.ownerName)
    : activeTasks.filter(t => t.status === filterStatus);

  // Then filter by owner
  const ownerFilteredTasks = ownerFilter === "me"
    ? statusFilteredTasks.filter(t => t.ownerName === DEFAULT_OWNER_NAME)
    : statusFilteredTasks;

  // Then filter by org (if specified in URL)
  const orgFilteredTasks = orgFilter
    ? ownerFilteredTasks.filter(t => t.projectOrg === orgFilter)
    : ownerFilteredTasks;

  // Then filter by project (if specified in URL)
  const projectFilteredTasks = projectFilter
    ? orgFilteredTasks.filter(t => t.projectSlug === projectFilter || t.projectFullPath === projectFilter)
    : orgFilteredTasks;

  const myOverdueTasks = ownerFilter === "me"
    ? overdueTasks.filter(t => t.ownerName === DEFAULT_OWNER_NAME)
    : overdueTasks;

  // Exclude overdue tasks from main list (they're shown in the overdue alert box above)
  const overdueIds = new Set(myOverdueTasks.map(t => t.id));
  const filteredTasks = projectFilteredTasks.filter(t => !overdueIds.has(t.id));

  // Group by unique owners and projects for stats
  const pendingTasks = allTasksWithCheckins.filter(t => t.status !== "complete" && t.status !== "cancelled");
  const owners = [...new Set(pendingTasks.map(t => t.ownerName).filter(Boolean))];
  const projects = [...new Set(pendingTasks.map(t => t.projectName).filter(Boolean))];

  // Stats - based on currently filtered tasks (excluding completed for stats)
  const tasksForStats = ownerFilter === "me"
    ? pendingTasks.filter(t => t.ownerName === DEFAULT_OWNER_NAME)
    : pendingTasks;

  // Count completed tasks
  const completedCount = allTasksWithCheckins.filter(t => t.status === "complete" || t.status === "cancelled").length;

  // Unowned tasks (always from all pending tasks, not filtered by owner)
  const unownedTasks = pendingTasks.filter(t => !t.ownerId && !t.ownerName);

  const stats = {
    total: tasksForStats.length,
    overdue: myOverdueTasks.length,
    inProgress: tasksForStats.filter(t => t.status === "in_progress").length,
    blocked: tasksForStats.filter(t => t.status === "blocked").length,
    pending: tasksForStats.filter(t => t.status === "pending").length,
    unowned: unownedTasks.length,
  };


  const syncAllMutation = trpc.sync.all.useMutation({
    onSuccess: (data) => {
      setSyncResult(
        `Synced: ${data.meetings?.tasksCreated || 0} tasks created, ${data.projects?.projectsCreated || 0} projects added`
      );
      refreshTasks();
    },
    onError: (error) => {
      setSyncResult(`Error: ${error.message}`);
    },
    onSettled: () => {
      setSyncing(false);
    },
  });

  const handleSyncAll = () => {
    setSyncing(true);
    setSyncResult(null);
    syncAllMutation.mutate();
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-500">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-shrink-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Tasks</h1>
            <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
              <p className="text-[12px] sm:text-[13px] text-zinc-500">
                {stats.total} {ownerFilter === "me" ? "my" : ""} active tasks
                {orgFilter && <span className="text-blue-400"> in {orgFilter}</span>}
                {projectFilter && <span className="text-blue-400"> ({projectFilter})</span>}
                {!orgFilter && !projectFilter && ` across ${projects.length} projects`}
                {(orgFilter || projectFilter) && (
                  <Link href="/tasks" className="ml-2 text-zinc-400 hover:text-zinc-200 underline">
                    Clear filters
                  </Link>
                )}
              </p>
              <button
                onClick={() => refreshTasks()}
                disabled={refreshing}
                className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-50"
                title={`Last updated: ${lastRefreshed.toLocaleTimeString()}`}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">
                  {refreshing ? "Updating..." : lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:ml-auto">
            {/* Owner filter */}
            <div className="flex items-center border border-zinc-700 rounded-md overflow-hidden">
              <button
                onClick={() => setOwnerFilter("me")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] transition-colors ${
                  ownerFilter === "me"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">My Tasks</span>
                <span className="xs:hidden">Mine</span>
              </button>
              <button
                onClick={() => setOwnerFilter("all")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] transition-colors ${
                  ownerFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                All
              </button>
            </div>
            <CreateTaskDialog onTaskCreated={() => refreshTasks()} />
            <Link
              href="/people"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[13px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
              title="People"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">People</span>
            </Link>
            <Link
              href="/routines"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[13px] bg-purple-900/30 hover:bg-purple-900/50 border border-purple-800/50 text-purple-300 rounded-md transition-colors"
              title="Routines"
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Routines</span>
            </Link>
            <button
              onClick={() => setSyncAllModalOpen(true)}
              disabled={syncing}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-[13px] bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-50"
              title="Sync All"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync All"}</span>
            </button>
          </div>
        </div>
        {syncResult && (
          <div className="mt-2">
            <div className={`text-[12px] ${syncResult.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
              {syncResult}
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="p-6 grid gap-4 grid-cols-2 md:grid-cols-6">
        <StatCard
          label="Total Active"
          value={stats.total}
          color="text-zinc-200"
          onClick={() => setFilterStatus("all")}
          active={filterStatus === "all"}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          color="text-red-400"
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          color="text-blue-400"
          onClick={() => setFilterStatus("in_progress")}
          active={filterStatus === "in_progress"}
        />
        <StatCard
          label="Blocked"
          value={stats.blocked}
          color="text-red-400"
          onClick={() => setFilterStatus("blocked")}
          active={filterStatus === "blocked"}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          color="text-amber-400"
          onClick={() => setFilterStatus("pending")}
          active={filterStatus === "pending"}
        />
        <StatCard
          label="Unowned"
          value={stats.unowned}
          color="text-purple-400"
          icon={<UserX className="h-4 w-4" />}
          onClick={() => {
            setOwnerFilter("all"); // Switch to All to see unowned tasks
            setFilterStatus("unowned");
          }}
          active={filterStatus === "unowned"}
        />
      </div>

      {/* Routines Section */}
      <div className="px-6">
        <RoutinesSection />
      </div>

      {/* Overdue Alert */}
      {myOverdueTasks.length > 0 && (
        <div className="mx-6 mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-[14px] font-medium text-red-400">
              {myOverdueTasks.length} Overdue Task{myOverdueTasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <TaskList tasks={myOverdueTasks} showProject compact onRefresh={refreshTasks} />
        </div>
      )}


      {/* View Controls */}
      <div className="px-6 mt-6 mb-4 flex items-center gap-2">
        <span className="text-[12px] text-zinc-500 mr-2">View:</span>
        <ViewButton
          active={viewMode === "by-date"}
          onClick={() => setViewMode("by-date")}
          icon={<Clock className="h-4 w-4" />}
          label="By Date"
        />
        <ViewButton
          active={viewMode === "by-status"}
          onClick={() => setViewMode("by-status")}
          icon={<CheckCircle className="h-4 w-4" />}
          label="By Status"
        />
        <ViewButton
          active={viewMode === "by-owner"}
          onClick={() => setViewMode("by-owner")}
          icon={<User className="h-4 w-4" />}
          label="By Owner"
        />
        <ViewButton
          active={viewMode === "by-project"}
          onClick={() => setViewMode("by-project")}
          icon={<Folder className="h-4 w-4" />}
          label="By Project"
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Show completed toggle */}
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] transition-colors ${
            showCompleted
              ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          {showCompleted ? "Showing" : "Show"} completed ({completedCount})
        </button>
      </div>

      {/* Task List */}
      <div className="px-6 pb-6">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No tasks match the current filter</p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <GroupedTaskList
              tasks={filteredTasks}
              groupBy={
                viewMode === "by-date" ? "date" :
                viewMode === "by-status" ? "status" :
                viewMode === "by-owner" ? "owner" : "project"
              }
              showCompletedToggle={false}
              // Only pass allTasksForCheckins when not filtering by status
              // This prevents showing check-ins for tasks that don't match the filter
              allTasksForCheckins={filterStatus === "all" ? activeTasks : undefined}
              onRefresh={refreshTasks}
            />
          </div>
        )}
      </div>

      {/* Sync Confirmation Modal */}
      <SyncConfirmationModal
        open={syncAllModalOpen}
        onOpenChange={setSyncAllModalOpen}
        onConfirm={handleSyncAll}
        type="all"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  onClick,
  active,
}: {
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`p-4 rounded-lg border transition-colors text-left ${
        active
          ? "bg-zinc-800/80 border-zinc-700"
          : "bg-zinc-800/30 border-zinc-800/50 hover:bg-zinc-800/50"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className={color}>{icon}</span>}
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-2xl font-semibold ${color}`}>{value}</span>
    </Wrapper>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] transition-colors ${
        active
          ? "bg-zinc-700 text-zinc-200"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
