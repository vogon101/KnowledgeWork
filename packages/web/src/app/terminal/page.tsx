"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Play, RotateCcw, Trash2, Sparkles } from "lucide-react";

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

// Use a fixed session ID for persistence
const PERSISTENT_SESSION_ID = "main";

// Wrapper component to handle useSearchParams in Suspense
function TerminalContent() {
  const [mountKey, setMountKey] = useState(Date.now());
  const [autoStart, setAutoStart] = useState(false);
  const [forceNew, setForceNew] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [promptContext, setPromptContext] = useState<{ type: string; title?: string } | null>(null);
  const searchParams = useSearchParams();

  // Check for pending prompt from sessionStorage
  useEffect(() => {
    if (searchParams.get("prompt") === "pending") {
      try {
        const stored = sessionStorage.getItem("pendingPrompt");
        if (stored) {
          const data = JSON.parse(stored);
          // Check if prompt is recent (within 30 seconds)
          if (Date.now() - data.timestamp < 30000) {
            setPendingPrompt(data.prompt);
            setPromptContext(data.context);
            setAutoStart(true); // Auto-start Claude with the prompt
            setMountKey(Date.now());
          }
          // Clear the stored prompt
          sessionStorage.removeItem("pendingPrompt");
        }
      } catch (e) {
        console.error("Error reading pending prompt:", e);
      }
    }
  }, [searchParams]);

  // Remount the terminal component (reconnects to existing session)
  const handleReconnect = useCallback(() => {
    setForceNew(false);
    setMountKey(Date.now());
  }, []);

  // Start a fresh session (kills existing)
  const handleNewSession = useCallback(() => {
    setForceNew(true);
    setMountKey(Date.now());
  }, []);

  const handleStartClaude = useCallback(() => {
    setAutoStart(true);
    setMountKey(Date.now());
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Terminal</h1>
          <p className="text-[12px] text-zinc-500">
            Persistent shell — session survives page navigation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartClaude}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            Start Claude
          </button>
          <button
            onClick={handleReconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reconnect
          </button>
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            New Session
          </button>
        </div>
      </div>

      {/* Prompt indicator */}
      {promptContext && (
        <div className="px-4 py-2 bg-purple-900/20 border-b border-purple-500/30">
          <div className="flex items-center gap-2 text-[12px] text-purple-300">
            <Sparkles className="h-4 w-4" />
            <span>
              Sending prompt with context:{" "}
              <span className="text-purple-200">{promptContext.type}</span>
              {promptContext.title && (
                <span className="text-purple-400"> — {promptContext.title}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        <Terminal
          key={mountKey}
          sessionId={PERSISTENT_SESSION_ID}
          autoStartClaude={autoStart}
          forceNewSession={forceNew}
          initialPrompt={pendingPrompt || undefined}
          onSessionCreated={() => {
            setAutoStart(false);
            setForceNew(false);
            setPendingPrompt(null);
            setPromptContext(null);
          }}
        />
      </div>

      {/* Help footer */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-950/50">
        <p className="text-[11px] text-zinc-500">
          <span className="text-zinc-400">Tip:</span> Press{" "}
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] font-mono">⌘J</kbd>
          {" "}to ask Claude with page context,{" "}
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] font-mono">⌘\</kbd>
          {" "}to toggle terminal. Session persists when you navigate away.
        </p>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function TerminalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Terminal</h1>
              <p className="text-[12px] text-zinc-500">Loading...</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center bg-zinc-900">
            <div className="text-zinc-500 text-[13px]">Loading terminal...</div>
          </div>
        </div>
      }
    >
      <TerminalContent />
    </Suspense>
  );
}
