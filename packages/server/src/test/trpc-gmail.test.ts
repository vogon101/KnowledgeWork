/**
 * Tests for Gmail tRPC router
 *
 * Tests the Gmail and Contacts integration. Since we can't test against
 * the real Gmail API without credentials, we test:
 * 1. Helper functions for parsing emails
 * 2. Router structure and error handling
 *
 * Note: These tests mock the gmail-client module and use a mock prisma
 * since the Gmail router doesn't actually use the database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCaller } from '../trpc/index.js';

// Mock the gmail-client module
vi.mock('../services/gmail-client.js', () => ({
  getGmailClient: vi.fn(),
  getPeopleClient: vi.fn(),
  isGmailConfigured: vi.fn(),
  hasCredentials: vi.fn(),
  hasTokens: vi.fn(),
  getAuthenticatedEmail: vi.fn(),
}));

import {
  getGmailClient,
  getPeopleClient,
  isGmailConfigured,
  hasCredentials,
  hasTokens,
  getAuthenticatedEmail,
} from '../services/gmail-client.js';

// Mock prisma - Gmail router doesn't need actual database access
const mockPrisma = {} as any;

describe('Gmail tRPC Router', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    caller = createCaller({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('gmail.status', () => {
    it('should return not configured when credentials are missing', async () => {
      vi.mocked(isGmailConfigured).mockReturnValue(false);
      vi.mocked(hasCredentials).mockReturnValue(false);
      vi.mocked(hasTokens).mockReturnValue(false);

      const result = await caller.gmail.status();

      expect(result.configured).toBe(false);
      expect(result.authenticated).toBe(false);
      expect(result.error).toContain('credentials not found');
    });

    it('should return not authenticated when tokens are missing', async () => {
      vi.mocked(isGmailConfigured).mockReturnValue(false);
      vi.mocked(hasCredentials).mockReturnValue(true);
      vi.mocked(hasTokens).mockReturnValue(false);

      const result = await caller.gmail.status();

      expect(result.configured).toBe(false);
      expect(result.authenticated).toBe(false);
      expect(result.error).toContain('not authenticated');
    });

    it('should return configured and authenticated when all is set up', async () => {
      vi.mocked(isGmailConfigured).mockReturnValue(true);
      vi.mocked(hasCredentials).mockReturnValue(true);
      vi.mocked(hasTokens).mockReturnValue(true);
      vi.mocked(getAuthenticatedEmail).mockResolvedValue('test@gmail.com');

      const result = await caller.gmail.status();

      expect(result.configured).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(result.email).toBe('test@gmail.com');
    });
  });

  describe('gmail.list', () => {
    it('should throw when Gmail is not configured', async () => {
      vi.mocked(getGmailClient).mockResolvedValue(null);

      await expect(caller.gmail.list({})).rejects.toThrow('Gmail not configured');
    });

    it('should list emails when configured', async () => {
      const mockGmail = {
        users: {
          messages: {
            list: vi.fn().mockResolvedValue({
              data: {
                messages: [{ id: 'msg-1' }, { id: 'msg-2' }],
                nextPageToken: null,
                resultSizeEstimate: 2,
              },
            }),
            get: vi.fn().mockImplementation(({ id }) => ({
              data: {
                id,
                threadId: `thread-${id}`,
                snippet: `Snippet for ${id}`,
                labelIds: ['INBOX', 'UNREAD'],
                payload: {
                  headers: [
                    { name: 'From', value: 'sender@example.com' },
                    { name: 'To', value: 'receiver@example.com' },
                    { name: 'Subject', value: `Subject for ${id}` },
                    { name: 'Date', value: '2026-01-27T10:00:00Z' },
                  ],
                },
              },
            })),
          },
        },
      };

      vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

      const result = await caller.gmail.list({ maxResults: 10 });

      expect(result.emails).toHaveLength(2);
      expect(result.emails[0]).toHaveProperty('id', 'msg-1');
      expect(result.emails[0]).toHaveProperty('subject', 'Subject for msg-1');
      expect(result.emails[0].isUnread).toBe(true);
    });
  });

  describe('gmail.get', () => {
    it('should throw when Gmail is not configured', async () => {
      vi.mocked(getGmailClient).mockResolvedValue(null);

      await expect(caller.gmail.get({ id: 'test-id' })).rejects.toThrow('Gmail not configured');
    });

    it('should return full email details', async () => {
      const mockGmail = {
        users: {
          messages: {
            get: vi.fn().mockResolvedValue({
              data: {
                id: 'msg-1',
                threadId: 'thread-1',
                snippet: 'This is a test email',
                labelIds: ['INBOX'],
                payload: {
                  mimeType: 'text/plain',
                  headers: [
                    { name: 'From', value: 'John Doe <john@example.com>' },
                    { name: 'To', value: 'Jane Smith <jane@example.com>' },
                    { name: 'Cc', value: 'Bob <bob@example.com>' },
                    { name: 'Subject', value: 'Test Email' },
                    { name: 'Date', value: 'Mon, 27 Jan 2026 10:00:00 +0000' },
                  ],
                  body: {
                    data: Buffer.from('Hello, this is the email body').toString('base64'),
                  },
                },
              },
            }),
          },
        },
      };

      vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

      const result = await caller.gmail.get({ id: 'msg-1' });

      expect(result.id).toBe('msg-1');
      expect(result.subject).toBe('Test Email');
      expect(result.from?.name).toBe('John Doe');
      expect(result.from?.email).toBe('john@example.com');
      expect(result.to).toHaveLength(1);
      expect(result.to[0]?.name).toBe('Jane Smith');
      expect(result.cc).toHaveLength(1);
      expect(result.bodyText).toBe('Hello, this is the email body');
    });

    it('should throw NOT_FOUND for missing email', async () => {
      const mockGmail = {
        users: {
          messages: {
            get: vi.fn().mockRejectedValue({ code: 404 }),
          },
        },
      };

      vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

      await expect(caller.gmail.get({ id: 'nonexistent' })).rejects.toThrow('not found');
    });
  });

  describe('gmail.search', () => {
    it('should search emails with query', async () => {
      const mockGmail = {
        users: {
          messages: {
            list: vi.fn().mockResolvedValue({
              data: {
                messages: [{ id: 'msg-1' }],
                nextPageToken: null,
                resultSizeEstimate: 1,
              },
            }),
            get: vi.fn().mockResolvedValue({
              data: {
                id: 'msg-1',
                threadId: 'thread-1',
                labelIds: ['INBOX'],
                payload: {
                  headers: [
                    { name: 'From', value: 'sender@example.com' },
                    { name: 'Subject', value: 'Budget Report' },
                    { name: 'Date', value: '2026-01-27T10:00:00Z' },
                  ],
                },
              },
            }),
          },
        },
      };

      vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

      const result = await caller.gmail.search({ query: 'subject:budget' });

      expect(mockGmail.users.messages.list).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'subject:budget' })
      );
      expect(result.emails).toHaveLength(1);
      expect(result.emails[0].subject).toBe('Budget Report');
    });
  });

  describe('gmail.labels', () => {
    it('should list Gmail labels', async () => {
      const mockGmail = {
        users: {
          labels: {
            list: vi.fn().mockResolvedValue({
              data: {
                labels: [
                  { id: 'INBOX', name: 'INBOX', type: 'system', messagesTotal: 100, messagesUnread: 5 },
                  { id: 'Label_1', name: 'Work', type: 'user', messagesTotal: 50 },
                ],
              },
            }),
          },
        },
      };

      vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

      const result = await caller.gmail.labels();

      expect(result.labels).toHaveLength(2);
      // System labels should come first
      expect(result.labels[0].type).toBe('system');
      expect(result.labels[0].name).toBe('INBOX');
    });
  });
});

describe('Contacts tRPC Router', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    caller = createCaller({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('gmail.contactsSearch', () => {
    it('should throw when People API is not configured', async () => {
      vi.mocked(getPeopleClient).mockResolvedValue(null);

      await expect(
        caller.gmail.contactsSearch({ query: 'John' })
      ).rejects.toThrow('People API not configured');
    });

    it('should search contacts by name', async () => {
      const mockPeople = {
        people: {
          searchContacts: vi.fn().mockResolvedValue({
            data: {
              results: [
                {
                  person: {
                    resourceName: 'people/123',
                    names: [{ displayName: 'John Smith' }],
                    emailAddresses: [{ value: 'john.smith@example.com' }],
                    phoneNumbers: [{ value: '+1 555-0123' }],
                    organizations: [{ name: 'Acme Corp', title: 'Engineer' }],
                  },
                },
                {
                  person: {
                    resourceName: 'people/456',
                    names: [{ displayName: 'John Doe' }],
                    emailAddresses: [
                      { value: 'john.doe@example.com' },
                      { value: 'johnd@personal.com' },
                    ],
                    phoneNumbers: [],
                    organizations: [],
                  },
                },
              ],
            },
          }),
        },
      };

      vi.mocked(getPeopleClient).mockResolvedValue(mockPeople as any);

      const result = await caller.gmail.contactsSearch({ query: 'John' });

      expect(result.contacts).toHaveLength(2);
      expect(result.contacts[0].name).toBe('John Smith');
      expect(result.contacts[0].emails).toContain('john.smith@example.com');
      expect(result.contacts[0].phones).toContain('+1 555-0123');
      expect(result.contacts[0].organization).toBe('Acme Corp');
      expect(result.contacts[0].jobTitle).toBe('Engineer');

      expect(result.contacts[1].name).toBe('John Doe');
      expect(result.contacts[1].emails).toHaveLength(2);
    });

    it('should handle scope errors gracefully', async () => {
      const mockPeople = {
        people: {
          searchContacts: vi.fn().mockRejectedValue({
            code: 403,
            message: 'Request had insufficient authentication scopes',
          }),
        },
      };

      vi.mocked(getPeopleClient).mockResolvedValue(mockPeople as any);

      await expect(
        caller.gmail.contactsSearch({ query: 'John' })
      ).rejects.toThrow('Contacts scope not authorized');
    });
  });

  describe('gmail.contactsList', () => {
    it('should list recent contacts', async () => {
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
                    resourceName: 'people/123',
                    names: [{ displayName: 'Recent Contact' }],
                    emailAddresses: [{ value: 'recent@example.com' }],
                    phoneNumbers: [],
                    organizations: [{ name: 'Company Inc' }],
                  },
                ],
                totalPeople: 1,
              },
            }),
          },
        },
      };

      vi.mocked(getPeopleClient).mockResolvedValue(mockPeople as any);

      const result = await caller.gmail.contactsList({ maxResults: 10 });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('Recent Contact');
      expect(result.contacts[0].emails).toContain('recent@example.com');
      expect(result.totalPeople).toBe(1);
    });

    it('should throw when People API is not configured', async () => {
      vi.mocked(getPeopleClient).mockResolvedValue(null);

      await expect(caller.gmail.contactsList({})).rejects.toThrow('People API not configured');
    });
  });
});

describe('Email Address Parsing', () => {
  // These test the parsing logic indirectly through the router
  // by checking the structured output from gmail.get

  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    caller = createCaller({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  it('should parse "Name <email>" format', async () => {
    const mockGmail = {
      users: {
        messages: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: 'msg-1',
              threadId: 'thread-1',
              labelIds: [],
              payload: {
                headers: [
                  { name: 'From', value: 'John Doe <john@example.com>' },
                  { name: 'Date', value: '2026-01-27T10:00:00Z' },
                ],
              },
            },
          }),
        },
      },
    };

    vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

    const result = await caller.gmail.get({ id: 'msg-1' });

    expect(result.from?.name).toBe('John Doe');
    expect(result.from?.email).toBe('john@example.com');
  });

  it('should parse quoted "Name" <email> format', async () => {
    const mockGmail = {
      users: {
        messages: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: 'msg-1',
              threadId: 'thread-1',
              labelIds: [],
              payload: {
                headers: [
                  { name: 'From', value: '"Smith, John" <john.smith@example.com>' },
                  { name: 'Date', value: '2026-01-27T10:00:00Z' },
                ],
              },
            },
          }),
        },
      },
    };

    vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

    const result = await caller.gmail.get({ id: 'msg-1' });

    expect(result.from?.name).toBe('Smith, John');
    expect(result.from?.email).toBe('john.smith@example.com');
  });

  it('should parse plain email address', async () => {
    const mockGmail = {
      users: {
        messages: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: 'msg-1',
              threadId: 'thread-1',
              labelIds: [],
              payload: {
                headers: [
                  { name: 'From', value: 'noreply@example.com' },
                  { name: 'Date', value: '2026-01-27T10:00:00Z' },
                ],
              },
            },
          }),
        },
      },
    };

    vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

    const result = await caller.gmail.get({ id: 'msg-1' });

    expect(result.from?.name).toBeNull();
    expect(result.from?.email).toBe('noreply@example.com');
  });

  it('should parse multiple recipients', async () => {
    const mockGmail = {
      users: {
        messages: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: 'msg-1',
              threadId: 'thread-1',
              labelIds: [],
              payload: {
                headers: [
                  { name: 'From', value: 'sender@example.com' },
                  { name: 'To', value: 'Alice <alice@example.com>, Bob <bob@example.com>, carol@example.com' },
                  { name: 'Date', value: '2026-01-27T10:00:00Z' },
                ],
              },
            },
          }),
        },
      },
    };

    vi.mocked(getGmailClient).mockResolvedValue(mockGmail as any);

    const result = await caller.gmail.get({ id: 'msg-1' });

    expect(result.to).toHaveLength(3);
    expect(result.to[0]?.name).toBe('Alice');
    expect(result.to[1]?.name).toBe('Bob');
    expect(result.to[2]?.email).toBe('carol@example.com');
  });
});
