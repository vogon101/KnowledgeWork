"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  AlertCircle,
  Bell,
  Wrench,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface HookEvent {
  id: string;
  type: string;
  sessionId?: string;
  timestamp: string;
  data: Record<string, unknown>;
}

const eventConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  Stop: { icon: CheckCircle, color: "text-emerald-400", label: "Completed" },
  PermissionRequest: { icon: AlertCircle, color: "text-amber-400", label: "Permission" },
  Notification: { icon: Bell, color: "text-blue-400", label: "Notification" },
  PreToolUse: { icon: Wrench, color: "text-zinc-400", label: "Tool" },
  PostToolUse: { icon: Wrench, color: "text-zinc-400", label: "Tool" },
  unknown: { icon: MessageSquare, color: "text-zinc-500", label: "Event" },
};

function getEventConfig(type: string) {
  return eventConfig[type] || eventConfig.unknown;
}

function getEventSummary(event: HookEvent): string {
  const { data, type } = event;

  if (type === "Stop") {
    return data.reason?.toString() || "Session ended";
  }

  if (type === "PermissionRequest") {
    const tool = data.tool_name || data.tool;
    return tool ? `Requesting ${tool}` : "Permission needed";
  }

  if (type === "Notification") {
    return data.message?.toString() || "Notification";
  }

  if (type === "PreToolUse" || type === "PostToolUse") {
    const tool = data.tool_name || data.tool;
    return tool ? `${tool}` : "Tool call";
  }

  return type;
}

interface ActivityFeedProps {
  limit?: number;
  compact?: boolean;
  stream?: boolean;
}

export function ActivityFeed({ limit = 10, compact = false, stream = true }: ActivityFeedProps) {
  const [events, setEvents] = useState<HookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (stream) {
      // Use SSE for real-time updates
      const eventSource = new EventSource("/api/hooks?stream=true");

      eventSource.onopen = () => {
        setConnected(true);
        setLoading(false);
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.type === "init") {
            setEvents(data.events.slice(0, limit));
          } else if (data.type === "event") {
            setEvents((prev) => [data.event, ...prev].slice(0, limit));
          }
        } catch (err) {
          console.error("Failed to parse SSE event:", err);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
      };

      return () => {
        eventSource.close();
      };
    } else {
      // Polling fallback
      const fetchEvents = async () => {
        try {
          const response = await fetch(`/api/hooks?limit=${limit}`);
          const data = await response.json();
          setEvents(data.events);
          setLoading(false);
        } catch (err) {
          console.error("Failed to fetch events:", err);
          setLoading(false);
        }
      };

      fetchEvents();
      const interval = setInterval(fetchEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [limit, stream]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-zinc-500">No activity yet</p>
        <p className="text-[11px] text-zinc-600 mt-1">
          Events from Claude Code will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Connection status */}
      {stream && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-zinc-500">
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-600"}`}
          />
          {connected ? "Live" : "Disconnected"}
        </div>
      )}

      {/* Events */}
      {events.map((event) => {
        const config = getEventConfig(event.type);
        const Icon = config.icon;
        const summary = getEventSummary(event);
        const timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });

        if (compact) {
          return (
            <div
              key={event.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/50"
            >
              <Icon className={`h-3 w-3 flex-shrink-0 ${config.color}`} />
              <span className="text-[12px] text-zinc-300 truncate flex-1">
                {summary}
              </span>
              <span className="text-[10px] text-zinc-500 flex-shrink-0">
                {timeAgo}
              </span>
            </div>
          );
        }

        return (
          <div
            key={event.id}
            className="p-2 rounded-lg bg-zinc-800/30 border border-zinc-800/50"
          >
            <div className="flex items-start gap-2">
              <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-400">
                    {config.label}
                  </span>
                  <span className="text-[10px] text-zinc-500">{timeAgo}</span>
                </div>
                <p className="text-[12px] text-zinc-300 mt-0.5 truncate">
                  {summary}
                </p>
                {event.sessionId && (
                  <p className="text-[10px] text-zinc-600 font-mono mt-1 truncate">
                    {event.sessionId}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
