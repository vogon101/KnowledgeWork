#!/usr/bin/env node
/**
 * Google CLI
 *
 * tRPC-based CLI for Google services (Gmail, Contacts, Calendar)
 * with end-to-end type safety.
 */
import { Command } from 'commander';
import { trpc } from './client.js';
// =============================================================================
// Formatting Helpers
// =============================================================================
function formatError(message) {
    return `Error: ${message}`;
}
function truncate(str, maxLen) {
    const s = str ?? '';
    if (s.length <= maxLen)
        return s;
    return s.slice(0, maxLen - 3) + '...';
}
function padEnd(str, len) {
    const s = str ?? '';
    if (s.length >= len)
        return s;
    return s + ' '.repeat(len - s.length);
}
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString();
}
function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function printNow() {
    const now = new Date();
    console.log(`Current time: ${now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);
}
let calendarNameCache = null;
async function getCalendarNames() {
    if (calendarNameCache)
        return calendarNameCache;
    try {
        const result = await trpc.calendar.calendars.query();
        calendarNameCache = new Map();
        for (const cal of result.calendars) {
            if (cal.id && cal.summary) {
                calendarNameCache.set(cal.id, cal.summary);
            }
        }
    }
    catch {
        calendarNameCache = new Map();
    }
    return calendarNameCache;
}
function formatCalendarTag(calendarId, calendarIds, nameMap) {
    const ids = calendarIds || (calendarId ? [calendarId] : []);
    const nonPrimary = ids.filter(id => id !== 'primary');
    if (nonPrimary.length === 0) {
        return ids.length > 1 ? '[multiple] ' : '';
    }
    const labels = nonPrimary.map(id => {
        if (nameMap?.has(id))
            return nameMap.get(id);
        return id;
    });
    return `[${labels.join(', ')}] `;
}
// Format an email address object to display string
function formatEmailAddress(addr) {
    if (!addr)
        return '(unknown)';
    if (addr.name)
        return `${addr.name} <${addr.email}>`;
    return addr.email;
}
// Format short version for list display
function formatEmailAddressShort(addr) {
    if (!addr)
        return '(unknown)';
    return addr.name || addr.email;
}
// =============================================================================
// Main Program
// =============================================================================
const program = new Command();
// Send all Commander output (including errors) to stdout so it's visible
// even when stderr is redirected (e.g. 2>/dev/null)
program.configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stdout.write(str),
    outputError: (str) => process.stdout.write(str),
});
program
    .name('google-cli')
    .description('CLI for Google integration (Gmail, Contacts, Calendar) via Knowledge Work')
    .version('1.0.0');
// =============================================================================
// Gmail Subcommand
// =============================================================================
const gmail = program.command('gmail').description('Gmail operations');
gmail
    .command('status')
    .description('Check Gmail configuration and authentication status')
    .action(async () => {
    try {
        const result = await trpc.gmail.status.query();
        if (!result.configured) {
            console.log('Gmail: Not configured');
            console.log('  Run: npx tsx packages/server/src/scripts/google-auth.ts');
            return;
        }
        if (!result.authenticated) {
            console.log('Gmail: Configured but not authenticated');
            console.log(`  Error: ${result.error || 'Unknown'}`);
            return;
        }
        console.log('Gmail: Configured and authenticated');
        console.log(`  Account: ${result.email}`);
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
gmail
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
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
gmail
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
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
gmail
    .command('get <id>')
    .description('Get full email content by ID')
    .option('--html', 'Show HTML body instead of text')
    .action(async (id, options) => {
    try {
        const email = await trpc.gmail.get.query({ id });
        console.log('─'.repeat(70));
        console.log(`From:    ${formatEmailAddress(email.from)}`);
        console.log(`To:      ${email.to.map(formatEmailAddress).join(', ')}`);
        if (email.cc.length > 0)
            console.log(`CC:      ${email.cc.map(formatEmailAddress).join(', ')}`);
        console.log(`Date:    ${formatDateTime(email.date)}`);
        console.log(`Subject: ${email.subject || '(no subject)'}`);
        if (email.labelIds.length > 0)
            console.log(`Labels:  ${email.labelIds.join(', ')}`);
        console.log('─'.repeat(70));
        if (options.html && email.bodyHtml) {
            console.log('\n[HTML Body]');
            console.log(email.bodyHtml);
        }
        else if (email.bodyText) {
            console.log(`\n${email.bodyText}`);
        }
        else if (email.bodyHtml) {
            console.log('\n[No text body - use --html to see HTML]');
        }
        else {
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
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
gmail
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
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
gmail
    .command('labels')
    .description('List Gmail labels')
    .action(async () => {
    try {
        const result = await trpc.gmail.labels.query();
        const labels = result.labels;
        console.log(`${labels.length} labels`);
        console.log('─'.repeat(50));
        const systemLabels = labels.filter((l) => l.type === 'system');
        const userLabels = labels.filter((l) => l.type === 'user');
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
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
gmail
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
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
// =============================================================================
// Contacts Subcommand
// =============================================================================
const contacts = program.command('contacts').description('Google Contacts operations');
contacts
    .command('search <query>')
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
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        if (msg.includes('scope') || msg.includes('Contacts')) {
            console.log('Contacts not authorized. Re-run google-auth.ts to add contacts scope.');
        }
        else {
            console.log(formatError(msg));
        }
        process.exit(1);
    }
});
contacts
    .command('list')
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
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        if (msg.includes('scope') || msg.includes('Contacts')) {
            console.log('Contacts not authorized. Re-run google-auth.ts to add contacts scope.');
        }
        else {
            console.log(formatError(msg));
        }
        process.exit(1);
    }
});
// =============================================================================
// Calendar Subcommand
// =============================================================================
const calendar = program.command('calendar').description('Google Calendar operations');
calendar
    .command('status')
    .description('Check Calendar configuration and authentication status')
    .action(async () => {
    try {
        const result = await trpc.calendar.status.query();
        if (!result.configured) {
            console.log('Calendar: Not configured');
            console.log('  Run: npx tsx packages/server/src/scripts/google-auth.ts');
            return;
        }
        if (!result.authenticated) {
            console.log('Calendar: Configured but not authenticated');
            console.log(`  Error: ${result.error || 'Unknown'}`);
            return;
        }
        console.log('Calendar: Configured and authenticated');
        console.log(`  Account: ${result.email}`);
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
calendar
    .command('calendars')
    .description('List all available calendars and their IDs')
    .action(async () => {
    try {
        const result = await trpc.calendar.calendars.query();
        console.log(`${result.calendars.length} calendars available`);
        console.log('─'.repeat(70));
        for (const cal of result.calendars) {
            const primary = cal.primary ? ' (primary)' : '';
            const configured = result.configuredIds.includes(cal.id) ? ' [configured]' : '';
            console.log(`  ${cal.summary || '(untitled)'}${primary}${configured}`);
            console.log(`    ID: ${cal.id}`);
            console.log(`    Access: ${cal.accessRole || 'unknown'}`);
        }
        console.log();
        console.log('To query multiple calendars, set:');
        console.log(`  export GOOGLE_CALENDAR_IDS=${result.configuredIds.join(',')}`);
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
calendar
    .command('today')
    .description('Show today\'s calendar events')
    .action(async () => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const result = await trpc.calendar.list.query({
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
        });
        printNow();
        if (result.events.length === 0) {
            console.log('No events today');
            return;
        }
        console.log(`Today: ${result.events.length} events`);
        console.log('─'.repeat(70));
        const nameMap = await getCalendarNames();
        for (const event of result.events) {
            const tag = formatCalendarTag(event.calendarId, event.calendarIds, nameMap);
            if (event.isAllDay) {
                console.log(`  All day   ${tag}${event.summary || '(no title)'}`);
            }
            else {
                const start = formatTime(event.start);
                const end = formatTime(event.end);
                console.log(`  ${start}-${end}  ${tag}${event.summary || '(no title)'}`);
            }
            if (event.location)
                console.log(`            Location: ${event.location}`);
            if (event.attendees.length > 0) {
                const names = event.attendees
                    .filter((a) => !a.self)
                    .map((a) => a.displayName || a.email)
                    .slice(0, 5);
                if (names.length > 0) {
                    console.log(`            With: ${names.join(', ')}${event.attendees.length > 6 ? ` +${event.attendees.length - 6} more` : ''}`);
                }
            }
            console.log(`            ID: ${event.id}`);
        }
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
calendar
    .command('upcoming')
    .description('Show upcoming events (next 7 days)')
    .option('--days <n>', 'Number of days to look ahead (default 7)', parseInt)
    .option('--limit <n>', 'Max results (default 50)', parseInt)
    .action(async (options) => {
    try {
        const now = new Date();
        const days = options.days || 7;
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
        const result = await trpc.calendar.list.query({
            timeMin: now.toISOString(),
            timeMax: end.toISOString(),
            maxResults: options.limit,
        });
        printNow();
        if (result.events.length === 0) {
            console.log(`No events in the next ${days} days`);
            return;
        }
        console.log(`Upcoming: ${result.events.length} events (next ${days} days)`);
        console.log('─'.repeat(70));
        const nameMap = await getCalendarNames();
        let currentDate = '';
        for (const event of result.events) {
            const eventDate = formatDate(event.start);
            if (eventDate !== currentDate) {
                currentDate = eventDate;
                console.log(`\n${eventDate}`);
            }
            const tag = formatCalendarTag(event.calendarId, event.calendarIds, nameMap);
            if (event.isAllDay) {
                console.log(`  All day   ${tag}${event.summary || '(no title)'}`);
            }
            else {
                const start = formatTime(event.start);
                const end = formatTime(event.end);
                console.log(`  ${start}-${end}  ${tag}${event.summary || '(no title)'}`);
            }
            console.log(`            ID: ${event.id}`);
        }
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
calendar
    .command('search <query>')
    .description('Search calendar events by text')
    .option('--days <n>', 'Days to search (default: 30 past + 30 future)', parseInt)
    .option('--limit <n>', 'Max results (default 20)', parseInt)
    .action(async (query, options) => {
    try {
        const now = new Date();
        const days = options.days || 30;
        const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days).toISOString();
        const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).toISOString();
        const result = await trpc.calendar.search.query({
            query,
            timeMin,
            timeMax,
            maxResults: options.limit,
        });
        printNow();
        if (result.events.length === 0) {
            console.log(`No events matching "${query}"`);
            return;
        }
        console.log(`${result.events.length} events matching "${query}"`);
        console.log('─'.repeat(70));
        const nameMap = await getCalendarNames();
        for (const event of result.events) {
            const dateStr = formatDate(event.start);
            const tag = formatCalendarTag(event.calendarId, event.calendarIds, nameMap);
            if (event.isAllDay) {
                console.log(`${dateStr}  All day   ${tag}${event.summary || '(no title)'}`);
            }
            else {
                const start = formatTime(event.start);
                const end = formatTime(event.end);
                console.log(`${dateStr}  ${start}-${end}  ${tag}${event.summary || '(no title)'}`);
            }
            if (event.location)
                console.log(`         Location: ${event.location}`);
            console.log(`         ID: ${event.id}`);
        }
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
calendar
    .command('get <id>')
    .description('Get full calendar event details by ID')
    .action(async (id) => {
    try {
        const event = await trpc.calendar.get.query({ id });
        printNow();
        console.log('─'.repeat(70));
        console.log(`Summary:  ${event.summary || '(no title)'}`);
        if (event.isAllDay) {
            console.log(`When:     All day (${event.startDate} - ${event.endDate})`);
        }
        else {
            console.log(`Start:    ${formatDateTime(event.start)}`);
            console.log(`End:      ${formatDateTime(event.end)}`);
        }
        if (event.location)
            console.log(`Location: ${event.location}`);
        if (event.status)
            console.log(`Status:   ${event.status}`);
        if (event.organizer) {
            console.log(`Organizer: ${event.organizer.displayName || event.organizer.email}`);
        }
        console.log('─'.repeat(70));
        if (event.attendees.length > 0) {
            console.log('\nAttendees:');
            for (const a of event.attendees) {
                const name = a.displayName || a.email;
                const status = a.responseStatus ? ` (${a.responseStatus})` : '';
                const role = a.organizer ? ' [organizer]' : a.self ? ' [you]' : '';
                console.log(`  ${name}${status}${role}`);
            }
        }
        if (event.description) {
            console.log('\nDescription:');
            console.log(event.description);
        }
        if (event.htmlLink) {
            console.log(`\nLink: ${event.htmlLink}`);
        }
        console.log(`Event ID: ${event.id}`);
    }
    catch (error) {
        console.log(formatError(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
});
// =============================================================================
// Parse and Run
// =============================================================================
program.parse();
