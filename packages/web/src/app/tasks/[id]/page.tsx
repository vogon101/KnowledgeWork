"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TaskDetailContent } from "@/components/task-detail-popover";
import { trpc } from "@/lib/trpc";

// Task detail type (camelCase) - matches TaskDetailContent component expectations
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
  // Blocking relationships via ItemLink
  blockers?: Array<{ id: number; displayId: string; title: string; status: string; linkId?: number }>;
  blocking?: Array<{ id: number; displayId: string; title: string; status: string; linkId?: number }>;
  subtaskCount: number;
  subtasksComplete: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  updates?: Array<{
    id: number;
    taskId: number;
    note: string;
    updateType: string;
    oldStatus: string | null;
    newStatus: string | null;
    createdAt: string;
  }>;
  subtasks?: TaskDetail[];
  relatedTasks?: TaskDetail[];
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [taskId, setTaskId] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then(({ id }) => {
      const parsedId = parseInt(id.replace(/^T-/i, ""), 10);
      if (isNaN(parsedId)) {
        setParseError("Invalid task ID");
        return;
      }
      setTaskId(parsedId);
    });
  }, [params]);

  // Fetch task using tRPC
  const taskQuery = trpc.items.get.useQuery(
    { id: taskId! },
    { enabled: taskId !== null }
  );

  const handleUpdate = () => {
    taskQuery.refetch();
  };

  // Transform tRPC response to TaskDetail (camelCase to camelCase, just fill in nulls)
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
    subtasks: undefined,
    relatedTasks: undefined,
  } : null;

  const loading = taskId === null || taskQuery.isLoading;
  const error = parseError || (taskQuery.isError ? taskQuery.error.message : null);

  const handleClose = () => {
    router.push("/tasks");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Link>
        <div className="bg-zinc-800 rounded-lg p-8 text-center">
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => taskQuery.refetch()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back link */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tasks
      </Link>

      {/* Task detail content - same component as modal, just full-width */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        <TaskDetailContent
          task={task}
          onClose={handleClose}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
