"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface FileChangeEvent {
  type: "connected" | "change" | "add" | "unlink";
  path?: string;
}

export function useFileWatcher() {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Only connect in development
    if (process.env.NODE_ENV !== "development") return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/watch");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: FileChangeEvent = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("[FileWatcher] Connected");
          return;
        }

        console.log(`[FileWatcher] ${data.type}: ${data.path}`);

        // Debounce the refresh to avoid too many reloads
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          router.refresh();
        }, 500);
      } catch (error) {
        console.error("[FileWatcher] Parse error:", error);
      }
    };

    eventSource.onerror = () => {
      console.log("[FileWatcher] Connection lost, reconnecting...");
      eventSource.close();

      // Reconnect after a delay
      setTimeout(connect, 3000);
    };
  }, [router]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
}
