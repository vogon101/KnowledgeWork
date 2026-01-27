import { getMeetings } from "@/lib/knowledge-base";
import { getTasksForMeeting, getMeetingByPath, isTaskDbAvailable, resolveProjectPaths, type ProjectPath } from "@/lib/task-db";
import { getOrgNameServer } from "@/lib/organizations-server";
import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { FilterableTag, FilterableTagList } from "@/components/filterable-tag";
import { PersonGroupedTaskList } from "@/components/task-list";
import { TaskListConnected } from "@/components/task-list/task-list-connected";
import { MeetingSyncButton } from "@/components/meeting-sync-button";
import { PageHeaderActions } from "@/components/page-header-actions";
import { Calendar, MapPin, FolderKanban, ListTodo } from "lucide-react";

interface Props {
  params: Promise<{
    org: string;
    year: string;
    month: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const meetings = await getMeetings();
  return meetings.map((meeting) => ({
    org: meeting.org,
    year: meeting.frontmatter.date.slice(0, 4),
    month: meeting.frontmatter.date.slice(5, 7),
    slug: meeting.slug,
  }));
}

export default async function MeetingPage({ params }: Props) {
  const { org, slug } = await params;
  const meetings = await getMeetings();
  const meeting = meetings.find((m) => m.org === org && m.slug === slug);

  if (!meeting) {
    notFound();
  }

  const meetingDate = new Date(meeting.frontmatter.date);

  // Try to get tasks from the task database
  let trackedTasks: Awaited<ReturnType<typeof getTasksForMeeting>> = [];
  let projectPaths = new Map<string, ProjectPath>();
  let meetingId: number | undefined;
  if (isTaskDbAvailable()) {
    try {
      trackedTasks = getTasksForMeeting(meeting.path);

      // Get meeting ID for TaskListConnected
      const meetingRecord = getMeetingByPath(meeting.path);
      meetingId = meetingRecord?.id;

      // Resolve project paths for proper linking (handles subprojects)
      const projectSlugs = meeting.frontmatter.projects || (meeting.frontmatter.project ? [meeting.frontmatter.project] : []);
      projectPaths = resolveProjectPaths(projectSlugs.filter(Boolean) as string[], org);
    } catch {
      // Database might not be available - that's ok
    }
  }

  return (
    <div className="p-5 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/meetings"
            className="text-[12px] text-zinc-500 hover:text-zinc-300 mb-1 inline-block"
          >
            ← Meetings
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{meeting.frontmatter.title}</h1>
          <p className="text-[13px] text-zinc-500">{getOrgNameServer(org)}</p>
        </div>
        <div className="flex items-center gap-3">
          <MeetingSyncButton meetingPath={meeting.path} />
          <PageHeaderActions
            editPath={meeting.path}
            aiContext={{
              type: "meeting",
              title: meeting.frontmatter.title,
              filePath: meeting.path,
            }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-[13px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(meetingDate, "EEEE, d MMMM yyyy")}</span>
        </div>
        {meeting.frontmatter.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <FilterableTag type="location" value={meeting.frontmatter.location} size="md" />
          </div>
        )}
        {/* Show all projects (from projects array or single project) */}
        {(meeting.frontmatter.projects || meeting.frontmatter.project) && (
          <div className="flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5 text-emerald-400" />
            <div className="flex items-center gap-2">
              {(meeting.frontmatter.projects || [meeting.frontmatter.project]).filter(Boolean).map((project, i, arr) => {
                // Use resolved path if available, otherwise fall back to simple path
                const resolved = projectPaths.get(project as string);
                const projectOrg = resolved?.org || org;
                const projectPath = resolved?.fullPath || project;

                return (
                  <span key={project} className="flex items-center gap-1">
                    <Link
                      href={`/projects/${projectOrg}/${projectPath}`}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      {project}
                    </Link>
                    {i < arr.length - 1 && <span className="text-zinc-600">·</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Attendees */}
      <FilterableTagList
        type="attendee"
        values={meeting.frontmatter.attendees}
        label="Attendees"
        labelIcon="users"
        size="md"
      />

      {/* Tags */}
      {meeting.frontmatter.tags && meeting.frontmatter.tags.length > 0 && (
        <FilterableTagList type="tag" values={meeting.frontmatter.tags} size="md" />
      )}

      {/* Summary */}
      {meeting.sections.summary && (
        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
          <Markdown content={meeting.sections.summary} className="text-[13px] text-zinc-300 leading-relaxed" />
        </div>
      )}

      {/* Discussion */}
      {meeting.sections.discussion && (
        <Section title="Discussion">
          <Markdown content={meeting.sections.discussion} />
        </Section>
      )}

      {/* Decisions */}
      {meeting.sections.decisions && (
        <Section title="Decisions">
          <Markdown content={meeting.sections.decisions} />
        </Section>
      )}

      {/* Tasks Section - Unified view */}
      {(trackedTasks.length > 0 || meeting.actions.length > 0) && (
        <TasksSection
          trackedTasks={trackedTasks}
          markdownActions={meeting.actions}
          meetingPath={meeting.path}
          meetingId={meetingId}
          org={org}
          defaultProject={meeting.frontmatter.project}
          projectPaths={projectPaths}
        />
      )}

      {/* Related */}
      {meeting.sections.related && (
        <Section title="Related">
          <Markdown content={meeting.sections.related} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
      <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="text-[13px] text-zinc-300">
        {children}
      </div>
    </div>
  );
}

import type { Task } from "@/lib/task-db";
import type { Action } from "@/lib/knowledge-base";

function TasksSection({
  trackedTasks,
  markdownActions,
  meetingPath,
  meetingId,
  org,
  defaultProject,
  projectPaths,
}: {
  trackedTasks: Task[];
  markdownActions: Action[];
  meetingPath: string;
  meetingId?: number;
  org: string;
  defaultProject?: string;
  projectPaths: Map<string, ProjectPath>;
}) {
  // Find unsynced actions (actions in markdown but not in DB)
  const syncedTitles = new Set(trackedTasks.map(t => t.title.toLowerCase()));
  const unsyncedActions = markdownActions.filter(
    a => !syncedTitles.has(a.action.toLowerCase()) &&
         a.status.toLowerCase() !== 'complete' &&
         a.status.toLowerCase() !== 'cancelled'
  );

  const hasTrackedTasks = trackedTasks.length > 0;
  const hasUnsyncedActions = unsyncedActions.length > 0;

  return (
    <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-zinc-400" />
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
            Tasks ({trackedTasks.length})
          </h2>
        </div>
        {hasUnsyncedActions && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-amber-400">
              {unsyncedActions.length} unsynced
            </span>
            <MeetingSyncButton meetingPath={meetingPath} />
          </div>
        )}
      </div>

      {/* Show tracked tasks from database - grouped by person then date */}
      {hasTrackedTasks && meetingId && (
        <TaskListConnected
          filter={{ sourceMeetingId: meetingId }}
          initialTasks={trackedTasks}
          variant="person-grouped"
          showProject
          showCompletedToggle
          defaultShowCompleted
        />
      )}
      {/* Fallback if no meetingId - use static list */}
      {hasTrackedTasks && !meetingId && (
        <PersonGroupedTaskList
          tasks={trackedTasks}
          showProject
          showCompletedToggle
          defaultShowCompleted
        />
      )}

      {/* Show unsynced actions if any */}
      {hasUnsyncedActions && (
        <div className={hasTrackedTasks ? "mt-4 pt-4 border-t border-zinc-800" : ""}>
          {hasTrackedTasks && (
            <p className="text-[11px] text-zinc-500 mb-2">
              Not yet synced:
            </p>
          )}
          <div className="space-y-2">
            {unsyncedActions.map((action, i) => {
              const actionProject = action.project || defaultProject;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 rounded bg-zinc-800/30 opacity-70"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <FilterableTag type="owner" value={action.owner} size="sm" />
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        {action.status}
                      </span>
                    </div>
                    <p className="text-[13px] text-zinc-400">{action.action}</p>
                    {actionProject && (() => {
                      const resolved = projectPaths.get(actionProject);
                      const projectOrg = resolved?.org || org;
                      const projectPath = resolved?.fullPath || actionProject;

                      return (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-600">
                          <FolderKanban className="h-3 w-3" />
                          <Link
                            href={`/projects/${projectOrg}/${projectPath}`}
                            className="hover:text-zinc-400"
                          >
                            {actionProject}
                          </Link>
                        </div>
                      );
                    })()}
                  </div>
                  {action.due && (
                    <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                      {action.due}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {!hasTrackedTasks && (
            <div className="mt-3 flex justify-end">
              <MeetingSyncButton meetingPath={meetingPath} />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasTrackedTasks && !hasUnsyncedActions && markdownActions.length > 0 && (
        <p className="text-[13px] text-zinc-500 italic">
          All actions completed or cancelled
        </p>
      )}
    </div>
  );
}
