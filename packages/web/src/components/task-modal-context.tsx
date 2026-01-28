"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { TaskDetailModal } from "./task-detail-popover";

interface TaskModalContextValue {
  openTaskModal: (taskId: number, displayId: string) => void;
  closeTaskModal: () => void;
}

const TaskModalContext = createContext<TaskModalContextValue | null>(null);

export function useTaskModal() {
  const context = useContext(TaskModalContext);
  if (!context) {
    throw new Error("useTaskModal must be used within a TaskModalProvider");
  }
  return context;
}

interface TaskModalProviderProps {
  children: ReactNode;
  onTaskUpdate?: () => void;
}

/**
 * Provider that manages task modal state at a high level.
 * This ensures the modal stays open even if the component that opened it unmounts.
 */
export function TaskModalProvider({ children, onTaskUpdate }: TaskModalProviderProps) {
  const [openModal, setOpenModal] = useState<{ taskId: number; displayId: string } | null>(null);

  const openTaskModal = useCallback((taskId: number, displayId: string) => {
    setOpenModal({ taskId, displayId });
  }, []);

  const closeTaskModal = useCallback(() => {
    setOpenModal(null);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setOpenModal(null);
    }
  }, []);

  return (
    <TaskModalContext.Provider value={{ openTaskModal, closeTaskModal }}>
      {children}
      {openModal && (
        <TaskDetailModal
          taskId={openModal.taskId}
          displayId={openModal.displayId}
          open={true}
          onOpenChange={handleOpenChange}
          onUpdate={onTaskUpdate}
        />
      )}
    </TaskModalContext.Provider>
  );
}
