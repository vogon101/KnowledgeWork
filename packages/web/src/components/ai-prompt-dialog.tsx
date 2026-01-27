"use client";

import { useState, useRef, useEffect, createContext, useContext, useCallback } from "react";
import { Sparkles, X, Send, Loader2, Command } from "lucide-react";
import { usePathname } from "next/navigation";
import { PromptContext } from "./prompt-popover";
import { useTerminal } from "./terminal-sidebar";
import { getPromptsForContext, buildContextString } from "@/lib/prompts";

interface AIPromptContextType {
  openPrompt: (context?: PromptContext) => void;
  closePrompt: () => void;
  setPageContext: (context: PromptContext) => void;
}

const AIPromptContext = createContext<AIPromptContextType | null>(null);

export function useAIPrompt() {
  const context = useContext(AIPromptContext);
  if (!context) {
    throw new Error("useAIPrompt must be used within AIPromptProvider");
  }
  return context;
}

function getContextFromPathname(pathname: string): PromptContext {
  // Parse pathname to determine context
  if (pathname.startsWith("/meetings/")) {
    const parts = pathname.split("/");
    return {
      type: "meeting",
      title: parts[parts.length - 1]?.replace(/-/g, " "),
      filePath: pathname,
    };
  }
  if (pathname.startsWith("/projects/")) {
    const parts = pathname.split("/");
    return {
      type: "project",
      title: parts.slice(2).join("/"),
      filePath: pathname,
    };
  }
  if (pathname.startsWith("/diary/")) {
    return {
      type: "diary",
      title: "Diary entry",
      filePath: pathname,
    };
  }
  return {
    type: "general",
    title: "Knowledge Work",
  };
}

interface AIPromptProviderProps {
  children: React.ReactNode;
}

export function AIPromptProvider({ children }: AIPromptProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemContext, setItemContext] = useState<PromptContext | null>(null);
  const [pageContext, setPageContext] = useState<PromptContext>({ type: "general" });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const terminal = useTerminal();

  // Update page context when pathname changes
  useEffect(() => {
    setPageContext(getContextFromPathname(pathname));
  }, [pathname]);

  const openPrompt = useCallback((context?: PromptContext) => {
    setItemContext(context || null);
    setIsOpen(true);
  }, []);

  const closePrompt = useCallback(() => {
    setIsOpen(false);
    setPrompt("");
    setItemContext(null);
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // ⌘J or Ctrl+J to open AI prompt
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        event.preventDefault();
        if (isOpen) {
          closePrompt();
        } else {
          openPrompt();
        }
      }
      // Escape to close
      if (event.key === "Escape" && isOpen) {
        closePrompt();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openPrompt, closePrompt]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const currentContext = itemContext || pageContext;

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsSubmitting(true);

    const contextStr = buildContextString(currentContext);
    const fullPrompt = `${prompt}\n\n---\n${contextStr}`;

    // Send to terminal sidebar
    terminal.sendPrompt(fullPrompt, {
      type: currentContext.type,
      title: currentContext.title,
    });

    closePrompt();
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AIPromptContext.Provider value={{ openPrompt, closePrompt, setPageContext }}>
      {children}

      {/* Modal backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePrompt}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-xl mx-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span className="text-[14px] font-medium text-zinc-200">Ask Claude</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Command className="h-3 w-3" />J to toggle
                </span>
                <button
                  onClick={closePrompt}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Context preview */}
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-800/30">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Context:</span>
                <span className="text-[12px] text-zinc-400">
                  {currentContext.type}
                  {currentContext.title && ` — ${currentContext.title}`}
                </span>
              </div>
            </div>

            {/* Input */}
            <div className="p-4">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getPromptsForContext(currentContext.type).placeholder}
                className="w-full h-28 px-4 py-3 text-[14px] bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              />

              {/* Quick actions - loaded from centralized prompts */}
              <div className="flex flex-wrap gap-2 mt-3">
                {getPromptsForContext(currentContext.type).quickActions.map((action) => (
                  <QuickAction
                    key={action.label}
                    label={action.label}
                    onClick={() => setPrompt(action.prompt)}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] text-zinc-600">
                  <span className="inline-flex items-center gap-1">
                    <Command className="h-3 w-3" />Enter
                  </span>
                  {" "}to send
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send to Claude
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AIPromptContext.Provider>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-full border border-zinc-700 transition-colors"
    >
      {label}
    </button>
  );
}
