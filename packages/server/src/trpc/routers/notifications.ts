/**
 * Notifications Router (tRPC)
 *
 * API for sending notifications to connected web clients.
 * Used by AI agents to notify users when content needs review.
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { emit } from '../../events.js';

// =============================================================================
// Input Schemas
// =============================================================================

const AIContentNotificationSchema = z.object({
  /** Type of content created */
  contentType: z.enum(['document', 'workstream', 'project', 'meeting-notes', 'other']),
  /** Title/description of the content */
  title: z.string().min(1),
  /** Path to the file (relative to KB root) */
  filePath: z.string().min(1),
  /** Optional message to display in the toast */
  message: z.string().optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const notificationsRouter = router({
  /**
   * Notify connected clients that AI has created content needing review
   *
   * Use this when:
   * - AI creates a new document, workstream, or project
   * - AI generates meeting notes or summaries
   * - AI creates any content the user should review
   *
   * Do NOT use for:
   * - Routine diary entries
   * - Memory/context updates
   * - Internal system files
   */
  aiContentCreated: publicProcedure
    .input(AIContentNotificationSchema)
    .mutation(({ input }) => {
      const { contentType, title, filePath, message } = input;

      // Emit the notification to all connected clients
      switch (contentType) {
        case 'document':
          emit.ai.documentCreated(title, filePath, message);
          break;
        case 'workstream':
          emit.ai.workstreamCreated(title, filePath, message);
          break;
        case 'project':
          emit.ai.projectCreated(title, filePath, message);
          break;
        case 'meeting-notes':
          emit.ai.meetingNotesCreated(title, filePath, message);
          break;
        default:
          emit.ai.contentCreated(title, filePath, message);
      }

      return {
        success: true,
        notified: true,
        contentType,
        title,
        filePath,
      };
    }),
});

export type NotificationsRouter = typeof notificationsRouter;
