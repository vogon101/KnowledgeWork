"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Users, Calendar, MapPin, FolderKanban, ChevronDown, ChevronRight, ListTodo, LayoutList, ToggleLeft, ToggleRight, User } from "lucide-react";
import { FilterableTag } from "@/components/filterable-tag";
import { PromptPopover } from "@/components/prompt-popover";
import { getMeetingUrl } from "@/lib/urls";

// Types matching knowledge-base.ts
interface Action {
  owner: string;
  action: string;
  due?: string;
  status: string;
  project?: string;             // Optional per-action project
}

interface MeetingNote {
  type: "meeting";
  path: string;
  org: string;
  slug: string;
  frontmatter: {
    title: string;
    date: string;
    attendees: string[];
    location?: string;
    tags?: string[];
    project?: string;           // Single project (backward compat)
    projects?: string[];        // Multiple projects
    status: "completed" | "ongoing" | "cancelled";
  };
  content: string;
  sections: {
    summary?: string;
    discussion?: string;
    decisions?: string;
    actions?: string;
    related?: string;
  };
  actions: Action[];
}

interface MeetingListProps {
  meetings: MeetingNote[];
  title?: string;
  showProjectFilter?: boolean;
  projectSlug?: string; // Filter to specific project
  includeWorkstreams?: boolean; // Include workstream meetings
  workstreamSlugs?: string[]; // Workstream slugs to include
  // Deprecated aliases for backwards compatibility
  includeSubProjects?: boolean;
  subProjectSlugs?: string[];
  attendeeFilter?: string; // Filter by attendee
  defaultView?: "meetings" | "actions";
  showViewToggle?: boolean;
  showWorkstreamToggle?: boolean;
  showSubProjectToggle?: boolean; // Deprecated alias
  maxItems?: number;
}

const actionStatusColors: Record<string, string> = {
  Pending: "bg-amber-500/20 text-amber-400",
  "In Progress": "bg-blue-500/20 text-blue-400",
  Complete: "bg-emerald-500/20 text-emerald-400",
  Done: "bg-emerald-500/20 text-emerald-400",
  Blocked: "bg-red-500/20 text-red-400",
  Waiting: "bg-purple-500/20 text-purple-400",
  Delegated: "bg-cyan-500/20 text-cyan-400",
  Cancelled: "bg-zinc-500/20 text-zinc-400",
  "N/A": "bg-zinc-500/20 text-zinc-400",
};

export function MeetingList({
  meetings,
  title,
  projectSlug,
  includeWorkstreams: initialIncludeWorkstreams,
  workstreamSlugs,
  // Deprecated aliases for backwards compatibility
  includeSubProjects: deprecatedIncludeSubProjects,
  subProjectSlugs: deprecatedSubProjectSlugs,
  attendeeFilter,
  defaultView = "meetings",
  showViewToggle = true,
  showWorkstreamToggle,
  showSubProjectToggle, // Deprecated alias
  maxItems,
}: MeetingListProps) {
  // Resolve deprecated props with new ones (new takes precedence)
  const effectiveWorkstreamSlugs = workstreamSlugs ?? deprecatedSubProjectSlugs ?? [];
  const effectiveInitialIncludeWorkstreams = initialIncludeWorkstreams ?? deprecatedIncludeSubProjects ?? true;
  const effectiveShowWorkstreamToggle = showWorkstreamToggle ?? showSubProjectToggle ?? false;

  const [view, setView] = useState<"meetings" | "actions">(defaultView);
  const [includeWorkstreams, setIncludeWorkstreams] = useState(effectiveInitialIncludeWorkstreams);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [groupByAssignee, setGroupByAssignee] = useState(true);
  const [expandedStatusSections, setExpandedStatusSections] = useState<Set<string>>(new Set(["pending", "blocked", "waiting"]));
  const [expandedAssignees, setExpandedAssignees] = useState<Set<string> | null>(null); // null = auto-expand active assignees
  const [expandedAssigneeCompleted, setExpandedAssigneeCompleted] = useState<Set<string>>(new Set()); // collapsed by default

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    let result = meetings;

    // Filter by project (checks both single project and projects array)
    if (projectSlug) {
      const allowedProjects = includeWorkstreams
        ? [projectSlug, ...effectiveWorkstreamSlugs]
        : [projectSlug];
      result = result.filter((m) => {
        // Check single project field
        if (m.frontmatter.project && allowedProjects.includes(m.frontmatter.project)) {
          return true;
        }
        // Check projects array
        if (m.frontmatter.projects?.some(p => allowedProjects.includes(p))) {
          return true;
        }
        return false;
      });
    }

    // Filter by attendee
    if (attendeeFilter) {
      const lowerFilter = attendeeFilter.toLowerCase();
      result = result.filter((m) =>
        m.frontmatter.attendees.some((a) => a.toLowerCase().includes(lowerFilter))
      );
    }

    // Sort by date descending (handle invalid dates)
    result = result.sort((a, b) => {
      const dateA = new Date(a.frontmatter.date).getTime();
      const dateB = new Date(b.frontmatter.date).getTime();
      // Push invalid dates to the end
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return dateB - dateA;
    });

    // Apply max limit
    if (maxItems && maxItems > 0) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [meetings, projectSlug, includeWorkstreams, effectiveWorkstreamSlugs, attendeeFilter, maxItems]);

  // Group meetings by month
  const groupedMeetings = useMemo(() => {
    const groups: Record<string, MeetingNote[]> = {};

    for (const meeting of filteredMeetings) {
      const date = parseISO(meeting.frontmatter.date);
      if (isNaN(date.getTime())) {
        console.error("Invalid date in meeting:", meeting.path, meeting.frontmatter.date);
        continue; // Skip meetings with invalid dates
      }
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMMM yyyy");

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(meeting);
    }

    // Convert to sorted array
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, meetings]) => ({
        key,
        label: format(parseISO(key + "-01"), "MMMM yyyy"),
        meetings,
      }));
  }, [filteredMeetings]);

  // Get all actions from filtered meetings
  const allActions = useMemo(() => {
    const actions: Array<Action & { meetingTitle: string; meetingPath: string; meetingOrg: string; meetingDate: string; meetingSlug: string; meetingProject?: string }> = [];

    for (const meeting of filteredMeetings) {
      for (const action of meeting.actions) {
        // Use action's own project if set, otherwise fall back to meeting's primary project
        const actionProject = action.project || meeting.frontmatter.project;
        actions.push({
          ...action,
          meetingTitle: meeting.frontmatter.title,
          meetingPath: meeting.path,
          meetingOrg: meeting.org,
          meetingDate: meeting.frontmatter.date,
          meetingSlug: meeting.slug,
          meetingProject: actionProject,
        });
      }
    }

    // Sort by due date (if present), then by meeting date
    actions.sort((a, b) => {
      // Parse due dates - handle formats like "20 Jan", "2026-01-20", etc.
      const parseDue = (due: string | undefined): Date | null => {
        if (!due) return null;
        // Try ISO format first
        if (/^\d{4}-\d{2}-\d{2}/.test(due)) {
          return new Date(due);
        }
        // Try "DD Mon" format - assume current year
        const match = due.match(/^(\d{1,2})\s+(\w{3})/);
        if (match) {
          const day = parseInt(match[1]);
          const monthStr = match[2];
          const months: Record<string, number> = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
          };
          const month = months[monthStr];
          if (month !== undefined) {
            const year = new Date().getFullYear();
            return new Date(year, month, day);
          }
        }
        return null;
      };

      const aDue = parseDue(a.due);
      const bDue = parseDue(b.due);

      // Actions with due dates come first
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;

      // Sort by due date if both have one
      if (aDue && bDue) {
        const diff = aDue.getTime() - bDue.getTime();
        if (diff !== 0) return diff;
      }

      // Fall back to meeting date (most recent first)
      return new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime();
    });

    return actions;
  }, [filteredMeetings]);

  // Define status categories
  const isActiveStatus = (status: string) => ["Pending", "In Progress"].includes(status);
  const isBlockedStatus = (status: string) => ["Blocked", "Waiting"].includes(status);
  const isCompletedStatus = (status: string) => ["Complete", "Done", "Delegated"].includes(status);
  const isInactiveStatus = (status: string) => ["Cancelled", "N/A"].includes(status);

  // Group actions by status
  const groupedActions = useMemo(() => {
    const pending = allActions.filter((a) => isActiveStatus(a.status));
    const blocked = allActions.filter((a) => isBlockedStatus(a.status));
    const completed = allActions.filter((a) => isCompletedStatus(a.status));
    const inactive = allActions.filter((a) => isInactiveStatus(a.status));
    const other = allActions.filter((a) =>
      !isActiveStatus(a.status) && !isBlockedStatus(a.status) &&
      !isCompletedStatus(a.status) && !isInactiveStatus(a.status)
    );

    return { pending, blocked, completed, inactive, other };
  }, [allActions]);

  // Helper to get sort priority for action status (lower = higher priority)
  const getStatusPriority = (status: string): number => {
    if (isActiveStatus(status)) return 0;    // Pending, In Progress first
    if (isBlockedStatus(status)) return 1;   // Blocked, Waiting second
    if (isCompletedStatus(status)) return 2; // Complete, Done, Delegated third
    if (isInactiveStatus(status)) return 3;  // Cancelled, N/A last
    return 1; // Unknown statuses treated as blocked-level
  };

  // Group actions by assignee
  const actionsByAssignee = useMemo(() => {
    const byAssignee: Record<string, typeof allActions> = {};

    for (const action of allActions) {
      const owner = action.owner || "Unassigned";
      if (!byAssignee[owner]) {
        byAssignee[owner] = [];
      }
      byAssignee[owner].push(action);
    }

    // Sort actions within each assignee: active first, then blocked, then completed/inactive
    for (const owner of Object.keys(byAssignee)) {
      byAssignee[owner].sort((a, b) => {
        const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
        if (priorityDiff !== 0) return priorityDiff;
        // Within same priority, keep the original due date / meeting date order
        return 0;
      });
    }

    // Sort assignees: those with active actions first (alphabetically), then those without (alphabetically)
    return Object.entries(byAssignee).sort(([a, actionsA], [b, actionsB]) => {
      const aHasActive = actionsA.some((action) => isActiveStatus(action.status) || isBlockedStatus(action.status));
      const bHasActive = actionsB.some((action) => isActiveStatus(action.status) || isBlockedStatus(action.status));

      if (aHasActive && !bHasActive) return -1;
      if (!aHasActive && bHasActive) return 1;
      return a.localeCompare(b);
    });
  }, [allActions]);

  // Determine which assignees should be expanded by default (those with active actions)
  const assigneesWithActiveActions = useMemo(() => {
    const active = new Set<string>();
    for (const [assignee, actions] of actionsByAssignee) {
      if (actions.some((a) => isActiveStatus(a.status) || isBlockedStatus(a.status))) {
        active.add(assignee);
      }
    }
    return active;
  }, [actionsByAssignee]);

  // Get effective expanded assignees (use auto-expand if not manually set)
  const effectiveExpandedAssignees = expandedAssignees ?? assigneesWithActiveActions;

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleStatusSection = (key: string) => {
    setExpandedStatusSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAssignee = (assignee: string) => {
    setExpandedAssignees((prev) => {
      // If null (auto mode), start from the auto-expanded set
      const current = prev ?? new Set(assigneesWithActiveActions);
      const next = new Set(current);
      if (next.has(assignee)) {
        next.delete(assignee);
      } else {
        next.add(assignee);
      }
      return next;
    });
  };

  const toggleAssigneeCompleted = (assignee: string) => {
    setExpandedAssigneeCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(assignee)) {
        next.delete(assignee);
      } else {
        next.add(assignee);
      }
      return next;
    });
  };

  // Expand first month by default
  useMemo(() => {
    if (groupedMeetings.length > 0 && expandedMonths.size === 0) {
      setExpandedMonths(new Set([groupedMeetings[0].key]));
    }
  }, [groupedMeetings, expandedMonths.size]);

  if (filteredMeetings.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
        {title && (
          <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            {title}
          </h2>
        )}
        <p className="text-[13px] text-zinc-500">No meetings found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {title && (
            <h2 className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
              {title} ({filteredMeetings.length})
            </h2>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Workstream toggle */}
          {effectiveShowWorkstreamToggle && effectiveWorkstreamSlugs.length > 0 && (
            <button
              onClick={() => setIncludeWorkstreams(!includeWorkstreams)}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              {includeWorkstreams ? (
                <ToggleRight className="h-4 w-4 text-emerald-400" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              Workstreams
            </button>
          )}

          {/* Group by assignee toggle (only in actions view) */}
          {view === "actions" && (
            <button
              onClick={() => setGroupByAssignee(!groupByAssignee)}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              {groupByAssignee ? (
                <ToggleRight className="h-4 w-4 text-cyan-400" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              <User className="h-3 w-3" />
              By assignee
            </button>
          )}

          {/* View toggle */}
          {showViewToggle && (
            <div className="flex items-center gap-1 bg-zinc-800 rounded p-0.5">
              <button
                onClick={() => setView("meetings")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                  view === "meetings"
                    ? "bg-zinc-700 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <LayoutList className="h-3 w-3" />
                Meetings
              </button>
              <button
                onClick={() => setView("actions")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                  view === "actions"
                    ? "bg-zinc-700 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <ListTodo className="h-3 w-3" />
                Actions ({allActions.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meetings View */}
      {view === "meetings" && (
        <div className="space-y-3">
          {groupedMeetings.map((group) => {
            const isExpanded = expandedMonths.has(group.key);
            return (
              <div key={group.key}>
                <button
                  onClick={() => toggleMonth(group.key)}
                  className="flex items-center gap-2 w-full text-left py-1.5 hover:bg-zinc-800/30 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                  <span className="text-[12px] font-medium text-zinc-400">
                    {group.label}
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    ({group.meetings.length})
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-5 mt-1 space-y-1">
                    {group.meetings.map((meeting) => (
                      <MeetingRow key={meeting.path} meeting={meeting} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions View */}
      {view === "actions" && (
        <div className="space-y-4">
          {groupByAssignee ? (
            /* Group by Assignee */
            <>
              {actionsByAssignee.map(([assignee, actions]) => {
                const activeActions = actions.filter((a) => isActiveStatus(a.status) || isBlockedStatus(a.status));
                const completedActions = actions.filter((a) => isCompletedStatus(a.status) || isInactiveStatus(a.status));
                const otherActions = actions.filter((a) =>
                  !isActiveStatus(a.status) && !isBlockedStatus(a.status) &&
                  !isCompletedStatus(a.status) && !isInactiveStatus(a.status)
                );
                const hasActiveActions = activeActions.length > 0;
                const isExpanded = effectiveExpandedAssignees.has(assignee);
                const isCompletedExpanded = expandedAssigneeCompleted.has(assignee);

                return (
                  <div key={assignee}>
                    <button
                      onClick={() => toggleAssignee(assignee)}
                      className="flex items-center gap-2 w-full text-left py-1 hover:bg-zinc-800/30 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                      <User className={`h-3.5 w-3.5 ${hasActiveActions ? "text-cyan-400" : "text-zinc-500"}`} />
                      <span className={`text-[12px] font-medium ${hasActiveActions ? "text-zinc-300" : "text-zinc-500"}`}>
                        {assignee}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {activeActions.length > 0 && <span className="text-amber-400">{activeActions.length} active</span>}
                        {activeActions.length > 0 && completedActions.length > 0 && " · "}
                        {completedActions.length > 0 && <span className="text-zinc-500">{completedActions.length} done</span>}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="ml-5 mt-1 space-y-1.5">
                        {/* Active actions (always shown) */}
                        {activeActions.map((action, i) => (
                          <ActionRow key={`active-${action.meetingPath}-${i}`} action={action} showOwner={false} />
                        ))}

                        {/* Other/unknown status actions */}
                        {otherActions.map((action, i) => (
                          <ActionRow key={`other-${action.meetingPath}-${i}`} action={action} showOwner={false} />
                        ))}

                        {/* Completed actions (collapsible) */}
                        {completedActions.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleAssigneeCompleted(assignee)}
                              className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-400 py-0.5"
                            >
                              {isCompletedExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              <span className="uppercase tracking-wider">
                                Completed ({completedActions.length})
                              </span>
                            </button>
                            {isCompletedExpanded && (
                              <div className="space-y-1.5 mt-1 opacity-60">
                                {completedActions.map((action, i) => (
                                  <ActionRow key={`completed-${action.meetingPath}-${i}`} action={action} showOwner={false} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            /* Group by Status */
            <>
              {/* Pending/In Progress */}
              {groupedActions.pending.length > 0 && (
                <CollapsibleStatusSection
                  label="Pending"
                  count={groupedActions.pending.length}
                  colorClass="text-amber-400"
                  isExpanded={expandedStatusSections.has("pending")}
                  onToggle={() => toggleStatusSection("pending")}
                >
                  {groupedActions.pending.map((action, i) => (
                    <ActionRow key={`pending-${action.meetingPath}-${i}`} action={action} />
                  ))}
                </CollapsibleStatusSection>
              )}

              {/* Blocked/Waiting */}
              {groupedActions.blocked.length > 0 && (
                <CollapsibleStatusSection
                  label="Blocked / Waiting"
                  count={groupedActions.blocked.length}
                  colorClass="text-red-400"
                  isExpanded={expandedStatusSections.has("blocked")}
                  onToggle={() => toggleStatusSection("blocked")}
                >
                  {groupedActions.blocked.map((action, i) => (
                    <ActionRow key={`blocked-${action.meetingPath}-${i}`} action={action} />
                  ))}
                </CollapsibleStatusSection>
              )}

              {/* Other (non-standard statuses) */}
              {groupedActions.other.length > 0 && (
                <CollapsibleStatusSection
                  label="Other"
                  count={groupedActions.other.length}
                  colorClass="text-zinc-400"
                  isExpanded={expandedStatusSections.has("other")}
                  onToggle={() => toggleStatusSection("other")}
                >
                  {groupedActions.other.map((action, i) => (
                    <ActionRow key={`other-${action.meetingPath}-${i}`} action={action} />
                  ))}
                </CollapsibleStatusSection>
              )}

              {/* Completed */}
              {groupedActions.completed.length > 0 && (
                <CollapsibleStatusSection
                  label="Complete"
                  count={groupedActions.completed.length}
                  colorClass="text-emerald-400/70"
                  isExpanded={expandedStatusSections.has("completed")}
                  onToggle={() => toggleStatusSection("completed")}
                  dimmed
                >
                  {groupedActions.completed.map((action, i) => (
                    <ActionRow key={`completed-${action.meetingPath}-${i}`} action={action} />
                  ))}
                </CollapsibleStatusSection>
              )}

              {/* Inactive (Cancelled, N/A) */}
              {groupedActions.inactive.length > 0 && (
                <CollapsibleStatusSection
                  label="Cancelled / N/A"
                  count={groupedActions.inactive.length}
                  colorClass="text-zinc-500"
                  isExpanded={expandedStatusSections.has("inactive")}
                  onToggle={() => toggleStatusSection("inactive")}
                  dimmed
                >
                  {groupedActions.inactive.map((action, i) => (
                    <ActionRow key={`inactive-${action.meetingPath}-${i}`} action={action} />
                  ))}
                </CollapsibleStatusSection>
              )}
            </>
          )}

          {allActions.length === 0 && (
            <p className="text-[13px] text-zinc-500">No actions found.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingRow({ meeting }: { meeting: MeetingNote }) {
  const date = parseISO(meeting.frontmatter.date);
  const meetingUrl = getMeetingUrl({
    org: meeting.org,
    date: meeting.frontmatter.date,
    slug: meeting.slug,
  });

  // Get all projects (from projects array or single project)
  const allProjects = meeting.frontmatter.projects || (meeting.frontmatter.project ? [meeting.frontmatter.project] : []);

  const meetingContext = {
    type: "meeting" as const,
    title: meeting.frontmatter.title,
    filePath: meeting.path,
    details: {
      Date: meeting.frontmatter.date,
      Attendees: meeting.frontmatter.attendees.join(", "),
      Location: meeting.frontmatter.location,
      Projects: allProjects.join(", ") || undefined,
    },
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded hover:bg-zinc-800/50 transition-colors group">
      <Link href={meetingUrl} className="flex items-start gap-3 flex-1 min-w-0">
        <Users className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] text-zinc-300 group-hover:text-zinc-100 line-clamp-1">
            {meeting.frontmatter.title}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5 flex-wrap">
            <span>{format(date, "EEE d")}</span>
            {meeting.frontmatter.location && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {meeting.frontmatter.location}
                </span>
              </>
            )}
            {allProjects.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FolderKanban className="h-3 w-3" />
                  {allProjects.join(", ")}
                </span>
              </>
            )}
            {meeting.actions.length > 0 && (
              <>
                <span>•</span>
                <span>{meeting.actions.length} actions</span>
              </>
            )}
          </div>
        </div>
      </Link>
      {/* AI Prompt button */}
      <div className="flex-shrink-0">
        <PromptPopover context={meetingContext} />
      </div>
    </div>
  );
}

function CollapsibleStatusSection({
  label,
  count,
  colorClass,
  isExpanded,
  onToggle,
  dimmed = false,
  children,
}: {
  label: string;
  count: number;
  colorClass: string;
  isExpanded: boolean;
  onToggle: () => void;
  dimmed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={dimmed ? "opacity-60" : ""}>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left py-1 hover:bg-zinc-800/30 rounded transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        )}
        <h3 className={`text-[11px] font-medium ${colorClass} uppercase tracking-wider`}>
          {label} ({count})
        </h3>
      </button>
      {isExpanded && (
        <div className="space-y-1.5 ml-5 mt-1">
          {children}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  action,
  showOwner = true,
}: {
  action: Action & { meetingTitle: string; meetingPath: string; meetingOrg: string; meetingDate: string; meetingSlug: string; meetingProject?: string };
  showOwner?: boolean;
}) {
  const meetingUrl = getMeetingUrl({
    org: action.meetingOrg,
    date: action.meetingDate,
    slug: action.meetingSlug,
  });
  const projectUrl = action.meetingProject ? `/projects/${action.meetingOrg}/${action.meetingProject}` : null;

  const actionContext = {
    type: "action" as const,
    title: action.action,
    filePath: action.meetingPath,
    details: {
      Owner: action.owner,
      Status: action.status,
      Due: action.due,
      Meeting: action.meetingTitle,
      Project: action.meetingProject,
    },
  };

  return (
    <div className="group flex items-start gap-3 p-2 rounded bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          {showOwner && <FilterableTag type="owner" value={action.owner} size="sm" />}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              actionStatusColors[action.status] || "bg-zinc-700 text-zinc-400"
            }`}
          >
            {action.status}
          </span>
          {action.due && (
            <span className="text-[10px] text-zinc-500">
              Due: {action.due}
            </span>
          )}
        </div>
        <p className="text-[13px] text-zinc-400">{action.action}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-600">
          {projectUrl && (
            <>
              <Link href={projectUrl} className="hover:text-zinc-400">
                {action.meetingProject}
              </Link>
              <span>·</span>
            </>
          )}
          <Link href={meetingUrl} className="hover:text-zinc-400">
            {action.meetingTitle}
          </Link>
        </div>
      </div>
      {/* AI Prompt button - always visible */}
      <div className="flex-shrink-0">
        <PromptPopover context={actionContext} />
      </div>
    </div>
  );
}
