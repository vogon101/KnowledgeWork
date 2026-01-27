import { z } from 'zod';
import { ProjectOrgSchema, ProjectStatusSchema } from './enums.js';

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

export const ProjectSchema = z.object({
  id: z.number(),
  slug: z.string().min(1),
  name: z.string().min(1),
  org: ProjectOrgSchema,
  status: ProjectStatusSchema.nullable().optional(),
  priority: z.number().min(1).max(4).nullable().optional(),
  parentId: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  isGeneral: z.boolean().default(false), // General project for org-level tasks
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateProject = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

// =============================================================================
// ORGANIZATION COLOR
// =============================================================================

// Available org colors - distinct from semantic badge colors
export const OrgColorSchema = z.enum(['indigo', 'teal', 'rose', 'orange']);
export type OrgColor = z.infer<typeof OrgColorSchema>;

export const ORG_COLORS = ['indigo', 'teal', 'rose', 'orange'] as const;

// =============================================================================
// PROJECT WITH PARENT (for nested projects)
// =============================================================================

export const ProjectWithParentSchema = ProjectSchema.extend({
  parentSlug: z.string().nullable().optional(),
  parentName: z.string().nullable().optional(),
  fullPath: z.string().optional(), // e.g., "energy/nuclear" for subprojects
  // Organization details from related Organization table
  organizationName: z.string().optional(),
  organizationShortName: z.string().nullable().optional(),
  organizationColor: OrgColorSchema.nullable().optional(),
});
export type ProjectWithParent = z.infer<typeof ProjectWithParentSchema>;

// =============================================================================
// PROJECT PATH (for URL construction)
// =============================================================================

export const ProjectPathSchema = z.object({
  org: z.string(),
  slug: z.string(),
  parentSlug: z.string().nullable(),
  fullPath: z.string(), // Either "slug" or "parentSlug/slug" for subprojects
});
export type ProjectPath = z.infer<typeof ProjectPathSchema>;
