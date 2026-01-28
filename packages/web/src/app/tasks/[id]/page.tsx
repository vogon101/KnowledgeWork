"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TaskDetailContent, transformTaskData } from "@/components/task-detail-popover";
import { trpc } from "@/lib/trpc";

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

  // Transform tRPC response to TaskDetail using shared function
  const task = taskQuery.data ? transformTaskData(taskQuery.data) : null;

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
          onRefetchTask={handleUpdate}
        />
      </div>
    </div>
  );
}
