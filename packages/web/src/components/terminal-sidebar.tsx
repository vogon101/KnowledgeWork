"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import dynamic from "next/dynamic";
import { X, Terminal as TerminalIcon, Play, Trash2 } from "lucide-react";

// Context for controlling terminal from anywhere
interface TerminalContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  focus: () => void;
  width: number;
  sendPrompt: (prompt: string, context?: { type: string; title?: string }) => void;
}

const TerminalContext = createContext<TerminalContextType | null>(null);

// Shared state for pending prompts
let pendingPromptData: { prompt: string; context?: { type: string; title?: string } } | null = null;
let promptListeners: ((data: typeof pendingPromptData) => void)[] = [];

export function setPendingPrompt(prompt: string, context?: { type: string; title?: string }) {
  pendingPromptData = { prompt, context };
  promptListeners.forEach(fn => fn(pendingPromptData));
}

export function usePendingPrompt() {
  const [data, setData] = useState(pendingPromptData);

  useEffect(() => {
    const handler = (newData: typeof pendingPromptData) => setData(newData);
    promptListeners.push(handler);
    return () => {
      promptListeners = promptListeners.filter(fn => fn !== handler);
    };
  }, []);

  const clear = useCallback(() => {
    pendingPromptData = null;
    setData(null);
  }, []);

  return { data, clear };
}

// Global ref to focus the terminal
let focusTerminalFn: (() => void) | null = null;

export function registerTerminalFocus(fn: () => void) {
  focusTerminalFn = fn;
}

export function useTerminal() {
  const ctx = useContext(TerminalContext);
  if (!ctx) {
    // Return a no-op version for components outside provider (e.g., during SSR)
    return {
      isOpen: false,
      toggle: () => {},
      open: () => {},
      close: () => {},
      focus: () => {},
      width: 0,
      sendPrompt: () => {},
    };
  }
  return ctx;
}

// Dynamic import to avoid SSR issues with xterm
const Terminal = dynamic(
  () => import("@/components/terminal").then((mod) => mod.Terminal),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-zinc-900">
        <div className="text-zinc-500 text-[13px]">Loading terminal...</div>
      </div>
    ),
  }
);

const PERSISTENT_SESSION_ID = "main";

interface TerminalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  pendingPrompt?: { prompt: string; context?: { type: string; title?: string } } | null;
  onPromptConsumed?: () => void;
}

const MIN_WIDTH = 400;
const MAX_WIDTH_PERCENT = 0.7; // 70% of screen max
const DEFAULT_WIDTH_PERCENT = 0.4; // 40% of screen (2/5)

export function TerminalSidebar({ isOpen, onClose, width, onWidthChange, pendingPrompt, onPromptConsumed }: TerminalSidebarProps) {
  // Use a stable key that doesn't change on re-renders
  const [mountKey] = useState(() => Date.now());
  const [autoStart, setAutoStart] = useState(false);
  const [forceNew, setForceNew] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [forceRemount, setForceRemount] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<string | undefined>(undefined);

  // When pendingPrompt changes, trigger auto-start with the prompt
  useEffect(() => {
    if (pendingPrompt) {
      setCurrentPrompt(pendingPrompt.prompt);
      setAutoStart(true);
      setForceRemount((n) => n + 1);
    }
  }, [pendingPrompt]);

  const handleNewSession = useCallback(() => {
    setForceNew(true);
    setForceRemount((n) => n + 1);
  }, []);

  const handleStartClaude = useCallback(() => {
    setAutoStart(true);
    setForceRemount((n) => n + 1);
  }, []);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * MAX_WIDTH_PERCENT;
      onWidthChange(Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, onWidthChange]);

  // Update width on window resize
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = window.innerWidth * MAX_WIDTH_PERCENT;
      if (width > maxWidth) {
        onWidthChange(maxWidth);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [width, onWidthChange]);

  if (!isOpen) return null;

  return (
    <div
      className="h-screen bg-zinc-950 border-l border-zinc-800 flex flex-col flex-shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/30 transition-colors z-10 -ml-1"
        onMouseDown={() => setIsResizing(true)}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-zinc-400" />
          <span className="text-[13px] font-medium text-zinc-300">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleStartClaude}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Start Claude"
          >
            <Play className="h-3 w-3" />
          </button>
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="New Session"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Close (⌘\)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Prompt indicator */}
      {pendingPrompt && (
        <div className="px-3 py-2 bg-purple-900/20 border-b border-purple-500/30">
          <div className="flex items-center gap-2 text-[11px] text-purple-300">
            <span className="flex-1 truncate">
              Sending: <span className="text-purple-200">{pendingPrompt.context?.title || pendingPrompt.prompt.slice(0, 50)}</span>
            </span>
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        <Terminal
          key={`${mountKey}-${forceRemount}`}
          sessionId={PERSISTENT_SESSION_ID}
          autoStartClaude={autoStart}
          forceNewSession={forceNew}
          initialPrompt={currentPrompt}
          onSessionCreated={() => {
            setAutoStart(false);
            setForceNew(false);
            setCurrentPrompt(undefined);
            onPromptConsumed?.();
          }}
        />
      </div>
    </div>
  );
}

const STORAGE_KEY = "terminal-sidebar-open";
const WIDTH_STORAGE_KEY = "terminal-sidebar-width";
const DEFAULT_WIDTH = 600;

// Provider component to manage terminal state globally
export function TerminalProvider({ children }: { children: React.ReactNode }) {
  // Start with defaults to avoid hydration mismatch
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [hydrated, setHydrated] = useState(false);
  const [promptToSend, setPromptToSend] = useState<{ prompt: string; context?: { type: string; title?: string } } | null>(null);

  // Load from localStorage after hydration
  useEffect(() => {
    const storedOpen = localStorage.getItem(STORAGE_KEY);
    const storedWidth = localStorage.getItem(WIDTH_STORAGE_KEY);

    if (storedOpen !== null) {
      setIsOpen(storedOpen === "true");
    }
    if (storedWidth) {
      setWidth(parseInt(storedWidth, 10));
    } else {
      setWidth(window.innerWidth * DEFAULT_WIDTH_PERCENT);
    }
    setHydrated(true);
  }, []);

  // Persist open state
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    }
  }, [isOpen, hydrated]);

  // Persist width
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(WIDTH_STORAGE_KEY, String(Math.round(width)));
    }
  }, [width, hydrated]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const focus = useCallback(() => {
    if (focusTerminalFn) {
      focusTerminalFn();
    }
  }, []);

  const sendPrompt = useCallback((prompt: string, context?: { type: string; title?: string }) => {
    // Open the terminal if it's closed
    setIsOpen(true);
    // Set the prompt to send
    setPromptToSend({ prompt, context });
    // Focus the terminal after a brief delay
    setTimeout(() => {
      if (focusTerminalFn) {
        focusTerminalFn();
      }
    }, 100);
  }, []);

  const clearPrompt = useCallback(() => {
    setPromptToSend(null);
  }, []);

  // Keyboard shortcut: ⌘\ to toggle terminal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <TerminalContext.Provider value={{ isOpen, toggle, open, close, focus, width, sendPrompt }}>
      <div className="flex h-screen overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          {children}
        </div>
        <TerminalSidebar
          isOpen={isOpen}
          onClose={close}
          width={width}
          onWidthChange={setWidth}
          pendingPrompt={promptToSend}
          onPromptConsumed={clearPrompt}
        />
      </div>
    </TerminalContext.Provider>
  );
}
