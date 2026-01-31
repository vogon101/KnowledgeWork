/**
 * Tests for tRPC projects router
 *
 * Tests the project API endpoints for listing, filtering,
 * and retrieving project details.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createCaller } from '../trpc/index.js';
import { getPrisma } from '../prisma.js';
import type { ProjectWithParent } from '@kw/api-types';

describe('tRPC Projects Router', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    const prisma = getPrisma();
    caller = createCaller({ prisma });
  });

  describe('projects.list', () => {
    it('should return all projects', async () => {
      const result = await caller.projects.list({});

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.projects)).toBe(true);
    });

    it('should include project fields with camelCase', async () => {
      const result = await caller.projects.list({});

      if (result.projects.length > 0) {
        const project: ProjectWithParent = result.projects[0];

        // Check required fields
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('slug');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('org');
        expect(project).toHaveProperty('createdAt');
        expect(project).toHaveProperty('updatedAt');

        // Check computed fields
        expect(project).toHaveProperty('fullPath');

        // Check optional fields exist (may be null)
        expect('parentId' in project).toBe(true);
        expect('parentSlug' in project).toBe(true);
        expect('description' in project).toBe(true);

        // Verify NO snake_case fields
        expect(project).not.toHaveProperty('parent_id');
        expect(project).not.toHaveProperty('created_at');
      }
    });

    it('should support pagination', async () => {
      const result = await caller.projects.list({ limit: 5, offset: 0 });

      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
      expect(result.projects.length).toBeLessThanOrEqual(5);
    });

    it('should filter by org', async () => {
      const allProjects = await caller.projects.list({});

      // Find a project with an org
      const projectWithOrg = allProjects.projects.find(p => p.org);

      if (projectWithOrg) {
        const filteredResult = await caller.projects.list({
          org: projectWithOrg.org as 'acme-corp' | 'example-org' | 'personal' | 'other',
        });

        filteredResult.projects.forEach((project) => {
          expect(project.org).toBe(projectWithOrg.org);
        });
      }
    });

    it('should filter by status', async () => {
      const result = await caller.projects.list({ status: 'active' });

      result.projects.forEach((project) => {
        expect(project.status).toBe('active');
      });
    });

    it('should exclude children when includeChildren is false', async () => {
      const withChildren = await caller.projects.list({ includeChildren: true });
      const withoutChildren = await caller.projects.list({ includeChildren: false });

      // Without children should only have top-level projects
      withoutChildren.projects.forEach((project) => {
        expect(project.parentId).toBeNull();
      });

      // May have fewer projects when excluding children
      expect(withoutChildren.projects.length).toBeLessThanOrEqual(withChildren.projects.length);
    });
  });

  describe('projects.get', () => {
    it('should return a single project by slug', async () => {
      const listResult = await caller.projects.list({ limit: 1 });

      if (listResult.projects.length === 0) {
        console.log('Skipping - no projects in database');
        return;
      }

      const projectSlug = listResult.projects[0].slug;
      const projectOrg = listResult.projects[0].org;
      const project = await caller.projects.get({ slug: projectSlug, org: projectOrg });

      expect(project.slug).toBe(projectSlug);
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('taskStats');
    });

    it('should include children in response', async () => {
      const listResult = await caller.projects.list({ limit: 1 });

      if (listResult.projects.length === 0) return;

      const project = await caller.projects.get({ slug: listResult.projects[0].slug, org: listResult.projects[0].org });

      expect(project).toHaveProperty('children');
      expect(Array.isArray(project.children)).toBe(true);
    });

    it('should include task statistics', async () => {
      const listResult = await caller.projects.list({ limit: 1 });

      if (listResult.projects.length === 0) return;

      const project = await caller.projects.get({ slug: listResult.projects[0].slug, org: listResult.projects[0].org });

      expect(project.taskStats).toHaveProperty('total');
      expect(project.taskStats).toHaveProperty('pending');
      expect(project.taskStats).toHaveProperty('complete');
      expect(typeof project.taskStats.total).toBe('number');
    });

    it('should filter by org when provided', async () => {
      const listResult = await caller.projects.list({ limit: 1 });

      if (listResult.projects.length === 0) return;

      const project = listResult.projects[0];
      const result = await caller.projects.get({
        slug: project.slug,
        org: project.org,
      });

      expect(result.slug).toBe(project.slug);
      expect(result.org).toBe(project.org);
    });

    it('should throw NOT_FOUND for non-existent project', async () => {
      await expect(
        caller.projects.get({ slug: 'non-existent-project-xyz', org: 'other' })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('projects.resolvePath', () => {
    it('should resolve project path', async () => {
      const listResult = await caller.projects.list({ limit: 1 });

      if (listResult.projects.length === 0) {
        console.log('Skipping - no projects in database');
        return;
      }

      const project = listResult.projects[0];
      const path = await caller.projects.resolvePath({ slug: project.slug });

      expect(path).not.toBeNull();
      expect(path!.slug).toBe(project.slug);
      expect(path!.org).toBe(project.org);
      expect(path!).toHaveProperty('fullPath');
    });

    it('should return null for non-existent project', async () => {
      const path = await caller.projects.resolvePath({ slug: 'non-existent-xyz' });
      expect(path).toBeNull();
    });
  });

  describe('Type Safety', () => {
    it('should have string org values', async () => {
      const result = await caller.projects.list({});

      result.projects.forEach((project) => {
        expect(typeof project.org).toBe('string');
        expect(project.org.length).toBeGreaterThan(0);
      });
    });

    it('should compute fullPath correctly', async () => {
      const result = await caller.projects.list({});

      result.projects.forEach((project) => {
        if (project.parentSlug) {
          // Subprojects should have parent/slug format
          expect(project.fullPath).toBe(`${project.parentSlug}/${project.slug}`);
        } else {
          // Top-level projects should have just the slug
          expect(project.fullPath).toBe(project.slug);
        }
      });
    });

    it('should have ISO date strings for timestamps', async () => {
      const result = await caller.projects.list({ limit: 1 });

      if (result.projects.length > 0) {
        const project = result.projects[0];

        // createdAt and updatedAt should be ISO strings
        expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(project.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });
  });
});
