/**
 * Organization utilities - server-side only
 *
 * Use these in server components (no "use client" directive)
 * For client components, use organizations.ts
 */

import Database from "better-sqlite3";
import { join } from "path";
import { existsSync } from "fs";

export interface Organization {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  description: string | null;
  color: "indigo" | "teal" | "rose" | "orange" | null;
}

// Database path - same as task-db.ts
const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), "../server/data/items.db");

// Cached database connection
let db: Database.Database | null = null;
let dbLastUsed = 0;
const DB_CACHE_TTL = 5000;

function getDb(): Database.Database | null {
  const now = Date.now();

  if (db && now - dbLastUsed > DB_CACHE_TTL) {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    db = null;
  }

  if (!db) {
    if (!existsSync(DB_PATH)) {
      return null;
    }

    try {
      db = new Database(DB_PATH, { readonly: true, timeout: 5000 });
    } catch (err) {
      console.warn("Organization database connection failed:", err);
      return null;
    }
  }

  dbLastUsed = now;
  return db;
}

/**
 * Type for the orgs map (useful for passing to components)
 */
export type OrgsMap = Map<string, Organization>;

/**
 * Fetch all organizations from database (server-side)
 * Use this in Next.js server components instead of the hook
 */
export function getOrganizationsServer(): Organization[] {
  const database = getDb();
  if (!database) {
    return [];
  }

  try {
    const rows = database.prepare(`
      SELECT id, slug, name, short_name as shortName, description, color
      FROM organizations
      ORDER BY name
    `).all() as Organization[];

    return rows;
  } catch (err) {
    console.warn("Failed to fetch organizations:", err);
    return [];
  }
}

/**
 * Get a single organization by slug (server-side)
 */
export function getOrganizationServer(slug: string): Organization | null {
  const database = getDb();
  if (!database) {
    return null;
  }

  try {
    const row = database.prepare(`
      SELECT id, slug, name, short_name as shortName, description, color
      FROM organizations
      WHERE slug = ?
    `).get(slug) as Organization | undefined;

    return row || null;
  } catch (err) {
    console.warn("Failed to fetch organization:", err);
    return null;
  }
}

/**
 * Get org display name by slug (server-side)
 * Falls back to slug if not found
 */
export function getOrgNameServer(slug: string): string {
  const org = getOrganizationServer(slug);
  return org?.name || slug;
}

/**
 * Get orgs map for efficient lookups (server-side)
 */
export function getOrganizationsMapServer(): OrgsMap {
  const orgs = getOrganizationsServer();
  const map = new Map<string, Organization>();
  for (const org of orgs) {
    map.set(org.slug, org);
  }
  return map;
}
