import { readFile, getMeetings, getProjects, type MeetingNote, type Project } from "@/lib/knowledge-base";
import { getOrganizationsServer, getOrgNameServer } from "@/lib/organizations-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { CollapsibleSection } from "@/components/collapsible-section";
import { MeetingList } from "@/components/meeting-list";
import { PersonGroupedTaskList } from "@/components/task-list";
import { Folder, FileText, CheckCircle2, Circle, AlertCircle, Clock, CornerDownRight, Calendar } from "lucide-react";

import type { Task } from "@/lib/task-db";

// Fetch tasks for an org (server-side)
async function getOrgTasks(orgSlug: string): Promise<Task[]> {
  try {
    const response = await fetch(
      `http://localhost:3004/api/trpc/items.list?input=${encodeURIComponent(
        JSON.stringify({
          json: {
            orgSlug,
            itemType: 'task',
            status: ["pending", "in_progress", "blocked"],
            limit: 200
          }
        })
      )}`,
      { cache: "no-store" }
    );
    if (!response.ok) return [];
    const data = await response.json();
    // API response matches Task type (field names aligned)
    return data.result?.data?.json?.items || [];
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{
    org: string;
  }>;
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  active: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", label: "Active" },
  planning: { color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Planning" },
  maintenance: { color: "text-amber-400", bgColor: "bg-amber-500/10", label: "Maintenance" },
  paused: { color: "text-zinc-400", bgColor: "bg-zinc-500/10", label: "Paused" },
  completed: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", label: "Completed" },
};

const priorityColors: Record<number, string> = {
  1: "text-red-400 bg-red-500/10",
  2: "text-orange-400 bg-orange-500/10",
  3: "text-yellow-400 bg-yellow-500/10",
  4: "text-zinc-400 bg-zinc-500/10",
};

const statusItemConfig = {
  done: { icon: CheckCircle2, color: "text-emerald-400" },
  "in-progress": { icon: Clock, color: "text-blue-400" },
  pending: { icon: Circle, color: "text-amber-400" },
  blocked: { icon: AlertCircle, color: "text-red-400" },
};

export async function generateStaticParams() {
  const orgs = getOrganizationsServer();
  return orgs.map((org) => ({ org: org.slug }));
}

export default async function OrgProjectPage({ params }: Props) {
  const { org } = await params;

  // Validate org exists in database
  const orgs = getOrganizationsServer();
  const validOrg = orgs.find(o => o.slug === org);
  if (!validOrg) {
    notFound();
  }

  // Try to read the org-level README
  const readmePath = `${org}/README.md`;
  const readme = await readFile(readmePath);

  if (!readme) {
    // If no README, redirect to projects list or show empty state
    notFound();
  }

  // Get projects for this org
  const allProjects = await getProjects();
  const orgProjects = allProjects.filter((p) => p.org === org && !p.isWorkstream);
  const workstreamsByParent = allProjects
    .filter((p) => p.isWorkstream && p.org === org)
    .reduce((acc, project) => {
      const parent = project.parentSlug || "";
      if (!acc[parent]) acc[parent] = [];
      acc[parent].push(project);
      return acc;
    }, {} as Record<string, Project[]>);

  // Get meetings for this org
  const allMeetings = await getMeetings();
  const orgMeetings = allMeetings.filter((m) => m.org === org);

  // Get tasks for this org (includes all projects and workstreams)
  const orgTasks = await getOrgTasks(org);

  const orgLabel = getOrgNameServer(org);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 px-6 py-5">
        <div className="flex items-center gap-2 text-[12px] text-zinc-500 mb-2">
          <Link href="/projects" className="hover:text-zinc-300">
            Projects
          </Link>
          <span>/</span>
          <span className="text-zinc-400">{orgLabel}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{orgLabel}</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Organisation overview</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Projects */}
        {orgProjects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
              Projects ({orgProjects.length})
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {orgProjects.map((project) => {
                const status = statusConfig[project.frontmatter.status || ""] || {
                  color: "text-zinc-400",
                  bgColor: "bg-zinc-500/10",
                  label: "Unknown",
                };
                const { extracted } = project;
                const todosDone = extracted.todos.filter((t) => t.done).length;
                const todosTotal = extracted.todos.length;
                const workstreams = workstreamsByParent[project.slug] || [];

                return (
                  <div
                    key={project.path}
                    className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50 space-y-3"
                  >
                    {/* Project Header */}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/projects/${org}/${project.slug}`}
                        className="flex items-center gap-2 group flex-1 min-w-0"
                      >
                        {project.isFile ? (
                          <FileText className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                        ) : (
                          <Folder className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                        )}
                        <span className="text-[14px] font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
                          {project.name}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {project.frontmatter.priority && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColors[project.frontmatter.priority] || "text-zinc-400 bg-zinc-500/10"}`}>
                            P{project.frontmatter.priority}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.color} ${status.bgColor}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Current phase if available */}
                    {extracted.currentPhase && (
                      <p className="text-[11px] text-blue-400 mt-1">
                        {extracted.currentPhase}
                      </p>
                    )}

                    {/* Last updated date */}
                    {extracted.lastUpdated && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
                        <Calendar className="h-2.5 w-2.5" />
                        {extracted.lastUpdated}
                      </div>
                    )}

                    {/* Progress bar */}
                    {todosTotal > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${(todosDone / todosTotal) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-zinc-500">
                          {todosDone}/{todosTotal}
                        </span>
                      </div>
                    )}

                    {/* Status Items (max 3) */}
                    {extracted.statusItems.length > 0 && (
                      <div className="space-y-1">
                        {extracted.statusItems.slice(0, 3).map((item, i) => {
                          const config = statusItemConfig[item.status] || statusItemConfig.pending;
                          const Icon = config.icon;
                          return (
                            <div key={i} className="flex items-start gap-2">
                              <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${config.color}`} />
                              <span className="text-[12px] text-zinc-400 line-clamp-1">{item.text}</span>
                            </div>
                          );
                        })}
                        {extracted.statusItems.length > 3 && (
                          <span className="text-[11px] text-zinc-600">
                            +{extracted.statusItems.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Workstreams */}
                    {workstreams.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800/50 space-y-1">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                          Workstreams ({workstreams.length})
                        </span>
                        {workstreams.slice(0, 4).map((workstream) => {
                          const wsStatus = statusConfig[workstream.frontmatter.status || ""] || statusConfig.paused;
                          const wsTodosDone = workstream.extracted.todos.filter((t) => t.done).length;
                          const wsTodosTotal = workstream.extracted.todos.length;
                          return (
                            <Link
                              key={workstream.path}
                              href={`/projects/${org}/${project.slug}/${workstream.slug}`}
                              className="flex items-center gap-2 p-1.5 -mx-1.5 rounded hover:bg-zinc-800/50 transition-colors group"
                            >
                              <CornerDownRight className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${wsStatus.bgColor.replace('/10', '')}`} />
                              <span className="text-[12px] text-zinc-400 group-hover:text-zinc-300 truncate flex-1">
                                {workstream.name}
                              </span>
                              {wsTodosTotal > 0 && (
                                <span className="text-[10px] text-zinc-600">
                                  {wsTodosDone}/{wsTodosTotal}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                        {workstreams.length > 4 && (
                          <span className="text-[10px] text-zinc-600 pl-5">
                            +{workstreams.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* README */}
        <CollapsibleSection
          title="Overview"
          defaultOpen={false}
          editPath={readmePath}
        >
          <div className="prose prose-invert prose-zinc max-w-none">
            <Markdown content={readme.content} />
          </div>
        </CollapsibleSection>

        {/* Tasks for this org (from all projects) */}
        {orgTasks.length > 0 && (
          <CollapsibleSection title="Tasks" defaultOpen={true}>
            <PersonGroupedTaskList
              tasks={orgTasks}
              showProject={true}
              showCompletedToggle
              defaultShowCompleted={false}
            />
          </CollapsibleSection>
        )}

        {/* Related Meetings */}
        {orgMeetings.length > 0 && (
          <CollapsibleSection title="Recent Meetings" defaultOpen={false}>
            <MeetingList
              meetings={orgMeetings}
              showViewToggle={false}
              defaultView="meetings"
              maxItems={15}
            />
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
