import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Kill a process and all its children
async function killTree(pid: number, signal: string = "TERM"): Promise<boolean> {
  try {
    // Get all child processes
    const { stdout } = await execAsync(`pgrep -P ${pid} 2>/dev/null || true`);
    const children = stdout
      .trim()
      .split("\n")
      .filter((s) => s)
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n));

    // Kill children first (depth-first)
    for (const child of children) {
      await killTree(child, signal);
    }

    // Kill the process itself
    await execAsync(`kill -${signal} ${pid} 2>/dev/null || true`);
    return true;
  } catch {
    return false;
  }
}

// Kill all processes on a port
async function killPort(port: number): Promise<{ killed: number[]; failed: number[] }> {
  const killed: number[] = [];
  const failed: number[] = [];

  try {
    const { stdout } = await execAsync(`lsof -ti :${port} 2>/dev/null || true`);
    const pids = stdout
      .trim()
      .split("\n")
      .filter((s) => s)
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n));

    for (const pid of pids) {
      const success = await killTree(pid, "TERM");
      if (success) {
        killed.push(pid);
      } else {
        failed.push(pid);
      }
    }

    // Force kill any remaining after a short delay
    if (failed.length > 0) {
      await new Promise((r) => setTimeout(r, 500));
      for (const pid of [...failed]) {
        try {
          await execAsync(`kill -9 ${pid} 2>/dev/null || true`);
          failed.splice(failed.indexOf(pid), 1);
          killed.push(pid);
        } catch {
          // Still failed
        }
      }
    }
  } catch {
    // lsof failed
  }

  return { killed, failed };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, pid, port } = body;

    if (action === "kill-pid" && typeof pid === "number") {
      // Kill a specific PID
      const success = await killTree(pid, "TERM");

      // Force kill if TERM didn't work
      if (!success) {
        await new Promise((r) => setTimeout(r, 500));
        await killTree(pid, "9");
      }

      return NextResponse.json({ success: true, pid });
    }

    if (action === "kill-port" && typeof port === "number") {
      // Kill all processes on a port
      const result = await killPort(port);
      return NextResponse.json({
        success: result.failed.length === 0,
        ...result,
      });
    }

    if (action === "kill-all-dev") {
      // Kill all dev processes
      const ports = [3001, 3002, 3004];
      const results: Record<number, { killed: number[]; failed: number[] }> = {};

      for (const p of ports) {
        results[p] = await killPort(p);
      }

      return NextResponse.json({
        success: true,
        results,
      });
    }

    if (action === "kill-pty-sessions") {
      // Request terminal server to kill all PTY sessions via REST API
      const terminalPort = process.env.TERMINAL_PORT || process.env.NEXT_PUBLIC_TERMINAL_PORT || "3002";

      try {
        const response = await fetch(`http://localhost:${terminalPort}/sessions`, {
          method: "DELETE",
        });
        if (response.ok) {
          return NextResponse.json({
            success: true,
            message: "All PTY sessions killed",
          });
        }
      } catch {
        // Terminal server not reachable, fall back to killing the port
      }

      const result = await killPort(parseInt(terminalPort, 10));
      return NextResponse.json({
        success: true,
        message: "Terminal server killed - PTY sessions cleaned up",
        ...result,
      });
    }

    if (action === "kill-pty-session" && typeof body.sessionId === "string") {
      // Kill a specific PTY session
      const terminalPort = process.env.TERMINAL_PORT || process.env.NEXT_PUBLIC_TERMINAL_PORT || "3002";

      try {
        const response = await fetch(`http://localhost:${terminalPort}/sessions/${body.sessionId}`, {
          method: "DELETE",
        });
        const data = await response.json();
        return NextResponse.json(data);
      } catch {
        return NextResponse.json({
          success: false,
          error: "Terminal server not reachable",
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
