"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  icon?: React.ReactNode;
  editPath?: string; // Optional path to edit this content
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className = "",
  headerClassName = "",
  icon,
  editPath,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-lg bg-zinc-800/30 border border-zinc-800/50 overflow-hidden ${className}`}>
      <div className="flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          )}
          {icon}
          <h2 className={`text-[12px] font-medium text-zinc-400 uppercase tracking-wider ${headerClassName}`}>
            {title}
          </h2>
        </button>
        {editPath && (
          <Link
            href={`/edit/${editPath}`}
            className="flex items-center gap-1 px-3 py-2 mr-2 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Link>
        )}
      </div>
      {isOpen && (
        <div className="px-4 pb-4 text-[13px] text-zinc-300">
          {children}
        </div>
      )}
    </div>
  );
}
