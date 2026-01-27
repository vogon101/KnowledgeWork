import * as pty from "node-pty";
import { EventEmitter } from "events";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get the knowledge base root (content directory)
// Use environment variable or compute from cwd
const KB_ROOT = process.env.KNOWLEDGE_BASE_PATH || path.resolve(process.cwd(), "../../content");

// Verify KB_ROOT exists
if (!fs.existsSync(KB_ROOT)) {
  console.error(`[PTY] KB_ROOT does not exist: ${KB_ROOT}`);
  console.error(`[PTY] Set KB_ROOT environment variable or run from knowledge-work-web directory`);
}

interface PtySession {
  id: string;
  pty: pty.IPty;
  createdAt: Date;
  // Buffer recent output for reconnection
  outputBuffer: string[];
  maxBufferSize: number;
}

class PtyServer extends EventEmitter {
  private static instance: PtyServer;
  private sessions: Map<string, PtySession> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): PtyServer {
    if (!PtyServer.instance) {
      PtyServer.instance = new PtyServer();
    }
    return PtyServer.instance;
  }

  createSession(sessionId: string): PtySession {
    // Check if session already exists
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    // Determine shell and args based on platform
    const shell = process.platform === "win32"
      ? "powershell.exe"
      : process.env.SHELL || "/bin/zsh";
    const args = process.platform === "win32" ? [] : ["-l"];

    console.log(`[PTY] Spawning shell: ${shell} in ${KB_ROOT}`);

    // Spawn PTY process
    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, args, {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: KB_ROOT,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          // Ensure proper color support
          COLORTERM: "truecolor",
        },
      });
    } catch (err) {
      console.error(`[PTY] Failed to spawn shell:`, err);
      throw err;
    }

    const session: PtySession = {
      id: sessionId,
      pty: ptyProcess,
      createdAt: new Date(),
      outputBuffer: [],
      maxBufferSize: 1000, // Keep last 1000 chunks
    };

    // Handle PTY output - buffer and emit
    ptyProcess.onData((data) => {
      // Add to buffer
      session.outputBuffer.push(data);
      if (session.outputBuffer.length > session.maxBufferSize) {
        session.outputBuffer.shift();
      }
      this.emit("data", sessionId, data);
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      this.emit("exit", sessionId, exitCode, signal);
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }

  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.write(data);
      return true;
    }
    return false;
  }

  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
      return true;
    }
    return false;
  }

  killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.kill();
      this.sessions.delete(sessionId);
      return true;
    }
    return false;
  }

  // Start Claude Code in a session
  startClaude(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Send the claude command to the shell
      session.pty.write("claude\r");
      return true;
    }
    return false;
  }

  getAllSessions(): Array<{ id: string; createdAt: Date }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
    }));
  }

  // Get buffered output for reconnection
  getBufferedOutput(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      return session.outputBuffer.join("");
    }
    return null;
  }

  // Check if session exists
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  // Kill all sessions (for cleanup on server shutdown)
  killAllSessions(): void {
    console.log(`[PTY] Killing ${this.sessions.size} sessions...`);
    for (const [id, session] of this.sessions) {
      try {
        session.pty.kill();
        console.log(`[PTY] Killed session: ${id}`);
      } catch (err) {
        console.error(`[PTY] Failed to kill session ${id}:`, err);
      }
    }
    this.sessions.clear();
  }
}

export const ptyServer = PtyServer.getInstance();

// Cleanup on process exit
const cleanup = () => {
  console.log("\n[PTY] Server shutting down, cleaning up...");
  ptyServer.killAllSessions();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", () => {
  ptyServer.killAllSessions();
});

export type { PtySession };
