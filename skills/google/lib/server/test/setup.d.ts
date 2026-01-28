/**
 * Test setup - initializes test database before running tests
 */
import { PrismaClient } from '../generated/prisma';
export declare function getTestPrisma(): PrismaClient;
