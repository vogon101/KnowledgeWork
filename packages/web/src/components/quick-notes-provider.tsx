"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface QuickNotesContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const QuickNotesContext = createContext<QuickNotesContextType | null>(null);

export function useQuickNotes() {
  const ctx = useContext(QuickNotesContext);
  if (!ctx) {
    return {
      isOpen: false,
      toggle: () => {},
      open: () => {},
      close: () => {},
    };
  }
  return ctx;
}

const STORAGE_KEY = "quick-notes-open";

export function QuickNotesProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsOpen(stored === "true");
    }
    setHydrated(true);
  }, []);

  // Persist state
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    }
  }, [isOpen, hydrated]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Keyboard shortcut: ⌘. to toggle (period)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        // Don't override if in an input or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <QuickNotesContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </QuickNotesContext.Provider>
  );
}
