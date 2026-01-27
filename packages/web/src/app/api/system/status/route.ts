import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Standard dev ports to check
const DEV_PORTS = [3001, 3002, 3004];

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

async function getProcessesOnPorts(): Promise<ProcessInfo[]> {
  const processes: ProcessInfo[] = [];

  for (const port of DEV_PORTS) {
    try {
      // lsof to get processes on port
      const { stdout } = await execAsync(
        `lsof -i :${port} -sTCP:LISTEN -n -P 2>/dev/null || true`
      );

      const lines = stdout.trim().split("\n").slice(1); // Skip header
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const [command, pidStr, user] = parts;
          const pid = parseInt(pidStr, 10);
          if (!isNaN(pid)) {
            processes.push({
              pid,
              port,
              command,
              user,
              type: "port",
            });
          }
        }
      }
    } catch {
      // Port not in use or lsof failed
    }
  }

  return processes;
}

async function getProcessFamily(pid: number): Promise<Set<number>> {
  const family = new Set<number>();
  family.add(pid);

  // Get children recursively
  async function getChildren(p: number): Promise<void> {
    try {
      const { stdout } = await execAsync(`pgrep -P ${p} 2>/dev/null || true`);
      const childPids = stdout.trim().split("\n").filter(s => s).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
      for (const childPid of childPids) {
        if (!family.has(childPid)) {
          family.add(childPid);
          await getChildren(childPid);
        }
      }
    } catch { /* ignore */ }
  }

  // Get parents recursively
  async function getParents(p: number): Promise<void> {
    try {
      const { stdout } = await execAsync(`ps -o ppid= -p ${p} 2>/dev/null || true`);
      const ppid = parseInt(stdout.trim(), 10);
      // Stop at PID 1 (init) or the shell
      if (!isNaN(ppid) && ppid > 1 && !family.has(ppid)) {
        family.add(ppid);
        await getParents(ppid);
      }
    } catch { /* ignore */ }
  }

  await Promise.all([getChildren(pid), getParents(pid)]);
  return family;
}

async function getOrphanNodeProcesses(portProcessPids: number[]): Promise<ProcessInfo[]> {
  const processes: ProcessInfo[] = [];

  // Get full family tree (parents + children) of all port-bound processes
  const legitimateFamily = new Set<number>();
  for (const pid of portProcessPids) {
    const family = await getProcessFamily(pid);
    family.forEach(p => legitimateFamily.add(p));
  }

  try {
    // Find node/tsx processes that might be orphans
    const { stdout } = await execAsync(
      `ps aux | grep -E 'node|tsx' | grep -v grep | grep -v 'Obsidian' 2>/dev/null || true`
    );

    const lines = stdout.trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 11) {
        const [user, pidStr, , , , , , , , , ...cmdParts] = parts;
        const pid = parseInt(pidStr, 10);
        const command = cmdParts.join(" ");

        // Skip if this is part of a legitimate process family
        if (legitimateFamily.has(pid)) continue;

        // Only include if it looks like a dev process
        if (
          !isNaN(pid) &&
          (command.includes("knowledge-work") ||
            command.includes("next") ||
            command.includes("terminal-server") ||
            command.includes("task-service"))
        ) {
          processes.push({
            pid,
            command: command.slice(0, 100), // Truncate
            user,
            type: "orphan",
          });
        }
      }
    }
  } catch {
    // ps failed
  }

  return processes;
}

async function getPtySessions(): Promise<PtySession[]> {
  const terminalPort = process.env.TERMINAL_PORT || process.env.NEXT_PUBLIC_TERMINAL_PORT || "3002";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`http://localhost:${terminalPort}/sessions`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return data.sessions.map((s: { id: string; createdAt: string }) => ({
        id: s.id,
        createdAt: new Date(s.createdAt).toLocaleString(),
      }));
    }
  } catch {
    // Terminal server not reachable
  }

  return [];
}

async function getMemoryUsage(): Promise<{ rss: number; heapUsed: number; heapTotal: number }> {
  const mem = process.memoryUsage();
  return {
    rss: Math.round(mem.rss / 1024 / 1024), // MB
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
  };
}

export async function GET() {
  try {
    // Get port processes first so we can exclude their children from orphan detection
    const portProcesses = await getProcessesOnPorts();
    const portPids = portProcesses.map(p => p.pid);

    const [orphanProcesses, ptySessions, memory] = await Promise.all([
      getOrphanNodeProcesses(portPids),
      getPtySessions(),
      getMemoryUsage(),
    ]);

    // Deduplicate by PID
    const seenPids = new Set<number>();
    const allProcesses: ProcessInfo[] = [];

    for (const p of portProcesses) {
      if (!seenPids.has(p.pid)) {
        seenPids.add(p.pid);
        allProcesses.push(p);
      }
    }

    for (const p of orphanProcesses) {
      if (!seenPids.has(p.pid)) {
        seenPids.add(p.pid);
        allProcesses.push(p);
      }
    }

    return NextResponse.json({
      processes: allProcesses,
      ptySessions,
      memory,
      ports: DEV_PORTS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
