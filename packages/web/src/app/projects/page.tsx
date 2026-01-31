"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Activity,
  Building2,
  Settings,
  GitBranch,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganizations, getOrgColorClasses, type Organization } from "@/lib/organizations";
import { OrgSettingsDialog } from "@/components/org-settings-dialog";
import {
  Badge,
  TodayBadge,
  WeekBadge,
  BlockedBadge,
  ActiveBadge,
  PriorityBadge,
} from "@/components/ui/badge";

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "bg-emerald-500", label: "Active" },
  planning: { color: "bg-blue-500", label: "Planning" },
  maintenance: { color: "bg-amber-500", label: "Maintenance" },
  paused: { color: "bg-zinc-500", label: "Paused" },
  complete: { color: "bg-emerald-500", label: "Complete" },
  completed: { color: "bg-emerald-500", label: "Completed" },
};

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
  description: string | null;
  fullPath: string;
  parentSlug: string | null;
  taskStats: TaskStats;
  recentActivityCount: number;
  recentCompletions: number;
  activityScore: number;
  dueToday?: number;
  dueThisWeek?: number;
  checkinsToday?: number;
  checkinsThisWeek?: number;
}

function ProjectCard({ project, isChild = false }: { project: ProjectWithStats; isChild?: boolean }) {
  const status = statusConfig[project.status || ""] || { color: "bg-zinc-600", label: "Unknown" };
  const {
    taskStats,
    dueToday = 0,
    dueThisWeek = 0,
    checkinsToday = 0,
    checkinsThisWeek = 0
  } = project;
  const activeTotal = taskStats.pending + taskStats.in_progress + taskStats.blocked;

  // Calculate combined stats
  const todayTotal = dueToday + checkinsToday;
  const weekTotal = dueThisWeek + checkinsThisWeek;

  return (
    <Link
      href={`/projects/${project.org}/${project.fullPath}`}
      className={`block px-3 py-2 rounded border transition-colors group ${
        isChild
          ? "bg-zinc-900/50 border-zinc-700/30 hover:bg-zinc-800/50 hover:border-zinc-600/50 ml-4"
          : "bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-700/50 hover:border-zinc-600/50"
      }`}
    >
      {/* Single row layout */}
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.color}`} />
        <span className="text-[12px] font-medium text-zinc-200 group-hover:text-zinc-100 truncate min-w-0 flex-1">
          {project.name}
        </span>
        {project.parentSlug && (
          <GitBranch className="h-3 w-3 text-zinc-500 flex-shrink-0" />
        )}
        <PriorityBadge priority={project.priority} size="sm" />
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TodayBadge count={todayTotal} />
          <WeekBadge count={weekTotal} />
          <BlockedBadge count={taskStats.blocked} />
          <ActiveBadge count={activeTotal} />
        </div>
        <ChevronRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" />
      </div>
    </Link>
  );
}

function OrgCard({ org, orgData, projects }: { org: string; orgData: Organization | undefined; projects: ProjectWithStats[] }) {
  const colors = getOrgColorClasses(orgData?.color);
  const label = orgData?.name || org;

  // Separate top-level projects from children
  const topLevel = projects.filter((p) => !p.parentSlug);
  const children = projects.filter((p) => p.parentSlug);

  // Group children by parent
  const childrenByParent: Record<string, ProjectWithStats[]> = {};
  for (const child of children) {
    if (child.parentSlug) {
      if (!childrenByParent[child.parentSlug]) {
        childrenByParent[child.parentSlug] = [];
      }
      childrenByParent[child.parentSlug].push(child);
    }
  }

  // Separate active from other
  const activeProjects = topLevel.filter((p) => p.status === "active");
  const otherProjects = topLevel.filter((p) => p.status !== "active");

  // Stats for org
  const totalTasks = projects.reduce((sum, p) => sum + p.taskStats.pending + p.taskStats.in_progress + p.taskStats.blocked, 0);
  const blockedTasks = projects.reduce((sum, p) => sum + p.taskStats.blocked, 0);

  return (
    <div className={`rounded-lg border border-zinc-700/50 ${colors.bg}`}>
      {/* Org Header - links to org page */}
      <div className="px-3 py-2 border-b border-zinc-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${org}/_general`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Building2 className={`h-3.5 w-3.5 ${colors.text}`} />
              <h2 className={`text-[13px] font-medium ${colors.text}`}>
                {label}
              </h2>
            </Link>
            <OrgSettingsDialog orgSlug={org}>
              <button
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                title="Organization settings"
              >
                <Settings className="h-3 w-3" />
              </button>
            </OrgSettingsDialog>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">{projects.length} projects</span>
            <ActiveBadge count={totalTasks} />
            <BlockedBadge count={blockedTasks} />
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="p-2 space-y-2">
        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-medium text-emerald-400 uppercase tracking-wide">
                Active ({activeProjects.length})
              </span>
            </div>
            <div className="space-y-1">
              {activeProjects.map((project) => (
                <div key={project.id} className="space-y-1">
                  <ProjectCard project={project} />
                  {childrenByParent[project.slug]?.map((child) => (
                    <ProjectCard key={child.id} project={child} isChild />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Projects */}
        {otherProjects.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide">
                Other ({otherProjects.length})
              </span>
            </div>
            <div className="space-y-1">
              {otherProjects.map((project) => (
                <div key={project.id} className="space-y-1">
                  <ProjectCard project={project} />
                  {childrenByParent[project.slug]?.map((child) => (
                    <ProjectCard key={child.id} project={child} isChild />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length === 0 && (
          <p className="text-[11px] text-zinc-600 px-2 py-1">No projects</p>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"organization" | "activity">("organization");
  const [sortBy, setSortBy] = useState<"activity" | "name" | "priority">("activity");

  // Fetch organizations from DB
  const { orgsMap, organizations } = useOrganizations();

  // Fetch projects with task stats
  const projectsQuery = trpc.projects.withTaskStats.useQuery({
    sortBy,
    limit: 100,
  });

  const projects = (projectsQuery.data?.projects || []) as ProjectWithStats[];
  const totalProjects = projects.length;

  // Group by org
  const projectsByOrg = projects.reduce((acc, project) => {
    const org = project.org;
    if (!acc[org]) acc[org] = [];
    acc[org].push(project);
    return acc;
  }, {} as Record<string, ProjectWithStats[]>);

  // Get all orgs that have projects, sorted alphabetically by display name
  const orgs = Object.keys(projectsByOrg).sort((a, b) => {
    const aName = orgsMap.get(a)?.name || a;
    const bName = orgsMap.get(b)?.name || b;
    return aName.localeCompare(bName);
  });

  // For activity view - separate active from other
  const activeProjects = projects.filter((p) => p.status === "active");
  const otherProjects = projects.filter((p) => p.status !== "active");

  return (
    <div className="p-4 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-[13px] text-zinc-500">
            {totalProjects} projects across {orgs.length} organizations
          </p>
        </div>

        {/* View controls */}
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-800 rounded p-0.5">
            <button
              onClick={() => setViewMode("organization")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors ${
                viewMode === "organization"
                  ? "bg-zinc-700 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Building2 className="h-3 w-3" />
              By Org
            </button>
            <button
              onClick={() => setViewMode("activity")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors ${
                viewMode === "activity"
                  ? "bg-zinc-700 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Activity className="h-3 w-3" />
              By Activity
            </button>
          </div>

          {/* Sort selector (for activity view) */}
          {viewMode === "activity" && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "activity" | "name" | "priority")}
              className="text-[11px] bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
            >
              <option value="activity">Sort by Activity</option>
              <option value="name">Sort by Name</option>
              <option value="priority">Sort by Priority</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === "organization" ? (
        <div className="space-y-3">
          {orgs.map((org) => (
            <OrgCard key={org} org={org} orgData={orgsMap.get(org)} projects={projectsByOrg[org] || []} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-medium text-emerald-400 uppercase tracking-wide">
                  Active ({activeProjects.length})
                </span>
              </div>
              <div className="space-y-1">
                {activeProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* Other Projects */}
          {otherProjects.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-wide">
                  Other ({otherProjects.length})
                </span>
              </div>
              <div className="space-y-1">
                {otherProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {projects.length === 0 && !projectsQuery.isLoading && (
        <p className="text-[13px] text-zinc-500">No projects found.</p>
      )}

      {projectsQuery.isLoading && (
        <div className="text-[13px] text-zinc-500">Loading projects...</div>
      )}
    </div>
  );
}
