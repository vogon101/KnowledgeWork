"use client";

import Link from "next/link";
import { Play, Target, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

function PriorityBadge({ priority }: { priority: number | null | undefined }) {
  if (!priority) return null;
  const colors: Record<number, string> = {
    1: "bg-red-500/20 text-red-400",
    2: "bg-orange-500/20 text-orange-400",
    3: "bg-yellow-500/20 text-yellow-400",
    4: "bg-zinc-500/20 text-zinc-400",
  };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${colors[priority] || colors[4]}`}>
      P{priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    in_progress: "bg-blue-500/20 text-blue-400",
    pending: "bg-zinc-500/20 text-zinc-400",
    blocked: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] rounded ${colors[status] || colors.pending}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function TodaysFocus() {
  const inProgressQuery = trpc.query.inProgress.useQuery({ limit: 5 });
  const todayQuery = trpc.query.today.useQuery();
  const highPriorityQuery = trpc.query.highPriority.useQuery({ limit: 5 });

  const inProgressTasks = inProgressQuery.data?.items || [];
  const todayTasks = todayQuery.data?.items || [];
  const highPriorityTasks = highPriorityQuery.data?.items || [];

  // Combine for "focus" - in-progress first, then today's due, then high priority
  // Deduplicate by ID
  const seenIds = new Set<number>();
  const focusTasks: typeof inProgressTasks = [];

  for (const task of [...inProgressTasks, ...todayTasks, ...highPriorityTasks]) {
    if (!seenIds.has(task.id)) {
      seenIds.add(task.id);
      focusTasks.push(task);
    }
  }

  if (focusTasks.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
        <div className="flex items-center gap-2 text-zinc-400">
          <Target className="h-4 w-4" />
          <span className="text-[13px]">No focus tasks</span>
        </div>
        <p className="text-[12px] text-zinc-500 mt-1">
          Start a task or set priorities to see focus items here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* In Progress */}
      {inProgressTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Play className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">
                In Progress ({inProgressTasks.length})
              </span>
            </div>
            <Link
              href="/tasks?status=in_progress"
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {inProgressTasks.slice(0, 4).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.displayId}`}
                className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-blue-500/10 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <PriorityBadge priority={task.priority} />
                  <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 truncate">
                    {task.title}
                  </span>
                </div>
                {task.projectName && (
                  <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2 truncate max-w-[80px]">
                    {task.projectName}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Due Today */}
      {todayTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Due Today ({todayTasks.length})
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            {todayTasks
              .filter((t) => t.status !== "in_progress")
              .slice(0, 3)
              .map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.displayId}`}
                  className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-emerald-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 truncate">
                      {task.title}
                    </span>
                  </div>
                  <StatusBadge status={task.status} />
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* High Priority (if not already shown) */}
      {highPriorityTasks.filter((t) => t.status !== "in_progress").length > 0 && (
        <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              High Priority
            </span>
          </div>
          <div className="space-y-1.5">
            {highPriorityTasks
              .filter((t) => t.status !== "in_progress" && !todayTasks.some((tt) => tt.id === t.id))
              .slice(0, 3)
              .map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.displayId}`}
                  className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-zinc-700/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 truncate">
                      {task.title}
                    </span>
                  </div>
                  <StatusBadge status={task.status} />
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
