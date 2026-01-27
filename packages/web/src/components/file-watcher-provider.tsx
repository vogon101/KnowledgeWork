"use client";

import { useFileWatcher } from "@/hooks/use-file-watcher";

export function FileWatcherProvider({ children }: { children: React.ReactNode }) {
  useFileWatcher();
  return <>{children}</>;
}
