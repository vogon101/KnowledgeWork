import { Server } from "socket.io";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { ptyServer } from "../lib/pty-server";

const PORT = parseInt(process.env.TERMINAL_PORT || "3002", 10);

// HTTP request handler for REST endpoints
const handleHttpRequest = (req: IncomingMessage, res: ServerResponse) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // GET /sessions - List all PTY sessions
  if (req.method === "GET" && url.pathname === "/sessions") {
    const sessions = ptyServer.getAllSessions();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ sessions }));
    return;
  }

  // DELETE /sessions/:id - Kill a specific session
  if (req.method === "DELETE" && url.pathname.startsWith("/sessions/")) {
    const sessionId = url.pathname.slice("/sessions/".length);
    const success = ptyServer.killSession(sessionId);
    res.writeHead(success ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success, sessionId }));
    return;
  }

  // DELETE /sessions - Kill all sessions
  if (req.method === "DELETE" && url.pathname === "/sessions") {
    ptyServer.killAllSessions();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, message: "All sessions killed" }));
    return;
  }

  // GET /health - Health check
  if (req.method === "GET" && url.pathname === "/health") {
    const sessions = ptyServer.getAllSessions();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      service: "terminal-server",
      sessions: sessions.length,
    }));
    return;
  }

  // Let socket.io handle other requests
};

const httpServer = createServer(handleHttpRequest);

// Allow connections from any localhost port
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow any localhost origin
      if (!origin || origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[Terminal] Client connected: ${socket.id}`);

  let currentSessionId: string | null = null;

  // Create or join a terminal session
  // requestBuffer flag indicates client wants buffered history (first page load vs reconnect)
  socket.on("terminal:create", (sessionId: string, options: { requestBuffer?: boolean } | ((response: unknown) => void), callbackArg?: (response: unknown) => void) => {
    // Handle both old format (sessionId, callback) and new format (sessionId, options, callback)
    const callback = typeof options === "function" ? options : callbackArg!;
    const requestBuffer = typeof options === "object" ? options.requestBuffer ?? false : false;

    try {
      const isExisting = ptyServer.hasSession(sessionId);
      const session = ptyServer.createSession(sessionId);
      currentSessionId = sessionId;

      // Forward PTY output to this client
      const dataHandler = (sId: string, data: string) => {
        if (sId === sessionId) {
          socket.emit("terminal:output", data);
        }
      };

      const exitHandler = (sId: string, exitCode: number, signal: number) => {
        if (sId === sessionId) {
          socket.emit("terminal:exit", { exitCode, signal });
          ptyServer.off("data", dataHandler);
          ptyServer.off("exit", exitHandler);
        }
      };

      ptyServer.on("data", dataHandler);
      ptyServer.on("exit", exitHandler);

      // Cleanup on disconnect - but DON'T kill the session
      socket.on("disconnect", () => {
        ptyServer.off("data", dataHandler);
        ptyServer.off("exit", exitHandler);
        // Session stays alive for reconnection
      });

      // Only send buffered output if explicitly requested (first page load)
      // Don't send on WebSocket reconnects to avoid disrupting vim/etc
      if (isExisting && requestBuffer) {
        const bufferedOutput = ptyServer.getBufferedOutput(sessionId);
        if (bufferedOutput) {
          socket.emit("terminal:output", bufferedOutput);
        }
      }

      callback({ success: true, sessionId, createdAt: session.createdAt, reconnected: isExisting });
    } catch (error) {
      callback({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Handle terminal input
  socket.on("terminal:input", (data: string) => {
    if (currentSessionId) {
      ptyServer.write(currentSessionId, data);
    }
  });

  // Handle terminal resize
  socket.on("terminal:resize", ({ cols, rows }: { cols: number; rows: number }) => {
    if (currentSessionId) {
      ptyServer.resize(currentSessionId, cols, rows);
    }
  });

  // Start Claude Code
  socket.on("terminal:startClaude", (callback) => {
    if (currentSessionId) {
      const success = ptyServer.startClaude(currentSessionId);
      callback({ success });
    } else {
      callback({ success: false, error: "No session" });
    }
  });

  // Kill session
  socket.on("terminal:kill", (callback) => {
    if (currentSessionId) {
      const success = ptyServer.killSession(currentSessionId);
      currentSessionId = null;
      callback({ success });
    } else {
      callback({ success: false, error: "No session" });
    }
  });

  // List all sessions
  socket.on("terminal:listSessions", (callback) => {
    const sessions = ptyServer.getAllSessions();
    callback({ sessions });
  });

  socket.on("disconnect", () => {
    console.log(`[Terminal] Client disconnected: ${socket.id}`);
  });
});

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[Terminal] Port ${PORT} is already in use.`);
    console.error(`[Terminal] Kill the existing process: lsof -i :${PORT} -sTCP:LISTEN`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(PORT, () => {
  console.log(`[Terminal] WebSocket server running on port ${PORT}`);
});

export { io, httpServer };
