"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Editor } from "@/components/editor";
import { ChevronRight, ExternalLink } from "lucide-react";

interface FileData {
  path: string;
  raw: string;
}

export default function EditPage() {
  const params = useParams();
  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pathSegments = params.path as string[];
  const relativePath = pathSegments.join("/");

  // Load file content
  useEffect(() => {
    const loadFile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/file?path=${encodeURIComponent(relativePath)}`);
        if (!response.ok) {
          throw new Error("Failed to load file");
        }
        const data = await response.json();
        setFile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [relativePath]);

  // Save handler - saves raw content directly
  const handleSave = useCallback(
    async (content: string) => {
      const response = await fetch("/api/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: relativePath,
          raw: content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      // Refresh file data
      const updated = await fetch(`/api/file?path=${encodeURIComponent(relativePath)}`);
      const data = await updated.json();
      setFile(data);
    },
    [relativePath]
  );

  // Build breadcrumb
  const pathParts = relativePath.split("/").filter(Boolean);
  const fileName = pathParts.pop() || "";

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
        <Link href={`/browse/${relativePath}`} className="text-[12px] text-zinc-500 hover:text-zinc-300">
          ← Back to file
        </Link>
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50">
          <p className="text-[13px] text-red-400">{error || "File not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[12px] text-zinc-500 flex-wrap">
        <Link href="/browse" className="hover:text-zinc-300">
          Browse
        </Link>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`/browse/${pathParts.slice(0, i + 1).join("/")}`}
              className="hover:text-zinc-300"
            >
              {part}
            </Link>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-300">{fileName}</span>
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{fileName}</h1>
          <p className="text-[13px] text-zinc-500">{relativePath}</p>
        </div>
        <Link
          href={`/browse/${relativePath}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Link>
      </div>

      {/* Editor */}
      <Editor content={file.raw} onSave={handleSave} />
    </div>
  );
}
