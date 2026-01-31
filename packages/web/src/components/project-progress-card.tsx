"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { ArrowRight } from "lucide-react";
import {
  Badge,
  OrgBadge,
  PriorityBadge,
  TodayBadge,
  WeekBadge,
  BlockedBadge,
  ActiveBadge,
} from "@/components/ui/badge";

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  complete: number;
  blocked: number;
  cancelled: number;
}

interface ProjectWithStats {
  id: number;
  slug: string;
  name: string;
  org: string;
  status: string | null;
  priority: number | null;
  fullPath: string;
  taskStats: TaskStats;
  recentActivityCount: number;
  recentCompletions: number;
  dueToday: number;
  dueThisWeek: number;
  checkinsToday: number;
  checkinsThisWeek: number;
  organizationColor?: "indigo" | "teal" | "rose" | "orange" | null;
  organizationShortName?: string | null;
  parentSlug?: string | null;
  parentName?: string | null;
}

export function ProjectProgressCard({ project }: { project: ProjectWithStats }) {
  const { taskStats, dueToday, dueThisWeek, checkinsToday, checkinsThisWeek } = project;
  const activeTotal = taskStats.pending + taskStats.in_progress + taskStats.blocked;

  // Calculate combined stats
  const todayTotal = (dueToday || 0) + (checkinsToday || 0);
  const weekTotal = (dueThisWeek || 0) + (checkinsThisWeek || 0);

  return (
    <Link
      href={`/projects/${project.org}/${project.fullPath}`}
      className="block px-3 py-2 rounded border bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-700/50 hover:border-zinc-600/50 transition-colors group"
    >
      {/* Single row layout */}
      <div className="flex items-center gap-2">
        <OrgBadge org={project.org} color={project.organizationColor} shortName={project.organizationShortName} size="sm" />
        {project.parentSlug && (
          <Badge variant="default" size="sm">{project.parentName || project.parentSlug}</Badge>
        )}
        <span className="text-[12px] font-medium text-zinc-200 group-hover:text-zinc-100 truncate min-w-0 flex-1">
          {project.name}
        </span>
        <PriorityBadge priority={project.priority} size="sm" />
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TodayBadge count={todayTotal} />
          <WeekBadge count={weekTotal} />
          <BlockedBadge count={taskStats.blocked} />
          <ActiveBadge count={activeTotal} />
        </div>
      </div>
    </Link>
  );
}

export function ProjectProgressGrid() {
  const projectsQuery = trpc.projects.withTaskStats.useQuery({
    status: "active",
    sortBy: "activity",
    limit: 8,
  });

  const projects = projectsQuery.data?.projects || [];

  if (projects.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50 text-center">
        <p className="text-[13px] text-zinc-500">No active projects</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
          Active Projects
        </span>
        <Link
          href="/projects"
          className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
        >
          All projects <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-1">
        {projects.map((project) => (
          <ProjectProgressCard key={project.id} project={project as ProjectWithStats} />
        ))}
      </div>
    </div>
  );
}
