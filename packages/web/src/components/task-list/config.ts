/**
 * Shared configuration for task-list components
 */

import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  XCircle,
  Pause,
} from "lucide-react";

// Default owner for new tasks and filtering
// Set via NEXT_PUBLIC_DEFAULT_OWNER in .env.local
export const DEFAULT_OWNER_NAME = process.env.NEXT_PUBLIC_DEFAULT_OWNER || "Alice";

export const statusConfig = {
  pending: {
    icon: Circle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    label: "Pending",
  },
  in_progress: {
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    label: "In Progress",
  },
  complete: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    label: "Complete",
  },
  blocked: {
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    label: "Blocked",
  },
  cancelled: {
    icon: XCircle,
    color: "text-zinc-500",
    bgColor: "bg-zinc-500/10",
    label: "Cancelled",
  },
  deferred: {
    icon: Pause,
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10",
    label: "Deferred",
  },
} as const;

export const priorityColors: Record<number, string> = {
  1: "text-red-400 bg-red-500/10",
  2: "text-orange-400 bg-orange-500/10",
  3: "text-yellow-400 bg-yellow-500/10",
  4: "text-zinc-400 bg-zinc-500/10",
};

export type StatusKey = keyof typeof statusConfig;

/**
 * Format a target period string for display
 */
export function formatTargetPeriod(period: string): string {
  // e.g., "2025-Q1" -> "Q1 2025", "2025-W3" -> "Week 3", "2025-01" -> "Jan 2025"
  const quarterMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (quarterMatch) {
    return `Q${quarterMatch[2]} ${quarterMatch[1]}`;
  }
  const weekMatch = period.match(/^(\d{4})-W(\d+)$/);
  if (weekMatch) {
    return `Week ${weekMatch[2]}`;
  }
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIndex = parseInt(monthMatch[2], 10) - 1;
    return `${monthNames[monthIndex]} ${monthMatch[1]}`;
  }
  return period;
}
