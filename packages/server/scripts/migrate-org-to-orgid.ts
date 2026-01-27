/**
 * Migration Script: Populate orgId from legacy org column
 *
 * This script migrates existing records that have the legacy `org` string column
 * set but no `orgId` FK, by looking up the organization and setting the proper FK.
 *
 * Run with: npx tsx scripts/migrate-org-to-orgid.ts
 *
 * Safe to run multiple times - only updates records where orgId is null.
 */

import { getPrisma } from '../src/prisma.js';

async function migrate() {
  const prisma = getPrisma();

  console.log('Starting org -> orgId migration...\n');

  // Get all organizations for lookup
  const orgs = await prisma.organization.findMany({
    select: { id: true, slug: true },
  });
  const orgIdBySlug = new Map(orgs.map(o => [o.slug, o.id]));
  console.log(`Found ${orgs.length} organizations: ${orgs.map(o => o.slug).join(', ')}\n`);

  // Migrate Projects
  console.log('--- PROJECTS ---');
  const projectsToMigrate = await prisma.project.findMany({
    where: {
      orgId: null,
      org: { not: null },
    },
    select: { id: true, slug: true, org: true },
  });

  console.log(`Found ${projectsToMigrate.length} projects with org but no orgId`);

  let projectsUpdated = 0;
  let projectsFailed = 0;
  for (const project of projectsToMigrate) {
    const orgId = orgIdBySlug.get(project.org!);
    if (orgId) {
      await prisma.project.update({
        where: { id: project.id },
        data: { orgId },
      });
      console.log(`  ✓ Project ${project.slug}: set orgId=${orgId} (from org=${project.org})`);
      projectsUpdated++;
    } else {
      console.log(`  ✗ Project ${project.slug}: organization "${project.org}" not found`);
      projectsFailed++;
    }
  }
  console.log(`Projects: ${projectsUpdated} updated, ${projectsFailed} failed\n`);

  // Migrate People
  console.log('--- PEOPLE ---');
  const peopleToMigrate = await prisma.person.findMany({
    where: {
      orgId: null,
      org: { not: null },
    },
    select: { id: true, name: true, org: true },
  });

  console.log(`Found ${peopleToMigrate.length} people with org but no orgId`);

  let peopleUpdated = 0;
  let peopleFailed = 0;
  for (const person of peopleToMigrate) {
    const orgId = orgIdBySlug.get(person.org!);
    if (orgId) {
      await prisma.person.update({
        where: { id: person.id },
        data: { orgId },
      });
      console.log(`  ✓ Person ${person.name}: set orgId=${orgId} (from org=${person.org})`);
      peopleUpdated++;
    } else {
      console.log(`  ✗ Person ${person.name}: organization "${person.org}" not found`);
      peopleFailed++;
    }
  }
  console.log(`People: ${peopleUpdated} updated, ${peopleFailed} failed\n`);

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Projects: ${projectsUpdated} migrated, ${projectsFailed} failed`);
  console.log(`People: ${peopleUpdated} migrated, ${peopleFailed} failed`);

  // Verification
  console.log('\n=== VERIFICATION ===');
  const projectsStillBroken = await prisma.project.count({
    where: { orgId: null, org: { not: null } },
  });
  const peopleStillBroken = await prisma.person.count({
    where: { orgId: null, org: { not: null } },
  });

  if (projectsStillBroken === 0 && peopleStillBroken === 0) {
    console.log('✓ All records with org now have orgId set');
  } else {
    console.log(`✗ ${projectsStillBroken} projects and ${peopleStillBroken} people still need migration`);
    console.log('  (These may have org values that don\'t match any organization slug)');
  }

  await prisma.$disconnect();
}

migrate().catch(console.error);
