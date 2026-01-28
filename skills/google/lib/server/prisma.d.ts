/**
 * Prisma client singleton for the unified item model
 *
 * This module provides a singleton PrismaClient instance using the
 * better-sqlite3 driver adapter (required in Prisma 7).
 */
import { PrismaClient } from './generated/prisma';
/**
 * Get the singleton Prisma client instance
 */
export declare function getPrisma(): PrismaClient;
/**
 * Close the Prisma client connection
 */
export declare function closePrisma(): Promise<void>;
/**
 * Get the database path (for utilities that need it)
 */
export declare function getDbPath(): string;
export type { Item, Person, Project, Meeting, Activity, CheckIn, ItemLink, ItemPerson, Tag, ItemTag, ItemAttachment, MeetingProject, MeetingAttendee, MeetingItem, RoutineCompletion, RoutineSkip, } from './generated/prisma';
