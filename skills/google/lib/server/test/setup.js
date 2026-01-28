/**
 * Test setup - initializes test database before running tests
 */
import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'fs';
const __dirname = dirname(fileURLToPath(import.meta.url));
// Use a test database file
const TEST_DB_PATH = join(__dirname, '../../data/test.db');
const TEMPLATE_DB_PATH = join(__dirname, '../../data/items.db');
let prisma = null;
export function getTestPrisma() {
    if (!prisma) {
        const adapter = new PrismaBetterSqlite3({ url: TEST_DB_PATH });
        prisma = new PrismaClient({ adapter });
    }
    return prisma;
}
beforeAll(async () => {
    // Create test database directory if needed
    const dataDir = dirname(TEST_DB_PATH);
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
    // Copy the main database as a template (so we have schema and some data)
    if (existsSync(TEMPLATE_DB_PATH)) {
        copyFileSync(TEMPLATE_DB_PATH, TEST_DB_PATH);
    }
    console.log('Test database initialized at:', TEST_DB_PATH);
});
afterAll(async () => {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
    }
    // Clean up test database
    if (existsSync(TEST_DB_PATH)) {
        rmSync(TEST_DB_PATH, { force: true });
    }
    console.log('Test database cleaned up');
});
