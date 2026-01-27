import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { MeetingLink } from "@/components/meeting-link";
import {
  getPersonById,
  getTasksForPerson,
  getTasksWaitingOnPerson,
  getMeetingsForPerson,
  isTaskDbAvailable,
} from "@/lib/task-db";
import { TaskList } from "@/components/task-list";
import { TaskListConnected } from "@/components/task-list/task-list-connected";
import { DeletePersonButton } from "./delete-person-button";
import { EditPersonButton } from "./edit-person-button";
import { AIButton } from "@/components/ai-button";

export const dynamic = "force-dynamic";

interface PersonDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonDetailPage({ params }: PersonDetailPageProps) {
  const { id } = await params;

  if (!isTaskDbAvailable()) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Person Not Available</h1>
        <div className="text-zinc-500">
          Task database not available. Run the task service to enable people tracking.
        </div>
      </div>
    );
  }

  const personId = parseInt(id, 10);
  if (isNaN(personId)) {
    notFound();
  }

  const person = getPersonById(personId);
  if (!person) {
    notFound();
  }

  const ownedTasks = getTasksForPerson(person.name);
  const waitingOnTasks = getTasksWaitingOnPerson(personId);
  const meetings = getMeetingsForPerson(personId);

  const activeTasks = ownedTasks.filter(
    (t) => !["complete", "cancelled"].includes(t.status)
  );
  const completedTasks = ownedTasks.filter(
    (t) => ["complete", "cancelled"].includes(t.status)
  );

  // Get initials
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 px-6 py-5">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/people"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 text-[14px]">People</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-medium text-zinc-400">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-[13px] text-zinc-500">
                {person.org && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {person.org}
                  </span>
                )}
                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {person.email}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AIButton
              context={{
                type: "general",
                title: `Person: ${person.name}`,
              }}
            />
            <EditPersonButton person={person} />
            <DeletePersonButton personId={person.id} personName={person.name} taskCount={activeTasks.length} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
            <span className="text-[13px]">
              <span className="text-zinc-200 font-medium">{activeTasks.length}</span>
              <span className="text-zinc-500 ml-1">active tasks</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-[13px]">
              <span className="text-zinc-200 font-medium">{waitingOnTasks.length}</span>
              <span className="text-zinc-500 ml-1">owed to you</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-400" />
            <span className="text-[13px]">
              <span className="text-zinc-200 font-medium">{meetings.length}</span>
              <span className="text-zinc-500 ml-1">meetings</span>
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks they own */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              Tasks Owned
              <span className="text-zinc-600">({activeTasks.length} active)</span>
            </h2>
            {ownedTasks.length > 0 ? (
              <TaskListConnected
                filter={{ ownerName: person.name }}
                initialTasks={ownedTasks}
                showProject
                showCompletedToggle
                defaultShowCompleted={false}
                compact
              />
            ) : (
              <div className="text-[12px] text-zinc-500 py-4 text-center">
                No tasks
              </div>
            )}
          </section>

          {/* Tasks owed (waiting on them) */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Owed to You
              <span className="text-zinc-600">({waitingOnTasks.length})</span>
            </h2>
            {waitingOnTasks.length > 0 ? (
              <TaskList tasks={waitingOnTasks} showProject compact />
            ) : (
              <div className="text-[12px] text-zinc-500 py-4 text-center">
                No tasks waiting on {person.name.split(" ")[0]}
              </div>
            )}
          </section>
        </div>

        {/* Recent meetings */}
        {meetings.length > 0 && (
          <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-[12px] font-medium uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              Recent Meetings
              <span className="text-zinc-600">({meetings.length})</span>
            </h2>
            <div className="space-y-1">
              {meetings.slice(0, 10).map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-zinc-800/50 transition-colors"
                >
                  <MeetingLink
                    path={meeting.path}
                    title={meeting.title}
                    className="text-[13px] text-zinc-300 hover:text-zinc-100"
                  />
                  <span className="text-[11px] text-zinc-500">
                    {new Date(meeting.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: meeting.date.startsWith(String(new Date().getFullYear()))
                        ? undefined
                        : "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
