/**
 * useTaskMutations hook
 *
 * Extracts common task mutation logic for reuse across components.
 * Handles status updates, note additions, and provides consistent
 * feedback/error handling patterns.
 */

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "blocked"
  | "cancelled"
  | "deferred";

export interface Feedback {
  type: "success" | "error";
  message: string;
}

export interface UseTaskMutationsOptions {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
}

export interface UseTaskMutationsResult {
  // State
  feedback: Feedback | null;
  isUpdating: boolean;
  isAddingNote: boolean;

  // Actions
  updateStatus: (taskId: number, newStatus: TaskStatus) => void;
  addNote: (taskId: number, note: string) => void;
  rescheduleDueDate: (taskId: number, newDate: string) => void;
  clearFeedback: () => void;
}

/**
 * Hook for managing task mutations with consistent feedback handling.
 *
 * @example
 * ```tsx
 * const { updateStatus, addNote, feedback, isUpdating } = useTaskMutations({
 *   onSuccess: () => router.refresh(),
 * });
 *
 * // Update task status
 * updateStatus(taskId, "complete");
 *
 * // Add a note
 * addNote(taskId, "Started working on this");
 * ```
 */
export function useTaskMutations(
  options: UseTaskMutationsOptions = {}
): UseTaskMutationsResult {
  const { onSuccess, onError } = options;
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Auto-clear feedback after 3 seconds
  const setFeedbackWithAutoClear = useCallback((newFeedback: Feedback) => {
    setFeedback(newFeedback);
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  // Update status mutation
  const updateMutation = trpc.items.update.useMutation({
    onSuccess: (_, variables) => {
      const statusDisplay = String(variables.data.status).replace("_", " ");
      setFeedbackWithAutoClear({
        type: "success",
        message: `Marked as ${statusDisplay}`,
      });
      onSuccess?.();
    },
    onError: (error) => {
      setFeedbackWithAutoClear({
        type: "error",
        message: error.message || "Failed to update",
      });
      onError?.(error);
    },
  });

  // Add note mutation
  const addNoteMutation = trpc.items.addNote.useMutation({
    onSuccess: () => {
      setFeedbackWithAutoClear({
        type: "success",
        message: "Note added",
      });
      onSuccess?.();
    },
    onError: (error) => {
      setFeedbackWithAutoClear({
        type: "error",
        message: error.message || "Failed to add note",
      });
      onError?.(error);
    },
  });

  // Update status action
  const updateStatus = useCallback(
    (taskId: number, newStatus: TaskStatus) => {
      updateMutation.mutate({
        id: taskId,
        data: { status: newStatus },
      });
    },
    [updateMutation]
  );

  // Add note action
  const addNote = useCallback(
    (taskId: number, note: string) => {
      if (!note.trim()) return;
      addNoteMutation.mutate({
        id: taskId,
        note,
        updateType: "note",
      });
    },
    [addNoteMutation]
  );

  // Reschedule due date action
  const rescheduleDueDate = useCallback(
    (taskId: number, newDate: string) => {
      updateMutation.mutate({
        id: taskId,
        data: { dueDate: newDate },
      });
    },
    [updateMutation]
  );

  // Clear feedback manually
  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  return {
    feedback,
    isUpdating: updateMutation.isPending,
    isAddingNote: addNoteMutation.isPending,
    updateStatus,
    addNote,
    rescheduleDueDate,
    clearFeedback,
  };
}

/**
 * Higher-level action handler for common task operations.
 * Maps action strings to status updates.
 *
 * @example
 * ```tsx
 * const { handleTaskAction, ... } = useTaskMutations({ onSuccess });
 *
 * // In action menu
 * <button onClick={() => handleTaskAction(taskId, "complete")}>Complete</button>
 * ```
 */
export function getTaskActionHandler(
  updateStatus: (taskId: number, status: TaskStatus) => void
) {
  return (taskId: number, action: string): boolean => {
    switch (action) {
      case "complete":
        updateStatus(taskId, "complete");
        return true;
      case "start":
        updateStatus(taskId, "in_progress");
        return true;
      case "block":
        updateStatus(taskId, "blocked");
        return true;
      case "defer":
        updateStatus(taskId, "deferred");
        return true;
      case "cancel":
        updateStatus(taskId, "cancelled");
        return true;
      case "reopen":
        updateStatus(taskId, "pending");
        return true;
      default:
        return false;
    }
  };
}
