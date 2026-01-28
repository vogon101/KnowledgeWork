import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { getPrisma } from '../prisma.js';
import { STATUS_TO_EMOJI, STATUS_TO_ACTION_STATUS } from './status-constants.js';
// Re-export for backwards compatibility
export { STATUS_TO_EMOJI, STATUS_TO_ACTION_STATUS };
/**
 * Sync task status back to its source markdown file
 */
export async function syncTaskToSource(taskId, basePath) {
    const prisma = getPrisma();
    // Get task with source info (items table in new schema)
    const task = await prisma.item.findUnique({
        where: { id: taskId },
        select: {
            id: true,
            title: true,
            status: true,
            sourceType: true,
            sourcePath: true,
            sourceLine: true,
            sourceMeetingId: true,
        },
    });
    if (!task) {
        return {
            success: false,
            source_type: null,
            source_path: null,
            message: `Task ${taskId} not found`,
        };
    }
    // Map to the format expected by downstream functions
    const taskData = {
        id: task.id,
        title: task.title,
        status: task.status,
        source_type: task.sourceType,
        source_path: task.sourcePath,
        source_line: task.sourceLine,
        source_meeting_id: task.sourceMeetingId,
    };
    // If task has source meeting, sync to meeting file
    if (taskData.source_meeting_id) {
        return syncToMeeting(taskData, basePath);
    }
    // If task has source file info, sync to that file
    if (taskData.source_path && taskData.source_type) {
        return syncToSourceFile(taskData, basePath);
    }
    return {
        success: true,
        source_type: null,
        source_path: null,
        message: 'No source file to sync (task created directly)',
    };
}
/**
 * Sync task status to a meeting action table
 */
async function syncToMeeting(task, basePath) {
    const prisma = getPrisma();
    // Get meeting file path
    const meeting = await prisma.meeting.findUnique({
        where: { id: task.source_meeting_id },
        select: { path: true },
    });
    if (!meeting?.path) {
        return {
            success: false,
            source_type: 'meeting',
            source_path: null,
            message: `Meeting ${task.source_meeting_id} not found or has no file path`,
        };
    }
    const filePath = join(basePath, meeting.path);
    try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const changes = [];
        // Find action table and update status
        // Format: | Owner | Action | Due | Status |
        // or: | Owner | Action | Due | Status | Project |
        const actionStatus = STATUS_TO_ACTION_STATUS[task.status] || task.status;
        let inActionTable = false;
        let updated = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Detect action table header
            if (line.includes('| Owner |') && line.includes('| Action |') && line.includes('| Status |')) {
                inActionTable = true;
                continue;
            }
            // Skip separator line
            if (inActionTable && line.match(/^\|[-\s|]+\|$/)) {
                continue;
            }
            // End of table
            if (inActionTable && (!line.startsWith('|') || line.trim() === '')) {
                inActionTable = false;
                continue;
            }
            // Look for matching action in table
            if (inActionTable && line.startsWith('|')) {
                // Check if this row contains our task (fuzzy match on title)
                const normalizedTitle = task.title.toLowerCase().trim();
                const normalizedLine = line.toLowerCase();
                if (normalizedLine.includes(normalizedTitle.slice(0, 30))) {
                    // Parse table row
                    const cells = line.split('|').map(c => c.trim()).filter(c => c);
                    // Find Status column (usually index 3 in 4-col or 5-col table)
                    // Format: Owner | Action | Due | Status [| Project]
                    if (cells.length >= 4) {
                        const statusIndex = 3; // 0-indexed
                        const oldStatus = cells[statusIndex];
                        if (oldStatus !== actionStatus) {
                            cells[statusIndex] = actionStatus;
                            lines[i] = '| ' + cells.join(' | ') + ' |';
                            changes.push(`Line ${i + 1}: "${oldStatus}" → "${actionStatus}"`);
                            updated = true;
                        }
                    }
                }
            }
        }
        if (updated) {
            await writeFile(filePath, lines.join('\n'), 'utf-8');
            return {
                success: true,
                source_type: 'meeting',
                source_path: meeting.path,
                message: `Updated meeting action status`,
                changes,
            };
        }
        return {
            success: true,
            source_type: 'meeting',
            source_path: meeting.path,
            message: 'No matching action found in meeting file (may need manual update)',
        };
    }
    catch (error) {
        return {
            success: false,
            source_type: 'meeting',
            source_path: meeting.path,
            message: `Failed to update meeting file: ${error}`,
        };
    }
}
/**
 * Sync task status to source file (README checkbox, status line, etc.)
 */
async function syncToSourceFile(task, basePath) {
    if (!task.source_path) {
        return {
            success: false,
            source_type: task.source_type,
            source_path: null,
            message: 'No source path specified',
        };
    }
    const filePath = join(basePath, task.source_path);
    try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const changes = [];
        let updated = false;
        switch (task.source_type) {
            case 'checkbox': {
                // Update checkbox: - [ ] or - [x]
                const isComplete = ['complete', 'completed', 'cancelled'].includes(task.status);
                const checkMark = isComplete ? 'x' : ' ';
                // If we have exact line number, use it
                if (task.source_line && task.source_line > 0 && task.source_line <= lines.length) {
                    const lineIdx = task.source_line - 1;
                    const line = lines[lineIdx];
                    const match = line.match(/^([-*]\s*)\[([ xX])\](\s*.+)$/);
                    if (match) {
                        const [, prefix, oldCheck, rest] = match;
                        if (oldCheck.toLowerCase() !== checkMark) {
                            lines[lineIdx] = `${prefix}[${checkMark}]${rest}`;
                            changes.push(`Line ${task.source_line}: [${oldCheck}] → [${checkMark}]`);
                            updated = true;
                        }
                    }
                }
                else {
                    // Search for matching checkbox by title
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (line.toLowerCase().includes(task.title.toLowerCase().slice(0, 30))) {
                            const match = line.match(/^([-*]\s*)\[([ xX])\](\s*.+)$/);
                            if (match) {
                                const [, prefix, oldCheck, rest] = match;
                                if (oldCheck.toLowerCase() !== checkMark) {
                                    lines[i] = `${prefix}[${checkMark}]${rest}`;
                                    changes.push(`Line ${i + 1}: [${oldCheck}] → [${checkMark}]`);
                                    updated = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                break;
            }
            case 'status_emoji': {
                // Update status emoji line
                const emoji = STATUS_TO_EMOJI[task.status] || '🟡';
                if (task.source_line && task.source_line > 0 && task.source_line <= lines.length) {
                    const lineIdx = task.source_line - 1;
                    const line = lines[lineIdx];
                    const match = line.match(/^([-*]\s*)(✅|🟢|🟡|🔴|🔵|⏳|❌)(\s*.+)$/);
                    if (match) {
                        const [, prefix, oldEmoji, rest] = match;
                        if (oldEmoji !== emoji) {
                            lines[lineIdx] = `${prefix}${emoji}${rest}`;
                            changes.push(`Line ${task.source_line}: ${oldEmoji} → ${emoji}`);
                            updated = true;
                        }
                    }
                }
                break;
            }
            case 'sub_project': {
                // Update sub-project table row
                const emoji = STATUS_TO_EMOJI[task.status] || '🟡';
                if (task.source_line && task.source_line > 0 && task.source_line <= lines.length) {
                    const lineIdx = task.source_line - 1;
                    const line = lines[lineIdx];
                    // Pattern: | 🟡 | [[link|Name]] | Description |
                    const match = line.match(/^(\|\s*)(✅|🟢|🟡|🔴|🔵|⏳|❌)(\s*\|.+)$/);
                    if (match) {
                        const [, prefix, oldEmoji, rest] = match;
                        if (oldEmoji !== emoji) {
                            lines[lineIdx] = `${prefix}${emoji}${rest}`;
                            changes.push(`Line ${task.source_line}: ${oldEmoji} → ${emoji}`);
                            updated = true;
                        }
                    }
                }
                break;
            }
            case 'readme':
            case 'next_steps':
                // README task references (T-XXXX format) don't need sync-back
                // The README just points to the task system, status is tracked there
                return {
                    success: true,
                    source_type: task.source_type,
                    source_path: task.source_path,
                    message: 'README task reference - status tracked in task system (no sync needed)',
                };
            default:
                return {
                    success: true,
                    source_type: task.source_type,
                    source_path: task.source_path,
                    message: `Source type "${task.source_type}" does not require sync-back`,
                };
        }
        if (updated) {
            await writeFile(filePath, lines.join('\n'), 'utf-8');
            return {
                success: true,
                source_type: task.source_type,
                source_path: task.source_path,
                message: `Updated source file`,
                changes,
            };
        }
        return {
            success: true,
            source_type: task.source_type,
            source_path: task.source_path,
            message: 'No changes needed (status already matches or line not found)',
        };
    }
    catch (error) {
        return {
            success: false,
            source_type: task.source_type,
            source_path: task.source_path,
            message: `Failed to update source file: ${error}`,
        };
    }
}
/**
 * Batch sync all tasks with source files
 */
export async function syncAllTasksToSources(basePath) {
    const prisma = getPrisma();
    const count = await prisma.item.count({
        where: {
            OR: [
                { sourcePath: { not: null } },
                { sourceMeetingId: { not: null } },
            ],
        },
    });
    // This is a placeholder - full implementation would iterate through tasks
    return {
        success: true,
        total: count,
        synced: 0,
        skipped: count,
        errors: [],
    };
}
