"use client";

import { CheckCircle2, Circle, Loader2, Info } from "lucide-react";
import { useState, useCallback } from "react";
import type { Task } from "@/lib/task-db";
import { useRouter } from "next/navigation";
import { formatDisplayDate } from "@/lib/date-parser";
import { TaskDetailModal } from "../task-detail-popover";
import { trpc } from "@/lib/trpc";

export interface CheckInRowProps {
  task: Task;
  compact: boolean;
  interactive: boolean;
  onRefresh?: () => void;
}

/**
 * Check-in reminder row - a separate visual item that links to the underlying task.
 * Shows pending check-in dates for tasks that need follow-up.
 */
export function CheckInRow({ task, compact, interactive, onRefresh }: CheckInRowProps) {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const router = useRouter();

  // tRPC mutation
  const completeCheckinMutation = trpc.items.completeCheckin.useMutation({
    onSuccess: () => {
      handleRefresh();
    },
  });

  const loading = completeCheckinMutation.isPending;

  // Use onRefresh if provided, otherwise fall back to router.refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  }, [onRefresh, router]);

  // Check if check-in is due (today or past)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkinDate = task.checkinBy ? new Date(task.checkinBy) : null;
  if (checkinDate) checkinDate.setHours(0, 0, 0, 0);
  const isDue = checkinDate && checkinDate <= today;
  // Check-ins shown here are always pending (completed ones are filtered out at query level)
  const isCompleted = false;

  const handleRowClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;

    e.preventDefault();
    e.stopPropagation();
    setDetailModalOpen(true);
  };

  const handleCompleteCheckin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive || loading) return;

    completeCheckinMutation.mutate({
      id: task.id,
      clear: true, // Clear the check-in date after completing
    });
  };

  // Use purple for due check-ins, zinc/gray for upcoming ones, green for completed
  const borderColor = isCompleted ? "border-emerald-600" : isDue ? "border-purple-500" : "border-zinc-600";
  const iconColor = isCompleted ? "text-emerald-400" : isDue ? "text-purple-400" : "text-zinc-500";
  const idColor = isCompleted ? "text-emerald-600" : isDue ? "text-purple-500" : "text-zinc-600";
  const titleColor = isCompleted ? "text-zinc-500" : isDue ? "text-purple-300" : "text-zinc-400";
  const dateColor = isCompleted ? "text-zinc-500" : isDue ? "text-purple-400" : "text-zinc-500";
  const hoverBg = isCompleted ? "hover:bg-zinc-800/30" : isDue ? "hover:bg-purple-900/20" : "hover:bg-zinc-800/30";

  return (
    <div className={compact ? "" : "relative"}>
      <div
        onClick={handleRowClick}
        className={`group flex items-start gap-2 ${
          compact
            ? `py-2 px-2 rounded-md border border-zinc-700/50 ${hoverBg}`
            : `p-3 rounded-lg border border-zinc-700/40 ${hoverBg}`
        } ${isDue ? "bg-purple-900/10" : "bg-zinc-800/40"} border-l-2 ${borderColor} ${interactive ? "cursor-pointer" : ""} ${loading ? "opacity-50" : ""} transition-colors`}
      >
        {/* Clickable checkbox to complete check-in */}
        <button
          onClick={handleCompleteCheckin}
          disabled={!interactive || loading || isCompleted}
          className={`mt-0.5 flex-shrink-0 ${
            interactive && !loading && !isCompleted
              ? "cursor-pointer hover:scale-110 transition-transform"
              : ""
          }`}
          title={isCompleted ? "Check-in completed" : "Mark check-in as done"}
        >
          {loading ? (
            <Loader2 className={`h-4 w-4 ${iconColor} animate-spin`} />
          ) : isCompleted ? (
            <CheckCircle2 className={`h-4 w-4 ${iconColor}`} />
          ) : (
            <Circle className={`h-4 w-4 ${iconColor}`} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {/* Task ID */}
            <span className={`text-[10px] ${idColor} font-mono flex-shrink-0`}>
              {task.displayId}
            </span>

            {/* Title: "Check in | Owner | Task" format */}
            <span className={`text-[13px] ${titleColor} ${isCompleted ? "line-through" : ""}`}>
              <span className="font-medium">Check in</span>
              {task.ownerName && <><span className="text-zinc-500 mx-1.5">|</span><span className="text-zinc-400">{task.ownerName}</span></>}
              <span className="text-zinc-500 mx-1.5">|</span>
              {task.title}
            </span>
          </div>

          {/* Meta row - just date now */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {task.checkinBy && (
              <span className={`text-[10px] ${dateColor}`}>
                {formatDisplayDate(task.checkinBy)}
              </span>
            )}
          </div>
        </div>

        {/* Info button */}
        {interactive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDetailModalOpen(true);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-opacity"
            title="View task details"
          >
            <Info className={`h-3 w-3 ${iconColor}`} />
          </button>
        )}
      </div>

      {/* Task detail modal */}
      <TaskDetailModal
        taskId={task.id}
        displayId={task.displayId}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onUpdate={() => handleRefresh()}
      />
    </div>
  );
}
