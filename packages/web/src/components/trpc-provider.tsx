"use client";

/**
 * tRPC Provider
 *
 * Wraps the app with tRPC and React Query providers.
 * Includes real-time sync via socket.io for push updates.
 */

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, getTRPCClient } from "@/lib/trpc";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

// Component to initialize real-time sync (must be inside QueryClientProvider)
function RealtimeSync() {
  useRealtimeSync();
  return null;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 5 * 1000,
            // Retry failed requests up to 3 times
            retry: 3,
            // Refetch when window regains focus (get fresh data when returning)
            refetchOnWindowFocus: true,
            // IMPORTANT: Stop polling when window is in background (battery saver)
            refetchIntervalInBackground: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() => getTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RealtimeSync />
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
