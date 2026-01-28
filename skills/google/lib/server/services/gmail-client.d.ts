/**
 * Gmail API Client Service
 *
 * Provides authenticated access to the Gmail API.
 * Credentials and tokens are stored in the content repo's .data directory.
 */
import { gmail_v1, people_v1, Auth } from 'googleapis';
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
/**
 * Get the path to the Gmail credentials file.
 * Uses GMAIL_CREDENTIALS_PATH env var or defaults to content repo's .data directory.
 */
export declare function getCredentialsPath(): string;
/**
 * Get the path to the Gmail tokens file.
 * Uses GMAIL_TOKEN_PATH env var or defaults to content repo's .data directory.
 */
export declare function getTokenPath(): string;
/**
 * Check if Gmail credentials are configured.
 */
export declare function hasCredentials(): boolean;
/**
 * Check if Gmail tokens exist (user has authenticated).
 */
export declare function hasTokens(): boolean;
/**
 * Check if Gmail is fully configured and authenticated.
 */
export declare function isGmailConfigured(): boolean;
/**
 * Load OAuth credentials from file.
 */
export declare function loadCredentials(): GmailCredentials | null;
/**
 * Load saved tokens from file.
 */
export declare function loadTokens(): TokenData | null;
/**
 * Save tokens to file.
 */
export declare function saveTokens(tokens: TokenData): void;
/**
 * Create an OAuth2 client from credentials.
 */
export declare function createOAuth2Client(): OAuth2Client | null;
/**
 * Get an authenticated OAuth2 client, loading tokens if available.
 * Auto-refreshes tokens if they've expired.
 */
export declare function getOAuth2Client(): Promise<OAuth2Client | null>;
/**
 * Generate an authorization URL for the OAuth flow.
 */
export declare function getAuthUrl(scopes: string[]): string | null;
/**
 * Exchange an authorization code for tokens.
 */
export declare function exchangeCodeForTokens(code: string): Promise<TokenData | null>;
/**
 * Get an authenticated Gmail API client.
 */
export declare function getGmailClient(): Promise<gmail_v1.Gmail | null>;
/**
 * Clear cached clients (useful after re-authentication).
 */
export declare function clearGmailClientCache(): void;
/**
 * Get an authenticated People API client (for contacts).
 */
export declare function getPeopleClient(): Promise<people_v1.People | null>;
/**
 * Get the authenticated user's email address.
 */
export declare function getAuthenticatedEmail(): Promise<string | null>;
export declare const GMAIL_SCOPES: {
    readonly READONLY: "https://www.googleapis.com/auth/gmail.readonly";
    readonly LABELS: "https://www.googleapis.com/auth/gmail.labels";
    readonly MODIFY: "https://www.googleapis.com/auth/gmail.modify";
    readonly COMPOSE: "https://www.googleapis.com/auth/gmail.compose";
    readonly SEND: "https://www.googleapis.com/auth/gmail.send";
};
export declare const CONTACTS_SCOPES: {
    readonly READONLY: "https://www.googleapis.com/auth/contacts.readonly";
};
export declare const DEFAULT_SCOPES: ("https://www.googleapis.com/auth/gmail.readonly" | "https://www.googleapis.com/auth/gmail.labels" | "https://www.googleapis.com/auth/contacts.readonly")[];
export {};
