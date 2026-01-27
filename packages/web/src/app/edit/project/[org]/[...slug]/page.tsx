"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProjectEditor } from "@/components/project-editor";
import { ChevronRight, ExternalLink } from "lucide-react";
import matter from "gray-matter";

interface FileData {
  path: string;
  raw: string;
  frontmatter: Record<string, unknown>;
  content: string;
}

export default function EditProjectPage() {
  const params = useParams();
  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const org = params.org as string;
  const slugArray = params.slug as string[];

  // Determine path based on whether this is a workstream or regular project
  // Regular: org/projects/slug/README.md or org/projects/slug.md
  // Workstream: org/projects/parent/workstream.md
  const isWorkstream = slugArray.length === 2;
  const projectSlug = isWorkstream ? slugArray[0] : slugArray[0];
  const workstreamSlug = isWorkstream ? slugArray[1] : null;

  // Build the file path - we'll try multiple patterns
  const possiblePaths = isWorkstream
    ? [`${org}/projects/${projectSlug}/${workstreamSlug}.md`]
    : [
        `${org}/projects/${projectSlug}/README.md`,
        `${org}/projects/${projectSlug}.md`,
      ];

  // Load file content
  useEffect(() => {
    const loadFile = async () => {
      setLoading(true);
      setError(null);

      for (const tryPath of possiblePaths) {
        try {
          const response = await fetch(`/api/file?path=${encodeURIComponent(tryPath)}`);
          if (response.ok) {
            const data = await response.json();
            setFile(data);
            setLoading(false);
            return;
          }
        } catch {
          // Try next path
        }
      }

      setError("Project file not found");
      setLoading(false);
    };

    loadFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, JSON.stringify(slugArray)]);

  // Save handler
  const handleSave = useCallback(
    async (content: string) => {
      if (!file) return;

      const response = await fetch("/api/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: file.path,
          raw: content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      // Refresh file data
      const updated = await fetch(`/api/file?path=${encodeURIComponent(file.path)}`);
      const data = await updated.json();
      setFile(data);
    },
    [file]
  );

  // Build view URL
  const viewUrl = isWorkstream
    ? `/projects/${org}/${projectSlug}/${workstreamSlug}`
    : `/projects/${org}/${projectSlug}`;

  if (loading) {
    return (
      <div className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/4" />
          <div className="h-8 bg-zinc-800 rounded w-1/2" />
          <div className="h-64 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="p-5 space-y-4">
        <Link href={viewUrl} className="text-[12px] text-zinc-500 hover:text-zinc-300">
          Back to project
        </Link>
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50">
          <p className="text-[13px] text-red-400">{error || "File not found"}</p>
        </div>
      </div>
    );
  }

  // Get project name from frontmatter or content
  const titleFromFrontmatter = file.frontmatter?.title as string | undefined;
  const titleFromContent = file.content.match(/^#\s+(.+)$/m)?.[1];
  const projectName = titleFromFrontmatter || titleFromContent || (isWorkstream ? workstreamSlug : projectSlug);

  return (
    <div className="p-5 space-y-4 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[12px] text-zinc-500 flex-wrap">
        <Link href="/projects" className="hover:text-zinc-300">
          Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${org}`} className="hover:text-zinc-300">
          {org}
        </Link>
        {isWorkstream && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/projects/${org}/${projectSlug}`} className="hover:text-zinc-300">
              {projectSlug}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-zinc-400">{isWorkstream ? workstreamSlug : projectSlug}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Edit: {projectName}</h1>
          <p className="text-[13px] text-zinc-500">{file.path}</p>
        </div>
        <Link
          href={viewUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Link>
      </div>

      {/* Editor */}
      <ProjectEditor
        path={file.path}
        rawContent={file.raw}
        frontmatter={file.frontmatter as { title?: string; status?: string; priority?: number; tags?: string[]; type?: string; parent?: string; }}
        content={file.content}
        onSave={handleSave}
      />
    </div>
  );
}
