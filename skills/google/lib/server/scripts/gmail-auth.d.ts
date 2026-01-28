/**
 * Gmail OAuth Authentication Script
 *
 * This script guides you through the OAuth flow to authenticate Gmail access.
 * Run once to set up Gmail integration.
 *
 * Prerequisites:
 * 1. Create a project in Google Cloud Console (console.cloud.google.com)
 * 2. Enable the Gmail API
 * 3. Configure OAuth consent screen (External, add your email as test user)
 * 4. Create OAuth credentials (Desktop app type)
 * 5. Download credentials.json and save to your content repo's .data folder
 *
 * Run with: npx tsx src/scripts/gmail-auth.ts
 */
import 'dotenv/config';
