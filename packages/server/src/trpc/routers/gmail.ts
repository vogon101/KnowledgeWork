/**
 * Gmail Router (tRPC)
 *
 * Type-safe API for Gmail operations.
 * Requires Gmail OAuth setup via: npx tsx src/scripts/gmail-auth.ts
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import {
  EmailQuerySchema,
  EmailSearchSchema,
  ContactSearchSchema,
  type EmailSummary,
  type EmailDetail,
  type EmailThread,
  type GmailLabel,
  type EmailAddress,
  type EmailAttachment,
  type Contact,
} from '@kw/api-types';
import {
  getGmailClient,
  getPeopleClient,
  isGmailConfigured,
  hasCredentials,
  hasTokens,
  getAuthenticatedEmail,
} from '../../services/gmail-client.js';
import type { gmail_v1 } from 'googleapis';

// =============================================================================
// HELPERS: Parse Gmail API responses
// =============================================================================

/**
 * Parse email address from Gmail header value.
 * Handles formats like: "Name <email@example.com>" or just "email@example.com"
 */
function parseEmailAddress(value: string | null | undefined): EmailAddress | null {
  if (!value) return null;

  // Pattern 1: "Quoted Name" <email> or Name <email>
  // The [^"<>]* ensures name doesn't consume angle brackets
  const match = value.match(/^(?:"([^"]+)"|([^<>]+))?\s*<([^<>]+@[^<>]+)>$/);
  if (match) {
    const name = (match[1] || match[2])?.trim() || null;
    return {
      name,
      email: match[3].trim(),
    };
  }

  // Pattern 2: Plain email address (no angle brackets)
  const plainMatch = value.match(/^([^\s@]+@[^\s@]+)$/);
  if (plainMatch) {
    return { name: null, email: plainMatch[1].trim() };
  }

  // Fallback: treat whole string as email
  return { name: null, email: value.trim() };
}

/**
 * Parse multiple email addresses from header (comma-separated).
 */
function parseEmailAddresses(value: string | null | undefined): EmailAddress[] {
  if (!value) return [];

  // Split on commas but not within quotes
  const parts = value.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  return parts.map(parseEmailAddress).filter((a): a is EmailAddress => a !== null);
}

/**
 * Get header value from Gmail message.
 */
function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | null {
  const header = headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || null;
}

/**
 * Decode base64url content from Gmail API.
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Extract body content from message payload.
 */
function extractBody(
  payload: gmail_v1.Schema$MessagePart | undefined,
  mimeType: 'text/plain' | 'text/html'
): string | null {
  if (!payload) return null;

  // Direct body
  if (payload.mimeType === mimeType && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Check parts recursively
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === mimeType && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      // Nested multipart
      if (part.parts) {
        const nested = extractBody(part, mimeType);
        if (nested) return nested;
      }
    }
  }

  return null;
}

/**
 * Extract attachments from message payload.
 */
function extractAttachments(payload: gmail_v1.Schema$MessagePart | undefined): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];

  function processpart(part: gmail_v1.Schema$MessagePart) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
      });
    }
    if (part.parts) {
      part.parts.forEach(processpart);
    }
  }

  if (payload) {
    processpart(payload);
  }

  return attachments;
}

/**
 * Format Gmail message to EmailSummary.
 */
function formatMessageSummary(message: gmail_v1.Schema$Message): EmailSummary {
  const headers = message.payload?.headers;
  const labelIds = message.labelIds || [];

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    subject: getHeader(headers, 'Subject'),
    from: parseEmailAddress(getHeader(headers, 'From')),
    to: parseEmailAddresses(getHeader(headers, 'To')),
    date: getHeader(headers, 'Date') || new Date().toISOString(),
    snippet: message.snippet || null,
    isUnread: labelIds.includes('UNREAD'),
    labelIds,
    hasAttachments: extractAttachments(message.payload).length > 0,
  };
}

/**
 * Format Gmail message to EmailDetail.
 */
function formatMessageDetail(message: gmail_v1.Schema$Message): EmailDetail {
  const headers = message.payload?.headers;
  const labelIds = message.labelIds || [];
  const attachments = extractAttachments(message.payload);

  // Build headers object
  const headersMap: Record<string, string> = {};
  if (headers) {
    for (const h of headers) {
      if (h.name && h.value) {
        headersMap[h.name] = h.value;
      }
    }
  }

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    subject: getHeader(headers, 'Subject'),
    from: parseEmailAddress(getHeader(headers, 'From')),
    to: parseEmailAddresses(getHeader(headers, 'To')),
    cc: parseEmailAddresses(getHeader(headers, 'Cc')),
    bcc: parseEmailAddresses(getHeader(headers, 'Bcc')),
    replyTo: parseEmailAddress(getHeader(headers, 'Reply-To')),
    date: getHeader(headers, 'Date') || new Date().toISOString(),
    snippet: message.snippet || null,
    isUnread: labelIds.includes('UNREAD'),
    labelIds,
    hasAttachments: attachments.length > 0,
    bodyText: extractBody(message.payload, 'text/plain'),
    bodyHtml: extractBody(message.payload, 'text/html'),
    attachments,
    headers: headersMap,
  };
}

/**
 * Format Gmail label.
 */
function formatLabel(label: gmail_v1.Schema$Label): GmailLabel {
  return {
    id: label.id || '',
    name: label.name || '',
    type: label.type === 'system' ? 'system' : 'user',
    messagesTotal: label.messagesTotal || undefined,
    messagesUnread: label.messagesUnread || undefined,
    threadsTotal: label.threadsTotal || undefined,
    threadsUnread: label.threadsUnread || undefined,
  };
}

// =============================================================================
// ROUTER
// =============================================================================

export const gmailRouter = router({
  /**
   * Check Gmail configuration and authentication status.
   */
  status: publicProcedure.query(async () => {
    const configured = isGmailConfigured();
    const hasCredentialsFile = hasCredentials();
    const hasTokensFile = hasTokens();

    if (!configured) {
      return {
        configured: false,
        authenticated: false,
        email: null,
        error: !hasCredentialsFile
          ? 'Gmail credentials not found. Run: npx tsx src/scripts/gmail-auth.ts'
          : 'Gmail not authenticated. Run: npx tsx src/scripts/gmail-auth.ts',
      };
    }

    const email = await getAuthenticatedEmail();
    return {
      configured: true,
      authenticated: !!email,
      email,
      error: email ? null : 'Failed to verify Gmail authentication',
    };
  }),

  /**
   * List emails with optional filters.
   */
  list: publicProcedure
    .input(EmailQuerySchema)
    .query(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      const { query, labelIds, maxResults, pageToken, includeSpamTrash } = input;

      // Build query string
      let q = query || '';
      if (labelIds && labelIds.length > 0) {
        const labelQuery = labelIds.map(id => `label:${id}`).join(' ');
        q = q ? `${q} ${labelQuery}` : labelQuery;
      }

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: q || undefined,
        maxResults,
        pageToken: pageToken || undefined,
        includeSpamTrash,
      });

      // Fetch full message details for each ID
      const messages = response.data.messages || [];
      const emails: EmailSummary[] = [];

      for (const msg of messages) {
        if (!msg.id) continue;

        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        emails.push(formatMessageSummary(full.data));
      }

      return {
        emails,
        nextPageToken: response.data.nextPageToken || null,
        resultSizeEstimate: response.data.resultSizeEstimate,
      };
    }),

  /**
   * Search emails using Gmail query syntax.
   */
  search: publicProcedure
    .input(EmailSearchSchema)
    .query(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      const { query, maxResults, pageToken } = input;

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        pageToken: pageToken || undefined,
      });

      // Fetch full message details for each ID
      const messages = response.data.messages || [];
      const emails: EmailSummary[] = [];

      for (const msg of messages) {
        if (!msg.id) continue;

        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        emails.push(formatMessageSummary(full.data));
      }

      return {
        emails,
        nextPageToken: response.data.nextPageToken || null,
        resultSizeEstimate: response.data.resultSizeEstimate,
      };
    }),

  /**
   * Get a single email by ID with full content.
   */
  get: publicProcedure
    .input(z.object({
      id: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      try {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: input.id,
          format: 'full',
        });

        return formatMessageDetail(response.data);
      } catch (err) {
        if ((err as { code?: number }).code === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Email ${input.id} not found`,
          });
        }
        throw err;
      }
    }),

  /**
   * Get all messages in a thread.
   */
  getThread: publicProcedure
    .input(z.object({
      id: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      try {
        const response = await gmail.users.threads.get({
          userId: 'me',
          id: input.id,
          format: 'full',
        });

        const thread = response.data;
        const messages = (thread.messages || []).map(formatMessageDetail);

        return {
          id: thread.id || '',
          messages,
          snippet: thread.snippet || null,
          historyId: thread.historyId || undefined,
        } as EmailThread;
      } catch (err) {
        if ((err as { code?: number }).code === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Thread ${input.id} not found`,
          });
        }
        throw err;
      }
    }),

  /**
   * List available labels.
   */
  labels: publicProcedure.query(async () => {
    const gmail = await getGmailClient();
    if (!gmail) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
      });
    }

    const response = await gmail.users.labels.list({
      userId: 'me',
    });

    const labels = (response.data.labels || []).map(formatLabel);

    // Sort: system labels first, then user labels alphabetically
    labels.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'system' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return { labels };
  }),

  /**
   * Mark an email as read.
   */
  markAsRead: publicProcedure
    .input(z.object({
      id: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      try {
        await gmail.users.messages.modify({
          userId: 'me',
          id: input.id,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });

        return { id: input.id, markedAsRead: true };
      } catch (err) {
        if ((err as { code?: number }).code === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Email ${input.id} not found`,
          });
        }
        throw err;
      }
    }),

  /**
   * Mark an email as unread.
   */
  markAsUnread: publicProcedure
    .input(z.object({
      id: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      try {
        await gmail.users.messages.modify({
          userId: 'me',
          id: input.id,
          requestBody: {
            addLabelIds: ['UNREAD'],
          },
        });

        return { id: input.id, markedAsUnread: true };
      } catch (err) {
        if ((err as { code?: number }).code === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Email ${input.id} not found`,
          });
        }
        throw err;
      }
    }),

  /**
   * Archive an email (remove from INBOX).
   */
  archive: publicProcedure
    .input(z.object({
      id: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      try {
        await gmail.users.messages.modify({
          userId: 'me',
          id: input.id,
          requestBody: {
            removeLabelIds: ['INBOX'],
          },
        });

        return { id: input.id, archived: true };
      } catch (err) {
        if ((err as { code?: number }).code === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Email ${input.id} not found`,
          });
        }
        throw err;
      }
    }),

  /**
   * Move an email to trash.
   */
  trash: publicProcedure
    .input(z.object({
      id: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      try {
        await gmail.users.messages.trash({
          userId: 'me',
          id: input.id,
        });

        return { id: input.id, trashed: true };
      } catch (err) {
        if ((err as { code?: number }).code === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Email ${input.id} not found`,
          });
        }
        throw err;
      }
    }),

  /**
   * Untrash an email.
   */
  untrash: publicProcedure
    .input(z.object({
      id: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const gmail = await getGmailClient();
      if (!gmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not configured. Run: npx tsx src/scripts/gmail-auth.ts',
        });
      }

      try {
        await gmail.users.messages.untrash({
          userId: 'me',
          id: input.id,
        });

        return { id: input.id, untrashed: true };
      } catch (err) {
        if ((err as { code?: number }).code === 404) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Email ${input.id} not found`,
          });
        }
        throw err;
      }
    }),

  // ===========================================================================
  // CONTACTS (People API)
  // ===========================================================================

  /**
   * Search contacts by name or email.
   * Requires re-authentication with contacts scope.
   */
  contactsSearch: publicProcedure
    .input(ContactSearchSchema)
    .query(async ({ input }) => {
      const people = await getPeopleClient();
      if (!people) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'People API not configured. Re-run gmail-auth.ts to add contacts scope.',
        });
      }

      try {
        const response = await people.people.searchContacts({
          query: input.query,
          pageSize: input.maxResults,
          readMask: 'names,emailAddresses,phoneNumbers,organizations',
        });

        const contacts: Contact[] = (response.data.results || [])
          .map(result => {
            const person = result.person;
            if (!person) return null;

            const names = person.names || [];
            const emails = person.emailAddresses || [];
            const phones = person.phoneNumbers || [];
            const orgs = person.organizations || [];

            const contact: Contact = {
              resourceName: person.resourceName || '',
              name: names[0]?.displayName ?? undefined,
              emails: emails.map(e => e.value || '').filter(Boolean),
              phones: phones.map(p => p.value || '').filter(Boolean),
              organization: orgs[0]?.name ?? undefined,
              jobTitle: orgs[0]?.title ?? undefined,
            };
            return contact;
          })
          .filter((c): c is Contact => c !== null);

        return {
          contacts,
          totalPeople: response.data.results?.length || 0,
        };
      } catch (err) {
        // Check for scope error
        const error = err as { code?: number; message?: string };
        if (error.code === 403 || error.message?.includes('scope')) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Contacts scope not authorized. Re-run gmail-auth.ts to add contacts permission.',
          });
        }
        throw err;
      }
    }),

  /**
   * List recent/frequent contacts.
   */
  contactsList: publicProcedure
    .input(z.object({
      maxResults: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input }) => {
      const people = await getPeopleClient();
      if (!people) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'People API not configured. Re-run gmail-auth.ts to add contacts scope.',
        });
      }

      try {
        const response = await people.people.connections.list({
          resourceName: 'people/me',
          pageSize: input.maxResults,
          personFields: 'names,emailAddresses,phoneNumbers,organizations',
          sortOrder: 'LAST_MODIFIED_DESCENDING',
        });

        const contacts: Contact[] = (response.data.connections || []).map(person => {
          const names = person.names || [];
          const emails = person.emailAddresses || [];
          const phones = person.phoneNumbers || [];
          const orgs = person.organizations || [];

          return {
            resourceName: person.resourceName || '',
            name: names[0]?.displayName || null,
            emails: emails.map(e => e.value || '').filter(Boolean),
            phones: phones.map(p => p.value || '').filter(Boolean),
            organization: orgs[0]?.name || null,
            jobTitle: orgs[0]?.title || null,
          };
        });

        return {
          contacts,
          totalPeople: response.data.totalPeople || contacts.length,
        };
      } catch (err) {
        const error = err as { code?: number; message?: string };
        if (error.code === 403 || error.message?.includes('scope')) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Contacts scope not authorized. Re-run gmail-auth.ts to add contacts permission.',
          });
        }
        throw err;
      }
    }),
});

export type GmailRouter = typeof gmailRouter;
