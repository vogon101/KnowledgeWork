"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Play,
  MessageSquare,
  Clock,
  Ban,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: number;
  action: string;
  detail: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  createdBy: string | null;
  item: {
    id: number;
    displayId: string;
    title: string;
    status: string;
    projectSlug: string | null;
    projectName: string | null;
    projectOrg: string | null;
  };
}

function getActivityIcon(action: string, newValue: string | null) {
  if (action === "status_changed") {
    if (newValue === "complete") {
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    }
    if (newValue === "in_progress") {
      return <Play className="h-3.5 w-3.5 text-blue-400" />;
    }
    if (newValue === "blocked") {
      return <Ban className="h-3.5 w-3.5 text-red-400" />;
    }
    return <Clock className="h-3.5 w-3.5 text-amber-400" />;
  }
  if (action === "note") {
    return <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />;
  }
  if (action === "created") {
    return <Activity className="h-3.5 w-3.5 text-emerald-400" />;
  }
  if (action === "priority_changed") {
    return <Activity className="h-3.5 w-3.5 text-orange-400" />;
  }
  if (action === "due_date_changed") {
    return <Clock className="h-3.5 w-3.5 text-blue-400" />;
  }
  if (action === "blocked" || action === "unblocked") {
    return <Ban className="h-3.5 w-3.5 text-red-400" />;
  }
  return <Activity className="h-3.5 w-3.5 text-zinc-500" />;
}

function getActivityLabel(action: string, oldValue: string | null, newValue: string | null): string {
  if (action === "status_changed") {
    if (newValue === "complete") return "Completed";
    if (newValue === "in_progress") return "Started";
    if (newValue === "blocked") return "Blocked";
    if (newValue === "pending") return "Set to Pending";
    if (newValue === "deferred") return "Deferred";
    if (newValue === "cancelled") return "Cancelled";
    return `${oldValue || ""} → ${newValue || ""}`;
  }
  if (action === "note") return "Note added";
  if (action === "created") return "Created";
  if (action === "priority_changed") {
    if (newValue) return `Priority set to P${newValue}`;
    return "Priority cleared";
  }
  if (action === "due_date_changed") {
    if (newValue) return `Due date set to ${newValue}`;
    return "Due date cleared";
  }
  if (action === "title_changed") return "Title updated";
  if (action === "owner_changed") return "Owner changed";
  if (action === "project_changed") return "Project changed";
  if (action === "blocked") return "Marked as blocked";
  if (action === "unblocked") return "Unblocked";
  return action.replace(/_/g, " ");
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const icon = getActivityIcon(activity.action, activity.newValue);
  const label = getActivityLabel(activity.action, activity.oldValue, activity.newValue);

  return (
    <div className="flex items-start gap-3 py-2 px-2 -mx-2 rounded hover:bg-zinc-800/50 transition-colors">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/tasks/${activity.item.displayId}`}
            className="text-[12px] text-zinc-200 hover:text-zinc-100 truncate"
          >
            {activity.item.title}
          </Link>
          <span className="text-[10px] text-zinc-600 flex-shrink-0">
            {label}
          </span>
        </div>
        {activity.detail && (
          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
            {activity.detail}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-600">
          <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
          {activity.item.projectName && (
            <>
              <span>•</span>
              <Link
                href={`/projects/${activity.item.projectOrg}/${activity.item.projectSlug}`}
                className="hover:text-zinc-400"
              >
                {activity.item.projectName}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function UnifiedActivityFeed() {
  const activityQuery = trpc.query.activityFeed.useQuery({ limit: 15 });
  const activities = activityQuery.data?.activities || [];

  if (activities.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50 text-center">
        <Activity className="h-5 w-5 text-zinc-600 mx-auto mb-2" />
        <p className="text-[13px] text-zinc-500">No recent activity</p>
        <p className="text-[11px] text-zinc-600 mt-1">
          Activity will appear here as you work on tasks
        </p>
      </div>
    );
  }

  // Group by relative time (today, yesterday, earlier)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayActivities: ActivityItem[] = [];
  const yesterdayActivities: ActivityItem[] = [];
  const earlierActivities: ActivityItem[] = [];

  for (const activity of activities) {
    const activityDate = new Date(activity.createdAt);
    if (activityDate >= today) {
      todayActivities.push(activity);
    } else if (activityDate >= yesterday) {
      yesterdayActivities.push(activity);
    } else {
      earlierActivities.push(activity);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
          Recent Activity
        </span>
      </div>

      <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50 space-y-3">
        {todayActivities.length > 0 && (
          <div>
            <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Today
            </h4>
            <div className="divide-y divide-zinc-800/50">
              {todayActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        )}

        {yesterdayActivities.length > 0 && (
          <div>
            <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Yesterday
            </h4>
            <div className="divide-y divide-zinc-800/50">
              {yesterdayActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        )}

        {earlierActivities.length > 0 && (
          <div>
            <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Earlier
            </h4>
            <div className="divide-y divide-zinc-800/50">
              {earlierActivities.slice(0, 5).map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
