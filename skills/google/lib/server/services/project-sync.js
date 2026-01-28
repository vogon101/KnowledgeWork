/**
 * Project Sync Service
 *
 * Syncs projects from the knowledge base filesystem into the task database.
 */
import fs from 'fs';
import path from 'path';
import { getPrisma } from '../prisma.js';
import { resolveKBPath } from './paths.js';
// Organisation folders and their DB identifiers
const ORGS = [
    { folder: 'acme-corp', dbOrg: 'acme-corp', name: 'Acme Corp' },
    { folder: 'example-org', dbOrg: 'example-org', name: 'Centre for Example Org' },
    { folder: 'consulting', dbOrg: 'consulting', name: 'Consulting' },
    { folder: 'personal', dbOrg: 'personal', name: 'Personal' },
    { folder: 'pricedout', dbOrg: 'pricedout', name: 'PricedOut' },
    { folder: 'other', dbOrg: 'other', name: 'Other' },
];
/**
 * Simple YAML frontmatter parser
 */
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    if (!match)
        return {};
    const yaml = match[1];
    const result = {};
    for (const line of yaml.split('\n')) {
        const kvMatch = line.match(/^(\w+):\s*(.*)$/);
        if (kvMatch) {
            const key = kvMatch[1];
            let value = kvMatch[2].trim();
            // Parse numbers
            if (/^\d+$/.test(value)) {
                value = parseInt(value, 10);
            }
            // Remove quotes
            if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            result[key] = value;
        }
    }
    return result;
}
/**
 * Map project status to valid database values
 * Schema allows: 'active', 'planning', 'paused', 'completed', 'archived'
 */
function normalizeStatus(status) {
    if (!status)
        return null;
    const statusMap = {
        active: 'active',
        planning: 'planning',
        paused: 'paused',
        completed: 'completed',
        archived: 'archived',
        // Map non-standard values
        maintenance: 'active', // maintenance is essentially active
        done: 'completed',
        inactive: 'paused',
    };
    return statusMap[status.toLowerCase()] || null;
}
/**
 * Normalize priority to valid range (1-4) or null
 */
function normalizePriority(priority) {
    if (priority === undefined || priority === null)
        return null;
    if (priority >= 1 && priority <= 4)
        return priority;
    return null;
}
/**
 * Extract project name from markdown content
 */
function extractProjectName(content, fallbackSlug) {
    // Try frontmatter title first
    const frontmatter = parseFrontmatter(content);
    if (frontmatter.title)
        return frontmatter.title;
    // Try first H1 heading
    const h1Match = content.match(/^# (.+)$/m);
    if (h1Match)
        return h1Match[1];
    // Fallback to slug
    return fallbackSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
/**
 * Scan the knowledge base for all projects
 */
export function scanProjects() {
    const projects = [];
    for (const { folder, dbOrg } of ORGS) {
        const projectsDir = resolveKBPath(path.join(folder, 'projects'));
        if (!fs.existsSync(projectsDir))
            continue;
        try {
            const entries = fs.readdirSync(projectsDir);
            for (const entry of entries) {
                const fullPath = path.join(projectsDir, entry);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    // Folder project - look for README.md
                    const readmePath = path.join(fullPath, 'README.md');
                    if (fs.existsSync(readmePath)) {
                        const content = fs.readFileSync(readmePath, 'utf-8');
                        const frontmatter = parseFrontmatter(content);
                        projects.push({
                            slug: entry,
                            name: extractProjectName(content, entry),
                            org: dbOrg,
                            status: normalizeStatus(frontmatter.status),
                            priority: normalizePriority(frontmatter.priority),
                            isSubProject: false,
                        });
                        // Scan for sub-projects (files with type: sub-project)
                        const folderEntries = fs.readdirSync(fullPath);
                        for (const subEntry of folderEntries) {
                            if (subEntry === 'README.md' || subEntry === 'next-steps.md')
                                continue;
                            if (!subEntry.endsWith('.md'))
                                continue;
                            const subPath = path.join(fullPath, subEntry);
                            try {
                                const subContent = fs.readFileSync(subPath, 'utf-8');
                                const subFrontmatter = parseFrontmatter(subContent);
                                if (subFrontmatter.type === 'sub-project') {
                                    const subSlug = subEntry.replace(/\.md$/, '');
                                    projects.push({
                                        slug: subSlug,
                                        name: extractProjectName(subContent, subSlug),
                                        org: dbOrg,
                                        status: normalizeStatus(subFrontmatter.status),
                                        priority: normalizePriority(subFrontmatter.priority),
                                        isSubProject: true,
                                        parentSlug: entry,
                                    });
                                }
                            }
                            catch {
                                // Skip files that can't be read
                            }
                        }
                    }
                }
                else if (entry.endsWith('.md') && !entry.includes('research-prompt')) {
                    // Standalone file project
                    const slug = entry.replace(/\.md$/, '');
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const frontmatter = parseFrontmatter(content);
                    projects.push({
                        slug,
                        name: extractProjectName(content, slug),
                        org: dbOrg,
                        status: normalizeStatus(frontmatter.status),
                        priority: normalizePriority(frontmatter.priority),
                        isSubProject: false,
                    });
                }
            }
        }
        catch {
            // Skip directories that can't be read
        }
    }
    return projects;
}
/**
 * Sync projects to the database
 */
export async function syncProjects() {
    const prisma = getPrisma();
    const result = {
        projects_found: 0,
        projects_created: 0,
        projects_updated: 0,
        errors: [],
    };
    const projects = scanProjects();
    result.projects_found = projects.length;
    // Use Prisma transaction for atomicity
    await prisma.$transaction(async (tx) => {
        // Build org slug -> id mapping for efficient lookup
        const orgs = await tx.organization.findMany({ select: { id: true, slug: true } });
        const orgIdBySlug = new Map(orgs.map(o => [o.slug, o.id]));
        // First pass: create/update non-sub-projects (they might be parents)
        for (const project of projects.filter(p => !p.isSubProject)) {
            try {
                // Look up organization by slug
                const orgId = project.org ? orgIdBySlug.get(project.org) || null : null;
                // Filter by organization relation, not legacy org column
                const existing = await tx.project.findFirst({
                    where: { slug: project.slug, organization: project.org ? { slug: project.org } : undefined },
                    select: { id: true, name: true, status: true },
                });
                if (existing) {
                    // Update if name or status changed
                    if (existing.name !== project.name || existing.status !== project.status) {
                        await tx.project.update({
                            where: { id: existing.id },
                            data: {
                                name: project.name,
                                status: project.status || null,
                                priority: project.priority || null,
                            },
                        });
                        result.projects_updated++;
                    }
                }
                else {
                    // Create new project - only use orgId FK, not legacy org column
                    await tx.project.create({
                        data: {
                            slug: project.slug,
                            name: project.name,
                            orgId,
                            status: project.status || null,
                            priority: project.priority || null,
                        },
                    });
                    result.projects_created++;
                }
            }
            catch (error) {
                result.errors.push(`Failed to sync project ${project.slug}: ${error.message}`);
            }
        }
        // Second pass: create/update sub-projects with parent references
        for (const project of projects.filter(p => p.isSubProject)) {
            try {
                // Look up organization by slug
                const orgId = project.org ? orgIdBySlug.get(project.org) || null : null;
                // Find parent - filter by organization relation
                let parentId = null;
                if (project.parentSlug) {
                    const parent = await tx.project.findFirst({
                        where: { slug: project.parentSlug, organization: project.org ? { slug: project.org } : undefined },
                        select: { id: true },
                    });
                    parentId = parent?.id || null;
                }
                // Filter by organization relation, not legacy org column
                const existing = await tx.project.findFirst({
                    where: { slug: project.slug, organization: project.org ? { slug: project.org } : undefined },
                    select: { id: true, name: true, status: true },
                });
                if (existing) {
                    // Update if changed
                    await tx.project.update({
                        where: { id: existing.id },
                        data: {
                            name: project.name,
                            status: project.status || null,
                            priority: project.priority || null,
                            parentId: parentId,
                        },
                    });
                    result.projects_updated++;
                }
                else {
                    // Create new sub-project - only use orgId FK, not legacy org column
                    await tx.project.create({
                        data: {
                            slug: project.slug,
                            name: project.name,
                            orgId,
                            status: project.status || null,
                            priority: project.priority || null,
                            parentId: parentId,
                        },
                    });
                    result.projects_created++;
                }
            }
            catch (error) {
                result.errors.push(`Failed to sync sub-project ${project.slug}: ${error.message}`);
            }
        }
    });
    return result;
}
/**
 * Get all projects from the database
 */
export async function getDbProjects() {
    const prisma = getPrisma();
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            slug: true,
            name: true,
            // Always use organization relation, not legacy org column
            organization: { select: { slug: true } },
            status: true,
        },
        orderBy: [
            { organization: { slug: 'asc' } },
            { name: 'asc' },
        ],
    });
    // Map to expected return type for backward compatibility
    return projects.map(p => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        org: p.organization?.slug || null,
        status: p.status,
    }));
}
