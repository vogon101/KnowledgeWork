"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { registerTerminalFocus } from "./terminal-sidebar";

interface TerminalProps {
  sessionId?: string;
  autoStartClaude?: boolean;
  forceNewSession?: boolean;
  onSessionCreated?: (sessionId: string) => void;
  initialPrompt?: string; // Prompt to send after Claude starts
}

export function Terminal({
  sessionId: providedSessionId,
  autoStartClaude = false,
  forceNewSession = false,
  onSessionCreated,
  initialPrompt,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const [sessionId, setSessionId] = useState<string>(
    providedSessionId || `session-${Date.now()}`
  );

  // Use refs for initial-mount-only values to prevent re-running effect
  const initialAutoStartRef = useRef(autoStartClaude);
  const initialForceNewRef = useRef(forceNewSession);
  const initialPromptRef = useRef(initialPrompt);
  const onSessionCreatedRef = useRef(onSessionCreated);
  const hasInitializedRef = useRef(false);

  // Update callback ref when it changes
  useEffect(() => {
    onSessionCreatedRef.current = onSessionCreated;
  }, [onSessionCreated]);

  const MIN_COLS = 80;

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current && socketRef.current?.connected) {
      fitAddonRef.current.fit();
      let { cols, rows } = xtermRef.current;

      // Enforce minimum columns
      if (cols < MIN_COLS) {
        cols = MIN_COLS;
        xtermRef.current.resize(cols, rows);
      }

      socketRef.current.emit("terminal:resize", { cols, rows });
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Prevent re-initialization on re-renders
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Create terminal instance
    // Use Nerd Font variants for icon support (Powerlevel10k, etc.)
    const xterm = new XTerm({
      cursorBlink: true,
      fontFamily: '"MesloLGS NF", "JetBrainsMono Nerd Font", "FiraCode Nerd Font", "Hack Nerd Font", "JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      theme: {
        background: "#18181b",
        foreground: "#f4f4f5",
        cursor: "#f4f4f5",
        cursorAccent: "#18181b",
        selectionBackground: "#3f3f46",
        black: "#18181b",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#f4f4f5",
        brightBlack: "#52525b",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fde047",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#ffffff",
      },
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // Open terminal
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Connect to WebSocket server
    // Use env var or default to port 3002
    const terminalPort = process.env.NEXT_PUBLIC_TERMINAL_PORT || "3002";
    const terminalUrl = `${window.location.protocol}//${window.location.hostname}:${terminalPort}`;
    const socket = io(terminalUrl, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    // Track if this is the first connection (page load) vs WebSocket reconnect
    let isFirstConnection = true;

    socket.on("connect", () => {
      setConnected(true);

      const createSession = (requestBuffer: boolean) => {
        socket.emit(
          "terminal:create",
          sessionId,
          { requestBuffer },
          (response: { success: boolean; sessionId?: string; error?: string; reconnected?: boolean }) => {
            if (response.success) {
              setSessionId(response.sessionId!);
              setReconnected(response.reconnected || false);
              onSessionCreatedRef.current?.(response.sessionId!);

              // Only show status messages on new sessions
              if (!response.reconnected) {
                xterm.write("\r\n\x1b[32m●\x1b[0m New session started\r\n\r\n");
              }
              // Note: We don't write anything on reconnect to avoid disrupting the terminal

              // Optionally start Claude Code (only on new sessions)
              if (initialAutoStartRef.current && !response.reconnected) {
                setTimeout(() => {
                  socket.emit("terminal:startClaude", () => {
                    // If there's an initial prompt, send it after Claude starts
                    if (initialPromptRef.current) {
                      // Wait for Claude to initialize and show its prompt
                      setTimeout(() => {
                        // Type the prompt character by character for visibility
                        const prompt = initialPromptRef.current;
                        if (prompt) {
                          socket.emit("terminal:input", prompt);
                          // Send enter to submit
                          setTimeout(() => {
                            socket.emit("terminal:input", "\r");
                          }, 100);
                        }
                      }, 3000); // Wait 3s for Claude to start
                    }
                  });
                }, 500);
              } else if (initialPromptRef.current && response.reconnected) {
                // If reconnecting and there's a prompt, send it directly
                setTimeout(() => {
                  const prompt = initialPromptRef.current;
                  if (prompt) {
                    socket.emit("terminal:input", prompt);
                    setTimeout(() => {
                      socket.emit("terminal:input", "\r");
                    }, 100);
                  }
                }, 500);
              }

              // Initial resize
              setTimeout(() => handleResize(), 100);
            } else {
              xterm.write(`\r\n\x1b[31mError: ${response.error}\x1b[0m\r\n`);
            }
          }
        );
      };

      // If forcing new session, kill existing first
      if (initialForceNewRef.current) {
        socket.emit("terminal:kill", () => {
          createSession(false); // New session, no buffer needed
        });
      } else {
        // Request buffer only on first page load, not WebSocket reconnects
        createSession(isFirstConnection);
      }

      isFirstConnection = false;
    });

    socket.on("disconnect", () => {
      setConnected(false);
      xterm.write("\r\n\x1b[31m●\x1b[0m Disconnected from terminal server\r\n");
    });

    // Handle terminal output
    socket.on("terminal:output", (data: string) => {
      xterm.write(data);
    });

    // Handle terminal exit
    socket.on("terminal:exit", ({ exitCode }: { exitCode: number }) => {
      xterm.write(`\r\n\x1b[33m● Process exited with code ${exitCode}\x1b[0m\r\n`);
    });

    // Handle shift+enter to send newline without submit
    // Claude Code uses shift+enter for multi-line input
    xterm.attachCustomKeyEventHandler((event) => {
      if (event.type === "keydown" && event.key === "Enter" && event.shiftKey) {
        // Send soft newline (just \n, not \r which would submit)
        socket.emit("terminal:input", "\n");
        return false; // Prevent default handling
      }
      return true; // Allow default handling for other keys
    });

    // Forward input to server
    xterm.onData((data) => {
      socket.emit("terminal:input", data);
    });

    // Handle resize - use ResizeObserver to detect container size changes
    // This catches both window resize AND sidebar width changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    // Also listen to window resize as a fallback
    window.addEventListener("resize", handleResize);

    // Register focus function
    registerTerminalFocus(() => {
      xterm.focus();
    });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      socket.disconnect();
      xterm.dispose();
      registerTerminalFocus(() => {}); // Cleanup
      hasInitializedRef.current = false; // Allow re-init on actual remount
    };
  }, [sessionId, handleResize]); // Only re-run on sessionId change (controlled by key)

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
          />
          <span className="text-[11px] text-zinc-400">
            {connected ? (reconnected ? "Reconnected" : "Connected") : "Disconnected"}
          </span>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">
          {sessionId === "main" ? "persistent" : sessionId}
        </span>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="flex-1 bg-zinc-900 p-2"
        style={{ minHeight: "400px" }}
      />
    </div>
  );
}
