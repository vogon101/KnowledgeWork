/**
 * tRPC Client for CLI
 *
 * Creates a standalone tRPC client for command-line use.
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

// Import the AppRouter type from server package build output
// Note: lib/server is a symlink created by `pnpm setup:content` pointing to packages/server/dist
import type { AppRouter } from '../lib/server/trpc/index.js';

const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://localhost:3004';

// Create the tRPC client
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${TASK_SERVICE_URL}/api/trpc`,
      transformer: superjson,
    }),
  ],
});

// Re-export types for convenience
export type { AppRouter };
export { formatTaskId, parseTaskId } from '@kw/api-types';
