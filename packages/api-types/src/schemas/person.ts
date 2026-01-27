import { z } from 'zod';
import { PersonOrgSchema } from './enums.js';

// =============================================================================
// PERSON SCHEMAS
// =============================================================================

export const PersonSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  org: PersonOrgSchema.nullable().optional(),
  airtableYaId: z.string().nullable().optional(),
  airtableSvId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Person = z.infer<typeof PersonSchema>;

export const CreatePersonSchema = PersonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreatePerson = z.infer<typeof CreatePersonSchema>;

export const UpdatePersonSchema = CreatePersonSchema.partial();
export type UpdatePerson = z.infer<typeof UpdatePersonSchema>;

// =============================================================================
// PERSON WITH STATS (for lists)
// =============================================================================

export const PersonWithStatsSchema = PersonSchema.extend({
  ownedTasks: z.number().default(0),
  waitingOnTasks: z.number().default(0),
});
export type PersonWithStats = z.infer<typeof PersonWithStatsSchema>;
