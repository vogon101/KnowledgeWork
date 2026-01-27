"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Bell, Users, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { TaskDetailModal } from "./task-detail-popover";
import { DEFAULT_OWNER_NAME } from "./task-list/config";

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

interface TaskItem {
  id: number;
  displayId: string;
  title: string;
  priority?: number | null;
  status: string;
  dueDate?: string | null;
  checkinBy?: string | null;
  checkinId?: number | null;
  projectName?: string | null;
  projectOrgShortName?: string | null;
  projectOrgColor?: string | null;
  ownerName?: string | null;
}

interface TaskRowProps {
  task: TaskItem;
  variant: "overdue" | "today" | "checkin" | "others";
  onUpdate: () => void;
  showOwner?: boolean;
}

function TaskRow({ task, variant, onUpdate, showOwner }: TaskRowProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const bgHover = {
    overdue: "hover:bg-red-500/10",
    today: "hover:bg-emerald-500/10",
    checkin: "hover:bg-purple-500/10",
    others: "hover:bg-zinc-700/50",
  }[variant];

  const timeColor = {
    overdue: "text-red-400",
    today: "text-emerald-400",
    checkin: "text-purple-400",
    others: "text-zinc-400",
  }[variant];

  // Show owner in title for check-ins (since they're in their own section, no need for "Check in" text)
  // and for "others" variant when showOwner is true
  const shouldShowOwner = showOwner || variant === "checkin";

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`w-full flex items-center justify-between py-1.5 px-2 -mx-2 rounded ${bgHover} transition-colors group text-left`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 truncate">
            {shouldShowOwner && task.ownerName && (
              <><span className="text-zinc-400 font-medium">{task.ownerName}</span><span className="text-zinc-500 mx-1.5">|</span></>
            )}
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {variant === "overdue" && task.dueDate && (
            <span className={`text-[10px] ${timeColor}`}>
              {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
            </span>
          )}
          {task.projectName && (
            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded truncate max-w-[180px] ${
              task.projectOrgColor === "indigo" ? "bg-indigo-500/20 text-indigo-300" :
              task.projectOrgColor === "teal" ? "bg-teal-500/20 text-teal-300" :
              task.projectOrgColor === "rose" ? "bg-rose-500/20 text-rose-300" :
              task.projectOrgColor === "orange" ? "bg-orange-500/20 text-orange-300" :
              "bg-zinc-700/50 text-zinc-300"
            }`}>
              {task.projectOrgShortName ? `${task.projectOrgShortName}: ` : ""}{task.projectName}
            </span>
          )}
          <PriorityBadge priority={task.priority} />
        </div>
      </button>
      <TaskDetailModal
        taskId={task.id}
        displayId={task.displayId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={onUpdate}
      />
    </>
  );
}

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  color: string;
  href: string;
}

function SectionHeader({ icon: Icon, label, count, color, href }: SectionHeaderProps) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between mb-2 group`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className={`text-[11px] font-medium ${color} uppercase tracking-wider`}>
          {label} ({count})
        </span>
      </div>
      <ChevronRight className={`h-3 w-3 ${color} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </Link>
  );
}

export function TodaySection() {
  const utils = trpc.useUtils();

  const overdueQuery = trpc.query.overdue.useQuery({});
  const todayQuery = trpc.query.today.useQuery({});
  const checkinQuery = trpc.items.checkins.useQuery({ includeFuture: false });
  const tasksQuery = trpc.items.list.useQuery({ itemType: 'task', limit: 500 });

  // All tasks for "others" section
  const allTasks = tasksQuery.data?.items || [];

  // Filter to only MY tasks (Alice's)
  const overdueTasks = (overdueQuery.data?.items || []).filter(t => t.ownerName === DEFAULT_OWNER_NAME);
  const todayTasks = (todayQuery.data?.items || []).filter(t => t.ownerName === DEFAULT_OWNER_NAME);
  const checkinTasks = checkinQuery.data || [];

  // Others' tasks due this week (overdue or due within 7 days)
  const inSevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const othersUrgentTasks = allTasks.filter(t =>
    t.ownerName &&
    t.ownerName !== DEFAULT_OWNER_NAME &&
    t.status !== "complete" &&
    t.status !== "cancelled" &&
    t.dueDate &&
    t.dueDate <= inSevenDays
  );

  const handleUpdate = () => {
    utils.query.overdue.invalidate();
    utils.query.today.invalidate();
    utils.items.checkins.invalidate();
    utils.items.list.invalidate();
  };

  // Filter out overdue tasks from today's list to avoid duplicates
  const todayOnlyTasks = todayTasks.filter(
    (t) => !overdueTasks.some((o) => o.id === t.id)
  );

  const totalItems = overdueTasks.length + todayOnlyTasks.length + checkinTasks.length + othersUrgentTasks.length;

  if (totalItems === 0) {
    return (
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="text-lg">✓</span>
          <span className="text-[13px] font-medium">All clear for today!</span>
        </div>
        <p className="text-[12px] text-zinc-500 mt-1">No urgent tasks or check-ins needed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overdue Tasks - Most urgent */}
      {overdueTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <SectionHeader
            icon={AlertTriangle}
            label="Overdue"
            count={overdueTasks.length}
            color="text-red-400"
            href="/tasks?filter=overdue"
          />
          <div className="space-y-1">
            {overdueTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="overdue"
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Due Today */}
      {todayOnlyTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <SectionHeader
            icon={Clock}
            label="Due Today"
            count={todayOnlyTasks.length}
            color="text-emerald-400"
            href="/tasks?filter=today"
          />
          <div className="space-y-1">
            {todayOnlyTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="today"
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Check-ins Due */}
      {checkinTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <SectionHeader
            icon={Bell}
            label="Check-ins Due"
            count={checkinTasks.length}
            color="text-purple-400"
            href="/tasks?filter=checkins"
          />
          <div className="space-y-1">
            {checkinTasks.map((task) => (
              <TaskRow
                key={`${task.id}-${task.checkinId}`}
                task={task}
                variant="checkin"
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Others' Tasks This Week */}
      {othersUrgentTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <SectionHeader
            icon={Users}
            label="Others' Tasks This Week"
            count={othersUrgentTasks.length}
            color="text-zinc-400"
            href="/tasks?owner=all"
          />
          <div className="space-y-1">
            {othersUrgentTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="others"
                showOwner
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
