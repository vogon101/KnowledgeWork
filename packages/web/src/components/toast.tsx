"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Check, X, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op version for components outside provider
    return {
      showToast: () => {},
    };
  }
  return context;
}

const TOAST_DURATION = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLeaving) {
      const timer = setTimeout(onRemove, 200);
      return () => clearTimeout(timer);
    }
  }, [isLeaving, onRemove]);

  const icons: Record<ToastType, typeof Check> = {
    success: Check,
    error: AlertCircle,
    info: Info,
  };

  const colors: Record<ToastType, string> = {
    success: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
    error: "bg-red-500/20 border-red-500/50 text-red-300",
    info: "bg-blue-500/20 border-blue-500/50 text-blue-300",
  };

  const iconColors: Record<ToastType, string> = {
    success: "text-emerald-400",
    error: "text-red-400",
    info: "text-blue-400",
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-200 ${
        colors[toast.type]
      } ${isLeaving ? "opacity-0 translate-x-[-20px]" : "opacity-100 translate-x-0"}`}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${iconColors[toast.type]}`} />
      <span className="text-[13px]">{toast.message}</span>
      <button
        onClick={() => setIsLeaving(true)}
        className="p-0.5 rounded hover:bg-white/10 ml-1"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
