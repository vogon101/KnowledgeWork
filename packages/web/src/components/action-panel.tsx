"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Ban, Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

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

export function ActionPanel() {
  const overdueQuery = trpc.query.overdue.useQuery();
  const checkinQuery = trpc.items.checkins.useQuery({ includeFuture: false });
  const blockedQuery = trpc.query.blocked.useQuery({ limit: 5 });

  const overdueTasks = overdueQuery.data?.items || [];
  const checkinTasks = checkinQuery.data || [];
  const blockedTasks = blockedQuery.data?.items || [];

  const totalActionItems = overdueTasks.length + checkinTasks.length + blockedTasks.length;

  if (totalActionItems === 0) {
    return (
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="text-lg">✓</span>
          <span className="text-[13px] font-medium">All clear!</span>
        </div>
        <p className="text-[12px] text-zinc-500 mt-1">No urgent actions needed</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[11px] font-medium text-red-400 uppercase tracking-wider">
              Overdue ({overdueTasks.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {overdueTasks.slice(0, 4).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.displayId}`}
                className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-red-500/10 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <PriorityBadge priority={task.priority} />
                  <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 truncate">
                    {task.title}
                  </span>
                </div>
                <span className="text-[10px] text-red-400 flex-shrink-0">
                  {task.dueDate && formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                </span>
              </Link>
            ))}
            {overdueTasks.length > 4 && (
              <Link
                href="/tasks?filter=overdue"
                className="block text-[11px] text-red-400 hover:text-red-300 pt-1"
              >
                +{overdueTasks.length - 4} more overdue
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Check-ins Due */}
      {checkinTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">
              Check-ins ({checkinTasks.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {checkinTasks.slice(0, 3).map((task) => (
              <Link
                key={`${task.id}-${task.checkinId}`}
                href={`/tasks/${task.displayId}`}
                className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-amber-500/10 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <PriorityBadge priority={task.priority} />
                  <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 truncate">
                    {task.title}
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 flex-shrink-0">
                  {task.checkinBy}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Blocked Tasks */}
      {blockedTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Ban className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Blocked ({blockedTasks.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {blockedTasks.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.displayId}`}
                className="flex items-start gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-zinc-700/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 truncate">
                      {task.title}
                    </span>
                  </div>
                  {task.blockers && task.blockers.length > 0 && (
                    <span className="text-[10px] text-zinc-500 mt-0.5 block truncate">
                      Blocked by: {task.blockers[0].title}
                      {task.blockers.length > 1 && ` +${task.blockers.length - 1} more`}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
