"use client";

import Link from "next/link";
import { getMeetingUrl } from "@/lib/urls";
import { FileText } from "lucide-react";

interface MeetingLinkProps {
  // Option 1: Full path
  path?: string;

  // Option 2: Components
  org?: string;
  date?: string;
  slug?: string;

  // Display
  title: string;
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Consistent meeting link component.
 * Accepts either a full path or org/date/slug components.
 */
export function MeetingLink({
  path,
  org,
  date,
  slug,
  title,
  showIcon = false,
  className = "text-blue-400 hover:text-blue-300 hover:underline",
  children,
}: MeetingLinkProps) {
  const href = getMeetingUrl({ path, org, date, slug });

  return (
    <Link href={href} className={className}>
      {showIcon && <FileText className="h-3.5 w-3.5 inline mr-1" />}
      {children || title}
    </Link>
  );
}

/**
 * Minimal meeting link for use in tables/lists
 */
export function MeetingLinkCompact({
  path,
  org,
  date,
  slug,
  title,
}: Omit<MeetingLinkProps, "showIcon" | "className" | "children">) {
  const href = getMeetingUrl({ path, org, date, slug });

  return (
    <Link
      href={href}
      className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {title}
    </Link>
  );
}
