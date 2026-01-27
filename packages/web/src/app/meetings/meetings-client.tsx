"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { MeetingList } from "@/components/meeting-list";
import { X, Users, FolderKanban, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Types matching knowledge-base.ts
interface Action {
  owner: string;
  action: string;
  due?: string;
  status: string;
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
    project?: string;
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

interface MeetingsPageClientProps {
  meetings: MeetingNote[];
}

function MeetingsContent({ meetings }: MeetingsPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const attendeeParam = searchParams.get("attendee");
  const projectParam = searchParams.get("project");
  const ownerParam = searchParams.get("owner");

  const [searchQuery, setSearchQuery] = useState("");

  // Filter meetings based on params and search
  const filteredMeetings = meetings.filter((m) => {
    // Attendee filter from URL
    if (attendeeParam) {
      const lowerAttendee = attendeeParam.toLowerCase();
      if (!m.frontmatter.attendees.some((a) => a.toLowerCase().includes(lowerAttendee))) {
        return false;
      }
    }

    // Project filter from URL
    if (projectParam) {
      if (m.frontmatter.project !== projectParam) {
        return false;
      }
    }

    // Owner filter - filter to meetings where this person has actions
    if (ownerParam) {
      const lowerOwner = ownerParam.toLowerCase();
      if (!m.actions.some((a) => a.owner.toLowerCase().includes(lowerOwner))) {
        return false;
      }
    }

    // Search query filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesTitle = m.frontmatter.title.toLowerCase().includes(lowerQuery);
      const matchesAttendee = m.frontmatter.attendees.some((a) =>
        a.toLowerCase().includes(lowerQuery)
      );
      const matchesProject = m.frontmatter.project?.toLowerCase().includes(lowerQuery);
      if (!matchesTitle && !matchesAttendee && !matchesProject) {
        return false;
      }
    }

    return true;
  });

  const clearFilter = (param: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    router.replace(`/meetings?${params.toString()}`, { scroll: false });
  };

  const hasFilters = attendeeParam || projectParam || ownerParam;

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-[13px] text-zinc-500">
          All meeting notes and records
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          type="search"
          placeholder="Search meetings..."
          className="pl-10 bg-zinc-800/50 border-zinc-700 text-[13px] h-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
            Filters:
          </span>
          {attendeeParam && (
            <button
              onClick={() => clearFilter("attendee")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[12px] hover:bg-purple-500/30 transition-colors"
            >
              <Users className="h-3 w-3" />
              {attendeeParam}
              <X className="h-3 w-3" />
            </button>
          )}
          {projectParam && (
            <button
              onClick={() => clearFilter("project")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[12px] hover:bg-emerald-500/30 transition-colors"
            >
              <FolderKanban className="h-3 w-3" />
              {projectParam}
              <X className="h-3 w-3" />
            </button>
          )}
          {ownerParam && (
            <button
              onClick={() => clearFilter("owner")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[12px] hover:bg-blue-500/30 transition-colors"
            >
              <Users className="h-3 w-3" />
              Actions: {ownerParam}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Meeting list */}
      <MeetingList
        meetings={filteredMeetings}
        showViewToggle={true}
        defaultView="meetings"
      />
    </div>
  );
}

export function MeetingsPageClient({ meetings }: MeetingsPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="p-5 space-y-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Meetings</h1>
            <p className="text-[13px] text-zinc-500">Loading...</p>
          </div>
        </div>
      }
    >
      <MeetingsContent meetings={meetings} />
    </Suspense>
  );
}
