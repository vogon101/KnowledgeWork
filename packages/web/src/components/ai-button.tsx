"use client";

import { Sparkles } from "lucide-react";
import { useAIPrompt } from "./ai-prompt-dialog";
import type { PromptContext } from "./prompt-popover";

interface AIButtonProps {
  context?: PromptContext;
  className?: string;
}

export function AIButton({ context, className }: AIButtonProps) {
  const { openPrompt } = useAIPrompt();

  return (
    <button
      onClick={() => openPrompt(context)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 rounded-md transition-colors ${className || ""}`}
      title="Ask Claude (Cmd+J)"
    >
      <Sparkles className="h-3.5 w-3.5" />
      Ask AI
    </button>
  );
}
