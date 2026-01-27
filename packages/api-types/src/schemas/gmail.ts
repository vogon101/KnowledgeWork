import { z } from 'zod';

// =============================================================================
// GMAIL LABEL
// =============================================================================

export const GmailLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['system', 'user']),
  messagesTotal: z.number().optional(),
  messagesUnread: z.number().optional(),
  threadsTotal: z.number().optional(),
  threadsUnread: z.number().optional(),
});
export type GmailLabel = z.infer<typeof GmailLabelSchema>;

// =============================================================================
// EMAIL ADDRESS
// =============================================================================

export const EmailAddressSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string(),
});
export type EmailAddress = z.infer<typeof EmailAddressSchema>;

// =============================================================================
// EMAIL ATTACHMENT
// =============================================================================

export const EmailAttachmentSchema = z.object({
  attachmentId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
});
export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;

// =============================================================================
// EMAIL SUMMARY (list view)
// =============================================================================

export const EmailSummarySchema = z.object({
  id: z.string(),
  threadId: z.string(),
  subject: z.string().nullable().optional(),
  from: EmailAddressSchema.nullable().optional(),
  to: z.array(EmailAddressSchema).default([]),
  date: z.string(), // ISO timestamp
  snippet: z.string().nullable().optional(),
  isUnread: z.boolean().default(false),
  labelIds: z.array(z.string()).default([]),
  hasAttachments: z.boolean().default(false),
});
export type EmailSummary = z.infer<typeof EmailSummarySchema>;

// =============================================================================
// EMAIL DETAIL (full message)
// =============================================================================

export const EmailDetailSchema = EmailSummarySchema.extend({
  cc: z.array(EmailAddressSchema).default([]),
  bcc: z.array(EmailAddressSchema).default([]),
  replyTo: EmailAddressSchema.nullable().optional(),
  bodyText: z.string().nullable().optional(),
  bodyHtml: z.string().nullable().optional(),
  attachments: z.array(EmailAttachmentSchema).default([]),
  headers: z.record(z.string()).optional(),
});
export type EmailDetail = z.infer<typeof EmailDetailSchema>;

// =============================================================================
// EMAIL THREAD
// =============================================================================

export const EmailThreadSchema = z.object({
  id: z.string(),
  messages: z.array(EmailDetailSchema),
  snippet: z.string().nullable().optional(),
  historyId: z.string().optional(),
});
export type EmailThread = z.infer<typeof EmailThreadSchema>;

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const EmailQuerySchema = z.object({
  query: z.string().optional(), // Gmail search query
  labelIds: z.array(z.string()).optional(),
  maxResults: z.number().min(1).max(500).optional().default(20),
  pageToken: z.string().optional(),
  includeSpamTrash: z.boolean().optional().default(false),
});
export type EmailQuery = z.infer<typeof EmailQuerySchema>;

export const EmailSearchSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(1).max(500).optional().default(20),
  pageToken: z.string().optional(),
});
export type EmailSearch = z.infer<typeof EmailSearchSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

export const EmailListResponseSchema = z.object({
  emails: z.array(EmailSummarySchema),
  nextPageToken: z.string().nullable().optional(),
  resultSizeEstimate: z.number().optional(),
});
export type EmailListResponse = z.infer<typeof EmailListResponseSchema>;

export const GmailStatusSchema = z.object({
  configured: z.boolean(),
  authenticated: z.boolean(),
  email: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});
export type GmailStatus = z.infer<typeof GmailStatusSchema>;

// =============================================================================
// CONTACTS (People API)
// =============================================================================

export const ContactSchema = z.object({
  resourceName: z.string(),
  name: z.string().nullable().optional(),
  emails: z.array(z.string()).default([]),
  phones: z.array(z.string()).default([]),
  organization: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ContactSearchSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(1).max(100).optional().default(10),
});
export type ContactSearch = z.infer<typeof ContactSearchSchema>;

export const ContactListResponseSchema = z.object({
  contacts: z.array(ContactSchema),
  totalPeople: z.number().optional(),
});
export type ContactListResponse = z.infer<typeof ContactListResponseSchema>;
