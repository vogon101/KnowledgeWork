/**
 * Google OAuth Authentication Script
 *
 * This script guides you through the OAuth flow to authenticate Google API access
 * (Gmail, Contacts, Calendar).
 * Run once to set up Google integration.
 *
 * Prerequisites:
 * 1. Create a project in Google Cloud Console (console.cloud.google.com)
 * 2. Enable the Gmail API, People API, and Google Calendar API
 * 3. Configure OAuth consent screen (External, add your email as test user)
 * 4. Create OAuth credentials (Desktop app type)
 * 5. Download credentials.json and save to your content repo's .data folder
 *
 * Run with: npx tsx src/scripts/google-auth.ts
 */

import 'dotenv/config';
import readline from 'readline';
import http from 'http';
import { URL } from 'url';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  getCredentialsPath,
  getTokenPath,
  hasCredentials,
  hasTokens,
  createOAuth2Client,
  saveTokens,
  clearGmailClientCache,
  getAuthenticatedEmail,
  getCalendarClient,
  DEFAULT_SCOPES,
} from '../services/google-client.js';
import { getKnowledgeBasePath } from '../services/paths.js';

// =============================================================================
// HELPERS
// =============================================================================

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Open a URL in the user's default browser.
 */
function openBrowser(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${cmd} ${JSON.stringify(url)}`, (err) => {
      resolve(!err);
    });
  });
}

/**
 * Start a temporary local HTTP server to capture the OAuth redirect.
 * Returns the authorization code.
 */
function waitForOAuthCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || '/', `http://localhost:${port}`);
      const code = reqUrl.searchParams.get('code');
      const error = reqUrl.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Authentication failed</h2><p>You can close this tab.</p></body></html>');
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Authentication successful!</h2><p>You can close this tab and return to the terminal.</p></body></html>');
        server.close();
        resolve(code);
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(port, '127.0.0.1');
    server.on('error', reject);

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for OAuth callback'));
    }, 120_000);
  });
}

/**
 * Find an available port by binding to port 0.
 */
function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Could not determine port')));
      }
    });
    srv.on('error', reject);
  });
}

/**
 * Read a kw.env file into a Map of key=value pairs.
 */
function readKwEnv(filePath: string): Map<string, string> {
  const entries = new Map<string, string>();
  if (!fs.existsSync(filePath)) return entries;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries.set(key, value);
  }
  return entries;
}

/**
 * Write a Map of key=value pairs to a kw.env file,
 * preserving comments and unrecognized lines.
 */
function writeKwEnv(filePath: string, entries: Map<string, string>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // If the file exists, update in place preserving comments
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    const written = new Set<string>();
    const output: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        output.push(line);
        continue;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) {
        output.push(line);
        continue;
      }
      const key = trimmed.slice(0, eqIdx).trim();
      if (entries.has(key)) {
        output.push(`${key}=${entries.get(key)}`);
        written.add(key);
      } else {
        output.push(line);
      }
    }

    // Append any new keys
    for (const [key, value] of entries) {
      if (!written.has(key)) {
        output.push(`${key}=${value}`);
      }
    }

    fs.writeFileSync(filePath, output.join('\n') + '\n');
  } else {
    // Create new file
    const lines = ['# KnowledgeWork content-level configuration', ''];
    for (const [key, value] of entries) {
      lines.push(`${key}=${value}`);
    }
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Google OAuth Authentication Setup');
  console.log('='.repeat(60));
  console.log();

  const credPath = getCredentialsPath();
  const tokenPath = getTokenPath();

  console.log('Configuration paths:');
  console.log(`  Credentials: ${credPath}`);
  console.log(`  Tokens:      ${tokenPath}`);
  console.log();

  // Check for existing credentials
  if (!hasCredentials()) {
    console.log('ERROR: No credentials file found!');
    console.log();
    console.log('To set up Gmail integration:');
    console.log('1. Go to https://console.cloud.google.com');
    console.log('2. Create a new project (or select existing)');
    console.log('3. Enable the Gmail API');
    console.log('4. Go to Credentials > Create Credentials > OAuth client ID');
    console.log('5. Choose "Desktop app" as the application type');
    console.log('6. Download the credentials JSON file');
    console.log(`7. Save it as: ${credPath}`);
    console.log();
    console.log('Or set GMAIL_CREDENTIALS_PATH environment variable to point to your credentials file.');
    process.exit(1);
  }

  console.log('✓ Found credentials file');

  // Check for existing tokens
  if (hasTokens()) {
    console.log('✓ Found existing tokens');

    // Try to verify they still work
    const email = await getAuthenticatedEmail();
    if (email) {
      console.log(`✓ Already authenticated as: ${email}`);
      console.log();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await question(rl, 'Re-authenticate? (y/N): ');
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('Keeping existing authentication.');
        process.exit(0);
      }
      console.log();
    } else {
      console.log('! Existing tokens may be invalid or expired');
    }
  }

  // Get an available port for the OAuth callback
  let callbackPort: number;
  try {
    callbackPort = await getAvailablePort();
  } catch {
    console.log('WARNING: Could not find available port, falling back to manual code entry');
    callbackPort = 0;
  }

  // Create OAuth client with localhost redirect
  const oAuth2Client = createOAuth2Client();
  if (!oAuth2Client) {
    console.log('ERROR: Failed to create OAuth client from credentials');
    console.log('Check that your credentials file is valid.');
    process.exit(1);
  }

  const useLocalServer = callbackPort > 0;
  const redirectUri = useLocalServer ? `http://localhost:${callbackPort}` : 'urn:ietf:wg:oauth:2.0:oob';

  // Generate auth URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: DEFAULT_SCOPES,
    prompt: 'consent',
    redirect_uri: redirectUri,
  });

  let code: string;

  if (useLocalServer) {
    // Auto-callback flow
    console.log();
    console.log('Opening browser for authentication...');

    const callbackPromise = waitForOAuthCallback(callbackPort);

    const opened = await openBrowser(authUrl);
    if (!opened) {
      console.log();
      console.log('Could not open browser automatically. Open this URL manually:');
      console.log('-'.repeat(60));
      console.log(authUrl);
      console.log('-'.repeat(60));
    }

    console.log('Waiting for authentication...');

    try {
      code = await callbackPromise;
      console.log('✓ Received authorization code');
    } catch (err) {
      console.log();
      console.log(`Auto-callback failed: ${err instanceof Error ? err.message : err}`);
      console.log('Falling back to manual code entry.');
      console.log();
      console.log('Open this URL in your browser:');
      console.log('-'.repeat(60));
      console.log(authUrl);
      console.log('-'.repeat(60));
      console.log();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      code = await question(rl, 'Enter the authorization code: ');
      rl.close();
    }
  } else {
    // Manual flow fallback
    console.log('To authenticate:');
    console.log();
    console.log('1. Open this URL in your browser:');
    console.log('-'.repeat(60));
    console.log(authUrl);
    console.log('-'.repeat(60));
    console.log();
    console.log('2. Sign in with your Google account');
    console.log('3. Grant the requested permissions');
    console.log('4. Copy the authorization code');
    console.log();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    code = await question(rl, 'Enter the authorization code: ');
    rl.close();
  }

  if (!code) {
    console.log('No code entered. Aborting.');
    process.exit(1);
  }

  console.log();
  console.log('Exchanging code for tokens...');

  try {
    // Exchange code using our client (with correct redirect_uri)
    const { tokens } = await oAuth2Client.getToken({ code, redirect_uri: redirectUri });
    saveTokens(tokens as Record<string, unknown>);
    clearGmailClientCache();
    console.log('✓ Tokens saved successfully');

    // Verify authentication
    const email = await getAuthenticatedEmail();
    if (email) {
      console.log(`✓ Authenticated as: ${email}`);
    }

    console.log();
    console.log('='.repeat(60));
    console.log('Google integration is now configured!');
    console.log('='.repeat(60));
    console.log();
    console.log(`Tokens are stored at: ${tokenPath}`);

    // Interactive calendar selection
    try {
      const calendarClient = await getCalendarClient();
      if (calendarClient) {
        const calList = await calendarClient.calendarList.list();
        const calendars = calList.data.items || [];
        if (calendars.length > 0) {
          console.log();
          console.log('Available calendars:');
          console.log('-'.repeat(60));

          const validCalendars: { id: string; summary: string; primary: boolean; accessRole: string }[] = [];
          for (const cal of calendars) {
            if (!cal.id) continue;
            validCalendars.push({
              id: cal.id,
              summary: cal.summary || '(untitled)',
              primary: !!cal.primary,
              accessRole: cal.accessRole || 'unknown',
            });
          }

          for (let i = 0; i < validCalendars.length; i++) {
            const cal = validCalendars[i];
            const primary = cal.primary ? ' (primary)' : '';
            const role = cal.accessRole !== 'owner' ? ` [${cal.accessRole}]` : '';
            console.log(`  ${i + 1}. ${cal.summary}${primary}${role}`);
            console.log(`     ${cal.id}`);
          }

          console.log();

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const selection = await question(
            rl,
            'Enter calendar numbers to include (e.g. 1,3,5), "all", or press Enter for primary only: '
          );
          rl.close();

          let selectedIds: string[];

          if (!selection || selection === '') {
            // Default: primary only
            const primary = validCalendars.find((c) => c.primary);
            selectedIds = primary ? [primary.id] : [validCalendars[0].id];
          } else if (selection.toLowerCase() === 'all') {
            selectedIds = validCalendars.map((c) => c.id);
          } else {
            const nums = selection.split(',').map((s) => parseInt(s.trim(), 10));
            selectedIds = nums
              .filter((n) => n >= 1 && n <= validCalendars.length)
              .map((n) => validCalendars[n - 1].id);
          }

          if (selectedIds.length > 0) {
            // Write to kw.env
            let kwEnvPath: string;
            try {
              kwEnvPath = path.join(getKnowledgeBasePath(), '.data', 'kw.env');
            } catch {
              // KNOWLEDGE_BASE_PATH not set — skip writing
              console.log();
              console.log('Selected calendar IDs:');
              console.log(`  GOOGLE_CALENDAR_IDS=${selectedIds.join(',')}`);
              console.log();
              console.log('Add this to your .env or content repo .data/kw.env manually.');
              return;
            }

            const entries = readKwEnv(kwEnvPath);
            entries.set('GOOGLE_CALENDAR_IDS', selectedIds.join(','));
            writeKwEnv(kwEnvPath, entries);

            console.log();
            console.log(`✓ Saved ${selectedIds.length} calendar(s) to ${kwEnvPath}`);
            for (const id of selectedIds) {
              const cal = validCalendars.find((c) => c.id === id);
              console.log(`  - ${cal?.summary || id}`);
            }
          }
        }
      }
    } catch {
      // Calendar listing is optional — don't fail auth on this
    }
  } catch (err) {
    console.log('ERROR: Failed to exchange code for tokens');
    console.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
