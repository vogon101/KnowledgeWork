"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Folder, Loader2, Search } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { FileSearchResult } from "@kw/api-types";

interface FileSearchCommandProps {
  /** Whether the dialog is open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function FileSearchCommand({
  open: controlledOpen,
  onOpenChange,
}: FileSearchCommandProps = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Use controlled or internal state
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Search query
  const { data, isLoading } = trpc.files.search.useQuery(
    { query, limit: 20 },
    {
      enabled: isOpen && query.length >= 1,
      staleTime: 10000,
    }
  );

  // Handle keyboard shortcut (Cmd+P for file search, like VS Code)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setOpen]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  // Handle selecting a result
  const handleSelect = useCallback(
    (result: FileSearchResult) => {
      setOpen(false);
      router.push(`/browse/${result.entry.path}`);
    },
    [router, setOpen]
  );

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setOpen}
      title="Search Files"
      description="Search for files in the knowledge base"
    >
      <CommandInput
        placeholder="Search files..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {isLoading && query.length >= 1 && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          </div>
        )}

        {!isLoading && query.length >= 1 && (!data?.results || data.results.length === 0) && (
          <CommandEmpty>No files found.</CommandEmpty>
        )}

        {data?.results && data.results.length > 0 && (
          <CommandGroup heading="Files">
            {data.results.map((result) => (
              <CommandItem
                key={result.entry.path}
                value={result.entry.path}
                onSelect={() => handleSelect(result)}
                className="cursor-pointer"
              >
                {result.entry.type === "folder" ? (
                  <Folder className="h-4 w-4 text-amber-500/80" />
                ) : (
                  <FileText className="h-4 w-4 text-zinc-500" />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] truncate">
                    <HighlightMatches
                      text={result.entry.frontmatterTitle || result.entry.name}
                      matches={result.matches}
                    />
                  </span>
                  <span className="text-[11px] text-zinc-500 truncate">
                    {result.entry.path}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && (
          <div className="py-6 text-center">
            <Search className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-[13px] text-zinc-500">
              Type to search for files
            </p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">Esc</kbd> to close
            </p>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// Highlight matched portions of text
function HighlightMatches({
  text,
  matches,
}: {
  text: string;
  matches?: Array<{ start: number; end: number }>;
}) {
  if (!matches || matches.length === 0) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    // Add text before match
    if (match.start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.start)}</span>
      );
    }

    // Add highlighted match
    parts.push(
      <span key={`match-${match.start}`} className="text-amber-400 font-medium">
        {text.slice(match.start, match.end)}
      </span>
    );

    lastIndex = match.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

// Button to trigger search (can be placed in header/nav)
export function FileSearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md",
          "bg-zinc-800/50 border border-zinc-700/50",
          "text-[13px] text-zinc-400 hover:text-zinc-200",
          "hover:bg-zinc-800 hover:border-zinc-600/50",
          "transition-colors",
          className
        )}
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
        <kbd className="ml-2 px-1.5 py-0.5 bg-zinc-700/50 rounded text-[11px] text-zinc-500">
          ⌘P
        </kbd>
      </button>
      <FileSearchCommand open={open} onOpenChange={setOpen} />
    </>
  );
}

// Global search provider (registers keyboard shortcut)
export function GlobalFileSearch() {
  const [open, setOpen] = useState(false);

  return <FileSearchCommand open={open} onOpenChange={setOpen} />;
}
