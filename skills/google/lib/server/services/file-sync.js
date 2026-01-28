/**
 * File Sync Service
 *
 * Bidirectional sync between workstream markdown files and the Item table.
 * Handles:
 * - Scanning project directories for workstream files
 * - Creating/updating Item records from file frontmatter
 * - Pushing database changes back to file frontmatter
 * - Conflict detection via content hashing
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import matter from 'gray-matter';
import { getPrisma } from '../prisma.js';
import { computeContentHash, detectConflict } from './hash-utils.js';
import { mapWorkstreamStatus, mapDbStatusToFile } from './status-constants.js';
import { getKnowledgeBasePath } from './paths.js';
// Re-export for backwards compatibility
export { mapWorkstreamStatus, mapDbStatusToFile };
// =============================================================================
// Constants
// =============================================================================
const ORGS = ['acme-corp', 'example-org', 'consulting', 'personal', 'other'];
// =============================================================================
// File Scanning
// =============================================================================
/**
 * Scan a project directory for workstream files
 */
function scanProjectForWorkstreams(projectPath, projectSlug, org) {
    const workstreams = [];
    if (!existsSync(projectPath))
        return workstreams;
    const entries = readdirSync(projectPath);
    for (const entry of entries) {
        const fullPath = join(projectPath, entry);
        const stat = statSync(fullPath);
        // Only look at markdown files (not directories, not README.md)
        if (!stat.isFile() || !entry.endsWith('.md') || entry === 'README.md') {
            continue;
        }
        try {
            const content = readFileSync(fullPath, 'utf-8');
            const { data: frontmatter, content: body } = matter(content);
            // Check if this is a workstream file
            if (frontmatter.type !== 'workstream' && frontmatter.type !== 'sub-project') {
                continue;
            }
            const workstreamFm = frontmatter;
            const relativePath = relative(getKnowledgeBasePath(), fullPath);
            workstreams.push({
                filePath: relativePath,
                absolutePath: fullPath,
                frontmatter: workstreamFm,
                content,
                contentHash: computeContentHash(content),
                parentProjectSlug: workstreamFm.parent || projectSlug,
                org,
            });
        }
        catch (error) {
            console.error(`Error parsing ${fullPath}: ${error.message}`);
        }
    }
    return workstreams;
}
/**
 * Scan all project directories for workstream files
 */
export function scanAllWorkstreams() {
    const allWorkstreams = [];
    for (const org of ORGS) {
        const projectsPath = join(getKnowledgeBasePath(), org, 'projects');
        if (!existsSync(projectsPath))
            continue;
        const projectDirs = readdirSync(projectsPath);
        for (const projectDir of projectDirs) {
            const projectPath = join(projectsPath, projectDir);
            const stat = statSync(projectPath);
            if (!stat.isDirectory())
                continue;
            const workstreams = scanProjectForWorkstreams(projectPath, projectDir, org);
            allWorkstreams.push(...workstreams);
        }
    }
    return allWorkstreams;
}
/**
 * Scan a specific file and return workstream data if valid
 */
export function scanWorkstreamFile(filePath) {
    const absolutePath = filePath.startsWith('/') ? filePath : join(getKnowledgeBasePath(), filePath);
    if (!existsSync(absolutePath))
        return null;
    try {
        const content = readFileSync(absolutePath, 'utf-8');
        const { data: frontmatter } = matter(content);
        if (frontmatter.type !== 'workstream' && frontmatter.type !== 'sub-project') {
            return null;
        }
        const workstreamFm = frontmatter;
        const relativePath = relative(getKnowledgeBasePath(), absolutePath);
        // Extract org and parent project from path
        // e.g., "example-org/projects/energy/nuclear.md"
        const pathParts = relativePath.split('/');
        const org = pathParts[0];
        const projectSlug = pathParts[2]; // projects/{project-slug}/file.md
        return {
            filePath: relativePath,
            absolutePath,
            frontmatter: workstreamFm,
            content,
            contentHash: computeContentHash(content),
            parentProjectSlug: workstreamFm.parent || projectSlug,
            org,
        };
    }
    catch (error) {
        console.error(`Error parsing ${absolutePath}: ${error.message}`);
        return null;
    }
}
// =============================================================================
// Sync: Filesystem → Database
// =============================================================================
/**
 * Sync a single workstream file to the database
 */
export async function syncWorkstreamToDb(workstream) {
    const prisma = getPrisma();
    // Find the parent project (use findFirst since slug is unique per org, not globally)
    const parentProject = await prisma.project.findFirst({
        where: { slug: workstream.parentProjectSlug },
    });
    if (!parentProject) {
        return {
            action: 'skipped',
            error: `Parent project not found: ${workstream.parentProjectSlug}`,
        };
    }
    // Check if item already exists for this file
    let existingItem = await prisma.item.findFirst({
        where: { filePath: workstream.filePath },
    });
    if (existingItem) {
        // Check for conflicts
        const conflict = detectConflict(workstream.content, existingItem.fileHash, existingItem.updatedAt, existingItem.lastSyncedAt);
        if (conflict.hasConflict) {
            return {
                action: 'conflict',
                itemId: existingItem.id,
                conflict,
            };
        }
        // Update if file changed
        if (conflict.fileChanged) {
            await prisma.item.update({
                where: { id: existingItem.id },
                data: {
                    title: workstream.frontmatter.title,
                    status: mapWorkstreamStatus(workstream.frontmatter.status),
                    priority: workstream.frontmatter.priority || null,
                    fileHash: workstream.contentHash,
                    lastSyncedAt: new Date(),
                },
            });
            return { action: 'updated', itemId: existingItem.id };
        }
        return { action: 'skipped', itemId: existingItem.id };
    }
    // Create new item
    const newItem = await prisma.item.create({
        data: {
            title: workstream.frontmatter.title,
            itemType: 'workstream',
            status: mapWorkstreamStatus(workstream.frontmatter.status),
            priority: workstream.frontmatter.priority || null,
            projectId: parentProject.id,
            filePath: workstream.filePath,
            fileHash: workstream.contentHash,
            lastSyncedAt: new Date(),
            sourceType: 'file',
            sourcePath: workstream.filePath,
        },
    });
    return { action: 'created', itemId: newItem.id };
}
/**
 * Sync all workstream files to the database
 */
export async function syncFilesystemToDb() {
    const workstreams = scanAllWorkstreams();
    const result = {
        synced: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        conflicts: [],
        errors: [],
    };
    for (const workstream of workstreams) {
        try {
            const syncResult = await syncWorkstreamToDb(workstream);
            switch (syncResult.action) {
                case 'created':
                    result.created++;
                    result.synced++;
                    break;
                case 'updated':
                    result.updated++;
                    result.synced++;
                    break;
                case 'skipped':
                    result.skipped++;
                    if (syncResult.error) {
                        result.errors.push(syncResult.error);
                    }
                    break;
                case 'conflict':
                    result.conflicts.push({
                        filePath: workstream.filePath,
                        itemId: syncResult.itemId,
                        reason: 'Both file and database modified since last sync',
                        fileHash: workstream.contentHash,
                        dbHash: syncResult.conflict?.storedFileHash || null,
                    });
                    break;
            }
        }
        catch (error) {
            result.errors.push(`Failed to sync ${workstream.filePath}: ${error.message}`);
        }
    }
    return result;
}
// =============================================================================
// Sync: Database → Filesystem
// =============================================================================
/**
 * Update a workstream file's frontmatter from database Item
 */
export async function syncItemToFile(itemId) {
    const prisma = getPrisma();
    const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: { project: true },
    });
    if (!item) {
        return { success: false, filePath: '', error: `Item not found: ${itemId}` };
    }
    if (item.itemType !== 'workstream') {
        return { success: false, filePath: '', error: `Item is not a workstream: ${item.itemType}` };
    }
    if (!item.filePath) {
        return { success: false, filePath: '', error: 'Item has no filePath' };
    }
    const absolutePath = join(getKnowledgeBasePath(), item.filePath);
    if (!existsSync(absolutePath)) {
        return { success: false, filePath: item.filePath, error: 'File not found on disk' };
    }
    try {
        const content = readFileSync(absolutePath, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        // Check for conflict
        const conflict = detectConflict(content, item.fileHash, item.updatedAt, item.lastSyncedAt);
        if (conflict.fileChanged) {
            return {
                success: false,
                filePath: item.filePath,
                error: 'File has been modified since last sync - resolve conflict first',
                hadConflict: true,
            };
        }
        // Update frontmatter
        const updatedFrontmatter = {
            ...frontmatter,
            title: item.title,
            status: mapDbStatusToFile(item.status),
            priority: item.priority || undefined,
        };
        // Rebuild file content
        const newContent = matter.stringify(body, updatedFrontmatter);
        writeFileSync(absolutePath, newContent, 'utf-8');
        // Update hash and sync time in database
        const newHash = computeContentHash(newContent);
        await prisma.item.update({
            where: { id: itemId },
            data: {
                fileHash: newHash,
                lastSyncedAt: new Date(),
            },
        });
        return { success: true, filePath: item.filePath };
    }
    catch (error) {
        return {
            success: false,
            filePath: item.filePath,
            error: error.message,
        };
    }
}
// =============================================================================
// Conflict Detection
// =============================================================================
/**
 * Get all items with potential sync conflicts
 */
export async function detectAllConflicts() {
    const prisma = getPrisma();
    const conflicts = [];
    const workstreamItems = await prisma.item.findMany({
        where: {
            itemType: 'workstream',
            filePath: { not: null },
            deletedAt: null,
        },
    });
    for (const item of workstreamItems) {
        if (!item.filePath)
            continue;
        const absolutePath = join(getKnowledgeBasePath(), item.filePath);
        if (!existsSync(absolutePath)) {
            conflicts.push({
                filePath: item.filePath,
                itemId: item.id,
                reason: 'File no longer exists on disk',
                fileHash: '',
                dbHash: item.fileHash,
            });
            continue;
        }
        try {
            const content = readFileSync(absolutePath, 'utf-8');
            const conflict = detectConflict(content, item.fileHash, item.updatedAt, item.lastSyncedAt);
            if (conflict.hasConflict) {
                conflicts.push({
                    filePath: item.filePath,
                    itemId: item.id,
                    reason: 'Both file and database modified since last sync',
                    fileHash: conflict.currentFileHash,
                    dbHash: conflict.storedFileHash,
                });
            }
        }
        catch (error) {
            conflicts.push({
                filePath: item.filePath,
                itemId: item.id,
                reason: `Error reading file: ${error.message}`,
                fileHash: '',
                dbHash: item.fileHash,
            });
        }
    }
    return conflicts;
}
/**
 * Force sync from file, ignoring conflicts (file wins)
 */
export async function forceFileSyncToDb(filePath) {
    const workstream = scanWorkstreamFile(filePath);
    if (!workstream) {
        return { success: false, error: 'Invalid workstream file' };
    }
    const prisma = getPrisma();
    const existingItem = await prisma.item.findFirst({
        where: { filePath: workstream.filePath },
    });
    const parentProject = await prisma.project.findFirst({
        where: { slug: workstream.parentProjectSlug },
    });
    if (!parentProject) {
        return { success: false, error: `Parent project not found: ${workstream.parentProjectSlug}` };
    }
    if (existingItem) {
        await prisma.item.update({
            where: { id: existingItem.id },
            data: {
                title: workstream.frontmatter.title,
                status: mapWorkstreamStatus(workstream.frontmatter.status),
                priority: workstream.frontmatter.priority || null,
                fileHash: workstream.contentHash,
                lastSyncedAt: new Date(),
            },
        });
        return { success: true, itemId: existingItem.id };
    }
    const newItem = await prisma.item.create({
        data: {
            title: workstream.frontmatter.title,
            itemType: 'workstream',
            status: mapWorkstreamStatus(workstream.frontmatter.status),
            priority: workstream.frontmatter.priority || null,
            projectId: parentProject.id,
            filePath: workstream.filePath,
            fileHash: workstream.contentHash,
            lastSyncedAt: new Date(),
            sourceType: 'file',
            sourcePath: workstream.filePath,
        },
    });
    return { success: true, itemId: newItem.id };
}
/**
 * Force sync from database, ignoring conflicts (database wins)
 */
export async function forceDbSyncToFile(itemId) {
    const prisma = getPrisma();
    const item = await prisma.item.findUnique({
        where: { id: itemId },
    });
    if (!item || !item.filePath) {
        return { success: false, filePath: '', error: 'Item not found or has no file path' };
    }
    const absolutePath = join(getKnowledgeBasePath(), item.filePath);
    if (!existsSync(absolutePath)) {
        return { success: false, filePath: item.filePath, error: 'File not found on disk' };
    }
    try {
        const content = readFileSync(absolutePath, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);
        const updatedFrontmatter = {
            ...frontmatter,
            title: item.title,
            status: mapDbStatusToFile(item.status),
            priority: item.priority || undefined,
        };
        const newContent = matter.stringify(body, updatedFrontmatter);
        writeFileSync(absolutePath, newContent, 'utf-8');
        const newHash = computeContentHash(newContent);
        await prisma.item.update({
            where: { id: itemId },
            data: {
                fileHash: newHash,
                lastSyncedAt: new Date(),
            },
        });
        return { success: true, filePath: item.filePath };
    }
    catch (error) {
        return { success: false, filePath: item.filePath, error: error.message };
    }
}
