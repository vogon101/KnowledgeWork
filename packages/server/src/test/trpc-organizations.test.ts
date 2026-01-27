/**
 * Tests for tRPC organizations router
 *
 * Tests the organization API endpoints for CRUD operations.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCaller } from '../trpc/index.js';
import { getPrisma } from '../prisma.js';

describe('tRPC Organizations Router', () => {
  let caller: ReturnType<typeof createCaller>;
  const testOrgSlug = 'test-org-' + Date.now();

  beforeAll(async () => {
    const prisma = getPrisma();
    caller = createCaller({ prisma });
  });

  afterAll(async () => {
    // Clean up test organizations and any orphaned test data
    const prisma = getPrisma();

    // Delete all test/temp organizations and their projects
    const testOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          { slug: { startsWith: 'test-' } },
          { slug: { startsWith: 'temp-' } },
        ],
      },
      select: { id: true, slug: true },
    });

    for (const org of testOrgs) {
      try {
        // Delete projects first (foreign key constraint)
        await prisma.project.deleteMany({ where: { orgId: org.id } });
        await prisma.organization.delete({ where: { id: org.id } });
      } catch {
        // Ignore errors
      }
    }
  });

  describe('organizations.list', () => {
    it('should return all organizations', async () => {
      const result = await caller.organizations.list();

      expect(result).toHaveProperty('organizations');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.organizations)).toBe(true);
      expect(result.count).toBe(result.organizations.length);
    });

    it('should include standard organizations', async () => {
      const result = await caller.organizations.list();

      const slugs = result.organizations.map(o => o.slug);

      // These were created in the migration
      expect(slugs).toContain('acme-corp');
      expect(slugs).toContain('example-org');
      expect(slugs).toContain('personal');
    });

    it('should include organization fields', async () => {
      const result = await caller.organizations.list();

      if (result.organizations.length > 0) {
        const org = result.organizations[0];

        expect(org).toHaveProperty('id');
        expect(org).toHaveProperty('slug');
        expect(org).toHaveProperty('name');
        expect(org).toHaveProperty('shortName');
        expect(org).toHaveProperty('description');
        expect(org).toHaveProperty('createdAt');
        expect(org).toHaveProperty('updatedAt');

        // Timestamps should be ISO strings
        expect(org.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });
  });

  describe('organizations.get', () => {
    it('should return a single organization by slug', async () => {
      const org = await caller.organizations.get({ slug: 'acme-corp' });

      expect(org.slug).toBe('acme-corp');
      expect(org.name).toBe('Acme Corp');
      expect(org.shortName).toBe('YA');
    });

    it('should include counts', async () => {
      const org = await caller.organizations.get({ slug: 'acme-corp' });

      expect(org).toHaveProperty('projectCount');
      expect(org).toHaveProperty('peopleCount');
      expect(typeof org.projectCount).toBe('number');
      expect(typeof org.peopleCount).toBe('number');
    });

    it('should throw NOT_FOUND for non-existent organization', async () => {
      await expect(
        caller.organizations.get({ slug: 'non-existent-org-xyz' })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('organizations.create', () => {
    it('should create a new organization', async () => {
      const result = await caller.organizations.create({
        slug: testOrgSlug,
        name: 'Test Organization',
        shortName: 'TO',
        description: 'A test organization',
      });

      expect(result.slug).toBe(testOrgSlug);
      expect(result.name).toBe('Test Organization');
      expect(result.shortName).toBe('TO');
      expect(result.description).toBe('A test organization');
    });

    it('should reject duplicate slugs', async () => {
      await expect(
        caller.organizations.create({
          slug: 'acme-corp', // Already exists
          name: 'Duplicate',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('should reject invalid slugs', async () => {
      await expect(
        caller.organizations.create({
          slug: 'Invalid Slug!', // Has spaces and special chars
          name: 'Test',
        })
      ).rejects.toThrow();
    });
  });

  describe('organizations.update', () => {
    it('should update organization name', async () => {
      const result = await caller.organizations.update({
        slug: testOrgSlug,
        data: {
          name: 'Updated Test Organization',
        },
      });

      expect(result.name).toBe('Updated Test Organization');
      expect(result.slug).toBe(testOrgSlug); // Slug unchanged
    });

    it('should update shortName to null', async () => {
      const result = await caller.organizations.update({
        slug: testOrgSlug,
        data: {
          shortName: null,
        },
      });

      expect(result.shortName).toBeNull();
    });

    it('should throw NOT_FOUND for non-existent organization', async () => {
      await expect(
        caller.organizations.update({
          slug: 'non-existent-org',
          data: { name: 'Test' },
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  // Note: organizations.findOrCreate was removed - orgs must be created explicitly
  // to prevent accidental creation of auto-created orgs

  describe('organizations.delete', () => {
    it('should delete organization with no references', async () => {
      // Create a temporary org to delete
      const tempSlug = 'temp-delete-test-' + Date.now();
      await caller.organizations.create({
        slug: tempSlug,
        name: 'Temporary',
      });

      // Creating an org now auto-creates a _general project, so delete it first
      const prisma = getPrisma();
      const generalProject = await prisma.project.findFirst({
        where: { slug: '_general', organization: { slug: tempSlug } },
      });
      if (generalProject) {
        await prisma.project.delete({ where: { id: generalProject.id } });
      }

      const result = await caller.organizations.delete({ slug: tempSlug });

      expect(result.deleted).toBe(true);

      // Verify it's gone
      await expect(
        caller.organizations.get({ slug: tempSlug })
      ).rejects.toThrow(/not found/i);
    });

    it('should reject deletion if projects reference it', async () => {
      // acme-corp has projects, so deletion should fail
      await expect(
        caller.organizations.delete({ slug: 'acme-corp' })
      ).rejects.toThrow(/cannot delete/i);
    });

    it('should throw NOT_FOUND for non-existent organization', async () => {
      await expect(
        caller.organizations.delete({ slug: 'non-existent-org' })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Project integration', () => {
    it('should require organization to exist before creating project', async () => {
      const nonExistentOrg = 'non-existent-org-' + Date.now();

      // Creating project with non-existent org should fail
      await expect(
        caller.projects.create({
          slug: 'test-project-' + Date.now(),
          name: 'Test Project',
          org: nonExistentOrg,
        })
      ).rejects.toThrow(/not found|Create the organization first/i);
    });

    it('should create project when organization exists', async () => {
      const orgSlug = 'test-org-integration-' + Date.now();
      const projectSlug = 'test-project-integration-' + Date.now();

      // Create organization first
      await caller.organizations.create({
        slug: orgSlug,
        name: 'Test Integration Organization',
      });

      // Now create project - should succeed
      const project = await caller.projects.create({
        slug: projectSlug,
        name: 'Test Project',
        org: orgSlug,
      });

      expect(project.org).toBe(orgSlug);

      // Verify org has the project (2 projects: auto-created _general + test project)
      const org = await caller.organizations.get({ slug: orgSlug });
      expect(org.projectCount).toBe(2);

      // Clean up (delete all projects for this org, then the org)
      const prisma = getPrisma();
      await prisma.project.deleteMany({ where: { organization: { slug: orgSlug } } });
      await prisma.organization.delete({ where: { slug: orgSlug } });
    });
  });
});
