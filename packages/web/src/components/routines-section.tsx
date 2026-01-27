"use client";

import { useState } from "react";
import { Check, Clock, RefreshCcw, Loader2, Folder, SkipForward, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

interface Routine {
  id: number;
  title: string;
  description: string | null;
  priority: number | null;
  recurrenceRule: string;
  recurrenceTime: string | null;
  ownerName: string | null;
  projectSlug: string | null;
  projectName: string | null;
  completedToday: boolean;
  lastCompleted: string | null;
  completionCount: number;
}

interface OverdueRoutine {
  id: number;
  title: string;
  recurrenceRule: string;
  projectName: string | null;
  overdueDates: string[];
  daysOverdue: number;
}

export function RoutinesSection() {
  const [loading, setLoading] = useState<number | null>(null);
  const [skipping, setSkipping] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // tRPC queries
  const dueQuery = trpc.routines.due.useQuery();
  const overdueQuery = trpc.routines.overdue.useQuery();

  // tRPC mutations
  const completeMutation = trpc.routines.complete.useMutation({
    onSuccess: () => {
      dueQuery.refetch();
      setLoading(null);
    },
    onError: () => setLoading(null),
  });

  const uncompleteMutation = trpc.routines.uncomplete.useMutation({
    onSuccess: () => {
      dueQuery.refetch();
      setLoading(null);
    },
    onError: () => setLoading(null),
  });

  const skipMutation = trpc.routines.skip.useMutation({
    onSuccess: () => {
      dueQuery.refetch();
      setSkipping(null);
    },
    onError: () => setSkipping(null),
  });

  const skipAllOverdueMutation = trpc.routines.skipAllOverdue.useMutation({
    onSuccess: () => {
      overdueQuery.refetch();
      setSkipping(null);
    },
    onError: () => setSkipping(null),
  });

  // Extract data from queries - map to ensure completedToday has a boolean value
  const routines: Routine[] = [
    ...(dueQuery.data?.pending || []).map(r => ({ ...r, completedToday: r.completedToday ?? false })),
    ...(dueQuery.data?.completed || []).map(r => ({ ...r, completedToday: r.completedToday ?? true })),
  ];
  const date = dueQuery.data?.date || "";
  const overdueRoutines: OverdueRoutine[] = overdueQuery.data?.routines || [];

  const pending = routines.filter((r) => !r.completedToday);
  const completed = routines.filter((r) => r.completedToday);

  const handleSkipToday = (routineId: number) => {
    setSkipping(routineId);
    skipMutation.mutate({ id: routineId, date });
  };

  const handleSkipAllOverdue = (routineId: number) => {
    setSkipping(routineId);
    skipAllOverdueMutation.mutate({ id: routineId });
  };

  const handleToggle = (routineId: number, currentlyCompleted: boolean) => {
    setLoading(routineId);

    if (currentlyCompleted) {
      uncompleteMutation.mutate({ id: routineId, date });
    } else {
      completeMutation.mutate({ id: routineId, date });
    }
  };

  // Don't render anything while loading or if no routines
  if (dueQuery.isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCcw className="h-4 w-4 text-purple-400" />
          <h2 className="text-[14px] font-medium">Daily Routines</h2>
          <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (dueQuery.isError || (routines.length === 0 && overdueRoutines.length === 0)) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCcw className="h-4 w-4 text-purple-400" />
        <Link href="/routines" className="text-[14px] font-medium hover:text-purple-300 transition-colors">
          Today's Routines
        </Link>
        <span className="text-[12px] text-zinc-500">
          {completed.length}/{routines.length} done
        </span>
        {overdueRoutines.length > 0 && (
          <span className="text-[11px] text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {overdueRoutines.length} overdue
          </span>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        {/* Overdue routines */}
        {overdueRoutines.length > 0 && (
          <div className="mb-4 pb-4 border-b border-amber-500/30">
            <div className="text-[11px] text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </div>
            <div className="space-y-1">
              {overdueRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-amber-200">{routine.title}</div>
                    <div className="text-[11px] text-amber-400/70">
                      {routine.daysOverdue} missed ({routine.recurrenceRule})
                    </div>
                  </div>
                  <button
                    onClick={() => handleSkipAllOverdue(routine.id)}
                    disabled={skipping === routine.id}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded transition-colors"
                    title="Skip all overdue"
                  >
                    {skipping === routine.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <SkipForward className="h-3 w-3" />
                    )}
                    Clear
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending routines */}
        {pending.length > 0 && (
          <div className="space-y-1">
            {pending.map((routine) => (
              <RoutineItem
                key={routine.id}
                routine={routine}
                onToggle={() => handleToggle(routine.id, false)}
                onSkip={() => handleSkipToday(routine.id)}
                loading={loading === routine.id}
                skipping={skipping === routine.id}
              />
            ))}
          </div>
        )}

        {/* Completed routines */}
        {completed.length > 0 && (
          <div className={pending.length > 0 ? "mt-3 pt-3 border-t border-zinc-800" : ""}>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-1 text-[11px] text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-400 transition-colors"
            >
              {showCompleted ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Completed ({completed.length})
            </button>
            {showCompleted && (
              <div className="space-y-1">
                {completed.map((routine) => (
                  <RoutineItem
                    key={routine.id}
                    routine={routine}
                    onToggle={() => handleToggle(routine.id, true)}
                    loading={loading === routine.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* All done message */}
        {pending.length === 0 && completed.length > 0 && overdueRoutines.length === 0 && (
          <div className="text-center py-2 text-emerald-400/70 text-[13px]">
            All routines complete for today
          </div>
        )}
      </div>
    </div>
  );
}

function RoutineItem({
  routine,
  onToggle,
  onSkip,
  loading,
  skipping,
}: {
  routine: Routine;
  onToggle: () => void;
  onSkip?: () => void;
  loading: boolean;
  skipping?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        routine.completedToday
          ? "hover:bg-zinc-800/50"
          : "hover:bg-zinc-800"
      }`}
    >
      <button
        onClick={onToggle}
        disabled={loading}
        className="flex-shrink-0 disabled:opacity-50"
      >
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            routine.completedToday
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
              : "border-zinc-600 hover:border-zinc-500"
          }`}
        >
          {loading ? (
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          ) : routine.completedToday ? (
            <Check className="h-3 w-3" />
          ) : null}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <div
          className={`text-[13px] ${
            routine.completedToday ? "text-zinc-500 line-through" : "text-zinc-200"
          }`}
        >
          {routine.title}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          {routine.recurrenceTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {routine.recurrenceTime}
            </span>
          )}
          {routine.projectName && (
            <span className="flex items-center gap-1">
              <Folder className="h-3 w-3" />
              {routine.projectName}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-[11px] text-zinc-500 capitalize">
        {routine.recurrenceRule}
      </div>

      {/* Skip button - only show for pending routines */}
      {onSkip && !routine.completedToday && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          disabled={skipping}
          className="flex-shrink-0 p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
          title="Skip today"
        >
          {skipping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SkipForward className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
