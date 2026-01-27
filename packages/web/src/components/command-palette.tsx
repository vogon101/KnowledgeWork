"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Calendar,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Search,
  Users,
  CheckSquare,
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCircle,
  Building2,
  GitBranch,
} from "lucide-react";

interface SearchResult {
  type: "diary" | "project" | "meeting" | "page" | "task" | "person" | "organization" | "workstream";
  title: string;
  href: string;
  description?: string;
  org?: string;
  // Task-specific
  taskId?: string;
  taskStatus?: string;
  taskOwner?: string;
  taskPriority?: number;
  // Person-specific
  personOrg?: string;
  personEmail?: string;
  // Organization-specific
  orgSlug?: string;
  orgShortName?: string;
  // Workstream/Project-specific
  projectSlug?: string;
  projectOrg?: string;
}

const staticPages: SearchResult[] = [
  { type: "page", title: "Dashboard", href: "/", description: "Home" },
  { type: "page", title: "Diary", href: "/diary", description: "Daily work logs" },
  { type: "page", title: "Tasks", href: "/tasks", description: "Task management" },
  { type: "page", title: "People", href: "/people", description: "Contacts & team" },
  { type: "page", title: "Projects", href: "/projects", description: "All projects" },
  { type: "page", title: "Meetings", href: "/meetings", description: "Meeting notes" },
  { type: "page", title: "Browse", href: "/browse", description: "File browser" },
  { type: "page", title: "Search", href: "/search", description: "Full-text search" },
];

const iconMap = {
  page: LayoutDashboard,
  diary: Calendar,
  project: FolderKanban,
  meeting: Users,
  task: CheckSquare,
  person: UserCircle,
  organization: Building2,
  workstream: GitBranch,
};

const taskStatusIcons = {
  pending: Circle,
  in_progress: Clock,
  complete: CheckCircle2,
  blocked: AlertCircle,
  cancelled: Circle,
  deferred: Circle,
};

const taskStatusColors = {
  pending: "text-zinc-400",
  in_progress: "text-blue-400",
  complete: "text-emerald-400",
  blocked: "text-red-400",
  cancelled: "text-zinc-500",
  deferred: "text-amber-400",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const searchContent = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchContent, 200);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search tasks, projects, people, meetings..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching..." : "No results found."}
        </CommandEmpty>

        {/* Static pages */}
        <CommandGroup heading="Pages">
          {staticPages
            .filter(
              (page) =>
                !search ||
                page.title.toLowerCase().includes(search.toLowerCase()) ||
                page.description?.toLowerCase().includes(search.toLowerCase())
            )
            .map((page) => {
              const Icon = iconMap[page.type];
              return (
                <CommandItem
                  key={page.href}
                  value={page.title}
                  onSelect={() => handleSelect(page.href)}
                >
                  <Icon className="mr-2 h-4 w-4 text-zinc-500" />
                  <span>{page.title}</span>
                  {page.description && (
                    <span className="ml-2 text-zinc-500 text-[12px]">
                      {page.description}
                    </span>
                  )}
                </CommandItem>
              );
            })}
        </CommandGroup>

        {/* Task results */}
        {results.filter(r => r.type === "task").length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {results.filter(r => r.type === "task").map((result, i) => {
                const StatusIcon = result.taskStatus
                  ? taskStatusIcons[result.taskStatus as keyof typeof taskStatusIcons] || Circle
                  : Circle;
                const statusColor = result.taskStatus
                  ? taskStatusColors[result.taskStatus as keyof typeof taskStatusColors] || "text-zinc-500"
                  : "text-zinc-500";
                return (
                  <CommandItem
                    key={`${result.href}-${i}`}
                    value={`${result.taskId} ${result.title}`}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <StatusIcon className={`mr-2 h-4 w-4 ${statusColor}`} />
                    <span className="text-zinc-500 text-[11px] mr-2">{result.taskId}</span>
                    <span className="flex-1 truncate">{result.title}</span>
                    {result.taskOwner && (
                      <span className="ml-2 text-zinc-600 text-[11px]">
                        {result.taskOwner}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* People results */}
        {results.filter(r => r.type === "person").length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="People">
              {results.filter(r => r.type === "person").map((result, i) => (
                <CommandItem
                  key={`${result.href}-${i}`}
                  value={result.title}
                  onSelect={() => handleSelect(result.href)}
                >
                  <UserCircle className="mr-2 h-4 w-4 text-zinc-500" />
                  <span className="flex-1 truncate">{result.title}</span>
                  {result.personOrg && (
                    <span className="ml-2 text-zinc-600 text-[11px]">
                      {result.personOrg}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Projects */}
        {results.filter(r => r.type === "project").length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {results.filter(r => r.type === "project").map((result, i) => (
                <CommandItem
                  key={`${result.href}-${i}`}
                  value={result.title}
                  onSelect={() => handleSelect(result.href)}
                >
                  <FolderKanban className="mr-2 h-4 w-4 text-zinc-500" />
                  <span className="flex-1 truncate">{result.title}</span>
                  {result.org && (
                    <span className="ml-2 text-zinc-600 text-[11px]">{result.org}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Organizations */}
        {results.filter(r => r.type === "organization").length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Organizations">
              {results.filter(r => r.type === "organization").map((result, i) => (
                <CommandItem
                  key={`${result.href}-${i}`}
                  value={result.title}
                  onSelect={() => handleSelect(result.href)}
                >
                  <Building2 className="mr-2 h-4 w-4 text-zinc-500" />
                  <span className="flex-1 truncate">{result.title}</span>
                  {result.orgShortName && (
                    <span className="ml-2 text-zinc-600 text-[11px]">{result.orgShortName}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Workstreams */}
        {results.filter(r => r.type === "workstream").length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Workstreams">
              {results.filter(r => r.type === "workstream").map((result, i) => (
                <CommandItem
                  key={`${result.href}-${i}`}
                  value={result.title}
                  onSelect={() => handleSelect(result.href)}
                >
                  <GitBranch className="mr-2 h-4 w-4 text-zinc-500" />
                  <span className="flex-1 truncate">{result.title}</span>
                  {result.projectSlug && (
                    <span className="ml-2 text-zinc-600 text-[11px]">
                      {result.projectOrg}/{result.projectSlug}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Other results (diary, meetings) */}
        {results.filter(r => !["task", "person", "project", "organization", "workstream"].includes(r.type)).length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Other">
              {results.filter(r => !["task", "person", "project", "organization", "workstream"].includes(r.type)).map((result, i) => {
                const Icon = iconMap[result.type] || FileText;
                return (
                  <CommandItem
                    key={`${result.href}-${i}`}
                    value={result.title}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <Icon className="mr-2 h-4 w-4 text-zinc-500" />
                    <span>{result.title}</span>
                    {result.description && (
                      <span className="ml-2 text-zinc-500 text-[12px]">{result.description}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
