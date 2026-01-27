#!/usr/bin/env npx tsx
/**
 * KnowledgeWork Content Repo Setup
 *
 * Sets up a content directory to work with the KnowledgeWork framework.
 * Creates symlinks for skills and configures local paths.
 *
 * Usage:
 *   pnpm setup:content --path /path/to/content
 *   pnpm setup:content  # Uses KNOWLEDGE_BASE_PATH from .env
 */

import fs from 'fs';
import path from 'path';

// Colors for terminal output
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

const info = (msg: string) => console.log(`${colors.green('✓')} ${msg}`);
const warn = (msg: string) => console.log(`${colors.yellow('!')} ${msg}`);
const error = (msg: string) => {
  console.error(`${colors.red('✗')} ${msg}`);
  process.exit(1);
};

// Parse arguments
function parseArgs(): { contentPath?: string; help?: boolean } {
  const args = process.argv.slice(2);
  const result: { contentPath?: string; help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      result.contentPath = args[i + 1];
      i++;
    } else if (args[i] === '-h' || args[i] === '--help') {
      result.help = true;
    }
  }

  return result;
}

function showHelp() {
  console.log(`
KnowledgeWork Content Setup

Usage:
  pnpm setup:content --path /path/to/content-repo
  pnpm setup:content  # Uses KNOWLEDGE_BASE_PATH from .env

Options:
  --path PATH    Path to content repository
  -h, --help     Show this help

This script:
  1. Creates kw.local.json in the content repo
  2. Creates .claude/skills/ directory with symlinks to framework skills
  3. Migrates any local-skills into .claude/skills/
  4. Creates .data/ directory for the database
  5. Creates CLI lib symlinks for server imports
  6. Verifies everything is connected
`);
}

function ensureDir(dir: string, label: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    info(`Created ${label}`);
  } else {
    info(`${label} exists`);
  }
}

function safeCreateSymlink(linkPath: string, targetPath: string, label: string) {
  try {
    // Check if path exists (follows symlinks)
    if (fs.existsSync(linkPath)) {
      const stats = fs.lstatSync(linkPath);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else if (stats.isDirectory()) {
        // Real directory exists - don't replace it (it's a local skill)
        return false;
      } else {
        fs.unlinkSync(linkPath);
      }
    } else {
      // Path doesn't exist, but might be a broken symlink
      try {
        const stats = fs.lstatSync(linkPath);
        if (stats.isSymbolicLink()) {
          fs.unlinkSync(linkPath);
        }
      } catch {
        // Doesn't exist at all - that's fine
      }
    }

    fs.symlinkSync(targetPath, linkPath);
    info(`Created symlink: ${label}`);
    return true;
  } catch (err) {
    warn(`Failed to create symlink ${label}: ${err}`);
    return false;
  }
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Determine framework path (this script's location)
  const frameworkPath = path.resolve(__dirname, '..');

  // Determine content path
  let contentPath = args.contentPath;

  if (!contentPath) {
    // Try to read from .env
    const envPath = path.join(frameworkPath, 'packages/server/.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/KNOWLEDGE_BASE_PATH=["']?([^"'\n]+)["']?/);
      if (match) {
        contentPath = match[1];
        info(`Using KNOWLEDGE_BASE_PATH from .env: ${contentPath}`);
      }
    }
  }

  if (!contentPath) {
    error('No content path specified. Use --path or set KNOWLEDGE_BASE_PATH in packages/server/.env');
  }

  // Resolve to absolute path
  contentPath = path.resolve(contentPath);

  // Validate paths
  if (!fs.existsSync(frameworkPath)) {
    error(`Framework path does not exist: ${frameworkPath}`);
  }

  const frameworkSkillsPath = path.join(frameworkPath, 'skills');
  if (!fs.existsSync(frameworkSkillsPath)) {
    error(`Framework missing skills/ directory: ${frameworkPath}`);
  }

  const frameworkAgentsPath = path.join(frameworkPath, 'agents');
  if (!fs.existsSync(frameworkAgentsPath)) {
    warn(`Framework missing agents/ directory: ${frameworkPath}`);
  }

  const frameworkDocsPath = path.join(frameworkPath, 'docs');

  console.log('\nKnowledgeWork Setup');
  console.log('===================');
  console.log(`Framework path: ${frameworkPath}`);
  console.log(`Content path:   ${contentPath}`);
  console.log('');

  // Create content directory if it doesn't exist
  ensureDir(contentPath, 'Content directory');

  // 1. Create/update kw.local.json
  const configPath = path.join(contentPath, 'kw.local.json');
  const config = {
    frameworkPath,
    databasePath: './.data/items.db',
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  info('Created kw.local.json');

  // 2. Create .data directory
  ensureDir(path.join(contentPath, '.data'), '.data/');

  // 3. Create .claude directory
  ensureDir(path.join(contentPath, '.claude'), '.claude/');

  // 4. Handle .claude/skills - needs to be a directory, not a symlink
  const contentSkillsPath = path.join(contentPath, '.claude/skills');

  // Check if it's currently a symlink (old setup) and remove it
  try {
    const stats = fs.lstatSync(contentSkillsPath);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(contentSkillsPath);
      info('Removed old skills symlink (migrating to directory structure)');
    }
  } catch {
    // Doesn't exist - that's fine
  }

  // Create skills as a real directory
  ensureDir(contentSkillsPath, '.claude/skills/');

  // 5. Symlink each framework skill into .claude/skills/
  console.log('\nLinking framework skills...');
  const frameworkSkills = fs.readdirSync(frameworkSkillsPath);
  for (const skillName of frameworkSkills) {
    const skillSource = path.join(frameworkSkillsPath, skillName);
    const skillDest = path.join(contentSkillsPath, skillName);

    // Only process directories
    const stats = fs.statSync(skillSource);
    if (!stats.isDirectory()) continue;

    safeCreateSymlink(skillDest, skillSource, `skills/${skillName}`);
  }

  // 6. Migrate local-skills if they exist
  const localSkillsPath = path.join(contentPath, '.claude/local-skills');
  if (fs.existsSync(localSkillsPath)) {
    console.log('\nMigrating local skills...');
    const localSkills = fs.readdirSync(localSkillsPath);
    for (const skillName of localSkills) {
      const skillSource = path.join(localSkillsPath, skillName);
      const skillDest = path.join(contentSkillsPath, skillName);

      const stats = fs.statSync(skillSource);
      if (!stats.isDirectory()) continue;

      // Check if destination already exists
      if (fs.existsSync(skillDest)) {
        const destStats = fs.lstatSync(skillDest);
        if (destStats.isSymbolicLink()) {
          // Framework skill symlink - local skill takes precedence
          fs.unlinkSync(skillDest);
          info(`Removed framework symlink for ${skillName} (local skill takes precedence)`);
        } else {
          // Already a directory - skip
          info(`Local skill ${skillName} already in skills/`);
          continue;
        }
      }

      // Move the local skill to skills/
      fs.renameSync(skillSource, skillDest);
      info(`Migrated local skill: ${skillName}`);
    }

    // Remove empty local-skills directory
    try {
      const remaining = fs.readdirSync(localSkillsPath);
      if (remaining.length === 0) {
        fs.rmdirSync(localSkillsPath);
        info('Removed empty local-skills directory');
      } else {
        warn(`local-skills still contains: ${remaining.join(', ')}`);
      }
    } catch {
      // Ignore errors
    }
  }

  // 7. Create context directory
  ensureDir(path.join(contentPath, '.claude/context'), '.claude/context/');

  // 7b. Handle .claude/agents - symlink framework agents
  const contentAgentsPath = path.join(contentPath, '.claude/agents');

  // Check if it's currently a symlink (old setup) and remove it
  try {
    const stats = fs.lstatSync(contentAgentsPath);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(contentAgentsPath);
      info('Removed old agents symlink (migrating to directory structure)');
    }
  } catch {
    // Doesn't exist - that's fine
  }

  // Create agents as a real directory
  ensureDir(contentAgentsPath, '.claude/agents/');

  // Symlink each framework agent into .claude/agents/
  if (fs.existsSync(frameworkAgentsPath)) {
    console.log('\nLinking framework agents...');
    const frameworkAgents = fs.readdirSync(frameworkAgentsPath);
    for (const agentName of frameworkAgents) {
      const agentSource = path.join(frameworkAgentsPath, agentName);
      const agentDest = path.join(contentAgentsPath, agentName);

      // Only process .md files
      if (!agentName.endsWith('.md')) continue;

      safeCreateSymlink(agentDest, agentSource, `agents/${agentName}`);
    }
  }

  // 7c. Symlink DOCUMENT-FORMATS.md from framework docs
  const docFormatsSource = path.join(frameworkDocsPath, 'DOCUMENT-FORMATS.md');
  const docFormatsDest = path.join(contentPath, 'DOCUMENT-FORMATS.md');
  if (fs.existsSync(docFormatsSource)) {
    safeCreateSymlink(docFormatsDest, docFormatsSource, 'DOCUMENT-FORMATS.md');
  }

  // 7d. Symlink FRAMEWORK-INSTRUCTIONS.md from framework docs
  const frameworkInstrSource = path.join(frameworkDocsPath, 'FRAMEWORK-INSTRUCTIONS.md');
  const frameworkInstrDest = path.join(contentPath, 'FRAMEWORK-INSTRUCTIONS.md');
  if (fs.existsSync(frameworkInstrSource)) {
    safeCreateSymlink(frameworkInstrDest, frameworkInstrSource, 'FRAMEWORK-INSTRUCTIONS.md');
  }

  // 8. Create task-cli lib symlink
  const taskCliLibDir = path.join(frameworkPath, 'skills/task-cli/lib');
  ensureDir(taskCliLibDir, 'skills/task-cli/lib/');

  safeCreateSymlink(
    path.join(taskCliLibDir, 'server'),
    path.join(frameworkPath, 'packages/server/dist'),
    'skills/task-cli/lib/server'
  );

  // 9. Create gmail-cli lib symlink
  const gmailCliLibDir = path.join(frameworkPath, 'skills/gmail/lib');
  ensureDir(gmailCliLibDir, 'skills/gmail/lib/');

  safeCreateSymlink(
    path.join(gmailCliLibDir, 'server'),
    path.join(frameworkPath, 'packages/server/dist'),
    'skills/gmail/lib/server'
  );

  // 10. Verify setup
  console.log('\nVerifying setup...');
  let errors = 0;

  // Check a framework skill exists
  const skillsCheck = path.join(contentSkillsPath, 'task-cli');
  if (!fs.existsSync(skillsCheck)) {
    warn('Framework skills not linked correctly');
    errors++;
  } else {
    info('Framework skills linked correctly');
  }

  // Check framework agents are linked (verify all 7)
  const expectedAgents = [
    'cowork.md',
    'chase.md',
    'meeting-prep.md',
    'people.md',
    'setup-review.md',
    'weekly-review.md',
    'writer.md',
  ];
  const missingAgents: string[] = [];
  for (const agentName of expectedAgents) {
    const agentCheck = path.join(contentAgentsPath, agentName);
    if (!fs.existsSync(agentCheck)) {
      missingAgents.push(agentName);
    }
  }
  if (missingAgents.length > 0) {
    warn(`Missing agents: ${missingAgents.join(', ')}`);
    errors++;
  } else {
    info(`All ${expectedAgents.length} framework agents linked correctly`);
  }

  // Check DOCUMENT-FORMATS.md is linked
  if (!fs.existsSync(docFormatsDest)) {
    warn('DOCUMENT-FORMATS.md not linked');
  } else {
    info('DOCUMENT-FORMATS.md linked correctly');
  }

  // Check FRAMEWORK-INSTRUCTIONS.md is linked
  if (!fs.existsSync(frameworkInstrDest)) {
    warn('FRAMEWORK-INSTRUCTIONS.md not linked');
  } else {
    info('FRAMEWORK-INSTRUCTIONS.md linked correctly');
  }

  // Check task-cli lib symlink
  const libCheck = path.join(taskCliLibDir, 'server/trpc');
  if (!fs.existsSync(libCheck)) {
    warn("Task CLI lib symlink not resolving (run 'pnpm build' first?)");
    errors++;
  } else {
    info('Task CLI lib symlink resolves correctly');
  }

  // Check gmail-cli lib symlink
  const gmailLibCheck = path.join(gmailCliLibDir, 'server/trpc');
  if (!fs.existsSync(gmailLibCheck)) {
    warn("Gmail CLI lib symlink not resolving (run 'pnpm build' first?)");
    errors++;
  } else {
    info('Gmail CLI lib symlink resolves correctly');
  }

  // Check for database
  const dbPath = path.join(contentPath, '.data/items.db');
  if (fs.existsSync(dbPath)) {
    info('Database found at .data/items.db');
  } else {
    warn('No database at .data/items.db (will be created on first server run)');
  }

  // List all skills
  console.log('\nInstalled skills:');
  const allSkills = fs.readdirSync(contentSkillsPath);
  for (const skillName of allSkills) {
    const skillPath = path.join(contentSkillsPath, skillName);
    try {
      const stats = fs.lstatSync(skillPath);
      const type = stats.isSymbolicLink() ? 'framework' : 'local';
      console.log(`  ${skillName} (${type})`);
    } catch {
      // Skip
    }
  }

  // List all agents (with local override detection)
  console.log('\nInstalled agents:');
  const allAgents = fs.readdirSync(contentAgentsPath);
  for (const agentName of allAgents) {
    if (!agentName.endsWith('.md')) continue;
    const agentPath = path.join(contentAgentsPath, agentName);
    try {
      const stats = fs.lstatSync(agentPath);
      const isFramework = stats.isSymbolicLink();
      const type = isFramework ? 'framework' : 'local override';
      console.log(`  ${agentName} (${type})`);
    } catch {
      // Skip
    }
  }

  console.log('');
  if (errors === 0) {
    console.log(colors.green('Setup complete!'));
  } else {
    console.log(colors.yellow('Setup complete with warnings.'));
    console.log('Some symlinks may not resolve until you build the framework (pnpm build).');
  }

  console.log(`
Next steps:
  1. Ensure ${contentPath}/.gitignore contains:
       .claude/skills/*
       !.claude/skills/invoicing/
       !.claude/skills/timecard/
       kw.local.json

  2. Copy CLAUDE.md template (if not already done):
       cp ${frameworkPath}/templates/CLAUDE.md ${contentPath}/CLAUDE.md

  3. Update ${frameworkPath}/packages/server/.env:
       KNOWLEDGE_BASE_PATH="${contentPath}"
       DATABASE_URL="file:${contentPath}/.data/items.db"

Note: Local skills now live in .claude/skills/ alongside framework symlinks.
      Framework skills are symlinks, local skills are real directories.
`);
}

main().catch((err) => {
  error(err.message);
});
