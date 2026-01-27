"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { useTerminal } from "./terminal-sidebar";
import { buildContextString, getPromptsForContext } from "@/lib/prompts";

export interface PromptContext {
  type: "action" | "meeting" | "project" | "diary" | "general";
  title?: string;
  details?: Record<string, string | undefined>;
  filePath?: string;
}

interface PromptPopoverProps {
  context: PromptContext;
  trigger?: React.ReactNode;
  className?: string;
}

export function PromptPopover({ context, trigger, className = "" }: PromptPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const terminal = useTerminal();

  // Calculate position when opening
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = 280; // Approximate height of popover
      const popoverWidth = 320;

      // Position above the trigger by default
      let top = rect.top - popoverHeight - 8;
      let left = rect.left;

      // If not enough space above, position below
      if (top < 10) {
        top = rect.bottom + 8;
      }

      // Keep within viewport horizontally
      if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }
      if (left < 10) {
        left = 10;
      }

      setPosition({ top, left });
    }
  };

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsSubmitting(true);

    // Build the full prompt with context
    const contextStr = buildContextString(context);
    const fullPrompt = `${prompt}\n\n---\n${contextStr}`;

    // Send to terminal sidebar
    terminal.sendPrompt(fullPrompt, {
      type: context.type,
      title: context.title,
    });

    setIsOpen(false);
    setPrompt("");
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
        title="Ask AI about this"
      >
        {trigger || <Sparkles className="h-3.5 w-3.5" />}
      </button>

      {/* Popover - rendered via portal to escape overflow clipping */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100] w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl"
          style={{ top: position.top, left: position.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-[12px] font-medium text-zinc-300">Ask AI</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Context preview */}
          <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-800/30">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Context</div>
            <div className="text-[11px] text-zinc-400 line-clamp-2">
              {context.type}: {context.title || "Current page"}
            </div>
          </div>

          {/* Input */}
          <div className="p-3">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPromptsForContext(context.type).placeholder}
              className="w-full h-20 px-3 py-2 text-[13px] bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-zinc-600">⌘+Enter to send</span>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-md transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Quick action buttons for common prompts
interface QuickPromptButtonProps {
  context: PromptContext;
  prompt: string;
  label: string;
  icon?: React.ReactNode;
}

export function QuickPromptButton({ context, prompt, label, icon }: QuickPromptButtonProps) {
  const terminal = useTerminal();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);

    const contextStr = buildContextString(context);
    const fullPrompt = `${prompt}\n\n---\n${contextStr}`;

    // Send to terminal sidebar
    terminal.sendPrompt(fullPrompt, {
      type: context.type,
      title: context.title,
    });

    setIsLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center gap-1.5 px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
    >
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}
