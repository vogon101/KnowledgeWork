"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, Calendar, FolderKanban, Users, FileText, Loader2, X, Filter, CheckSquare, Circle, CheckCircle2, AlertCircle, Clock, GitBranch } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  type: "diary" | "project" | "meeting" | "task" | "file" | "workstream";
  title: string;
  href: string;
  snippet?: string;
  date?: string;
  org?: string;
  matchType: "title" | "content" | "field";
  matchField?: string;
  score: number;
  // Task-specific
  taskId?: string;
  taskStatus?: string;
  taskOwner?: string;
  taskPriority?: number;
  // File-specific
  filePath?: string;
  fileExtension?: string;
}

// Parse field:value format
function parseQuery(q: string): { field?: string; value: string; raw: string } {
  const colonIndex = q.indexOf(":");
  if (colonIndex > 0) {
    const field = q.slice(0, colonIndex).toLowerCase().trim();
    const value = q.slice(colonIndex + 1).trim();
    const validFields = ["attendee", "attendees", "location", "tag", "tags", "project", "owner", "status", "org"];
    if (validFields.includes(field) && value) {
      return { field, value, raw: q };
    }
  }
  return { value: q, raw: q };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Initialize query from URL params
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      setActiveField(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
      setActiveField(data.field || null);
      setSearched(true);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
      // Update URL without navigation
      if (query) {
        router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
      } else {
        router.replace("/search", { scroll: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, router]);

  const clearFieldFilter = () => {
    const parsed = parseQuery(query);
    if (parsed.field) {
      setQuery(parsed.value);
    }
  };

  const typeIcons: Record<string, typeof Calendar> = {
    diary: Calendar,
    project: FolderKanban,
    workstream: GitBranch,
    meeting: Users,
    task: CheckSquare,
    file: FileText,
  };

  const typeColors: Record<string, string> = {
    diary: "text-blue-400",
    project: "text-emerald-400",
    workstream: "text-violet-400",
    meeting: "text-purple-400",
    task: "text-amber-400",
    file: "text-zinc-400",
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

  const priorityColors: Record<number, string> = {
    1: "text-red-400",
    2: "text-orange-400",
    3: "text-yellow-400",
    4: "text-zinc-400",
  };

  const fieldColors: Record<string, string> = {
    attendee: "text-blue-400 bg-blue-500/10",
    location: "text-emerald-400 bg-emerald-500/10",
    tag: "text-purple-400 bg-purple-500/10",
    project: "text-amber-400 bg-amber-500/10",
    owner: "text-cyan-400 bg-cyan-500/10",
    org: "text-pink-400 bg-pink-500/10",
    status: "text-zinc-400 bg-zinc-500/10",
    id: "text-amber-400 bg-amber-500/10",
  };

  const parsed = parseQuery(query);

  return (
    <div className="p-5 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Search</h1>
        <p className="text-[13px] text-zinc-500">
          Search across tasks, diary entries, projects, meetings, and files
        </p>
      </div>

      {/* Search input */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          type="search"
          placeholder="Search... (e.g., attendee:John, tag:nuclear)"
          className="pl-10 bg-zinc-800/50 border-zinc-700 text-[13px] h-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 animate-spin" />
        )}
      </div>

      {/* Active field filter indicator */}
      {activeField && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${fieldColors[activeField] || "text-zinc-400 bg-zinc-500/10"}`}>
            <Filter className="h-3.5 w-3.5" />
            <span className="text-[12px] font-medium">
              Filtering by {activeField}: <strong>{parsed.value}</strong>
            </span>
            <button
              onClick={clearFieldFilter}
              className="p-0.5 rounded hover:bg-white/10"
              title="Clear filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Filter hints */}
      {!searched && !query && (
        <div className="text-[12px] text-zinc-500 space-y-3">
          <div>
            <p className="font-medium text-zinc-400 mb-1">Search by task ID:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuery("T-")}
                className="px-2 py-1 rounded text-[11px] text-amber-400 bg-amber-500/10 hover:opacity-80 transition-opacity"
              >
                T-123
              </button>
            </div>
          </div>
          <div>
            <p className="font-medium text-zinc-400 mb-1">Filter by field:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { field: "attendee", example: "attendee:John" },
                { field: "tag", example: "tag:nuclear" },
                { field: "location", example: "location:office" },
                { field: "owner", example: "owner:Alice" },
                { field: "project", example: "project:scout" },
              ].map(({ field, example }) => (
                <button
                  key={field}
                  onClick={() => setQuery(example)}
                  className={`px-2 py-1 rounded text-[11px] ${fieldColors[field]} hover:opacity-80 transition-opacity`}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          <div className="text-[12px] text-zinc-500">
            {total === 0 ? (
              "No results found"
            ) : (
              <>
                {total} result{total !== 1 ? "s" : ""} for &quot;{query}&quot;
              </>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, i) => {
                const Icon = typeIcons[result.type];
                const color = typeColors[result.type];

                // Special rendering for tasks
                if (result.type === "task") {
                  const StatusIcon = result.taskStatus
                    ? taskStatusIcons[result.taskStatus as keyof typeof taskStatusIcons] || Circle
                    : Circle;
                  const statusColor = result.taskStatus
                    ? taskStatusColors[result.taskStatus as keyof typeof taskStatusColors] || "text-zinc-500"
                    : "text-zinc-500";

                  return (
                    <Link
                      key={`${result.href}-${i}`}
                      href={result.href}
                      className="block p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <StatusIcon className={`h-4 w-4 mt-0.5 ${statusColor} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[11px] text-zinc-500 font-mono">
                              {result.taskId}
                            </span>
                            <span className="text-[13px] font-medium text-zinc-200">
                              {result.title}
                            </span>
                            {result.taskPriority && result.taskPriority <= 2 && (
                              <span className={`text-[10px] font-medium ${priorityColors[result.taskPriority] || "text-zinc-400"}`}>
                                P{result.taskPriority}
                              </span>
                            )}
                            {result.matchType === "title" && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
                                title match
                              </span>
                            )}
                          </div>
                          {result.snippet && (
                            <p className="text-[12px] text-zinc-500 line-clamp-2 mb-1">
                              {result.snippet}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                            <span className="capitalize">{result.taskStatus?.replace("_", " ")}</span>
                            {result.taskOwner && <span>Owner: {result.taskOwner}</span>}
                            {result.org && <span>{result.org}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={`${result.href}-${i}`}
                    href={result.href}
                    className="block p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 ${color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[13px] font-medium text-zinc-200">
                            {result.title}
                          </span>
                          {result.matchType === "title" && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
                              title match
                            </span>
                          )}
                          {result.matchType === "field" && result.matchField && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${fieldColors[result.matchField] || "bg-zinc-500/20 text-zinc-400"}`}>
                              {result.matchField} match
                            </span>
                          )}
                        </div>
                        {result.snippet && (
                          <p className="text-[12px] text-zinc-500 line-clamp-2 mb-1">
                            {result.snippet}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                          <span className="capitalize">{result.type}</span>
                          {result.org && <span>{result.org}</span>}
                          {result.date && <span>{result.date}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick navigation when no search */}
      {!searched && (
        <div>
          <h2 className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Quick Navigation
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <QuickLink href="/tasks" icon={CheckSquare} label="Tasks" description="Task management" />
            <QuickLink href="/diary" icon={Calendar} label="Diary" description="Daily work logs" />
            <QuickLink href="/projects" icon={FolderKanban} label="Projects" description="All projects" />
            <QuickLink href="/meetings" icon={Users} label="Meetings" description="Meeting notes" />
            <QuickLink href="/browse" icon={FileText} label="Browse" description="File browser" />
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-zinc-500" />
        <span className="text-[13px] font-medium text-zinc-300 group-hover:text-zinc-100">
          {label}
        </span>
      </div>
      <p className="text-[12px] text-zinc-500">{description}</p>
    </Link>
  );
}

// Main export wrapped in Suspense for useSearchParams
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="p-5 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Search</h1>
          <p className="text-[13px] text-zinc-500">Loading...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
