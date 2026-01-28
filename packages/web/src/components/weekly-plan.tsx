"use client";

import Link from "next/link";
import { Calendar, ArrowRight, Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format, isTomorrow, parseISO, addDays, isToday } from "date-fns";
import { useTaskModal } from "./task-modal-context";
import { DEFAULT_OWNER_NAME } from "./task-list/config";

function PriorityDot({ priority }: { priority: number | null | undefined }) {
  if (!priority) return <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />;
  const colors: Record<number, string> = {
    1: "bg-red-400",
    2: "bg-orange-400",
    3: "bg-yellow-400",
    4: "bg-zinc-400",
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[priority] || colors[4]}`} />;
}

function formatDayLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, d MMM");
}

interface TaskItem {
  id: number;
  displayId: string;
  title: string;
  priority?: number | null;
  projectName?: string | null;
}

interface CheckinItem {
  id: number;
  displayId: string;
  title: string;
  priority?: number | null;
  checkinId: number;
  checkinBy: string;
}

interface TaskRowProps {
  task: TaskItem;
}

function TaskRow({ task }: TaskRowProps) {
  const { openTaskModal } = useTaskModal();

  return (
    <button
      onClick={() => openTaskModal(task.id, task.displayId)}
      className="w-full flex items-center gap-2 py-1 px-1 -mx-1 rounded hover:bg-zinc-700/50 transition-colors group text-left"
    >
      <PriorityDot priority={task.priority} />
      <span className="text-[12px] text-zinc-300 group-hover:text-zinc-100 truncate flex-1">
        {task.title}
      </span>
      {task.projectName && (
        <span className="text-[10px] text-zinc-600 truncate max-w-[60px]">
          {task.projectName}
        </span>
      )}
    </button>
  );
}

interface CheckinRowProps {
  checkin: CheckinItem;
}

function CheckinRow({ checkin }: CheckinRowProps) {
  const { openTaskModal } = useTaskModal();

  return (
    <button
      onClick={() => openTaskModal(checkin.id, checkin.displayId)}
      className="w-full flex items-center gap-2 py-1 px-1 -mx-1 rounded hover:bg-purple-500/10 transition-colors group text-left"
    >
      <Bell className="w-3 h-3 text-purple-400" />
      <span className="text-[12px] text-zinc-400 group-hover:text-zinc-200 truncate flex-1">
        {checkin.title}
      </span>
      <span className="text-[10px] text-purple-400">Check-in</span>
    </button>
  );
}

export function WeeklyPlan() {
  // Get upcoming tasks (next 7 days, we'll filter out today)
  const upcomingQuery = trpc.query.upcoming.useQuery({ days: 7 });

  // Get upcoming check-ins (next 7 days)
  const checkinsQuery = trpc.items.checkins.useQuery({ includeFuture: true });

  const grouped = upcomingQuery.data?.grouped || [];
  const allCheckins = checkinsQuery.data || [];

  // Filter out today from the grouped data and filter to my tasks only
  const filteredGrouped = grouped
    .filter((g) => !isToday(parseISO(g.date)))
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => item.ownerName === DEFAULT_OWNER_NAME),
    }))
    .filter((g) => g.items.length > 0);

  // Check-ins are always owned by me, so no need to filter by owner

  // Group check-ins by date (excluding today and past)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkinsByDate: Record<string, CheckinItem[]> = {};
  for (const checkin of allCheckins) {
    if (!checkin.checkinBy) continue;
    const checkinDate = parseISO(checkin.checkinBy);
    if (checkinDate <= today) continue; // Skip today and past

    const dateKey = checkin.checkinBy;
    if (!checkinsByDate[dateKey]) {
      checkinsByDate[dateKey] = [];
    }
    checkinsByDate[dateKey].push({
      id: checkin.id,
      displayId: checkin.displayId,
      title: checkin.title,
      priority: checkin.priority,
      checkinId: checkin.checkinId || 0,
      checkinBy: checkin.checkinBy,
    });
  }

  // Merge tasks and check-ins for each day (next 6 days)
  const next6Days: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const date = addDays(today, i);
    next6Days.push(format(date, "yyyy-MM-dd"));
  }

  // Build merged day data
  const dayData: Array<{
    date: string;
    tasks: TaskItem[];
    checkins: CheckinItem[];
  }> = [];

  for (const dateStr of next6Days) {
    const tasksForDay = filteredGrouped.find((g) => g.date === dateStr)?.items || [];
    const checkinsForDay = checkinsByDate[dateStr] || [];

    if (tasksForDay.length > 0 || checkinsForDay.length > 0) {
      dayData.push({
        date: dateStr,
        tasks: tasksForDay,
        checkins: checkinsForDay,
      });
    }
  }

  const totalTasks = dayData.reduce((acc, d) => acc + d.tasks.length, 0);
  const totalCheckins = dayData.reduce((acc, d) => acc + d.checkins.length, 0);

  if (dayData.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
        <div className="flex items-center gap-2 text-zinc-400">
          <Calendar className="h-4 w-4" />
          <span className="text-[13px]">No upcoming items</span>
        </div>
        <p className="text-[12px] text-zinc-500 mt-1">
          Tasks and check-ins for the next 6 days will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            Next 6 Days
            {(totalTasks > 0 || totalCheckins > 0) && (
              <span className="ml-1 text-zinc-500">
                ({totalTasks} tasks{totalCheckins > 0 && `, ${totalCheckins} Check-ins`})
              </span>
            )}
          </span>
        </div>
        <Link
          href="/tasks?filter=upcoming"
          className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {dayData.map(({ date, tasks, checkins }) => (
          <div key={date} className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-medium ${
                isTomorrow(parseISO(date))
                  ? "text-blue-400"
                  : "text-zinc-400"
              }`}>
                {formatDayLabel(date)}
              </span>
              <span className="text-[10px] text-zinc-600">
                {tasks.length + checkins.length} item{tasks.length + checkins.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1">
              {/* Tasks first */}
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                />
              ))}
              {/* Then check-ins */}
              {checkins.map((checkin) => (
                <CheckinRow
                  key={`checkin-${checkin.id}-${checkin.checkinId}`}
                  checkin={checkin}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
