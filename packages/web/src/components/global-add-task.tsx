"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { CreateTaskDialog } from "./create-task-dialog";

export function GlobalAddTask() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // CMD/CTRL + I to open create task dialog
    if ((e.metaKey || e.ctrlKey) && e.key === "i") {
      // Don't trigger if user is typing in a real input/textarea
      // (but allow from terminal's hidden textarea)
      const target = e.target as HTMLElement;
      const isTerminal = target.closest(".xterm") !== null;
      if (
        !isTerminal &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      // Prevent default behavior
      e.preventDefault();
      e.stopPropagation();
      setDialogOpen(true);
    }
  }, []);

  useEffect(() => {
    // Use capture phase to intercept before browser handles it
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  return (
    <>
      {/* Floating button - positioned above QuickNotes */}
      <button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-20 right-4 z-50 p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-colors group"
        title="New Task (⌘I)"
      >
        <Plus className="h-5 w-5" />
        <span className="absolute right-full mr-2 px-2 py-1 text-xs bg-zinc-800 text-zinc-200 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          New Task
        </span>
      </button>

      {/* Dialog - controlled mode */}
      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTaskCreated={() => setDialogOpen(false)}
      />
    </>
  );
}
