/**
 * Data Migration: Create _general projects for existing organizations
 *
 * This script:
 * 1. Finds all organizations without a _general project
 * 2. Creates a _general project in the database for each
 * 3. Creates the filesystem folder and README.md for each
 *
 * Run with: npx tsx src/scripts/migrate-general-projects.ts
 */
import 'dotenv/config';
