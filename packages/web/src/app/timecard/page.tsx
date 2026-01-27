"use client";

import { useState, useMemo } from "react";
import {
  Clock,
  Calendar,
  Filter,
  Building2,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// Default client colors (cycles through for orgs not in the list)
const CLIENT_COLOR_PALETTE = [
  "bg-teal-500/20 text-teal-300",
  "bg-indigo-500/20 text-indigo-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-purple-500/20 text-purple-300",
];

function formatHours(hours: number): string {
  return hours.toFixed(1);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export default function TimecardPage() {
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Fetch data
  const summaryQuery = trpc.timecard.summary.useQuery();
  const listQuery = trpc.timecard.list.useQuery();
  const orgsQuery = trpc.organizations.list.useQuery();

  // Build org display names and colors from database
  const orgDisplayNames = useMemo(() => {
    const names: Record<string, string> = {};
    orgsQuery.data?.forEach(org => {
      names[org.slug] = org.name;
    });
    return names;
  }, [orgsQuery.data]);

  const orgColors = useMemo(() => {
    const colors: Record<string, string> = {};
    orgsQuery.data?.forEach((org, i) => {
      colors[org.slug] = CLIENT_COLOR_PALETTE[i % CLIENT_COLOR_PALETTE.length];
    });
    return colors;
  }, [orgsQuery.data]);

  // Helper to get display name (falls back to slug)
  const getClientName = (slug: string) => orgDisplayNames[slug] || slug;
  const getClientColor = (slug: string) => orgColors[slug] || "bg-zinc-700 text-zinc-300";

  // Extract data
  const summary = summaryQuery.data;
  const entries = listQuery.data?.entries || [];

  // Get available months from entries
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    entries.forEach((e) => months.add(e.date.slice(0, 7)));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (clientFilter !== "all") {
      result = result.filter((e) => e.client === clientFilter);
    }
    if (monthFilter !== "all") {
      result = result.filter((e) => e.date.startsWith(monthFilter));
    }
    return result;
  }, [entries, clientFilter, monthFilter]);

  // Group entries by month
  const entriesByMonth = useMemo(() => {
    const groups: Record<string, typeof filteredEntries> = {};
    for (const entry of filteredEntries) {
      const month = entry.date.slice(0, 7);
      if (!groups[month]) {
        groups[month] = [];
      }
      groups[month].push(entry);
    }
    return groups;
  }, [filteredEntries]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let total = 0;
    for (const entry of filteredEntries) {
      if (!totals[entry.client]) {
        totals[entry.client] = 0;
      }
      totals[entry.client] += entry.hours;
      total += entry.hours;
    }
    return { byClient: totals, total };
  }, [filteredEntries]);

  // Toggle month expansion
  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  // Expand all months by default when data loads
  useMemo(() => {
    if (availableMonths.length > 0 && expandedMonths.size === 0) {
      // Expand the first month by default
      setExpandedMonths(new Set([availableMonths[0]]));
    }
  }, [availableMonths, expandedMonths.size]);

  if (summaryQuery.isLoading || listQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (summaryQuery.isError || listQuery.isError) {
    return (
      <div className="min-h-screen p-6">
        <div className="text-red-400">Could not load timecard data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6 text-blue-400" />
              Timecard
            </h1>
            <p className="text-[13px] text-zinc-500 mt-1">
              {summary?.entryCount || 0} entries · {formatHours(summary?.totalHours || 0)} hours total
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Hours */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[12px] uppercase tracking-wider mb-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </div>
            <div className="text-2xl font-semibold">
              {formatHours(filteredTotals.total)}
            </div>
            <div className="text-[12px] text-zinc-500 mt-1">
              {filteredEntries.length} entries
            </div>
          </div>

          {/* Client Breakdowns */}
          {summary?.clients.map((client) => {
            const clientHours = filteredTotals.byClient[client] || 0;
            return (
              <div
                key={client}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex items-center gap-2 text-zinc-500 text-[12px] uppercase tracking-wider mb-2">
                  <Building2 className="h-4 w-4" />
                  {getClientName(client) || client}
                </div>
                <div className="text-2xl font-semibold">
                  {formatHours(clientHours)}
                </div>
                <div className="text-[12px] text-zinc-500 mt-1">
                  {(clientHours / 8).toFixed(1)} days
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-4">
        <Filter className="h-4 w-4 text-zinc-500" />

        <div className="flex items-center gap-2">
          <label className="text-[12px] text-zinc-500">Client:</label>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-[13px] focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Clients</option>
            {summary?.clients.map((client) => (
              <option key={client} value={client}>
                {getClientName(client) || client}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[12px] text-zinc-500">Month:</label>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-[13px] focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Months</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monthly Breakdown with Entries */}
      <div className="p-6 space-y-4">
        {Object.entries(entriesByMonth)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, monthEntries]) => {
            const isExpanded = expandedMonths.has(month);
            const monthTotals = monthEntries.reduce(
              (acc, e) => {
                acc.total += e.hours;
                acc.byClient[e.client] = (acc.byClient[e.client] || 0) + e.hours;
                return acc;
              },
              { total: 0, byClient: {} as Record<string, number> }
            );

            return (
              <div
                key={month}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden"
              >
                {/* Month Header */}
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                    <Calendar className="h-4 w-4 text-zinc-500" />
                    <span className="font-medium">{getMonthName(month)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    {Object.entries(monthTotals.byClient).map(([client, hours]) => (
                      <span
                        key={client}
                        className={`px-2 py-0.5 rounded ${getClientColor(client) || "bg-zinc-700 text-zinc-300"}`}
                      >
                        {client}: {formatHours(hours)}h
                      </span>
                    ))}
                    <span className="text-zinc-400 font-medium">
                      Total: {formatHours(monthTotals.total)}h
                    </span>
                  </div>
                </button>

                {/* Month Entries */}
                {isExpanded && (
                  <div className="border-t border-zinc-800">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[11px] text-zinc-500 uppercase tracking-wider">
                          <th className="text-left px-4 py-2">Date</th>
                          <th className="text-left px-4 py-2">Client</th>
                          <th className="text-right px-4 py-2">Hours</th>
                          <th className="text-left px-4 py-2">Tasks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthEntries.map((entry, i) => (
                          <tr
                            key={`${entry.date}-${entry.client}-${i}`}
                            className="border-t border-zinc-800/50 hover:bg-zinc-800/30"
                          >
                            <td className="px-4 py-2 text-[13px] text-zinc-400">
                              {formatDate(entry.date)}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[12px] ${
                                  getClientColor(entry.client) ||
                                  "bg-zinc-700 text-zinc-300"
                                }`}
                              >
                                {entry.client}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-[13px] text-right font-mono">
                              {formatHours(entry.hours)}
                            </td>
                            <td className="px-4 py-2 text-[13px] text-zinc-400 max-w-md truncate">
                              {entry.tasks || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No timecard entries found</p>
          </div>
        )}
      </div>
    </div>
  );
}
