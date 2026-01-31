#!/usr/bin/env node
/**
 * Type-Safe Task CLI
 *
 * tRPC-based CLI for task management with end-to-end type safety.
 */
import { Command } from 'commander';
import { trpc, formatTaskId, parseTaskId } from './client.js';
import { formatItemList, formatItemLine, formatItemDetail, formatError } from './format.js';
/**
 * Parse a project argument. Requires fully qualified org/slug format
 * to avoid ambiguity (e.g., "_general" exists in multiple orgs).
 */
function parseProjectArg(projectArg) {
    if (!projectArg.includes('/')) {
        console.log(formatError(`Project must be fully qualified as org/project (got "${projectArg}"). Example: myorg/_general`));
        process.exit(1);
    }
    const [org, ...rest] = projectArg.split('/');
    return { org, slug: rest.join('/') };
}
/**
 * Resolve a project argument to a project ID.
 * Requires org/slug format for disambiguation.
 */
async function resolveProjectId(projectArg) {
    const { slug, org } = parseProjectArg(projectArg);
    const projectResult = await trpc.projects.get.query({ slug, org });
    return projectResult.id;
}
/**
 * Parse a due date argument that may be relative (today, tomorrow, +3d) or ISO format.
 * Returns ISO date string (YYYY-MM-DD) or null if "none".
 */
function parseDueDate(dueArg) {
    const lower = dueArg.toLowerCase().trim();
    // "none" clears the date
    if (lower === 'none')
        return null;
    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueArg))
        return dueArg;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Relative dates
    if (lower === 'today' || lower === 'tod') {
        return today.toISOString().split('T')[0];
    }
    if (lower === 'tomorrow' || lower === 'tom') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
    // +Nd format (e.g., +3d, +7d)
    const plusDaysMatch = lower.match(/^\+(\d+)d$/);
    if (plusDaysMatch) {
        const days = parseInt(plusDaysMatch[1], 10);
        const future = new Date(today);
        future.setDate(future.getDate() + days);
        return future.toISOString().split('T')[0];
    }
    // Weekday names (next occurrence)
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shortWeekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    let dayIndex = weekdays.indexOf(lower);
    if (dayIndex === -1)
        dayIndex = shortWeekdays.indexOf(lower);
    if (dayIndex !== -1) {
        const currentDay = today.getDay();
        let daysToAdd = dayIndex - currentDay;
        if (daysToAdd <= 0)
            daysToAdd += 7;
        const target = new Date(today);
        target.setDate(target.getDate() + daysToAdd);
        return target.toISOString().split('T')[0];
    }
    // Fallback: return as-is (let the API validate)
    return dueArg;
}
/**
 * Extract a readable error message from tRPC or generic errors.
 */
function getErrorMessage(error) {
    if (error instanceof Error) {
        // TRPCClientError has a .message that's usually descriptive
        // but sometimes wraps a JSON shape — try to extract the inner message
        try {
            const parsed = JSON.parse(error.message);
            if (Array.isArray(parsed) && parsed[0]?.error?.message) {
                return parsed[0].error.message;
            }
        }
        catch {
            // Not JSON, use as-is
        }
        return error.message;
    }
    return String(error);
}
const program = new Command();
// Send all Commander output (including errors) to stdout so it's visible
// even when stderr is redirected (e.g. 2>/dev/null)
program.configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stdout.write(str),
    outputError: (str) => process.stdout.write(str),
});
program
    .name('task-cli')
    .description('Type-safe CLI for Knowledge Work task management')
    .version('1.0.0');
// ============================================================================
// List Command
// ============================================================================
program
    .command('list')
    .description('List items with optional filters')
    .option('--type <type>', 'Item type (task, routine)')
    .option('--project <org/slug>', 'Project (e.g. myorg/_general)')
    .option('--owner <name>', 'Owner name (partial match)')
    .option('--due <date>', 'Due date filter (today, tomorrow, this-week, YYYY-MM-DD)')
    .option('--status <status>', 'Status filter (comma-separated)')
    .option('--limit <n>', 'Max results', parseInt)
    .action(async (options) => {
    try {
        const filters = {};
        if (options.type)
            filters.itemType = options.type;
        if (options.project) {
            const { slug, org } = parseProjectArg(options.project);
            filters.projectSlug = slug;
            filters.orgSlug = org;
        }
        if (options.owner)
            filters.ownerName = options.owner;
        if (options.status)
            filters.status = options.status.split(',');
        if (options.limit)
            filters.limit = options.limit;
        // Handle due date
        if (options.due) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (options.due === 'today') {
                filters.dueDate = today.toISOString().split('T')[0];
            }
            else if (options.due === 'tomorrow') {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                filters.dueDate = tomorrow.toISOString().split('T')[0];
            }
            else if (options.due === 'this-week') {
                const endOfWeek = new Date(today);
                endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
                filters.dueBefore = endOfWeek.toISOString().split('T')[0];
            }
            else {
                filters.dueDate = options.due;
            }
        }
        const result = await trpc.items.list.query(filters);
        console.log(formatItemList(result.items));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Get Command
// ============================================================================
program
    .command('get <ids>')
    .description('Get details for one or more items (comma-separated)')
    .action(async (ids) => {
    try {
        const idList = ids.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
        if (idList.length === 1) {
            const item = await trpc.items.get.query({ id: idList[0] });
            console.log(formatItemDetail(item));
        }
        else {
            const items = await Promise.all(idList.map((id) => trpc.items.get.query({ id }).catch(() => null)));
            const valid = items.filter(Boolean);
            if (valid.length === 0) {
                console.log(formatError('No items found for the given IDs'));
                process.exit(1);
            }
            console.log(formatItemList(valid));
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Today Command
// ============================================================================
program
    .command('today')
    .description('Show items due today')
    .action(async () => {
    try {
        const result = await trpc.query.today.query({});
        console.log(formatItemList(result.items));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Overdue Command
// ============================================================================
program
    .command('overdue')
    .description('Show overdue items')
    .action(async () => {
    try {
        const result = await trpc.query.overdue.query({});
        console.log(formatItemList(result.items));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Waiting Command
// ============================================================================
program
    .command('waiting')
    .description('Show items waiting on others')
    .action(async () => {
    try {
        const result = await trpc.query.waiting.query();
        if (result.total === 0) {
            console.log('No items waiting on others');
            return;
        }
        console.log(`${result.total} items waiting on others`);
        console.log('─'.repeat(60));
        for (const group of result.byPerson) {
            console.log(`\n${group.person.name}:`);
            for (const item of group.items) {
                const priority = item.priority ? `p${item.priority}` : '  ';
                const due = item.dueDate || '';
                console.log(`  ${item.displayId}  ${priority}  ${item.title.slice(0, 40)}  ${due}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Priority Command
// ============================================================================
program
    .command('priority')
    .alias('high')
    .description('Show high priority items (P1 and P2)')
    .option('--owner <name>', 'Filter by owner name')
    .option('--limit <n>', 'Max results', parseInt)
    .action(async (options) => {
    try {
        const result = await trpc.query.highPriority.query({
            ownerName: options.owner,
            limit: options.limit,
        });
        if (result.count === 0) {
            console.log('No high priority items');
            return;
        }
        console.log(`${result.count} high priority items`);
        console.log('─'.repeat(60));
        console.log(formatItemList(result.items));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Blocked Command
// ============================================================================
program
    .command('blocked')
    .description('Show blocked items')
    .action(async () => {
    try {
        // Use query.blocked which includes all blockers via ItemLink
        const result = await trpc.query.blocked.query({});
        if (result.items.length === 0) {
            console.log('No blocked items');
            return;
        }
        console.log(`${result.items.length} blocked items`);
        console.log('─'.repeat(60));
        for (const item of result.items) {
            // Cast to access new fields from the updated API
            const typedItem = item;
            const blockerCount = typedItem.blockerCount ?? (typedItem.blockers?.length ?? 0);
            const blockerInfo = blockerCount > 0
                ? blockerCount === 1
                    ? ` (blocked by: ${typedItem.blockers?.[0]?.title?.slice(0, 20) ?? '?'})`
                    : ` (blocked by ${blockerCount} tasks)`
                : '';
            console.log(`${item.displayId}  ${item.title.slice(0, 40)}${blockerInfo}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Stats Command
// ============================================================================
program
    .command('stats')
    .alias('dashboard')
    .description('Show summary statistics')
    .option('--owner <name>', 'Filter by owner name')
    .action(async (options) => {
    try {
        const result = await trpc.query.dashboard.query({
            ownerName: options.owner,
        });
        console.log('Task Statistics');
        console.log('─'.repeat(40));
        console.log(`Total active:    ${result.total}`);
        console.log(`Overdue:         ${result.overdue}`);
        console.log(`Due today:       ${result.dueToday}`);
        console.log(`High priority:   ${result.highPriority}`);
        console.log(`Blocked:         ${result.blocked}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Activity Command
// ============================================================================
program
    .command('activity')
    .description('Show recent activity (status changes, completions, notes)')
    .option('--limit <n>', 'Number of activities to show', parseInt)
    .option('--since <date>', 'Only show activity since date (YYYY-MM-DD)')
    .action(async (options) => {
    try {
        const limit = options.limit || 30;
        const result = await trpc.query.activityFeed.query({ limit });
        // Filter by date if specified
        let activities = result.activities;
        if (options.since) {
            const sinceDate = new Date(options.since);
            sinceDate.setHours(0, 0, 0, 0);
            activities = activities.filter((a) => new Date(a.createdAt) >= sinceDate);
        }
        if (activities.length === 0) {
            console.log('No recent activity');
            return;
        }
        console.log(`Recent Activity (${activities.length} items)`);
        console.log('─'.repeat(70));
        for (const a of activities) {
            const date = new Date(a.createdAt);
            const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            // Format action for display
            let actionDesc = a.action;
            if ((a.action === 'status_change' || a.action === 'status_changed') && a.oldValue && a.newValue) {
                actionDesc = `${a.oldValue} → ${a.newValue}`;
            }
            else if (a.action === 'created') {
                actionDesc = 'created';
            }
            else if (a.action === 'note' && a.detail) {
                actionDesc = `note: ${a.detail.slice(0, 40)}${a.detail.length > 40 ? '...' : ''}`;
            }
            else if (a.action === 'owner_changed' && a.newValue) {
                actionDesc = `owner → ${a.newValue}`;
            }
            else if (a.action === 'blocked' && a.detail) {
                actionDesc = `blocked by ${a.detail}`;
            }
            const project = a.item.projectName ? ` [${a.item.projectName}]` : '';
            const title = a.item.title.length > 35 ? a.item.title.slice(0, 35) + '...' : a.item.title;
            console.log(`${dateStr} ${timeStr}  ${a.item.displayId.padEnd(7)}  ${actionDesc.padEnd(20)}  ${title}${project}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Workstreams Command (queries child projects, not items)
// ============================================================================
program
    .command('workstreams')
    .description('List workstreams (child projects)')
    .option('--org <org>', 'Filter by organization')
    .action(async (options) => {
    try {
        const result = await trpc.projects.list.query({
            org: options.org,
        });
        // Filter to only child projects (workstreams have a parentId)
        const workstreams = result.projects.filter((p) => p.parentId != null);
        if (workstreams.length === 0) {
            console.log('No workstreams found');
            return;
        }
        console.log(`${workstreams.length} workstreams`);
        console.log('─'.repeat(60));
        for (const ws of workstreams) {
            const status = ws.status ? `[${ws.status}]` : '';
            const org = ws.org ? `(${ws.org})` : '';
            console.log(`  ${ws.slug.padEnd(30)} ${status.padEnd(12)} ${ws.name} ${org}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Delete Command
// ============================================================================
program
    .command('delete <ids>')
    .description('Soft delete one or more items (comma-separated IDs)')
    .action(async (ids) => {
    try {
        const idList = ids.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
        const results = [];
        for (const id of idList) {
            const result = await trpc.items.delete.mutate({ id });
            results.push(`${formatTaskId(result.id)}: deleted`);
        }
        console.log(results.join('\n'));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Restore Command
// ============================================================================
program
    .command('restore <ids>')
    .description('Restore one or more soft-deleted items (comma-separated IDs)')
    .action(async (ids) => {
    try {
        const idList = ids.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
        const results = [];
        for (const id of idList) {
            const result = await trpc.items.restore.mutate({ id });
            results.push(`${formatTaskId(result.id)}: ${result.title} → restored`);
        }
        console.log(results.join('\n'));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Note Command
// ============================================================================
program
    .command('note <id> <note>')
    .description('Add a note/update to an item')
    .option('--type <type>', 'Update type (note, progress, blocker)', 'note')
    .action(async (id, note, options) => {
    try {
        const numericId = parseTaskId(id) ?? parseInt(id);
        const result = await trpc.items.addNote.mutate({
            id: numericId,
            note,
            updateType: options.type,
        });
        console.log(`Added ${result.updateType} to ${result.displayId}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Complete Command
// ============================================================================
program
    .command('complete <ids>')
    .description('Mark one or more items complete (comma-separated IDs)')
    .action(async (ids) => {
    try {
        const idList = ids.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
        const results = [];
        for (const id of idList) {
            const item = await trpc.items.complete.mutate({ id });
            results.push(`${formatTaskId(item.id)}: ${item.title} → complete`);
        }
        console.log(results.join('\n'));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Update Command
// ============================================================================
program
    .command('update <ids>')
    .description('Update one or more items (comma-separated IDs)')
    .option('--status <status>', 'New status')
    .option('--priority <n>', 'New priority (1-4)', parseInt)
    .option('--due <date>', 'New due date (YYYY-MM-DD, or "none" to clear)')
    .option('--target <period>', 'Target period (e.g., 2026-Q1, 2026-01)')
    .option('--title <text>', 'New title')
    .option('--description <text>', 'Description')
    .option('--parent <id>', 'Parent item ID (for subtasks)')
    .option('--blocked-by <ids>', 'IDs of items blocking this one (comma-separated, sets status to blocked and adds blockers)')
    .option('--add-blocker <ids>', 'Add blocker IDs (comma-separated)')
    .option('--remove-blocker <ids>', 'Remove blocker IDs (comma-separated)')
    .option('--owner <name>', 'Owner name')
    .option('--project <org/slug>', 'Project (e.g. myorg/_general)')
    .action(async (ids, options) => {
    try {
        const idList = ids.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = {};
        if (options.status)
            data.status = options.status;
        if (options.priority)
            data.priority = options.priority;
        // Handle due date - supports relative dates (today, tomorrow, +3d, etc.)
        if (options.due) {
            data.dueDate = parseDueDate(options.due);
        }
        if (options.target)
            data.targetPeriod = options.target;
        if (options.title)
            data.title = options.title;
        if (options.description)
            data.description = options.description;
        if (options.parent)
            data.parentId = parseTaskId(options.parent) ?? parseInt(options.parent);
        // Handle --blocked-by: sets status to blocked AND adds the blockers
        if (options.blockedBy) {
            data.status = 'blocked';
        }
        // Resolve owner name to ID if provided
        if (options.owner) {
            const person = await trpc.people.findByName.query({ name: options.owner });
            if (!person) {
                console.log(formatError(`Owner not found: ${options.owner}`));
                process.exit(1);
            }
            data.ownerId = person.id;
        }
        // Resolve project slug to ID if provided (supports org/slug format for disambiguation)
        if (options.project) {
            try {
                data.projectId = await resolveProjectId(options.project);
            }
            catch {
                console.log(formatError(`Project not found: ${options.project}`));
                process.exit(1);
            }
        }
        // Parse blocker IDs
        const blockersToAdd = [];
        const blockersToRemove = [];
        if (options.blockedBy) {
            const ids = options.blockedBy.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
            blockersToAdd.push(...ids);
        }
        if (options.addBlocker) {
            const ids = options.addBlocker.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
            blockersToAdd.push(...ids);
        }
        if (options.removeBlocker) {
            const ids = options.removeBlocker.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
            blockersToRemove.push(...ids);
        }
        const noDataUpdate = Object.keys(data).length === 0;
        const noBlockerUpdate = blockersToAdd.length === 0 && blockersToRemove.length === 0;
        if (noDataUpdate && noBlockerUpdate) {
            console.log(formatError('No updates specified'));
            process.exit(1);
        }
        const results = [];
        for (const id of idList) {
            // Update item fields if any
            if (!noDataUpdate) {
                const item = await trpc.items.update.mutate({ id, data });
                results.push(`${formatTaskId(item.id)}: updated`);
            }
            // Add blockers using ItemLink API
            for (const blockerId of blockersToAdd) {
                try {
                    await trpc.items.addBlocker.mutate({ itemId: id, blockerId });
                    results.push(`${formatTaskId(id)}: added blocker ${formatTaskId(blockerId)}`);
                }
                catch (e) {
                    // Ignore duplicate errors (already blocked)
                    const msg = e instanceof Error ? e.message : '';
                    if (!msg.includes('already blocks')) {
                        throw e;
                    }
                }
            }
            // Remove blockers using ItemLink API
            for (const blockerId of blockersToRemove) {
                const result = await trpc.items.removeBlocker.mutate({ itemId: id, blockerId });
                if (result.deleted) {
                    results.push(`${formatTaskId(id)}: removed blocker ${formatTaskId(blockerId)}`);
                }
            }
        }
        console.log(results.join('\n'));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Create Command
// ============================================================================
program
    .command('create <type> <title>')
    .description('Create a new item (type: task, routine)')
    .option('--owner <name>', 'Owner name')
    .option('--project <org/slug>', 'Project (e.g. myorg/_general)')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--target <period>', 'Target period (e.g., 2026-Q1)')
    .option('--priority <n>', 'Priority (1-4)', parseInt)
    .option('--description <text>', 'Description')
    .option('--parent <id>', 'Parent item ID (for subtasks)')
    .option('--blocked-by <ids>', 'IDs of items blocking this one (comma-separated)')
    .action(async (type, title, options) => {
    try {
        // First resolve owner name to ID if provided
        let ownerId;
        if (options.owner) {
            const person = await trpc.people.findByName.query({ name: options.owner });
            if (!person) {
                console.log(formatError(`Owner not found: ${options.owner}`));
                process.exit(1);
            }
            ownerId = person.id;
        }
        // Resolve project slug to ID if provided (supports org/slug format for disambiguation)
        let projectId;
        if (options.project) {
            try {
                projectId = await resolveProjectId(options.project);
            }
            catch {
                console.log(formatError(`Project not found: ${options.project}`));
                process.exit(1);
            }
        }
        const item = await trpc.items.create.mutate({
            title,
            itemType: type,
            ownerId,
            projectId,
            dueDate: options.due ? parseDueDate(options.due) : undefined,
            targetPeriod: options.target,
            priority: options.priority,
            description: options.description,
            parentId: options.parent ? (parseTaskId(options.parent) ?? parseInt(options.parent)) : undefined,
            // Set status to blocked if blockers are specified
            status: options.blockedBy ? 'blocked' : undefined,
        });
        console.log(`Created: ${formatItemLine(item)}`);
        // Add blockers using ItemLink API (supports comma-separated IDs)
        if (options.blockedBy) {
            const blockerIds = options.blockedBy.split(',').map((id) => parseTaskId(id.trim()) ?? parseInt(id.trim()));
            for (const blockerId of blockerIds) {
                try {
                    await trpc.items.addBlocker.mutate({ itemId: item.id, blockerId });
                    console.log(`  → blocked by ${formatTaskId(blockerId)}`);
                }
                catch (e) {
                    const msg = e instanceof Error ? e.message : '';
                    if (!msg.includes('already blocks')) {
                        console.log(formatError(`Failed to add blocker ${formatTaskId(blockerId)}: ${msg}`));
                    }
                }
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// People Command Group
// ============================================================================
program
    .command('people [name]')
    .description('List people or show tasks for a specific person')
    .option('--org <org>', 'Filter by organization')
    .action(async (name, options) => {
    try {
        if (name) {
            // Find person by name and show their tasks
            const result = await trpc.people.list.query({ search: name, org: options.org });
            const person = result.people[0];
            if (!person) {
                console.log(formatError(`Person not found: ${name}`));
                process.exit(1);
            }
            const personDetail = await trpc.people.get.query({ id: person.id });
            console.log(`${personDetail.name}`);
            if (personDetail.org)
                console.log(`Org: ${personDetail.org}`);
            if (personDetail.email)
                console.log(`Email: ${personDetail.email}`);
            console.log('─'.repeat(40));
            if (personDetail.ownedTasks && personDetail.ownedTasks.length > 0) {
                console.log('\nOwned tasks:');
                for (const task of personDetail.ownedTasks) {
                    const priority = task.priority ? `p${task.priority}` : '  ';
                    const due = task.dueDate || '';
                    console.log(`${task.displayId}  ${task.status.padEnd(10)}  ${priority}  ${task.title.slice(0, 40)}  ${due}`);
                }
            }
            if (personDetail.waitingOnTasks && personDetail.waitingOnTasks.length > 0) {
                console.log('\nWaiting on:');
                for (const task of personDetail.waitingOnTasks) {
                    const priority = task.priority ? `p${task.priority}` : '  ';
                    const due = task.dueDate || '';
                    console.log(`${task.displayId}  ${task.status.padEnd(10)}  ${priority}  ${task.title.slice(0, 40)}  ${due}`);
                }
            }
        }
        else {
            // List all people
            const result = await trpc.people.list.query({ org: options.org });
            for (const person of result.people) {
                const owned = person.ownedTasks ?? 0;
                const waiting = person.waitingOnTasks ?? 0;
                const org = person.org ? `[${person.org}]`.padEnd(12) : ''.padEnd(12);
                console.log(`${person.name.padEnd(20)} ${org} owned: ${owned}  waiting: ${waiting}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// people-create - Create a new person
program
    .command('people-create <name>')
    .description('Create a new person')
    .option('--email <email>', 'Email address')
    .option('--org <org>', 'Organization (ya, cbp, external, personal)')
    .option('--notes <notes>', 'Notes')
    .action(async (name, options) => {
    try {
        const person = await trpc.people.create.mutate({
            name,
            email: options.email,
            org: options.org,
            notes: options.notes,
        });
        console.log(`Created person: ${person.name} (ID: ${person.id})`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// people-update - Update a person
program
    .command('people-update <name>')
    .description('Update a person by name')
    .option('--new-name <name>', 'New name')
    .option('--email <email>', 'Email address')
    .option('--org <org>', 'Organization')
    .option('--notes <notes>', 'Notes')
    .action(async (name, options) => {
    try {
        // Find person by name
        const person = await trpc.people.findByName.query({ name });
        if (!person) {
            console.log(formatError(`Person not found: ${name}`));
            process.exit(1);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = {};
        if (options.newName)
            data.name = options.newName;
        if (options.email)
            data.email = options.email;
        if (options.org)
            data.org = options.org;
        if (options.notes)
            data.notes = options.notes;
        if (Object.keys(data).length === 0) {
            console.log(formatError('No updates specified'));
            process.exit(1);
        }
        const updated = await trpc.people.update.mutate({ id: person.id, data });
        console.log(`Updated person: ${updated.name}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// people-delete - Delete a person
program
    .command('people-delete <name>')
    .description('Delete a person by name')
    .action(async (name) => {
    try {
        // Find person by name
        const person = await trpc.people.findByName.query({ name });
        if (!person) {
            console.log(formatError(`Person not found: ${name}`));
            process.exit(1);
        }
        await trpc.people.delete.mutate({ id: person.id });
        console.log(`Deleted person: ${name}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Search Command
// ============================================================================
program
    .command('search <query>')
    .description('Search items by title')
    .action(async (query) => {
    try {
        const result = await trpc.query.search.query({ query });
        console.log(formatItemList(result.items));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Checkins Command
// ============================================================================
program
    .command('checkins')
    .description('Show tasks where check-in is due')
    .action(async () => {
    try {
        const items = await trpc.items.checkins.query({});
        console.log(formatItemList(items));
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Routines Command Group
// ============================================================================
const routines = program
    .command('routines')
    .description('Manage recurring routines');
// routines due - Show routines due today
routines
    .command('due')
    .description('Show routines due today (or specified date)')
    .option('--date <date>', 'Date to check (YYYY-MM-DD)')
    .action(async (options) => {
    try {
        const result = await trpc.routines.due.query(options.date ? { date: options.date } : {});
        console.log(`Routines for ${result.date}`);
        console.log('─'.repeat(60));
        if (result.pending.length > 0) {
            console.log(`\nPending (${result.pendingCount}):`);
            for (const r of result.pending) {
                const priority = r.priority ? `p${r.priority}` : '  ';
                const project = r.projectName ? ` [${r.projectName}]` : '';
                console.log(`  ${r.id.toString().padStart(4)}  ${priority}  ${r.title}${project}`);
            }
        }
        if (result.completed.length > 0) {
            console.log(`\nCompleted (${result.completedCount}):`);
            for (const r of result.completed) {
                console.log(`  ${r.id.toString().padStart(4)}  ✓   ${r.title}`);
            }
        }
        if (result.total === 0) {
            console.log('No routines due.');
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines overdue - Show overdue routines
routines
    .command('overdue')
    .description('Show overdue routines')
    .action(async () => {
    try {
        const result = await trpc.routines.overdue.query();
        if (result.totalOverdue === 0) {
            console.log('No overdue routines.');
            return;
        }
        console.log(`${result.totalOverdue} overdue routines (${result.totalMissedInstances} missed instances)`);
        console.log('─'.repeat(60));
        for (const r of result.routines) {
            console.log(`\n${r.id}: ${r.title}`);
            console.log(`   Rule: ${r.recurrenceRule}`);
            console.log(`   Overdue: ${r.daysOverdue} day(s) - ${r.overdueDates.join(', ')}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines complete - Complete a routine
routines
    .command('complete <id>')
    .description('Mark a routine as complete for today')
    .option('--date <date>', 'Date to complete for (YYYY-MM-DD)')
    .option('--notes <notes>', 'Completion notes')
    .action(async (id, options) => {
    try {
        const routineId = parseInt(id);
        const result = await trpc.routines.complete.mutate({
            id: routineId,
            date: options.date,
            notes: options.notes,
        });
        if (result.alreadyCompleted) {
            console.log(`Routine ${result.routineId} was already completed for ${result.date}`);
        }
        else {
            console.log(`Routine ${result.routineId} completed for ${result.date}`);
            if (result.diarySync.synced) {
                console.log(`  Logged to diary: ${result.diarySync.diaryPath}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines skip - Skip a routine
routines
    .command('skip <id>')
    .description('Skip a routine for today')
    .option('--date <date>', 'Date to skip (YYYY-MM-DD)')
    .option('--notes <notes>', 'Skip reason')
    .action(async (id, options) => {
    try {
        const routineId = parseInt(id);
        const result = await trpc.routines.skip.mutate({
            id: routineId,
            date: options.date,
            notes: options.notes,
        });
        if (result.alreadySkipped) {
            console.log(`Routine ${result.routineId} was already skipped for ${result.date}`);
        }
        else {
            console.log(`Routine ${result.routineId} skipped for ${result.date}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines skip-all-overdue - Skip all overdue instances
routines
    .command('skip-all-overdue <id>')
    .description('Skip all overdue instances of a routine')
    .action(async (id) => {
    try {
        const routineId = parseInt(id);
        const result = await trpc.routines.skipAllOverdue.mutate({ id: routineId });
        if (result.skippedCount === 0) {
            console.log(`Routine ${result.routineId} has no overdue instances`);
        }
        else {
            console.log(`Routine ${result.routineId}: skipped ${result.skippedCount} overdue instance(s)`);
            console.log(`  Dates skipped: ${result.datesSkipped?.join(', ')}`);
            console.log(`  Next due: ${result.nextDue}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines list - List all routine templates
routines
    .command('list')
    .description('List all routine templates')
    .action(async () => {
    try {
        const result = await trpc.routines.list.query();
        console.log(`${result.count} routines`);
        console.log('─'.repeat(60));
        for (const r of result.routines) {
            const priority = r.priority ? `p${r.priority}` : '  ';
            const project = r.projectName ? ` [${r.projectName}]` : '';
            const lastDone = r.lastCompleted ? ` (last: ${r.lastCompleted})` : '';
            console.log(`${r.id.toString().padStart(4)}  ${priority}  ${r.recurrenceRule.padEnd(10)}  ${r.title}${project}${lastDone}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines get - Get a specific routine with history
routines
    .command('get <id>')
    .description('Get routine details with completion history')
    .action(async (id) => {
    try {
        const routineId = parseInt(id);
        const result = await trpc.routines.get.query({ id: routineId });
        console.log(`Routine ${result.id}: ${result.title}`);
        console.log('─'.repeat(60));
        console.log(`Description:  ${result.description || '-'}`);
        console.log(`Priority:     ${result.priority ? `P${result.priority}` : '-'}`);
        console.log(`Owner:        ${result.ownerName || '-'}`);
        console.log(`Project:      ${result.projectFullPath || '-'}`);
        console.log(`Rule:         ${result.recurrenceRule}`);
        if (result.recurrenceTime)
            console.log(`Time:         ${result.recurrenceTime}`);
        if (result.recurrenceDays)
            console.log(`Days:         ${result.recurrenceDays}`);
        if (result.history && result.history.length > 0) {
            console.log(`\nRecent completions:`);
            for (const h of result.history.slice(0, 10)) {
                const notes = h.notes ? ` - ${h.notes}` : '';
                console.log(`  ✓ ${h.completed_date}${notes}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines create - Create a new routine
routines
    .command('create <title>')
    .description('Create a new routine')
    .requiredOption('--rule <rule>', 'Recurrence rule (daily, weekly, monthly, bimonthly, yearly)')
    .option('--time <time>', 'Time of day (HH:MM)')
    .option('--days <days>', 'Days (for custom, comma-separated: mon,tue,wed or 1,2,3)')
    .option('--priority <n>', 'Priority (1-4)', parseInt)
    .option('--owner <name>', 'Owner name')
    .option('--project <org/slug>', 'Project (e.g. myorg/_general)')
    .option('--description <text>', 'Description')
    .action(async (title, options) => {
    try {
        // Resolve owner name to ID if provided
        let ownerId;
        if (options.owner) {
            const person = await trpc.people.findByName.query({ name: options.owner });
            if (!person) {
                console.log(formatError(`Owner not found: ${options.owner}`));
                process.exit(1);
            }
            ownerId = person.id;
        }
        // Resolve project slug to ID if provided (supports org/slug format for disambiguation)
        let projectId;
        if (options.project) {
            try {
                projectId = await resolveProjectId(options.project);
            }
            catch {
                console.log(formatError(`Project not found: ${options.project}`));
                process.exit(1);
            }
        }
        // Parse days if provided
        let recurrenceDays;
        if (options.days) {
            recurrenceDays = options.days.split(',').map((d) => d.trim());
        }
        const result = await trpc.routines.create.mutate({
            title,
            recurrenceRule: options.rule,
            recurrenceTime: options.time,
            recurrenceDays,
            priority: options.priority,
            ownerId,
            projectId,
            description: options.description,
        });
        console.log(`Created routine ${result.id}: ${result.title} (${result.recurrenceRule})`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines update - Update a routine
routines
    .command('update <id>')
    .description('Update a routine')
    .option('--title <text>', 'New title')
    .option('--rule <rule>', 'Recurrence rule')
    .option('--time <time>', 'Time of day')
    .option('--days <days>', 'Days (comma-separated)')
    .option('--priority <n>', 'Priority (1-4)', parseInt)
    .option('--description <text>', 'Description')
    .action(async (id, options) => {
    try {
        const routineId = parseInt(id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = {};
        if (options.title)
            data.title = options.title;
        if (options.rule)
            data.recurrenceRule = options.rule;
        if (options.time)
            data.recurrenceTime = options.time;
        if (options.days)
            data.recurrenceDays = options.days.split(',').map((d) => d.trim());
        if (options.priority)
            data.priority = options.priority;
        if (options.description)
            data.description = options.description;
        if (Object.keys(data).length === 0) {
            console.log(formatError('No updates specified'));
            process.exit(1);
        }
        await trpc.routines.update.mutate({ id: routineId, data });
        console.log(`Routine ${routineId} updated`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines delete - Delete a routine
routines
    .command('delete <id>')
    .description('Delete a routine and its history')
    .action(async (id) => {
    try {
        const routineId = parseInt(id);
        await trpc.routines.delete.mutate({ id: routineId });
        console.log(`Routine ${routineId} deleted`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines uncomplete - Undo a routine completion
routines
    .command('uncomplete <id>')
    .description('Undo routine completion for a date')
    .option('--date <date>', 'Date to uncomplete (YYYY-MM-DD)')
    .action(async (id, options) => {
    try {
        const routineId = parseInt(id);
        const result = await trpc.routines.uncomplete.mutate({
            id: routineId,
            date: options.date,
        });
        if (result.wasCompleted) {
            console.log(`Routine ${result.routineId} uncompleted for ${result.date}`);
        }
        else {
            console.log(`Routine ${result.routineId} was not completed for ${result.date}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// routines unskip - Undo skipping a routine
routines
    .command('unskip <id>')
    .description('Undo skipping a routine for a date')
    .option('--date <date>', 'Date to unskip (YYYY-MM-DD)')
    .action(async (id, options) => {
    try {
        const routineId = parseInt(id);
        const result = await trpc.routines.unskip.mutate({
            id: routineId,
            date: options.date,
        });
        if (result.wasSkipped) {
            console.log(`Routine ${result.routineId} unskipped for ${result.date}`);
        }
        else {
            console.log(`Routine ${result.routineId} was not skipped for ${result.date}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Sync Command Group
// ============================================================================
const sync = program
    .command('sync')
    .description('Sync operations for meetings and filesystem');
// sync meeting-preview - Preview what would be synced from a meeting
sync
    .command('meeting-preview <path>')
    .description('Preview what would be synced from a meeting')
    .action(async (path) => {
    try {
        const result = await trpc.sync.meetingPreview.query({ path });
        console.log(`Meeting: ${result.title}`);
        console.log(`Path: ${result.path}`);
        console.log(`Date: ${result.date}`);
        console.log(`Attendees: ${result.attendees.join(', ')}`);
        if (result.primaryProject) {
            console.log(`Primary Project: ${result.primaryProject}`);
        }
        console.log('─'.repeat(60));
        console.log(`\n${result.actionsCount} actions found`);
        console.log(`  Would create: ${result.wouldCreate}`);
        console.log(`  Would skip: ${result.wouldSkip}`);
        if (result.actions.length > 0) {
            console.log('\nActions:');
            for (const a of result.actions) {
                const status = a.wouldCreate ? '+ CREATE' : a.isDeleted ? '- DELETED' : '○ SKIP';
                const existingId = a.existingTaskId ? ` (${formatTaskId(a.existingTaskId)})` : '';
                console.log(`  ${status}: ${a.action.slice(0, 50)}${existingId}`);
                console.log(`          Owner: ${a.owner || '-'}, Due: ${a.due || '-'}, Status: ${a.status}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// sync meeting - Sync actions from a meeting file to database
sync
    .command('meeting <path>')
    .description('Sync actions from a meeting file to database')
    .option('--dry-run', 'Preview without making changes')
    .action(async (path, options) => {
    try {
        const result = await trpc.sync.meeting.mutate({ path, dryRun: options.dryRun });
        console.log(`Meeting: ${result.meetingTitle}`);
        console.log('─'.repeat(60));
        console.log(`Actions found: ${result.actionsFound}`);
        console.log(`Tasks created: ${result.tasksCreated}`);
        console.log(`Tasks updated: ${result.tasksUpdated}`);
        console.log(`Tasks skipped: ${result.tasksSkipped}`);
        if (result.taskIds.length > 0) {
            console.log(`\nTask IDs: ${result.taskIds.map(formatTaskId).join(', ')}`);
        }
        if (result.errors.length > 0) {
            console.log('\nErrors:');
            for (const e of result.errors) {
                console.log(`  ${e}`);
            }
        }
        if (result.dryRun) {
            console.log('\n(Dry run - no changes made)');
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// sync filesystem-preview - Preview projects found in filesystem
sync
    .command('filesystem-preview')
    .description('Preview projects found in filesystem (including workstreams)')
    .action(async () => {
    try {
        const result = await trpc.sync.filesystemPreview.query();
        console.log(`${result.total} projects found`);
        console.log('─'.repeat(60));
        for (const p of result.projects) {
            const status = p.status ? `[${p.status}]` : '';
            const parent = p.isSubProject ? `  (child of ${p.parentSlug})` : '';
            console.log(`  ${p.slug.padEnd(30)} ${status.padEnd(12)} ${p.name} (${p.org})${parent}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// sync filesystem - Sync all projects (including workstreams) to database
sync
    .command('filesystem')
    .description('Sync all projects (including workstreams) to database')
    .action(async () => {
    try {
        const result = await trpc.sync.filesystem.mutate();
        console.log('Project sync complete');
        console.log('─'.repeat(60));
        console.log(`Projects found: ${result.projectsFound}`);
        console.log(`  Created: ${result.projectsCreated}`);
        console.log(`  Updated: ${result.projectsUpdated}`);
        if (result.errors.length > 0) {
            console.log(`\n${result.errors.length} errors:`);
            for (const e of result.errors) {
                console.log(`  ${e}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Projects Command Group
// ============================================================================
program
    .command('projects [slug]')
    .description('List projects or get project details')
    .option('--org <org>', 'Filter by organization')
    .option('--status <status>', 'Filter by status')
    .action(async (slug, options) => {
    try {
        if (slug) {
            const project = await trpc.projects.get.query({ slug, org: options.org });
            console.log(`${project.name} (${project.slug})`);
            console.log('─'.repeat(40));
            console.log(`Org:      ${project.org}`);
            console.log(`Status:   ${project.status || '-'}`);
            console.log(`Priority: ${project.priority ? `P${project.priority}` : '-'}`);
            if (project.parentSlug) {
                console.log(`Parent:   ${project.parentSlug}`);
            }
            if (project.description) {
                console.log(`\n${project.description}`);
            }
            if (project.taskStats) {
                console.log(`\nTasks: ${project.taskStats.total} total, ${project.taskStats.pending} pending, ${project.taskStats.complete} complete`);
            }
            if (project.children && project.children.length > 0) {
                console.log(`\nSub-projects:`);
                for (const child of project.children) {
                    const status = child.status ? `[${child.status}]` : '';
                    console.log(`  ${child.slug.padEnd(25)} ${status.padEnd(12)} ${child.name}`);
                }
            }
        }
        else {
            const result = await trpc.projects.list.query({
                org: options.org,
                status: options.status,
            });
            for (const p of result.projects) {
                const status = p.status ? `[${p.status}]` : '';
                console.log(`${p.org}/${p.slug.padEnd(25)} ${status.padEnd(12)} ${p.name}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// projects-create - Create a new project
program
    .command('projects-create <slug> <name>')
    .description('Create a new project')
    .requiredOption('--org <org>', 'Organization (acme-corp, example-org, consulting, personal, other)')
    .option('--status <status>', 'Status (active, planning, paused, completed, archived)')
    .option('--priority <n>', 'Priority (1-4)', parseInt)
    .option('--parent <slug>', 'Parent project slug')
    .option('--description <text>', 'Description')
    .action(async (slug, name, options) => {
    try {
        // Resolve parent slug to ID if provided
        let parentId;
        if (options.parent) {
            try {
                const parent = await trpc.projects.get.query({ slug: options.parent });
                parentId = parent.id;
            }
            catch {
                console.log(formatError(`Parent project not found: ${options.parent}`));
                process.exit(1);
            }
        }
        const project = await trpc.projects.create.mutate({
            slug,
            name,
            org: options.org,
            status: options.status,
            priority: options.priority,
            parentId,
            description: options.description,
        });
        console.log(`Created project: ${project.org}/${project.slug} - ${project.name}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// projects-update - Update a project
program
    .command('projects-update <slug>')
    .description('Update a project')
    .option('--org <org>', 'Organization (to find the project)')
    .option('--name <name>', 'New name')
    .option('--new-slug <slug>', 'New slug')
    .option('--new-org <org>', 'New organization')
    .option('--status <status>', 'Status')
    .option('--priority <n>', 'Priority (1-4)', parseInt)
    .option('--description <text>', 'Description')
    .action(async (slug, options) => {
    try {
        // Find project
        const project = await trpc.projects.get.query({ slug, org: options.org });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = {};
        if (options.name)
            data.name = options.name;
        if (options.newSlug)
            data.slug = options.newSlug;
        if (options.newOrg)
            data.org = options.newOrg;
        if (options.status)
            data.status = options.status;
        if (options.priority)
            data.priority = options.priority;
        if (options.description)
            data.description = options.description;
        if (Object.keys(data).length === 0) {
            console.log(formatError('No updates specified'));
            process.exit(1);
        }
        const updated = await trpc.projects.update.mutate({ id: project.id, data });
        console.log(`Updated project: ${updated.org}/${updated.slug}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// projects-delete - Delete a project
program
    .command('projects-delete <slug>')
    .description('Delete a project')
    .option('--org <org>', 'Organization (to find the project)')
    .option('--cascade-items', 'Delete all items in the project (soft delete)')
    .option('--orphan-items', 'Move items to parent project (or unassign)')
    .option('--cascade-children', 'Delete all child projects recursively')
    .option('--orphan-children', 'Move child projects to parent (or make top-level)')
    .option('--force', 'Shorthand for --cascade-items --cascade-children')
    .action(async (slug, options) => {
    try {
        // Find project
        const project = await trpc.projects.get.query({ slug, org: options.org });
        // Determine cascade options
        let onItems = 'fail';
        let onChildren = 'fail';
        if (options.force) {
            onItems = 'cascade';
            onChildren = 'cascade';
        }
        else {
            if (options.cascadeItems)
                onItems = 'cascade';
            else if (options.orphanItems)
                onItems = 'orphan';
            if (options.cascadeChildren)
                onChildren = 'cascade';
            else if (options.orphanChildren)
                onChildren = 'orphan';
        }
        const result = await trpc.projects.delete.mutate({
            id: project.id,
            onItems,
            onChildren,
        });
        console.log(`Deleted project: ${result.org}/${result.slug}`);
        if (result.itemsAffected > 0) {
            console.log(`  Items affected: ${result.itemsAffected}`);
        }
        if (result.childrenAffected > 0) {
            console.log(`  Child projects affected: ${result.childrenAffected}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Organizations Command Group
// ============================================================================
program
    .command('orgs [slug]')
    .description('List organizations or get organization details')
    .action(async (slug) => {
    try {
        if (slug) {
            const org = await trpc.organizations.get.query({ slug });
            console.log(`${org.name} (${org.slug})`);
            console.log('─'.repeat(40));
            if (org.shortName)
                console.log(`Short name:  ${org.shortName}`);
            if (org.description)
                console.log(`Description: ${org.description}`);
            console.log(`Projects:    ${org.projectCount}`);
            console.log(`People:      ${org.peopleCount}`);
            console.log(`Created:     ${org.createdAt.split('T')[0]}`);
        }
        else {
            const result = await trpc.organizations.list.query();
            console.log(`${result.count} organizations`);
            console.log('─'.repeat(60));
            for (const org of result.organizations) {
                const shortName = org.shortName ? ` (${org.shortName})` : '';
                const description = org.description ? ` - ${org.description.slice(0, 40)}` : '';
                console.log(`${org.slug.padEnd(20)} ${org.name}${shortName}${description}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// orgs-create - Create a new organization
program
    .command('orgs-create <slug> <name>')
    .description('Create a new organization')
    .option('--short-name <name>', 'Short name (e.g., YA, ExOrg)')
    .option('--description <text>', 'Description')
    .action(async (slug, name, options) => {
    try {
        const org = await trpc.organizations.create.mutate({
            slug,
            name,
            shortName: options.shortName,
            description: options.description,
        });
        console.log(`Created organization: ${org.slug} - ${org.name}`);
        if (org.shortName)
            console.log(`  Short name: ${org.shortName}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// orgs-update - Update an organization
program
    .command('orgs-update <slug>')
    .description('Update an organization')
    .option('--name <name>', 'New name')
    .option('--short-name <name>', 'New short name (use empty string to clear)')
    .option('--description <text>', 'New description')
    .action(async (slug, options) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = {};
        if (options.name)
            data.name = options.name;
        if (options.shortName !== undefined) {
            data.shortName = options.shortName === '' ? null : options.shortName;
        }
        if (options.description !== undefined) {
            data.description = options.description === '' ? null : options.description;
        }
        if (Object.keys(data).length === 0) {
            console.log(formatError('No updates specified'));
            process.exit(1);
        }
        const updated = await trpc.organizations.update.mutate({ slug, data });
        console.log(`Updated organization: ${updated.slug} - ${updated.name}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// orgs-delete - Delete an organization
program
    .command('orgs-delete <slug>')
    .description('Delete an organization (fails if projects/people reference it unless --force)')
    .option('--force', 'Force delete: cascade-delete all projects/items, unlink people')
    .option('--delete-people', 'With --force: also delete people (default: just unlink)')
    .action(async (slug, options) => {
    try {
        if (options.force) {
            const result = await trpc.organizations.deleteForce.mutate({
                slug,
                deleteItems: true,
                deletePeople: options.deletePeople || false,
            });
            console.log(`Deleted organization: ${slug}`);
            if (result.projectsDeleted > 0) {
                console.log(`  Projects deleted: ${result.projectsDeleted}`);
            }
            if (result.peopleAffected > 0) {
                const action = options.deletePeople ? 'deleted' : 'unlinked';
                console.log(`  People ${action}: ${result.peopleAffected}`);
            }
        }
        else {
            const result = await trpc.organizations.delete.mutate({ slug });
            if (result.deleted) {
                console.log(`Deleted organization: ${slug}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Check-in Management Commands
// ============================================================================
program
    .command('checkin-add <id> <date>')
    .description('Add a check-in date to an item')
    .option('--note <note>', 'Check-in note')
    .action(async (id, date, options) => {
    try {
        const numericId = parseTaskId(id) ?? parseInt(id);
        const result = await trpc.items.addCheckin.mutate({
            itemId: numericId,
            date,
            note: options.note,
        });
        console.log(`Check-in added: ${result.itemDisplayId} on ${result.date}`);
        if (result.note)
            console.log(`  Note: ${result.note}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('checkin-list <id>')
    .description('List check-ins for an item')
    .option('--include-completed', 'Include completed check-ins')
    .action(async (id, options) => {
    try {
        const numericId = parseTaskId(id) ?? parseInt(id);
        const result = await trpc.items.listCheckins.query({
            itemId: numericId,
            includeCompleted: options.includeCompleted,
        });
        console.log(`Check-ins for ${result.displayId}`);
        console.log('─'.repeat(40));
        if (result.checkins.length === 0) {
            console.log('No check-ins');
            return;
        }
        for (const c of result.checkins) {
            const status = c.completed ? '✓' : '○';
            const note = c.note ? ` - ${c.note}` : '';
            console.log(`  ${status} ${c.date}${note} (ID: ${c.id})`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('checkin-delete <checkinId>')
    .description('Delete a check-in')
    .action(async (checkinId) => {
    try {
        const id = parseInt(checkinId);
        await trpc.items.deleteCheckin.mutate({ id });
        console.log(`Check-in ${id} deleted`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('checkin-complete <id>')
    .description('Complete a check-in for an item')
    .option('--checkin-id <id>', 'Specific check-in ID to complete')
    .option('--clear', 'Clear all pending check-ins')
    .action(async (id, options) => {
    try {
        const numericId = parseTaskId(id) ?? parseInt(id);
        const result = await trpc.items.completeCheckin.mutate({
            id: numericId,
            checkinId: options.checkinId ? parseInt(options.checkinId) : undefined,
            clear: options.clear,
        });
        console.log(`Check-in completed for ${result.displayId}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Item Links Commands
// ============================================================================
program
    .command('link-add <fromId> <linkType> <toId>')
    .description('Add a link between two items (linkType: blocks, related, duplicate)')
    .action(async (fromId, linkType, toId) => {
    try {
        if (!['blocks', 'related', 'duplicate'].includes(linkType)) {
            console.log(formatError('Link type must be: blocks, related, or duplicate'));
            process.exit(1);
        }
        const result = await trpc.items.addLink.mutate({
            fromId,
            toId,
            linkType: linkType,
        });
        console.log(`Link added: ${result.fromDisplayId} ${result.linkType} ${result.toDisplayId}`);
        console.log(`  From: ${result.fromTitle}`);
        console.log(`  To:   ${result.toTitle}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('link-remove <fromId> <linkType> <toId>')
    .description('Remove a link between two items')
    .action(async (fromId, linkType, toId) => {
    try {
        if (!['blocks', 'related', 'duplicate'].includes(linkType)) {
            console.log(formatError('Link type must be: blocks, related, or duplicate'));
            process.exit(1);
        }
        const result = await trpc.items.removeLink.mutate({
            fromId,
            toId,
            linkType: linkType,
        });
        if (result.deleted) {
            console.log(`Link removed: ${result.fromDisplayId} ${result.linkType} ${result.toDisplayId}`);
        }
        else {
            console.log('Link not found');
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('links <id>')
    .description('Show all links for an item')
    .action(async (id) => {
    try {
        const result = await trpc.items.getLinks.query({ id });
        console.log(`Links for ${result.displayId}`);
        console.log('─'.repeat(60));
        if (result.outgoing.length === 0 && result.incoming.length === 0) {
            console.log('No links');
            return;
        }
        if (result.outgoing.length > 0) {
            console.log('\nOutgoing links:');
            for (const l of result.outgoing) {
                const status = l.targetStatus !== 'complete' ? '' : ' ✓';
                console.log(`  ${l.linkType.padEnd(10)} → ${l.targetDisplayId}  ${l.targetTitle}${status}`);
            }
        }
        if (result.incoming.length > 0) {
            console.log('\nIncoming links:');
            for (const l of result.incoming) {
                const status = l.sourceStatus !== 'complete' ? '' : ' ✓';
                console.log(`  ${l.linkType.padEnd(10)} ← ${l.sourceDisplayId}  ${l.sourceTitle}${status}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Item Person Commands
// ============================================================================
program
    .command('person-add <itemId> <personName> <role>')
    .description('Add a person with a role to an item (role: assignee, waiting_on, stakeholder, reviewer, cc)')
    .action(async (itemId, personName, role) => {
    try {
        const validRoles = ['assignee', 'waiting_on', 'stakeholder', 'reviewer', 'cc'];
        if (!validRoles.includes(role)) {
            console.log(formatError(`Role must be: ${validRoles.join(', ')}`));
            process.exit(1);
        }
        const result = await trpc.items.addPerson.mutate({
            itemId,
            personName,
            role: role,
        });
        console.log(`Added ${result.personName} as ${result.role} to ${result.itemDisplayId}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('person-remove <itemId> <personName> <role>')
    .description('Remove a person role from an item')
    .action(async (itemId, personName, role) => {
    try {
        const validRoles = ['assignee', 'waiting_on', 'stakeholder', 'reviewer', 'cc'];
        if (!validRoles.includes(role)) {
            console.log(formatError(`Role must be: ${validRoles.join(', ')}`));
            process.exit(1);
        }
        const result = await trpc.items.removePerson.mutate({
            itemId,
            personName,
            role: role,
        });
        if (result.deleted) {
            console.log(`Removed ${role} role from ${result.itemDisplayId}`);
        }
        else {
            console.log('Role not found');
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('item-people <id>')
    .description('Show all people associated with an item')
    .action(async (id) => {
    try {
        const result = await trpc.items.getPeople.query({ id });
        console.log(`People for ${result.displayId}`);
        console.log('─'.repeat(50));
        if (result.people.length === 0) {
            console.log('No people associated');
            return;
        }
        for (const p of result.people) {
            const org = p.personOrg ? ` [${p.personOrg}]` : '';
            console.log(`  ${p.role.padEnd(12)}  ${p.personName}${org}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Tags Commands
// ============================================================================
const tags = program
    .command('tags')
    .description('Manage tags');
// tags list - List all tags
tags
    .command('list')
    .description('List all tags')
    .option('--search <query>', 'Search tags')
    .action(async (options) => {
    try {
        const result = await trpc.tags.list.query(options.search ? { search: options.search } : undefined);
        if (result.length === 0) {
            console.log('No tags found');
            return;
        }
        console.log(`${result.length} tags`);
        console.log('─'.repeat(50));
        for (const t of result) {
            const color = t.color ? ` (${t.color})` : '';
            const count = t.itemCount ? ` [${t.itemCount} items]` : '';
            console.log(`  ${t.id.toString().padStart(3)}  ${t.name}${color}${count}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// tags get - Get tag details
tags
    .command('get <nameOrId>')
    .description('Get tag details with items')
    .action(async (nameOrId) => {
    try {
        const isNumeric = /^\d+$/.test(nameOrId);
        const result = await trpc.tags.get.query(isNumeric ? { id: parseInt(nameOrId) } : { name: nameOrId });
        console.log(`Tag: ${result.name} (ID: ${result.id})`);
        if (result.color)
            console.log(`Color: ${result.color}`);
        if (result.description)
            console.log(`Description: ${result.description}`);
        console.log('─'.repeat(50));
        if (result.items.length === 0) {
            console.log('No items with this tag');
            return;
        }
        console.log(`\n${result.items.length} items:`);
        for (const item of result.items) {
            const status = item.status === 'complete' ? '✓' : '○';
            console.log(`  ${status} ${formatTaskId(item.id)}  ${item.title}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// tags create - Create a new tag
tags
    .command('create <name>')
    .description('Create a new tag')
    .option('--color <color>', 'Tag color (hex or name)')
    .option('--description <text>', 'Tag description')
    .action(async (name, options) => {
    try {
        const result = await trpc.tags.create.mutate({
            name,
            color: options.color,
            description: options.description,
        });
        console.log(`Created tag: ${result.name} (ID: ${result.id})`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// tags update - Update a tag
tags
    .command('update <id>')
    .description('Update a tag')
    .option('--name <name>', 'New name')
    .option('--color <color>', 'New color')
    .option('--description <text>', 'New description')
    .action(async (id, options) => {
    try {
        const tagId = parseInt(id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = { id: tagId };
        if (options.name)
            data.name = options.name;
        if (options.color !== undefined)
            data.color = options.color || null;
        if (options.description !== undefined)
            data.description = options.description || null;
        const result = await trpc.tags.update.mutate(data);
        console.log(`Updated tag: ${result.name}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// tags delete - Delete a tag
tags
    .command('delete <id>')
    .description('Delete a tag')
    .action(async (id) => {
    try {
        const tagId = parseInt(id);
        await trpc.tags.delete.mutate({ id: tagId });
        console.log(`Tag ${tagId} deleted`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// Item tag commands (not under tags subcommand for ease of use)
program
    .command('tag-add <itemId> <tagName>')
    .description('Add a tag to an item')
    .action(async (itemId, tagName) => {
    try {
        const result = await trpc.items.addTag.mutate({
            itemId,
            tagName,
        });
        console.log(`Added tag "${result.tagName}" to ${result.itemDisplayId}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('tag-remove <itemId> <tagName>')
    .description('Remove a tag from an item')
    .action(async (itemId, tagName) => {
    try {
        const result = await trpc.items.removeTag.mutate({
            itemId,
            tagName,
        });
        if (result.deleted) {
            console.log(`Removed tag from ${result.itemDisplayId}`);
        }
        else {
            console.log('Tag not found on item');
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('item-tags <id>')
    .description('Show all tags for an item')
    .action(async (id) => {
    try {
        const result = await trpc.items.getTags.query({ id });
        console.log(`Tags for ${result.displayId}`);
        console.log('─'.repeat(40));
        if (result.tags.length === 0) {
            console.log('No tags');
            return;
        }
        for (const t of result.tags) {
            const color = t.color ? ` (${t.color})` : '';
            console.log(`  ${t.name}${color}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// History Command
// ============================================================================
program
    .command('history <id>')
    .description('Show activity history for an item')
    .action(async (id) => {
    try {
        const numericId = parseTaskId(id) ?? parseInt(id);
        const item = await trpc.items.get.query({ id: numericId });
        console.log(`History for ${item.displayId}: ${item.title}`);
        console.log('─'.repeat(60));
        if (!item.updates || item.updates.length === 0) {
            console.log('No activity recorded');
            return;
        }
        for (const update of item.updates) {
            const date = new Date(update.created_at).toLocaleDateString();
            const time = new Date(update.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const action = update.update_type || 'note';
            let detail = update.note || '';
            if (update.old_status && update.new_status) {
                detail = `${update.old_status} → ${update.new_status}${detail ? ': ' + detail : ''}`;
            }
            console.log(`${date} ${time}  [${action}]  ${detail}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Subtasks Command
// ============================================================================
program
    .command('subtasks <id>')
    .description('Show subtasks for an item')
    .action(async (id) => {
    try {
        const numericId = parseTaskId(id) ?? parseInt(id);
        const item = await trpc.items.get.query({ id: numericId });
        console.log(`Subtasks for ${item.displayId}: ${item.title}`);
        console.log('─'.repeat(60));
        if (!item.subtasks || item.subtasks.length === 0) {
            console.log('No subtasks');
            return;
        }
        for (const subtask of item.subtasks) {
            const status = subtask.status === 'complete' ? '✓' : '○';
            const priority = subtask.priority ? `p${subtask.priority}` : '  ';
            console.log(`  ${status} ${subtask.displayId}  ${priority}  ${subtask.title}`);
        }
        console.log(`\nProgress: ${item.subtasksComplete}/${item.subtaskCount} complete`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// ============================================================================
// Focus Commands
// ============================================================================
program
    .command('focus')
    .description('Record or view daily focus rating')
    .option('--user <rating>', 'User focus rating (1-5)', parseInt)
    .option('--ai <rating>', 'AI-assessed focus rating (1-5)', parseInt)
    .option('--notes <notes>', 'User notes about focus')
    .option('--ai-notes <notes>', 'AI notes about focus patterns')
    .option('--date <date>', 'Date to record (YYYY-MM-DD, default: today)')
    .action(async (options) => {
    try {
        // If no ratings provided, show today's entry
        if (!options.user && !options.ai && !options.notes && !options.aiNotes) {
            const date = options.date || new Date().toISOString().split('T')[0];
            const result = await trpc.focus.get.query({ date });
            if (!result.entry) {
                console.log(`No focus entry for ${date}`);
                return;
            }
            const entry = result.entry;
            console.log(`Focus for ${entry.date}`);
            console.log('─'.repeat(40));
            console.log(`User rating:  ${entry.userRating ?? '-'}/5`);
            console.log(`AI rating:    ${entry.aiRating ?? '-'}/5`);
            if (entry.userNotes)
                console.log(`User notes:   ${entry.userNotes}`);
            if (entry.aiNotes)
                console.log(`AI notes:     ${entry.aiNotes}`);
            return;
        }
        // Record/update focus entry
        const date = options.date || new Date().toISOString().split('T')[0];
        const result = await trpc.focus.upsert.mutate({
            date,
            userRating: options.user,
            aiRating: options.ai,
            userNotes: options.notes,
            aiNotes: options.aiNotes,
        });
        if (result.created) {
            console.log(`Focus entry created for ${result.date}`);
        }
        else {
            console.log(`Focus entry updated for ${result.date}`);
        }
        if (options.user)
            console.log(`  User rating: ${options.user}/5`);
        if (options.ai)
            console.log(`  AI rating: ${options.ai}/5`);
        if (options.notes)
            console.log(`  Notes: ${options.notes}`);
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('focus-list')
    .description('List focus ratings')
    .option('--month <month>', 'Filter by month (YYYY-MM)')
    .option('--week', 'Show last 7 days')
    .option('--limit <n>', 'Number of entries to show', parseInt)
    .action(async (options) => {
    try {
        let startDate;
        let endDate;
        if (options.month) {
            startDate = `${options.month}-01`;
            const [year, month] = options.month.split('-').map(Number);
            const lastDay = new Date(year, month, 0).getDate();
            endDate = `${options.month}-${lastDay.toString().padStart(2, '0')}`;
        }
        else if (options.week) {
            const today = new Date();
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            startDate = weekAgo.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
        }
        const result = await trpc.focus.list.query({
            startDate,
            endDate,
            limit: options.limit || 30,
        });
        if (result.entries.length === 0) {
            console.log('No focus entries found');
            return;
        }
        console.log(`Focus entries (${result.entries.length})`);
        console.log('─'.repeat(60));
        console.log('Date         User  AI    Notes');
        console.log('─'.repeat(60));
        for (const entry of result.entries) {
            const userR = entry.userRating !== null ? entry.userRating.toString() : '-';
            const aiR = entry.aiRating !== null ? entry.aiRating.toString() : '-';
            const notes = entry.userNotes ? entry.userNotes.slice(0, 35) : '';
            console.log(`${entry.date}   ${userR.padStart(2)}/5  ${aiR.padStart(2)}/5  ${notes}`);
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
program
    .command('focus-summary')
    .description('Show focus rating summary and trends')
    .option('--period <period>', 'Period: week, month, all (default: month)')
    .action(async (options) => {
    try {
        const result = await trpc.focus.summary.query({
            period: options.period,
        });
        console.log(`Focus Summary (${result.period})`);
        console.log('─'.repeat(50));
        console.log(`Entries:          ${result.entryCount}`);
        console.log(`Avg user rating:  ${result.avgUserRating ?? '-'}/5`);
        console.log(`Avg AI rating:    ${result.avgAiRating ?? '-'}/5`);
        if (result.weeklyBreakdown && result.weeklyBreakdown.length > 0) {
            console.log('\nWeekly breakdown:');
            console.log('Week of       User  AI    Entries');
            console.log('─'.repeat(40));
            for (const week of result.weeklyBreakdown.slice(0, 8)) {
                const userR = week.avgUserRating !== null ? week.avgUserRating.toFixed(1) : '-';
                const aiR = week.avgAiRating !== null ? week.avgAiRating.toFixed(1) : '-';
                console.log(`${week.weekStart}   ${userR.padStart(4)}  ${aiR.padStart(4)}  ${week.entryCount}`);
            }
        }
    }
    catch (error) {
        console.log(formatError(getErrorMessage(error)));
        process.exit(1);
    }
});
// Parse and run
program.parse();
