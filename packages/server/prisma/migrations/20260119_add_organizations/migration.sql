-- Add organizations table and migrate data from string org columns

-- Step 1: Create organizations table
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");

-- Step 2: Insert known organizations
INSERT OR IGNORE INTO "organizations" ("slug", "name", "short_name") VALUES
    ('acme-corp', 'Acme Corp', 'YA'),
    ('example-org', 'Centre for Example Org', 'ExOrg'),
    ('consulting', 'Consulting', NULL),
    ('personal', 'Personal', NULL),
    ('other', 'Other', NULL),
    ('external', 'External', NULL);

-- Step 3: Add org_id column to projects (with temporary nullable constraint)
ALTER TABLE "projects" ADD COLUMN "org_id" INTEGER REFERENCES "organizations"("id");

-- Step 4: Migrate project org data
UPDATE "projects" SET "org_id" = (
    SELECT "id" FROM "organizations" WHERE "slug" = "projects"."org"
);

-- Step 5: Add org_id column to people (nullable)
ALTER TABLE "people" ADD COLUMN "org_id" INTEGER REFERENCES "organizations"("id");

-- Step 6: Migrate people org data (mapping short names to full slugs)
UPDATE "people" SET "org_id" = (
    SELECT "id" FROM "organizations"
    WHERE "slug" = CASE "people"."org"
        WHEN 'ya' THEN 'acme-corp'
        WHEN 'cbp' THEN 'example-org'
        ELSE "people"."org"
    END
) WHERE "org" IS NOT NULL;

-- Step 7: Create index on org_id columns
CREATE INDEX IF NOT EXISTS "projects_org_id_idx" ON "projects"("org_id");
CREATE INDEX IF NOT EXISTS "people_org_id_idx" ON "people"("org_id");

-- Note: We keep the old 'org' string column for now as a backup
-- It can be dropped in a future migration after verifying data integrity
-- To drop later: ALTER TABLE "projects" DROP COLUMN "org";
-- To drop later: ALTER TABLE "people" DROP COLUMN "org";
