import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/**
 * Get today's diary file path
 */
export function getDiaryPath(basePath, date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dow = DAYS[date.getDay()];
    return join(basePath, 'diary', String(year), month, `${day}-${dow}.md`);
}
/**
 * Create a new diary file with the standard format
 */
function createDiaryFile(filePath, date) {
    const year = date.getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const dow = DAYS[date.getDay()];
    // Ordinal suffix
    const suffix = (day === 1 || day === 21 || day === 31) ? 'st' :
        (day === 2 || day === 22) ? 'nd' :
            (day === 3 || day === 23) ? 'rd' : 'th';
    const content = `# ${dow} ${day}${suffix} ${month} ${year}

## Summary

<!-- Brief summary of the day -->

## Work Log

<!-- Key activities, decisions, progress -->

## Meetings

<!-- Links to meeting notes -->

## Task Activity

<!-- AUTO-GENERATED: Task status changes from the task system -->
<!-- The AI reads this section to stay aware of task progress -->
`;
    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, content, 'utf-8');
    console.log(`Created diary file: ${filePath}`);
}
/**
 * Append task activity to today's diary
 */
export function logTaskActivity(basePath, activity, date = new Date()) {
    const diaryPath = getDiaryPath(basePath, date);
    // Create diary if it doesn't exist
    if (!existsSync(diaryPath)) {
        createDiaryFile(diaryPath, date);
    }
    // Read current content
    let content = readFileSync(diaryPath, 'utf-8');
    // Format the activity line
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const actionVerb = {
        completed: 'Completed',
        started: 'Started',
        blocked: 'Blocked',
        deferred: 'Deferred',
        cancelled: 'Cancelled',
    }[activity.action];
    let activityLine = `- ${time} — ${actionVerb} ${activity.displayId}: "${activity.title}"`;
    if (activity.projectName) {
        activityLine += ` (${activity.projectName})`;
    }
    // Find or create the Task Activity section
    const taskActivityHeader = '## Task Activity';
    if (content.includes(taskActivityHeader)) {
        // Append to existing section
        // Find the section and append after any existing content
        const sectionIndex = content.indexOf(taskActivityHeader);
        const nextSectionMatch = content.slice(sectionIndex + taskActivityHeader.length).match(/\n## /);
        if (nextSectionMatch && nextSectionMatch.index !== undefined) {
            // There's another section after Task Activity - insert before it
            const insertPoint = sectionIndex + taskActivityHeader.length + nextSectionMatch.index;
            content = content.slice(0, insertPoint) + activityLine + '\n' + content.slice(insertPoint);
        }
        else {
            // Task Activity is the last section - append at end
            content = content.trimEnd() + '\n' + activityLine + '\n';
        }
    }
    else {
        // Add the section at the end
        content = content.trimEnd() + '\n\n' + taskActivityHeader + '\n\n' +
            '<!-- AUTO-GENERATED: Task status changes from the task system -->\n' +
            '<!-- The AI reads this section to stay aware of task progress -->\n' +
            activityLine + '\n';
    }
    writeFileSync(diaryPath, content, 'utf-8');
    return {
        success: true,
        diaryPath,
        message: `Logged ${activity.action} for ${activity.displayId} to diary`,
    };
}
/**
 * Log routine completion to diary
 */
export function logRoutineCompletion(basePath, routineTitle, date = new Date()) {
    const diaryPath = getDiaryPath(basePath, date);
    // Create diary if it doesn't exist
    if (!existsSync(diaryPath)) {
        createDiaryFile(diaryPath, date);
    }
    let content = readFileSync(diaryPath, 'utf-8');
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const activityLine = `- ${time} — Routine: "${routineTitle}"`;
    const taskActivityHeader = '## Task Activity';
    if (content.includes(taskActivityHeader)) {
        const sectionIndex = content.indexOf(taskActivityHeader);
        const nextSectionMatch = content.slice(sectionIndex + taskActivityHeader.length).match(/\n## /);
        if (nextSectionMatch && nextSectionMatch.index !== undefined) {
            const insertPoint = sectionIndex + taskActivityHeader.length + nextSectionMatch.index;
            content = content.slice(0, insertPoint) + activityLine + '\n' + content.slice(insertPoint);
        }
        else {
            content = content.trimEnd() + '\n' + activityLine + '\n';
        }
    }
    else {
        content = content.trimEnd() + '\n\n' + taskActivityHeader + '\n\n' +
            '<!-- AUTO-GENERATED: Task status changes from the task system -->\n' +
            activityLine + '\n';
    }
    writeFileSync(diaryPath, content, 'utf-8');
    return { success: true, diaryPath };
}
