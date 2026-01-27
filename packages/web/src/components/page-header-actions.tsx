"use client";

import Link from "next/link";
import { Pencil, FileText } from "lucide-react";
import { AIButton } from "./ai-button";
import type { PromptContext } from "./prompt-popover";

interface PageHeaderActionsProps {
  editPath?: string;
  projectEditUrl?: string; // Use structured project editor
  aiContext?: PromptContext;
}

export function PageHeaderActions({ editPath, projectEditUrl, aiContext }: PageHeaderActionsProps) {
  // If projectEditUrl is provided, show both raw edit and structured edit
  // Otherwise just show raw edit
  const editUrl = projectEditUrl || (editPath ? `/edit/${editPath}` : null);

  return (
    <div className="flex items-center gap-2">
      <AIButton context={aiContext} />
      {projectEditUrl && editPath && (
        <Link
          href={`/edit/${editPath}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Edit raw markdown"
        >
          <FileText className="h-3.5 w-3.5" />
        </Link>
      )}
      {editUrl && (
        <Link
          href={editUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      )}
    </div>
  );
}
