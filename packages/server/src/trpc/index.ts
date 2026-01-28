/**
 * tRPC Server Setup
 *
 * Root router and context for the Knowledge Work API.
 * This provides end-to-end type safety between the task-service and clients.
 */

// Re-export tRPC utilities from trpc.ts (separate file to avoid circular deps)
export { router, publicProcedure, middleware, createContext, type TRPCContext } from './trpc.js';

// Import routers
import { router } from './trpc.js';
import { filesRouter } from './routers/files.js';
import { calendarRouter } from './routers/calendar.js';
import { gmailRouter } from './routers/gmail.js';
import { itemsRouter } from './routers/items.js';
import { notificationsRouter } from './routers/notifications.js';
import { organizationsRouter } from './routers/organizations.js';
import { peopleRouter } from './routers/people.js';
import { projectsRouter } from './routers/projects.js';
import { queryRouter } from './routers/query.js';
import { routinesRouter } from './routers/routines.js';
import { syncRouter } from './routers/sync.js';
import { tagsRouter } from './routers/tags.js';
import { timecardRouter } from './routers/timecard.js';
import { focusRouter } from './routers/focus.js';

// =============================================================================
// ROOT ROUTER
// =============================================================================

export const appRouter = router({
  calendar: calendarRouter,
  files: filesRouter,
  gmail: gmailRouter,
  items: itemsRouter,
  notifications: notificationsRouter,
  organizations: organizationsRouter,
  people: peopleRouter,
  projects: projectsRouter,
  query: queryRouter,
  routines: routinesRouter,
  sync: syncRouter,
  tags: tagsRouter,
  timecard: timecardRouter,
  focus: focusRouter,
});

export type AppRouter = typeof appRouter;

// =============================================================================
// CALLER (for testing and server-side usage)
// =============================================================================

import type { TRPCContext } from './trpc.js';

/**
 * Create a tRPC caller for direct server-side calls.
 * Useful for testing and internal API calls.
 */
export const createCaller = appRouter.createCaller;
