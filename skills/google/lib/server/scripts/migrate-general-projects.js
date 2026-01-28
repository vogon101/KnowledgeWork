/**
 * Data Migration: Create _general projects for existing organizations
 *
 * This script:
 * 1. Finds all organizations without a _general project
 * 2. Creates a _general project in the database for each
 * 3. Creates the filesystem folder and README.md for each
 *
 * Run with: npx tsx src/scripts/migrate-general-projects.ts
 */
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
// Load environment first
import 'dotenv/config';
import { getPrisma, closePrisma } from '../prisma.js';
const prisma = getPrisma();
async function main() {
    const kbPath = process.env.KNOWLEDGE_BASE_PATH;
    if (!kbPath) {
        console.error('ERROR: KNOWLEDGE_BASE_PATH environment variable is required');
        process.exit(1);
    }
    console.log('Starting migration: Create _general projects for existing orgs\n');
    console.log(`Knowledge Base Path: ${kbPath}\n`);
    // Find all organizations
    const orgs = await prisma.organization.findMany({
        include: {
            projects: {
                where: { isGeneral: true },
            },
        },
    });
    console.log(`Found ${orgs.length} organizations\n`);
    let created = 0;
    let skipped = 0;
    let errors = 0;
    for (const org of orgs) {
        const hasGeneral = org.projects.length > 0;
        if (hasGeneral) {
            console.log(`  ✓ ${org.slug}: Already has _general project (skipped)`);
            skipped++;
            continue;
        }
        try {
            // Create the _general project in DB
            await prisma.project.create({
                data: {
                    slug: '_general',
                    name: org.name,
                    orgId: org.id,
                    isGeneral: true,
                    status: 'active',
                },
            });
            console.log(`  + ${org.slug}: Created _general project in DB`);
            // Create filesystem folder and README
            const generalDir = path.join(kbPath, org.slug, 'projects', '_general');
            if (!existsSync(generalDir)) {
                await mkdir(generalDir, { recursive: true });
                console.log(`    Created folder: ${generalDir}`);
            }
            const readmePath = path.join(generalDir, 'README.md');
            const readmeContent = `---
type: project
title: ${org.name}
status: active
isGeneral: true
---

# ${org.name}

General tasks and activities for ${org.name} that aren't tied to a specific project.
`;
            await writeFile(readmePath, readmeContent);
            console.log(`    Created README: ${readmePath}`);
            created++;
        }
        catch (err) {
            console.error(`  ✗ ${org.slug}: Error - ${err}`);
            errors++;
        }
    }
    console.log('\n--- Migration Summary ---');
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors:  ${errors}`);
    console.log('------------------------\n');
}
main()
    .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await closePrisma();
});
