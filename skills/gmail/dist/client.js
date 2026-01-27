/**
 * tRPC Client for Gmail CLI
 *
 * Creates a standalone tRPC client for Gmail operations.
 */
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://localhost:3004';
// Create the tRPC client
export const trpc = createTRPCClient({
    links: [
        httpBatchLink({
            url: `${TASK_SERVICE_URL}/api/trpc`,
            transformer: superjson,
        }),
    ],
});
