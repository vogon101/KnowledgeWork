import { getProjects, readFile, getProjectFiles, getMeetings, type Project, type ProjectFileEntry, type MeetingNote } from "@/lib/knowledge-base";
import { getTasksForProject, isTaskDbAvailable, type Task } from "@/lib/task-db";
import { getOrgNameServer } from "@/lib/organizations-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { CollapsibleSection } from "@/components/collapsible-section";
import { FilterableTagList } from "@/components/filterable-tag";
import { MeetingList } from "@/components/meeting-list";
import { PersonGroupedTaskList } from "@/components/task-list";
import { TaskListConnected } from "@/components/task-list/task-list-connected";
import { PageHeaderActions } from "@/components/page-header-actions";
import { ExternalLinks } from "@/components/external-links";
import { ProjectHeaderSettings } from "@/components/project-header-settings";
import { ProjectFilesTree } from "@/components/project-files-tree";
import { CheckCircle2, Circle, AlertCircle, Clock, CornerDownRight, FileText, ChevronRight, Folder, FolderOpen, Sparkles } from "lucide-react";

interface Props {
  params: Promise<{
    org: string;
    slug: string[]; // catch-all: can be [projectSlug] or [parentSlug, workstreamSlug]
  }>;
}

export async function generateStaticParams() {
  const projects = await getProjects();
  const params: { org: string; slug: string[] }[] = [];

  for (const project of projects) {
    if (project.isWorkstream && project.parentSlug) {
      // Workstream: [parentSlug, slug]
      params.push({
        org: project.org,
        slug: [project.parentSlug, project.slug],
      });
    } else {
      // Regular project: [slug]
      params.push({
        org: project.org,
        slug: [project.slug],
      });
    }
  }

  return params;
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
  done: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "in-progress": { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  pending: { icon: Circle, color: "text-amber-400", bg: "bg-amber-500/10" },
  blocked: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

// Status emoji mapping for workstream badges
const workstreamStatusColors: Record<string, string> = {
  "🟢": "bg-emerald-500/20 text-emerald-400",
  "🟡": "bg-amber-500/20 text-amber-400",
  "🔴": "bg-red-500/20 text-red-400",
  "⏳": "bg-blue-500/20 text-blue-400",
  "✅": "bg-emerald-500/20 text-emerald-400",
};

export default async function ProjectPage({ params }: Props) {
  const { org, slug: slugArray } = await params;
  const projects = await getProjects();

  // Determine if this is a workstream or regular project
  const isWorkstreamRoute = slugArray.length === 2;
  const parentSlug = isWorkstreamRoute ? slugArray[0] : null;
  const projectSlug = isWorkstreamRoute ? slugArray[1] : slugArray[0];

  let project: Project | undefined;
  let parentProject: Project | undefined;

  if (isWorkstreamRoute) {
    // Find workstream
    project = projects.find(
      (p) => p.isWorkstream && p.org === org && p.parentSlug === parentSlug && p.slug === projectSlug
    );
    // Find parent
    parentProject = projects.find(
      (p) => !p.isWorkstream && p.org === org && p.slug === parentSlug
    );
  } else {
    // Find regular project
    project = projects.find(
      (p) => p.org === org && p.slug === projectSlug && !p.isWorkstream
    );
  }

  if (!project) {
    notFound();
  }

  // For workstreams, render with full project-like features
  if (isWorkstreamRoute) {
    // Fetch tasks for workstream (pass org for disambiguation)
    let workstreamTasks: Task[] = [];
    if (isTaskDbAvailable()) {
      workstreamTasks = getTasksForProject(project.slug, true, org);
    }

    // Fetch workstream files (if it's a folder-based workstream)
    const workstreamFiles = project.isFile ? [] : await getProjectFiles(project.path);

    // Fetch all meetings for filtering
    const allMeetings = await getMeetings();

    // Find nested workstreams (workstreams under this workstream)
    const nestedWorkstreams = projects.filter(
      (p) => p.isWorkstream && p.parentSlug === project.slug && p.org === org
    );

    // Read next-steps if it exists
    let nextStepsContent: string | null = null;
    if (project.nextStepsPath) {
      const nextSteps = await readFile(project.nextStepsPath);
      if (nextSteps) {
        nextStepsContent = nextSteps.content;
      }
    }

    return (
      <WorkstreamView
        project={project}
        parentProject={parentProject}
        org={org}
        parentSlug={parentSlug!}
        tasks={workstreamTasks}
        workstreamFiles={workstreamFiles}
        allMeetings={allMeetings}
        nestedWorkstreams={nestedWorkstreams}
        nextStepsContent={nextStepsContent}
      />
    );
  }

  // Fetch project files and all meetings for regular projects
  const projectFiles = project.isFile ? [] : await getProjectFiles(project.path);
  const allMeetings = await getMeetings();

  // Get workstream slugs for this project
  const workstreamSlugs = projects
    .filter((p) => p.isWorkstream && p.parentSlug === project.slug && p.org === org)
    .map((p) => p.slug);

  // Get tasks for this project from task database (including completed for toggle)
  // Pass org for disambiguation (important for _general projects)
  let projectTasks: Task[] = [];
  if (isTaskDbAvailable()) {
    projectTasks = getTasksForProject(project.slug, true, org);
  }

  // Regular project view
  return <ProjectView project={project} projects={projects} org={org} projectFiles={projectFiles} allMeetings={allMeetings} workstreamSlugs={workstreamSlugs} projectTasks={projectTasks} />;
}

// Workstream view component
function WorkstreamView({
  project,
  parentProject,
  org,
  parentSlug,
  tasks,
  workstreamFiles,
  allMeetings,
  nestedWorkstreams,
  nextStepsContent,
}: {
  project: Project;
  parentProject: Project | undefined;
  org: string;
  parentSlug: string;
  tasks: Task[];
  workstreamFiles: ProjectFileEntry[];
  allMeetings: MeetingNote[];
  nestedWorkstreams: Project[];
  nextStepsContent: string | null;
}) {
  const status = statusConfig[project.frontmatter.status || ""] || {
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10",
    label: project.frontmatter.status || "Unknown",
  };

  const { extracted } = project;
  const todosDone = extracted.todos.filter((t) => t.done).length;
  const todosTotal = extracted.todos.length;
  const activeTasks = tasks.filter(t => !['complete', 'cancelled'].includes(t.status));

  return (
    <div className="p-5 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px] text-zinc-500 mb-1">
            <Link href="/projects" className="hover:text-zinc-300">
              Projects
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/projects/${org}/${parentSlug}`} className="hover:text-zinc-300">
              {parentProject?.name || parentSlug}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-zinc-400">{project.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
            {project.frontmatter.status && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${status.color} ${status.bgColor}`}>
                {status.label}
              </span>
            )}
            {project.frontmatter.priority && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${priorityColors[project.frontmatter.priority] || "text-zinc-400 bg-zinc-500/10"}`}>
                P{project.frontmatter.priority}
              </span>
            )}
          </div>
          <p className="text-[13px] text-zinc-500">{getOrgNameServer(org)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectHeaderSettings
            projectSlug={project.slug}
            projectOrg={org}
            isWorkstream={true}
          />
          <PageHeaderActions
            editPath={project.path}
            projectEditUrl={`/edit/project/${org}/${parentSlug}/${project.slug}`}
            aiContext={{
              type: "project",
              title: project.name,
              filePath: project.path,
            }}
          />
        </div>
      </div>

      {/* Tags */}
      {project.frontmatter.tags && project.frontmatter.tags.length > 0 && (
        <FilterableTagList type="tag" values={project.frontmatter.tags} size="md" />
      )}

      {/* External Links */}
      {extracted.externalLinks.length > 0 && (
        <ExternalLinks links={extracted.externalLinks} />
      )}

      {/* AI Status Summary */}
      {extracted.aiStatusSummary && (
        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-[12px] font-medium text-purple-400 uppercase tracking-wider">
                AI Status
              </span>
            </div>
            {extracted.aiStatusDate && (
              <span className="text-[11px] text-zinc-500">
                {extracted.aiStatusDate}
              </span>
            )}
          </div>
          <div className="text-[13px] text-zinc-300 leading-relaxed">
            <Markdown content={extracted.aiStatusSummary} />
          </div>
        </div>
      )}

      {/* Extracted Data Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(extracted.currentPhase || extracted.lastUpdated) && (
          <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
            {extracted.currentPhase && (
              <div className="mb-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Current Phase</span>
                <p className="text-[14px] font-medium text-blue-400">{extracted.currentPhase}</p>
              </div>
            )}
            {extracted.lastUpdated && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Last Updated</span>
                <p className="text-[13px] text-zinc-300">{extracted.lastUpdated}</p>
              </div>
            )}
          </div>
        )}

        {todosTotal > 0 && (
          <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Progress</span>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(todosDone / todosTotal) * 100}%` }}
                />
              </div>
              <span className="text-[13px] font-medium text-zinc-300">
                {todosDone}/{todosTotal}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status Items */}
      {extracted.statusItems.length > 0 && (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Current Status
          </h2>
          <div className="space-y-2">
            {extracted.statusItems.map((item, i) => {
              const config = statusItemConfig[item.status] || statusItemConfig.pending;
              const Icon = config.icon;
              return (
                <div key={i} className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                  <span className="text-[13px] text-zinc-300">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracked Tasks from Database */}
      {tasks.length > 0 && (
        <CollapsibleSection
          title={`Tracked Tasks (${activeTasks.length} active)`}
          defaultOpen={activeTasks.length > 0}
        >
          <TaskListConnected
            filter={{ projectSlug: project.slug, orgSlug: org }}
            initialTasks={tasks}
            variant="person-grouped"
            showProject={false}
            showCompletedToggle
            defaultShowCompleted={false}
          />
        </CollapsibleSection>
      )}

      {/* Markdown Todos */}
      {extracted.todos.length > 0 && (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Checklist ({todosDone}/{todosTotal} done)
          </h2>
          <div className="space-y-1.5">
            {extracted.todos.map((todo, i) => (
              <div key={i} className="flex items-start gap-2">
                {todo.done ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 mt-0.5 flex-shrink-0 text-zinc-500" />
                )}
                <span className={`text-[13px] ${todo.done ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nested Workstreams */}
      {nestedWorkstreams.length > 0 && (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Workstreams
          </h2>
          <div className="space-y-3">
            {nestedWorkstreams.map((workstream) => {
              const wsStatus = statusConfig[workstream.frontmatter.status || ""] || {
                color: "text-zinc-400",
                bgColor: "bg-zinc-500/10",
                label: workstream.frontmatter.status || "",
              };
              const wsTodosDone = workstream.extracted.todos.filter((t) => t.done).length;
              const wsTodosTotal = workstream.extracted.todos.length;
              const wsExtracted = workstream.extracted;

              return (
                <Link
                  key={workstream.path}
                  href={`/projects/${workstream.org}/${project.slug}/${workstream.slug}`}
                  className="block p-4 rounded-lg bg-zinc-800/40 border border-zinc-800/30 hover:bg-zinc-800/60 hover:border-zinc-700/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <CornerDownRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                    <FileText className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-zinc-300 group-hover:text-zinc-100">
                          {workstream.name}
                        </span>
                        {workstream.frontmatter.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${wsStatus.color} ${wsStatus.bgColor}`}>
                            {wsStatus.label}
                          </span>
                        )}
                      </div>
                    </div>
                    {wsExtracted.lastUpdated && (
                      <span className="text-[10px] text-zinc-600">
                        {wsExtracted.lastUpdated}
                      </span>
                    )}
                  </div>

                  {wsExtracted.statusItems.length > 0 && (
                    <div className="ml-11 space-y-1 mb-2">
                      {wsExtracted.statusItems.slice(0, 3).map((item, i) => {
                        const config = statusItemConfig[item.status] || statusItemConfig.pending;
                        const Icon = config.icon;
                        return (
                          <div key={i} className="flex items-start gap-1.5">
                            <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${config.color}`} />
                            <span className="text-[11px] text-zinc-400 line-clamp-1">{item.text}</span>
                          </div>
                        );
                      })}
                      {wsExtracted.statusItems.length > 3 && (
                        <span className="text-[10px] text-zinc-600">
                          +{wsExtracted.statusItems.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {wsTodosTotal > 0 && (
                    <div className="ml-11 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(wsTodosDone / wsTodosTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {wsTodosDone}/{wsTodosTotal} tasks
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Workstream Files */}
      {!project.isFile && (
        <ProjectFilesTree
          projectPath={project.path.replace(/\/README\.md$/, '')}
          title="Files"
          maxHeight="300px"
        />
      )}

      {/* Related Meetings */}
      <MeetingList
        meetings={allMeetings}
        title="Related Meetings"
        projectSlug={project.slug}
        workstreamSlugs={[]}
        showWorkstreamToggle={false}
        showViewToggle={true}
      />

      {/* README content - Collapsed by default */}
      <CollapsibleSection title="README" defaultOpen={false} editPath={project.path}>
        <Markdown content={project.content} />
      </CollapsibleSection>

      {/* Next Steps */}
      {nextStepsContent && project.nextStepsPath && (
        <CollapsibleSection title="Next Steps" defaultOpen={false} editPath={project.nextStepsPath}>
          <Markdown content={nextStepsContent} />
        </CollapsibleSection>
      )}
    </div>
  );
}

// Regular project view component
async function ProjectView({
  project,
  projects,
  org,
  projectFiles,
  allMeetings,
  workstreamSlugs,
  projectTasks,
}: {
  project: Project;
  projects: Project[];
  org: string;
  projectFiles: ProjectFileEntry[];
  allMeetings: MeetingNote[];
  workstreamSlugs: string[];
  projectTasks: Task[];
}) {
  // Find workstreams for this project
  const workstreams = projects.filter(
    (p) => p.isWorkstream && p.parentSlug === project.slug && p.org === org
  );

  // Read next-steps if it exists
  let nextStepsContent: string | null = null;
  if (project.nextStepsPath) {
    const nextSteps = await readFile(project.nextStepsPath);
    if (nextSteps) {
      nextStepsContent = nextSteps.content;
    }
  }

  const status = statusConfig[project.frontmatter.status || ""] || {
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10",
    label: project.frontmatter.status || "Unknown",
  };

  const { extracted } = project;
  const todosDone = extracted.todos.filter((t) => t.done).length;
  const todosTotal = extracted.todos.length;

  const hasWorkstreams = workstreams.length > 0 || (project.workstreams?.length ?? 0) > 0;

  return (
    <div className="p-5 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/projects"
            className="text-[12px] text-zinc-500 hover:text-zinc-300 mb-1 inline-block"
          >
            ← Projects
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
            {project.frontmatter.status && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${status.color} ${status.bgColor}`}>
                {status.label}
              </span>
            )}
            {project.frontmatter.priority && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${priorityColors[project.frontmatter.priority] || "text-zinc-400 bg-zinc-500/10"}`}>
                P{project.frontmatter.priority}
              </span>
            )}
          </div>
          <p className="text-[13px] text-zinc-500">{getOrgNameServer(org)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectHeaderSettings
            projectSlug={project.slug}
            projectOrg={org}
          />
          <PageHeaderActions
            editPath={project.path}
            projectEditUrl={`/edit/project/${org}/${project.slug}`}
            aiContext={{
              type: "project",
              title: project.name,
              filePath: project.path,
            }}
          />
        </div>
      </div>

      {/* Tags */}
      {project.frontmatter.tags && project.frontmatter.tags.length > 0 && (
        <FilterableTagList type="tag" values={project.frontmatter.tags} size="md" />
      )}

      {/* External Links */}
      {extracted.externalLinks.length > 0 && (
        <ExternalLinks links={extracted.externalLinks} />
      )}

      {/* AI Status Summary */}
      {extracted.aiStatusSummary && (
        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-[12px] font-medium text-purple-400 uppercase tracking-wider">
                AI Status
              </span>
            </div>
            {extracted.aiStatusDate && (
              <span className="text-[11px] text-zinc-500">
                {extracted.aiStatusDate}
              </span>
            )}
          </div>
          <div className="text-[13px] text-zinc-300 leading-relaxed">
            <Markdown content={extracted.aiStatusSummary} />
          </div>
        </div>
      )}

      {/* Extracted Data Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(extracted.currentPhase || extracted.lastUpdated) && (
          <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
            {extracted.currentPhase && (
              <div className="mb-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Current Phase</span>
                <p className="text-[14px] font-medium text-blue-400">{extracted.currentPhase}</p>
              </div>
            )}
            {extracted.lastUpdated && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Last Updated</span>
                <p className="text-[13px] text-zinc-300">{extracted.lastUpdated}</p>
              </div>
            )}
          </div>
        )}

        {todosTotal > 0 && (
          <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Progress</span>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(todosDone / todosTotal) * 100}%` }}
                />
              </div>
              <span className="text-[13px] font-medium text-zinc-300">
                {todosDone}/{todosTotal}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status Items */}
      {extracted.statusItems.length > 0 && (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Current Status
          </h2>
          <div className="space-y-2">
            {extracted.statusItems.map((item, i) => {
              const config = statusItemConfig[item.status] || statusItemConfig.pending;
              const Icon = config.icon;
              return (
                <div key={i} className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                  <span className="text-[13px] text-zinc-300">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Todos (from markdown) */}
      {extracted.todos.length > 0 && (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Checklist ({todosDone}/{todosTotal} done)
          </h2>
          <div className="space-y-1.5">
            {extracted.todos.map((todo, i) => (
              <div key={i} className="flex items-start gap-2">
                {todo.done ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 mt-0.5 flex-shrink-0 text-zinc-500" />
                )}
                <span className={`text-[13px] ${todo.done ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks (from task database) - grouped by person then date */}
      {projectTasks.length > 0 && (
        <CollapsibleSection
          title={`Tasks (${projectTasks.length})`}
          defaultOpen={true}
        >
          <TaskListConnected
            filter={{ projectSlug: project.slug, orgSlug: org }}
            initialTasks={projectTasks}
            variant="person-grouped"
          />
        </CollapsibleSection>
      )}

      {/* Workstreams */}
      {hasWorkstreams && (
        <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Workstreams
          </h2>
          <div className="space-y-3">
            {workstreams.map((workstream) => {
              const wsStatus = statusConfig[workstream.frontmatter.status || ""] || {
                color: "text-zinc-400",
                bgColor: "bg-zinc-500/10",
                label: workstream.frontmatter.status || "",
              };
              const wsTodosDone = workstream.extracted.todos.filter((t) => t.done).length;
              const wsTodosTotal = workstream.extracted.todos.length;
              const { extracted } = workstream;

              return (
                <Link
                  key={workstream.path}
                  href={`/projects/${workstream.org}/${project.slug}/${workstream.slug}`}
                  className="block p-4 rounded-lg bg-zinc-800/40 border border-zinc-800/30 hover:bg-zinc-800/60 hover:border-zinc-700/50 transition-colors group"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-3 mb-2">
                    <CornerDownRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                    <FileText className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-zinc-300 group-hover:text-zinc-100">
                          {workstream.name}
                        </span>
                        {workstream.frontmatter.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${wsStatus.color} ${wsStatus.bgColor}`}>
                            {wsStatus.label}
                          </span>
                        )}
                      </div>
                    </div>
                    {extracted.lastUpdated && (
                      <span className="text-[10px] text-zinc-600">
                        {extracted.lastUpdated}
                      </span>
                    )}
                  </div>

                  {/* Status items preview (up to 3) */}
                  {extracted.statusItems.length > 0 && (
                    <div className="ml-11 space-y-1 mb-2">
                      {extracted.statusItems.slice(0, 3).map((item, i) => {
                        const config = statusItemConfig[item.status] || statusItemConfig.pending;
                        const Icon = config.icon;
                        return (
                          <div key={i} className="flex items-start gap-1.5">
                            <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${config.color}`} />
                            <span className="text-[11px] text-zinc-400 line-clamp-1">{item.text}</span>
                          </div>
                        );
                      })}
                      {extracted.statusItems.length > 3 && (
                        <span className="text-[10px] text-zinc-600">
                          +{extracted.statusItems.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress bar for todos */}
                  {wsTodosTotal > 0 && (
                    <div className="ml-11 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(wsTodosDone / wsTodosTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {wsTodosDone}/{wsTodosTotal} tasks
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}

            {/* Render workstream refs from table that aren't files */}
            {(project.workstreams ?? [])
              .filter((ref) => !workstreams.some((ws) => ws.slug === ref.slug))
              .map((ref) => (
                <div
                  key={ref.path}
                  className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-800/30"
                >
                  <div className="flex items-center gap-3">
                    <CornerDownRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                    <FileText className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-zinc-300">
                          {ref.name}
                        </span>
                        {ref.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${workstreamStatusColors[ref.status] || "bg-zinc-500/20 text-zinc-400"}`}>
                            {ref.status}
                          </span>
                        )}
                      </div>
                      {ref.description && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {ref.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Project Files */}
      {!project.isFile && (
        <ProjectFilesTree
          projectPath={project.path.replace(/\/README\.md$/, '')}
          title="Project Files"
          maxHeight="300px"
        />
      )}

      {/* Related Meetings */}
      <MeetingList
        meetings={allMeetings}
        title="Related Meetings"
        projectSlug={project.slug}
        workstreamSlugs={workstreamSlugs}
        showWorkstreamToggle={workstreamSlugs.length > 0}
        showViewToggle={true}
      />

      {/* README content - Collapsed by default */}
      <CollapsibleSection title="README" defaultOpen={false} editPath={project.path}>
        <Markdown content={project.content} />
      </CollapsibleSection>

      {/* Next Steps - Collapsed by default */}
      {nextStepsContent && project.nextStepsPath && (
        <CollapsibleSection title="Next Steps" defaultOpen={false} editPath={project.nextStepsPath}>
          <Markdown content={nextStepsContent} />
        </CollapsibleSection>
      )}
    </div>
  );
}
