/**
 * Real-time sync hook
 *
 * Connects to the task service socket.io server and invalidates
 * React Query cache when data changes.
 */

"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";

// Event types matching server
type EntityType =
  | "items"
  | "people"
  | "projects"
  | "organizations"
  | "checkins"
  | "routines"
  | "meetings";

interface DataChangeEvent {
  entity: EntityType;
  mutation: "create" | "update" | "delete";
  id?: number;
  ids?: number[];
}

// Map entity types to tRPC router paths that should be invalidated
// tRPC query keys are structured as [["trpc"], procedure.path, ...]
const routerPathsMap: Record<EntityType, string[]> = {
  items: ["items", "query"],
  checkins: ["items", "query"],
  people: ["people"],
  projects: ["projects"],
  organizations: ["organizations"],
  routines: ["routines"],
  meetings: ["meetings"],
};

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get task service URL from env
    const taskServiceUrl =
      process.env.NEXT_PUBLIC_TASK_SERVICE_URL || "http://localhost:3004";

    // Connect to socket.io server
    const socket = io(taskServiceUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[realtime] Connected to task service");
    });

    socket.on("disconnect", () => {
      console.log("[realtime] Disconnected from task service");
    });

    socket.on("data:changed", (event: DataChangeEvent) => {
      // Get router paths to invalidate for this entity
      const routerPaths = routerPathsMap[event.entity] || [];

      // Invalidate queries using a predicate that matches tRPC's key structure
      // tRPC keys can be: [["router", "procedure"], { input }] or similar
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key) || key.length === 0) return false;

          // tRPC key structure: first element is the path array or path string
          const firstElement = key[0];

          // Handle array path like [["items", "list"], {...}]
          if (Array.isArray(firstElement)) {
            const routerName = firstElement[0];
            if (typeof routerName === "string") {
              return routerPaths.includes(routerName);
            }
          }

          // Handle string path like ["items.list", {...}]
          if (typeof firstElement === "string") {
            return routerPaths.some(
              (router) =>
                firstElement === router ||
                firstElement.startsWith(`${router}.`)
            );
          }

          return false;
        },
      });
    });

    socket.on("connect_error", (error) => {
      console.warn("[realtime] Connection error:", error.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return socketRef.current;
}
