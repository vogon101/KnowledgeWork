/**
 * tRPC Client Setup
 *
 * Type-safe client for the task-service API.
 * Provides React Query hooks with full type inference.
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import superjson from 'superjson';

// Import the AppRouter type from server package
// This is the source of truth for all API types
import type { AppRouter } from '@kw/server/src/trpc/index.js';

// Create the tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Task service URL - defaults to localhost:3004
const TASK_SERVICE_URL = process.env.NEXT_PUBLIC_TASK_SERVICE_URL || 'http://localhost:3004';

// Custom logger for better error visibility
const customLogger = loggerLink({
  enabled: () => process.env.NODE_ENV === 'development',
  logger(opts) {
    const { direction, type, path, input } = opts;
    const prefix = direction === 'up' ? ' >> ' : ' << ';
    const label = `${type} #${opts.id}`;

    if (direction === 'down' && opts.result instanceof Error) {
      // Error response - log with full details
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`tRPC Client Error: ${path}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Type:', type);
      if (input !== undefined) {
        console.error('Input:', input);
      }
      console.error('Error:', opts.result);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      // Normal logging
      console.log(prefix, label, path, direction === 'up' ? input : opts.result);
    }
  },
});

// tRPC client configuration
export function getTRPCClient() {
  return trpc.createClient({
    links: [
      // Custom logger for development with enhanced error output
      customLogger,
      // HTTP batch link - batches multiple requests into one
      httpBatchLink({
        url: `${TASK_SERVICE_URL}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
}

// Re-export types from @kw/api-types for convenience
export type {
  ItemWithRelations,
  Item,
  CreateItem,
  UpdateItem,
  Person,
  Project,
  ItemQuery,
} from '@kw/api-types';

export { formatTaskId, parseTaskId } from '@kw/api-types';
