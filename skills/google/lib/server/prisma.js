/**
 * Prisma client singleton for the unified item model
 *
 * This module provides a singleton PrismaClient instance using the
 * better-sqlite3 driver adapter (required in Prisma 7).
 */
import { PrismaClient } from './generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
// Singleton Prisma client instance
let prisma = null;
let dbPath = null;
/**
 * Parse DATABASE_URL to extract the file path.
 * Called lazily when getPrisma() is first invoked.
 */
function getDbPathLazy() {
    if (dbPath)
        return dbPath;
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable is required. ' +
            'Set it in packages/server/.env to point to your database file.');
    }
    // DATABASE_URL format: "file:./path/to/db" - extract the path
    dbPath = dbUrl.replace(/^file:/, '');
    return dbPath;
}
/**
 * Get the singleton Prisma client instance
 */
export function getPrisma() {
    if (!prisma) {
        const path = getDbPathLazy();
        const adapter = new PrismaBetterSqlite3({ url: path });
        prisma = new PrismaClient({ adapter });
        console.log(`Prisma connected: ${path}`);
    }
    return prisma;
}
/**
 * Close the Prisma client connection
 */
export async function closePrisma() {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
        console.log('Prisma connection closed');
    }
}
/**
 * Get the database path (for utilities that need it)
 */
export function getDbPath() {
    return getDbPathLazy();
}
