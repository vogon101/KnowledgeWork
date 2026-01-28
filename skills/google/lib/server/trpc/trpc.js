/**
 * tRPC Instance Setup
 *
 * Separate file to avoid circular dependencies with routers.
 */
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { getPrisma } from '../prisma.js';
import { emitDataChange } from '../events.js';
export async function createContext() {
    return {
        prisma: getPrisma(),
    };
}
// =============================================================================
// TRPC INSTANCE
// =============================================================================
const t = initTRPC.context().create({
    transformer: superjson,
    errorFormatter({ shape }) {
        return shape;
    },
});
// =============================================================================
// AUTO-EMIT MIDDLEWARE
// =============================================================================
/**
 * Middleware that automatically emits socket events after mutations.
 * Extracts entity type from router path and mutation type from procedure name.
 */
const autoEmitMiddleware = t.middleware(async ({ path, type, next }) => {
    const result = await next();
    // Only emit on successful mutations
    if (type !== 'mutation' || !result.ok) {
        return result;
    }
    // Extract entity type from path (e.g., "items.create" -> "items")
    const [routerName, procedureName] = path.split('.');
    // Map router names to entity types
    const entityMap = {
        items: 'items',
        people: 'people',
        projects: 'projects',
        organizations: 'organizations',
        routines: 'routines',
    };
    const entity = entityMap[routerName];
    if (!entity) {
        return result; // Unknown router, skip emit
    }
    // Determine mutation type from procedure name
    let mutation = 'update'; // default
    if (procedureName.includes('create') || procedureName.includes('add')) {
        mutation = 'create';
    }
    else if (procedureName.includes('delete') || procedureName.includes('remove')) {
        mutation = 'delete';
    }
    // Extract ID from result if available
    const data = result.data;
    const id = data?.id;
    const ids = data?.ids;
    console.log(`[emit] ${entity}.${mutation}`, id ? `id=${id}` : '', ids ? `ids=${ids}` : '');
    emitDataChange({ entity, mutation, id, ids });
    return result;
});
export const router = t.router;
export const publicProcedure = t.procedure.use(autoEmitMiddleware);
export const middleware = t.middleware;
