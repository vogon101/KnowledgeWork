"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Trash2,
  AlertTriangle,
  Server,
  Cpu,
  HardDrive,
  Terminal,
  Zap,
} from "lucide-react";

interface ProcessInfo {
  pid: number;
  port?: number;
  command: string;
  user: string;
  type: "port" | "orphan" | "pty";
}

interface PtySession {
  id: string;
  createdAt: string;
}

interface SystemStatus {
  processes: ProcessInfo[];
  ptySessions: PtySession[];
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  ports: number[];
  timestamp: string;
}

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [killing, setKilling] = useState<Set<number | string>>(new Set());

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/system/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const killProcess = async (pid: number) => {
    setKilling((prev) => new Set(prev).add(pid));
    try {
      const res = await fetch("/api/system/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kill-pid", pid }),
      });
      if (!res.ok) throw new Error("Failed to kill process");
      // Refresh status after kill
      await fetchStatus();
    } catch (err) {
      alert(`Failed to kill process: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setKilling((prev) => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    }
  };

  const killPort = async (port: number) => {
    setKilling((prev) => new Set(prev).add(`port-${port}`));
    try {
      const res = await fetch("/api/system/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kill-port", port }),
      });
      if (!res.ok) throw new Error("Failed to kill port");
      await fetchStatus();
    } catch (err) {
      alert(`Failed to kill port: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setKilling((prev) => {
        const next = new Set(prev);
        next.delete(`port-${port}`);
        return next;
      });
    }
  };

  const killAllDev = async () => {
    if (!confirm("Kill all dev processes? This will stop Next.js, terminal server, and task service.")) {
      return;
    }
    setKilling((prev) => new Set(prev).add("all"));
    try {
      const res = await fetch("/api/system/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kill-all-dev" }),
      });
      if (!res.ok) throw new Error("Failed to kill all");
      await fetchStatus();
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setKilling((prev) => {
        const next = new Set(prev);
        next.delete("all");
        return next;
      });
    }
  };

  const getPortLabel = (port: number) => {
    switch (port) {
      case 3001:
        return "Next.js";
      case 3002:
        return "Terminal Server";
      case 3004:
        return "Task Service";
      default:
        return `Port ${port}`;
    }
  };

  const getProcessIcon = (type: string) => {
    switch (type) {
      case "port":
        return <Server className="h-4 w-4" />;
      case "orphan":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "pty":
        return <Terminal className="h-4 w-4" />;
      default:
        return <Cpu className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">System Status</h1>
          <p className="text-sm text-zinc-500">
            Monitor and manage dev processes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={killAllDev}
            disabled={killing.has("all")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Kill All Dev
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Memory Usage */}
      {status?.memory && (
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Next.js Memory Usage
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-zinc-500">RSS</div>
              <div className="text-lg font-mono">{status.memory.rss} MB</div>
            </div>
            <div>
              <div className="text-zinc-500">Heap Used</div>
              <div className="text-lg font-mono">{status.memory.heapUsed} MB</div>
            </div>
            <div>
              <div className="text-zinc-500">Heap Total</div>
              <div className="text-lg font-mono">{status.memory.heapTotal} MB</div>
            </div>
          </div>
        </div>
      )}

      {/* Processes by Port */}
      <div className="mb-6">
        <h2 className="text-sm font-medium mb-3">Dev Ports</h2>
        <div className="space-y-2">
          {status?.ports.map((port) => {
            const processesOnPort = status.processes.filter((p) => p.port === port);
            const isActive = processesOnPort.length > 0;

            return (
              <div
                key={port}
                className={`p-3 rounded-lg border ${
                  isActive
                    ? "bg-green-900/10 border-green-500/30"
                    : "bg-zinc-800/30 border-zinc-700/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isActive ? "bg-green-500" : "bg-zinc-600"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium">{getPortLabel(port)}</div>
                      <div className="text-xs text-zinc-500">Port {port}</div>
                    </div>
                  </div>
                  {isActive && (
                    <button
                      onClick={() => killPort(port)}
                      disabled={killing.has(`port-${port}`)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-600/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Kill
                    </button>
                  )}
                </div>
                {processesOnPort.length > 0 && (
                  <div className="mt-2 text-xs text-zinc-400 font-mono truncate">
                    PID: {processesOnPort.map((p) => p.pid).join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All Processes */}
      <div className="mb-6">
        <h2 className="text-sm font-medium mb-3">
          All Dev Processes ({status?.processes.length || 0})
        </h2>
        {status?.processes.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm bg-zinc-800/30 rounded-lg">
            No dev processes running
          </div>
        ) : (
          <div className="space-y-1">
            {status?.processes.map((proc) => (
              <div
                key={proc.pid}
                className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                  proc.type === "orphan"
                    ? "bg-yellow-900/10 border border-yellow-500/20"
                    : "bg-zinc-800/30"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getProcessIcon(proc.type)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-300">PID {proc.pid}</span>
                      {proc.port && (
                        <span className="text-xs text-zinc-500">
                          :{proc.port}
                        </span>
                      )}
                      {proc.type === "orphan" && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                          orphan
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {proc.command}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => killProcess(proc.pid)}
                  disabled={killing.has(proc.pid)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-600/20 transition-colors disabled:opacity-50 ml-2"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PTY Sessions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            PTY Sessions ({status?.ptySessions?.length || 0})
          </h2>
          {status?.ptySessions && status.ptySessions.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm("Kill all PTY sessions? This will close all terminal tabs.")) return;
                setKilling((prev) => new Set(prev).add("all-pty"));
                try {
                  await fetch("/api/system/kill", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "kill-pty-sessions" }),
                  });
                  await fetchStatus();
                } finally {
                  setKilling((prev) => {
                    const next = new Set(prev);
                    next.delete("all-pty");
                    return next;
                  });
                }
              }}
              disabled={killing.has("all-pty")}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-600/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Kill All
            </button>
          )}
        </div>
        {!status?.ptySessions || status.ptySessions.length === 0 ? (
          <div className="p-3 text-center text-zinc-500 text-sm bg-zinc-800/30 rounded-lg">
            No active PTY sessions (terminal server may be down)
          </div>
        ) : (
          <div className="space-y-1">
            {status.ptySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 text-sm"
              >
                <div>
                  <div className="text-zinc-300 font-mono">{session.id}</div>
                  <div className="text-xs text-zinc-500">Created: {session.createdAt}</div>
                </div>
                <button
                  onClick={async () => {
                    setKilling((prev) => new Set(prev).add(`pty-${session.id}`));
                    try {
                      await fetch("/api/system/kill", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "kill-pty-session", sessionId: session.id }),
                      });
                      await fetchStatus();
                    } finally {
                      setKilling((prev) => {
                        const next = new Set(prev);
                        next.delete(`pty-${session.id}`);
                        return next;
                      });
                    }
                  }}
                  disabled={killing.has(`pty-${session.id}`)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-600/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          PTY sessions persist for terminal reconnection. The main session is &quot;main&quot;.
        </p>
      </div>

      {/* Help */}
      <div className="p-4 bg-zinc-800/30 rounded-lg text-sm text-zinc-400">
        <h3 className="font-medium text-zinc-300 mb-2">Troubleshooting</h3>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            <strong>Orphan processes</strong> are node/tsx processes that survived
            shutdown. Kill them individually or use &quot;Kill All Dev&quot;.
          </li>
          <li>
            <strong>PTY sessions</strong> keep terminal state across page loads.
            They&apos;re cleaned up when the terminal server stops.
          </li>
          <li>
            If ports show no processes but are still in use, try{" "}
            <code className="px-1 py-0.5 bg-zinc-700 rounded">
              lsof -i :PORT
            </code>{" "}
            in terminal.
          </li>
          <li>
            For persistent issues, run{" "}
            <code className="px-1 py-0.5 bg-zinc-700 rounded">
              ./scripts/kill-dev.sh
            </code>{" "}
            from knowledge-work-web.
          </li>
        </ul>
      </div>

      {/* Last updated */}
      {status?.timestamp && (
        <div className="mt-4 text-xs text-zinc-600 text-right">
          Last updated: {new Date(status.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
