"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-medium rounded",
  {
    variants: {
      variant: {
        // Semantic variants (used for status, actions, etc.)
        default: "bg-zinc-600/50 text-zinc-300",
        muted: "bg-zinc-700/50 text-zinc-400",
        primary: "bg-blue-500/20 text-blue-300",
        success: "bg-emerald-500/20 text-emerald-300",
        warning: "bg-amber-500/20 text-amber-300",
        danger: "bg-red-500/20 text-red-300",
        info: "bg-cyan-500/20 text-cyan-300",
        purple: "bg-purple-500/20 text-purple-300",
        // Org color variants (stored in database, distinct from semantic)
        indigo: "bg-indigo-500/20 text-indigo-300",
        teal: "bg-teal-500/20 text-teal-300",
        rose: "bg-rose-500/20 text-rose-300",
        orange: "bg-orange-500/20 text-orange-300",
      },
      size: {
        sm: "px-1 py-0.5 text-[8px]",
        md: "px-1.5 py-0.5 text-[9px]",
        lg: "px-2 py-1 text-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

// Convenience components for common use cases
export function TodayBadge({ count, size = "md" }: { count: number; size?: "sm" | "md" | "lg" }) {
  if (count === 0) return null;
  return <Badge variant="primary" size={size}>{count} today</Badge>;
}

export function WeekBadge({ count, size = "md" }: { count: number; size?: "sm" | "md" | "lg" }) {
  if (count === 0) return null;
  return <Badge variant="warning" size={size}>{count} week</Badge>;
}

export function BlockedBadge({ count, size = "md" }: { count: number; size?: "sm" | "md" | "lg" }) {
  if (count === 0) return null;
  return <Badge variant="danger" size={size}>{count} blocked</Badge>;
}

export function ActiveBadge({ count, size = "md" }: { count: number; size?: "sm" | "md" | "lg" }) {
  if (count === 0) return null;
  return <Badge variant="default" size={size}>{count} active</Badge>;
}

export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const config: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
    active: { variant: "success", label: "Active" },
    planning: { variant: "primary", label: "Planning" },
    maintenance: { variant: "warning", label: "Maintenance" },
    paused: { variant: "muted", label: "Paused" },
    complete: { variant: "success", label: "Complete" },
    completed: { variant: "success", label: "Completed" },
    pending: { variant: "muted", label: "Pending" },
    in_progress: { variant: "primary", label: "In Progress" },
    blocked: { variant: "danger", label: "Blocked" },
    cancelled: { variant: "muted", label: "Cancelled" },
    deferred: { variant: "warning", label: "Deferred" },
  };

  const { variant, label } = config[status] || { variant: "muted" as const, label: status };
  return <Badge variant={variant} size={size}>{label}</Badge>;
}

export function PriorityBadge({ priority, size = "md" }: { priority: number | null; size?: "sm" | "md" | "lg" }) {
  if (!priority) return null;

  const variant: BadgeProps["variant"] =
    priority === 1 ? "danger" :
    priority === 2 ? "warning" :
    "muted";

  return <Badge variant={variant} size={size}>P{priority}</Badge>;
}

// Org color type for database-stored colors
export type OrgColor = "indigo" | "teal" | "rose" | "orange";

// Valid org colors for documentation and validation
export const ORG_COLORS: OrgColor[] = ["indigo", "teal", "rose", "orange"];

export function OrgBadge({
  org,
  color,
  shortName,
  size = "md"
}: {
  org: string;
  color?: OrgColor | string | null;  // Color from database
  shortName?: string | null;          // Short name from database
  size?: "sm" | "md" | "lg";
}) {
  // Use database color if provided, otherwise fall back to default
  const variant = (color && ORG_COLORS.includes(color as OrgColor))
    ? (color as OrgColor)
    : "default";

  // Use database shortName if provided, otherwise use org slug
  const label = shortName || org;

  return <Badge variant={variant} size={size}>{label}</Badge>;
}
