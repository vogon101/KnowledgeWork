/**
 * Gmail API Client Service
 *
 * Provides authenticated access to the Gmail API.
 * Credentials and tokens are stored in the content repo's .data directory.
 */

import fs from 'fs';
import path from 'path';
import { google, gmail_v1, people_v1, calendar_v3, Auth } from 'googleapis';
import { getKnowledgeBasePath } from './paths.js';

// =============================================================================
// TYPES
// =============================================================================

type OAuth2Client = Auth.OAuth2Client;

interface GmailCredentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface TokenData {
  refresh_token?: string | null;
  access_token?: string | null;
  expiry_date?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
}

// =============================================================================
// PATHS
// =============================================================================

/**
 * Get the path to the Gmail credentials file.
 * Uses GMAIL_CREDENTIALS_PATH env var or defaults to content repo's .data directory.
 */
export function getCredentialsPath(): string {
  if (process.env.GMAIL_CREDENTIALS_PATH) {
    return process.env.GMAIL_CREDENTIALS_PATH;
  }
  return path.join(getKnowledgeBasePath(), '.data', 'gmail-credentials.json');
}

/**
 * Get the path to the Gmail tokens file.
 * Uses GMAIL_TOKEN_PATH env var or defaults to content repo's .data directory.
 */
export function getTokenPath(): string {
  if (process.env.GMAIL_TOKEN_PATH) {
    return process.env.GMAIL_TOKEN_PATH;
  }
  return path.join(getKnowledgeBasePath(), '.data', 'gmail-tokens.json');
}

// =============================================================================
// CLIENT STATE
// =============================================================================

let cachedOAuth2Client: OAuth2Client | null = null;
let cachedGmailClient: gmail_v1.Gmail | null = null;
let cachedPeopleClient: people_v1.People | null = null;
let cachedCalendarClient: calendar_v3.Calendar | null = null;

// =============================================================================
// CONFIGURATION CHECK
// =============================================================================

/**
 * Check if Gmail credentials are configured.
 */
export function hasCredentials(): boolean {
  const credPath = getCredentialsPath();
  return fs.existsSync(credPath);
}

/**
 * Check if Gmail tokens exist (user has authenticated).
 */
export function hasTokens(): boolean {
  const tokenPath = getTokenPath();
  return fs.existsSync(tokenPath);
}

/**
 * Check if Gmail is fully configured and authenticated.
 */
export function isGmailConfigured(): boolean {
  return hasCredentials() && hasTokens();
}

// =============================================================================
// CREDENTIALS & TOKENS
// =============================================================================

/**
 * Load OAuth credentials from file.
 */
export function loadCredentials(): GmailCredentials | null {
  const credPath = getCredentialsPath();
  if (!fs.existsSync(credPath)) {
    return null;
  }

  const content = fs.readFileSync(credPath, 'utf-8');
  return JSON.parse(content) as GmailCredentials;
}

/**
 * Load saved tokens from file.
 */
export function loadTokens(): TokenData | null {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    return null;
  }

  const content = fs.readFileSync(tokenPath, 'utf-8');
  return JSON.parse(content) as TokenData;
}

/**
 * Save tokens to file.
 */
export function saveTokens(tokens: TokenData): void {
  const tokenPath = getTokenPath();
  const dir = path.dirname(tokenPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
}

// =============================================================================
// OAUTH CLIENT
// =============================================================================

/**
 * Create an OAuth2 client from credentials.
 */
export function createOAuth2Client(): OAuth2Client | null {
  const credentials = loadCredentials();
  if (!credentials) {
    return null;
  }

  const config = credentials.installed || credentials.web;
  if (!config) {
    return null;
  }

  const { client_id, client_secret, redirect_uris } = config;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

/**
 * Get an authenticated OAuth2 client, loading tokens if available.
 * Auto-refreshes tokens if they've expired.
 */
export async function getOAuth2Client(): Promise<OAuth2Client | null> {
  if (cachedOAuth2Client) {
    return cachedOAuth2Client;
  }

  const oAuth2Client = createOAuth2Client();
  if (!oAuth2Client) {
    return null;
  }

  const tokens = loadTokens();
  if (!tokens) {
    return null;
  }

  // Cast to compatible type for googleapis
  oAuth2Client.setCredentials(tokens as Auth.Credentials);

  // Set up token refresh callback
  oAuth2Client.on('tokens', (newTokens) => {
    // Preserve refresh token if not in new tokens
    const updatedTokens: TokenData = {
      ...tokens,
      ...(newTokens as TokenData),
    };
    saveTokens(updatedTokens);
  });

  // Check if token needs refresh
  if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
    try {
      const { credentials } = await oAuth2Client.refreshAccessToken();
      saveTokens({
        ...tokens,
        ...(credentials as TokenData),
      } as TokenData);
      oAuth2Client.setCredentials(credentials);
    } catch (err) {
      console.error('Failed to refresh Gmail token:', err);
      // Token might be revoked, clear cache
      cachedOAuth2Client = null;
      return null;
    }
  }

  cachedOAuth2Client = oAuth2Client;
  return oAuth2Client;
}

/**
 * Generate an authorization URL for the OAuth flow.
 */
export function getAuthUrl(scopes: string[]): string | null {
  const oAuth2Client = createOAuth2Client();
  if (!oAuth2Client) {
    return null;
  }

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to always get refresh token
  });
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenData | null> {
  const oAuth2Client = createOAuth2Client();
  if (!oAuth2Client) {
    return null;
  }

  const { tokens } = await oAuth2Client.getToken(code);
  const tokenData = tokens as TokenData;
  saveTokens(tokenData);

  // Reset cached clients
  cachedOAuth2Client = null;
  cachedGmailClient = null;

  return tokenData;
}

// =============================================================================
// GMAIL CLIENT
// =============================================================================

/**
 * Get an authenticated Gmail API client.
 */
export async function getGmailClient(): Promise<gmail_v1.Gmail | null> {
  if (cachedGmailClient) {
    return cachedGmailClient;
  }

  const auth = await getOAuth2Client();
  if (!auth) {
    return null;
  }

  cachedGmailClient = google.gmail({ version: 'v1', auth });
  return cachedGmailClient;
}

/**
 * Clear cached clients (useful after re-authentication).
 */
export function clearGmailClientCache(): void {
  cachedOAuth2Client = null;
  cachedGmailClient = null;
  cachedPeopleClient = null;
  cachedCalendarClient = null;
}

// =============================================================================
// PEOPLE (CONTACTS) CLIENT
// =============================================================================

/**
 * Get an authenticated People API client (for contacts).
 */
export async function getPeopleClient(): Promise<people_v1.People | null> {
  if (cachedPeopleClient) {
    return cachedPeopleClient;
  }

  const auth = await getOAuth2Client();
  if (!auth) {
    return null;
  }

  cachedPeopleClient = google.people({ version: 'v1', auth });
  return cachedPeopleClient;
}

// =============================================================================
// CALENDAR CLIENT
// =============================================================================

/**
 * Get an authenticated Google Calendar API client.
 */
export async function getCalendarClient(): Promise<calendar_v3.Calendar | null> {
  if (cachedCalendarClient) {
    return cachedCalendarClient;
  }

  const auth = await getOAuth2Client();
  if (!auth) {
    return null;
  }

  cachedCalendarClient = google.calendar({ version: 'v3', auth });
  return cachedCalendarClient;
}

// =============================================================================
// GMAIL STATUS
// =============================================================================

/**
 * Get the authenticated user's email address.
 */
export async function getAuthenticatedEmail(): Promise<string | null> {
  const gmail = await getGmailClient();
  if (!gmail) {
    return null;
  }

  try {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return profile.data.emailAddress || null;
  } catch {
    return null;
  }
}

// =============================================================================
// SCOPES
// =============================================================================

export const GMAIL_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  LABELS: 'https://www.googleapis.com/auth/gmail.labels',
  MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
  COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',
  SEND: 'https://www.googleapis.com/auth/gmail.send',
} as const;

export const CONTACTS_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/contacts.readonly',
} as const;

export const CALENDAR_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
} as const;

// Default scopes for initial setup (read-only gmail + contacts + calendar)
export const DEFAULT_SCOPES = [
  GMAIL_SCOPES.READONLY,
  GMAIL_SCOPES.LABELS,
  CONTACTS_SCOPES.READONLY,
  CALENDAR_SCOPES.READONLY,
];
