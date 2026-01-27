"use client";

import Link from "next/link";
import { Users, MapPin, Tag, FolderKanban, User } from "lucide-react";

type TagType = "attendee" | "location" | "tag" | "project" | "owner" | "status";
type IconName = "users" | "map-pin" | "tag" | "folder" | "user";

const icons: Record<IconName, typeof Tag> = {
  users: Users,
  "map-pin": MapPin,
  tag: Tag,
  folder: FolderKanban,
  user: User,
};

const tagConfig: Record<TagType, { icon: typeof Tag; color: string; bgColor: string }> = {
  attendee: { icon: Users, color: "text-blue-400", bgColor: "bg-blue-500/10 hover:bg-blue-500/20" },
  location: { icon: MapPin, color: "text-emerald-400", bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20" },
  tag: { icon: Tag, color: "text-purple-400", bgColor: "bg-purple-500/10 hover:bg-purple-500/20" },
  project: { icon: FolderKanban, color: "text-amber-400", bgColor: "bg-amber-500/10 hover:bg-amber-500/20" },
  owner: { icon: User, color: "text-cyan-400", bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20" },
  status: { icon: Tag, color: "text-zinc-400", bgColor: "bg-zinc-500/10 hover:bg-zinc-500/20" },
};

interface FilterableTagProps {
  type: TagType;
  value: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function FilterableTag({ type, value, showIcon = false, size = "sm" }: FilterableTagProps) {
  const config = tagConfig[type];
  const Icon = config.icon;

  const sizeClasses = size === "sm"
    ? "text-[11px] px-2 py-0.5"
    : "text-[12px] px-2.5 py-1";

  // Determine the link destination based on type
  let href: string;
  let title: string;

  if (type === "attendee") {
    // Link to meetings filtered by attendee
    href = `/meetings?attendee=${encodeURIComponent(value)}`;
    title = `View meetings with ${value}`;
  } else if (type === "owner") {
    // Link to meetings filtered by action owner
    href = `/meetings?owner=${encodeURIComponent(value)}`;
    title = `View meetings with actions for ${value}`;
  } else if (type === "project") {
    // Link to project page
    href = `/search?q=${encodeURIComponent(`project:${value}`)}`;
    title = `Find all for project: ${value}`;
  } else {
    // Default to search
    href = `/search?q=${encodeURIComponent(`${type}:${value}`)}`;
    title = `Find all with ${type}: ${value}`;
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 rounded-full ${config.bgColor} ${config.color} ${sizeClasses} transition-colors`}
      title={title}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {value}
    </Link>
  );
}

// For rendering a list of tags (e.g., attendees array)
interface FilterableTagListProps {
  type: TagType;
  values: string[];
  showIcon?: boolean;
  size?: "sm" | "md";
  label?: string;
  labelIcon?: IconName;
}

export function FilterableTagList({
  type,
  values,
  showIcon = false,
  size = "sm",
  label,
  labelIcon,
}: FilterableTagListProps) {
  if (!values || values.length === 0) return null;

  const LabelIcon = labelIcon ? icons[labelIcon] : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {label && (
        <span className="flex items-center gap-1.5 text-[13px] text-zinc-500">
          {LabelIcon && <LabelIcon className="h-3.5 w-3.5" />}
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <FilterableTag key={value} type={type} value={value} showIcon={showIcon} size={size} />
        ))}
      </div>
    </div>
  );
}
