#!/usr/bin/env node
/**
 * Gmail CLI
 *
 * tRPC-based CLI for Gmail operations with end-to-end type safety.
 */

import { Command } from 'commander';
import { trpc } from './client.js';

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatError(message: string): string {
  return `Error: ${message}`;
}

function truncate(str: string | undefined | null, maxLen: number): string {
  const s = str ?? '';
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + '...';
}

function padEnd(str: string | undefined | null, len: number): string {
  const s = str ?? '';
  if (s.length >= len) return s;
  return s + ' '.repeat(len - s.length);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

// Format an email address object to display string
function formatEmailAddress(addr: { name?: string | null; email: string } | null | undefined): string {
  if (!addr) return '(unknown)';
  if (addr.name) return `${addr.name} <${addr.email}>`;
  return addr.email;
}

// Format short version for list display
function formatEmailAddressShort(addr: { name?: string | null; email: string } | null | undefined): string {
  if (!addr) return '(unknown)';
  return addr.name || addr.email;
}

// =============================================================================
// Main Program
// =============================================================================

const program = new Command();

program
  .name('gmail-cli')
  .description('CLI for Gmail integration via Knowledge Work')
  .version('1.0.0');

// =============================================================================
// Status Command
// =============================================================================

program
  .command('status')
  .description('Check Gmail configuration and authentication status')
  .action(async () => {
    try {
      const result = await trpc.gmail.status.query();

      if (!result.configured) {
        console.log('Gmail: Not configured');
        console.log('  Run: npx tsx packages/server/src/scripts/gmail-auth.ts');
        return;
      }

      if (!result.authenticated) {
        console.log('Gmail: Configured but not authenticated');
        console.log(`  Error: ${result.error || 'Unknown'}`);
        return;
      }

      console.log('Gmail: Configured and authenticated');
      console.log(`  Account: ${result.email}`);
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// =============================================================================
// List Command
// =============================================================================

program
  .command('list')
  .description('List recent emails')
  .option('--query <q>', 'Gmail search query (e.g., "is:unread", "from:john")')
  .option('--label <label>', 'Filter by label (e.g., INBOX, IMPORTANT)')
  .option('--limit <n>', 'Max results (default 20)', parseInt)
  .option('--unread', 'Show only unread emails')
  .action(async (options) => {
    try {
      let query = options.query || '';
      if (options.unread && !query.includes('is:unread')) {
        query = query ? `${query} is:unread` : 'is:unread';
      }

      const result = await trpc.gmail.list.query({
        query: query || undefined,
        labelIds: options.label ? [options.label] : undefined,
        maxResults: options.limit,
      });

      if (result.emails.length === 0) {
        console.log('No emails found');
        return;
      }

      console.log(`${result.emails.length} emails${result.nextPageToken ? ' (more available)' : ''}`);
      console.log('─'.repeat(70));

      for (const email of result.emails) {
        const unread = email.isUnread ? '●' : ' ';
        const dateStr = formatDate(email.date);
        const from = padEnd(truncate(formatEmailAddressShort(email.from), 25), 25);
        const subject = truncate(email.subject, 40);

        console.log(`${unread} ${dateStr}  ${from}  ${subject}`);
        console.log(`  ID: ${email.id}`);
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// =============================================================================
// Search Command
// =============================================================================

program
  .command('search <query>')
  .description('Search emails with Gmail query syntax')
  .option('--limit <n>', 'Max results (default 20)', parseInt)
  .action(async (query, options) => {
    try {
      const result = await trpc.gmail.search.query({
        query,
        maxResults: options.limit,
      });

      if (result.emails.length === 0) {
        console.log('No emails found');
        return;
      }

      console.log(`${result.emails.length} emails matching "${query}"`);
      console.log('─'.repeat(70));

      for (const email of result.emails) {
        const unread = email.isUnread ? '●' : ' ';
        const dateStr = formatDate(email.date);
        const from = padEnd(truncate(formatEmailAddressShort(email.from), 25), 25);
        const subject = truncate(email.subject, 40);

        console.log(`${unread} ${dateStr}  ${from}  ${subject}`);
        console.log(`  ID: ${email.id}`);
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// =============================================================================
// Get Command
// =============================================================================

program
  .command('get <id>')
  .description('Get full email content by ID')
  .option('--html', 'Show HTML body instead of text')
  .action(async (id, options) => {
    try {
      const email = await trpc.gmail.get.query({ id });

      console.log('─'.repeat(70));
      console.log(`From:    ${formatEmailAddress(email.from)}`);
      console.log(`To:      ${email.to.map(formatEmailAddress).join(', ')}`);
      if (email.cc.length > 0) console.log(`CC:      ${email.cc.map(formatEmailAddress).join(', ')}`);
      console.log(`Date:    ${formatDateTime(email.date)}`);
      console.log(`Subject: ${email.subject || '(no subject)'}`);
      if (email.labelIds.length > 0) console.log(`Labels:  ${email.labelIds.join(', ')}`);
      console.log('─'.repeat(70));

      if (options.html && email.bodyHtml) {
        console.log('\n[HTML Body]');
        console.log(email.bodyHtml);
      } else if (email.bodyText) {
        console.log(`\n${email.bodyText}`);
      } else if (email.bodyHtml) {
        console.log('\n[No text body - use --html to see HTML]');
      } else {
        console.log('\n[No body content]');
      }

      if (email.attachments.length > 0) {
        console.log('\n─'.repeat(70));
        console.log('Attachments:');
        for (const att of email.attachments) {
          console.log(`  ${att.filename} (${att.mimeType}, ${att.size} bytes)`);
        }
      }

      console.log(`\nThread ID: ${email.threadId}`);
      console.log(`Email ID: ${email.id}`);
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// =============================================================================
// Thread Command
// =============================================================================

program
  .command('thread <id>')
  .description('Get all messages in a thread')
  .action(async (id) => {
    try {
      const thread = await trpc.gmail.getThread.query({ id });

      console.log(`Thread: ${thread.messages.length} messages`);
      console.log('─'.repeat(70));

      for (let i = 0; i < thread.messages.length; i++) {
        const msg = thread.messages[i];
        const dateStr = formatDateTime(msg.date);

        console.log(`\n[${i + 1}/${thread.messages.length}] ${dateStr}`);
        console.log(`From: ${formatEmailAddress(msg.from)}`);
        console.log(`Subject: ${msg.subject || '(no subject)'}`);
        console.log('─'.repeat(40));
        console.log(msg.snippet || '[No preview]');
        console.log(`  ID: ${msg.id}`);
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// =============================================================================
// Labels Command
// =============================================================================

program
  .command('labels')
  .description('List Gmail labels')
  .action(async () => {
    try {
      const labels = await trpc.gmail.labels.query();

      console.log(`${labels.length} labels`);
      console.log('─'.repeat(50));

      // Group by type
      type LabelType = typeof labels[number];
      const systemLabels = labels.filter((l: LabelType) => l.type === 'system');
      const userLabels = labels.filter((l: LabelType) => l.type === 'user');

      if (systemLabels.length > 0) {
        console.log('\nSystem labels:');
        for (const l of systemLabels) {
          const counts = l.messagesTotal !== undefined ? ` (${l.messagesUnread}/${l.messagesTotal})` : '';
          console.log(`  ${l.name}${counts}`);
        }
      }

      if (userLabels.length > 0) {
        console.log('\nUser labels:');
        for (const l of userLabels) {
          const counts = l.messagesTotal !== undefined ? ` (${l.messagesUnread}/${l.messagesTotal})` : '';
          console.log(`  ${l.name}${counts}`);
        }
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// =============================================================================
// Inbox Command (convenience)
// =============================================================================

program
  .command('inbox')
  .description('Show unread inbox emails (shortcut for: list --label INBOX --unread)')
  .option('--limit <n>', 'Max results (default 20)', parseInt)
  .option('--all', 'Show all inbox emails, not just unread')
  .action(async (options) => {
    try {
      const query = options.all ? 'in:inbox' : 'in:inbox is:unread';
      const result = await trpc.gmail.list.query({
        query,
        maxResults: options.limit,
      });

      if (result.emails.length === 0) {
        console.log(options.all ? 'Inbox is empty' : 'No unread emails in inbox');
        return;
      }

      const label = options.all ? 'Inbox' : 'Unread inbox';
      console.log(`${label}: ${result.emails.length} emails`);
      console.log('─'.repeat(70));

      for (const email of result.emails) {
        const unread = email.isUnread ? '●' : ' ';
        const dateStr = formatDate(email.date);
        const from = padEnd(truncate(formatEmailAddressShort(email.from), 25), 25);
        const subject = truncate(email.subject, 40);

        console.log(`${unread} ${dateStr}  ${from}  ${subject}`);
        console.log(`  ID: ${email.id}`);
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// =============================================================================
// Contacts Commands
// =============================================================================

program
  .command('contacts <query>')
  .description('Search contacts by name or email')
  .option('--limit <n>', 'Max results (default 10)', parseInt)
  .action(async (query, options) => {
    try {
      const result = await trpc.gmail.contactsSearch.query({
        query,
        maxResults: options.limit || 10,
      });

      if (result.contacts.length === 0) {
        console.log(`No contacts found matching "${query}"`);
        return;
      }

      console.log(`${result.contacts.length} contacts matching "${query}"`);
      console.log('─'.repeat(60));

      for (const contact of result.contacts) {
        const name = contact.name || '(no name)';
        const email = contact.emails[0] || '(no email)';
        const org = contact.organization ? ` - ${contact.organization}` : '';

        console.log(`${name}${org}`);
        console.log(`  Email: ${email}`);
        if (contact.emails.length > 1) {
          console.log(`  Other: ${contact.emails.slice(1).join(', ')}`);
        }
        if (contact.phones.length > 0) {
          console.log(`  Phone: ${contact.phones.join(', ')}`);
        }
        console.log('');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('scope') || msg.includes('Contacts')) {
        console.error('Contacts not authorized. Re-run gmail-auth.ts to add contacts scope.');
      } else {
        console.error(formatError(msg));
      }
      process.exit(1);
    }
  });

program
  .command('contacts-list')
  .description('List recent contacts')
  .option('--limit <n>', 'Max results (default 20)', parseInt)
  .action(async (options) => {
    try {
      const result = await trpc.gmail.contactsList.query({
        maxResults: options.limit || 20,
      });

      if (result.contacts.length === 0) {
        console.log('No contacts found');
        return;
      }

      console.log(`${result.contacts.length} contacts`);
      console.log('─'.repeat(60));

      for (const contact of result.contacts) {
        const name = contact.name || '(no name)';
        const email = contact.emails[0] || '(no email)';
        console.log(`${name}: ${email}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('scope') || msg.includes('Contacts')) {
        console.error('Contacts not authorized. Re-run gmail-auth.ts to add contacts scope.');
      } else {
        console.error(formatError(msg));
      }
      process.exit(1);
    }
  });

// =============================================================================
// Parse and Run
// =============================================================================

program.parse();
