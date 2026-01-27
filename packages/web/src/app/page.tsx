"use client";

import { format } from "date-fns";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { TodaySection } from "@/components/today-section";
import { WeeklyPlan } from "@/components/weekly-plan";
import { ProjectProgressGrid } from "@/components/project-progress-card";
import { UnifiedActivityFeed } from "@/components/unified-activity-feed";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const today = new Date();
  const formattedDate = format(today, "EEEE, d MMMM yyyy");

  // Dashboard stats - poll every 5 seconds to stay in sync
  const statsQuery = trpc.query.dashboard.useQuery({});
  const stats = statsQuery.data;

  return (
    <div className="p-5 space-y-6 max-w-7xl @container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-zinc-500">{formattedDate}</p>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-[12px]">
            {stats.overdue > 0 && (
              <Link href="/tasks?filter=overdue" className="text-red-400 hover:text-red-300">
                {stats.overdue} overdue
              </Link>
            )}
            {stats.dueToday > 0 && (
              <Link href="/tasks?filter=today" className="text-emerald-400 hover:text-emerald-300">
                {stats.dueToday} due today
              </Link>
            )}
            <span className="text-zinc-500">{stats.total} active tasks</span>
          </div>
        )}
      </div>

      {/* Top Row: Today + Next 6 Days side-by-side when container is wide enough */}
      <div className="flex flex-col @4xl:grid @4xl:grid-cols-3 gap-5">
        {/* Today Section */}
        <div className="@4xl:col-span-2">
          <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Today
          </h2>
          <TodaySection />
        </div>

        {/* Weekly Plan - next to Today when wide, below Today when narrow */}
        <div>
          <WeeklyPlan />
        </div>
      </div>

      {/* Full-width content below */}
      <div className="space-y-6">
        {/* Project Progress */}
        <ProjectProgressGrid />

        {/* Recent Activity */}
        <UnifiedActivityFeed />

        {/* Quick Links */}
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50 space-y-2">
          <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Quick Links
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Link
              href="/meetings"
              className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-zinc-700/50 transition-colors text-[12px] text-zinc-400 hover:text-zinc-200"
            >
              <Calendar className="h-3.5 w-3.5" />
              Meetings
            </Link>
            <Link
              href="/tasks?status=blocked"
              className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-zinc-700/50 transition-colors text-[12px] text-zinc-400 hover:text-zinc-200"
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center text-red-400">⊘</span>
              Blocked Tasks
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-zinc-700/50 transition-colors text-[12px] text-zinc-400 hover:text-zinc-200"
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">📁</span>
              All Projects
            </Link>
            <Link
              href="/routines"
              className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-zinc-700/50 transition-colors text-[12px] text-zinc-400 hover:text-zinc-200"
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">🔄</span>
              Routines
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
