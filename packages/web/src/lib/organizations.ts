/**
 * Organization utilities - client-side only
 *
 * Use these in client components ("use client")
 * For server components, use organizations-server.ts
 */

import { trpc } from "./trpc";

export interface Organization {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  description: string | null;
  color: "indigo" | "teal" | "rose" | "orange" | null;
}

// Color mapping from DB color names to Tailwind classes
const COLOR_CLASSES: Record<string, { text: string; bg: string }> = {
  indigo: { text: "text-indigo-400", bg: "bg-indigo-500/10" },
  teal: { text: "text-teal-400", bg: "bg-teal-500/10" },
  rose: { text: "text-rose-400", bg: "bg-rose-500/10" },
  orange: { text: "text-orange-400", bg: "bg-orange-500/10" },
};

const DEFAULT_COLOR = { text: "text-zinc-400", bg: "bg-zinc-500/10" };

/**
 * Get Tailwind color classes for an organization
 */
export function getOrgColorClasses(color: string | null | undefined) {
  return COLOR_CLASSES[color || ""] || DEFAULT_COLOR;
}

/**
 * Hook to fetch all organizations (for client components)
 */
export function useOrganizations() {
  const query = trpc.organizations.list.useQuery();

  const orgsMap = new Map<string, Organization>();
  for (const org of query.data?.organizations || []) {
    orgsMap.set(org.slug, org as Organization);
  }

  return {
    organizations: (query.data?.organizations || []) as Organization[],
    orgsMap,
    isLoading: query.isLoading,
    error: query.error,

    // Helper to get org display name
    getOrgName: (slug: string) => orgsMap.get(slug)?.name || slug,

    // Helper to get org short name
    getOrgShortName: (slug: string) => orgsMap.get(slug)?.shortName || slug,

    // Helper to get org color classes
    getOrgColors: (slug: string) => getOrgColorClasses(orgsMap.get(slug)?.color),

    // Helper to get full org data
    getOrg: (slug: string) => orgsMap.get(slug),
  };
}

/**
 * Type for the orgs map (useful for passing to components)
 */
export type OrgsMap = Map<string, Organization>;
