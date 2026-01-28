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
import readline from 'readline';
import { getCredentialsPath, getTokenPath, hasCredentials, hasTokens, createOAuth2Client, exchangeCodeForTokens, getAuthenticatedEmail, DEFAULT_SCOPES, } from '../services/gmail-client.js';
// =============================================================================
// HELPERS
// =============================================================================
function question(rl, prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}
// =============================================================================
// MAIN
// =============================================================================
async function main() {
    console.log('='.repeat(60));
    console.log('Gmail OAuth Authentication Setup');
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
        }
        else {
            console.log('! Existing tokens may be invalid or expired');
        }
    }
    // Create OAuth client
    const oAuth2Client = createOAuth2Client();
    if (!oAuth2Client) {
        console.log('ERROR: Failed to create OAuth client from credentials');
        console.log('Check that your credentials file is valid.');
        process.exit(1);
    }
    // Generate auth URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: DEFAULT_SCOPES,
        prompt: 'consent',
    });
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
    const code = await question(rl, 'Enter the authorization code: ');
    rl.close();
    if (!code) {
        console.log('No code entered. Aborting.');
        process.exit(1);
    }
    console.log();
    console.log('Exchanging code for tokens...');
    try {
        await exchangeCodeForTokens(code);
        console.log('✓ Tokens saved successfully');
        // Verify authentication
        const email = await getAuthenticatedEmail();
        if (email) {
            console.log(`✓ Authenticated as: ${email}`);
        }
        console.log();
        console.log('='.repeat(60));
        console.log('Gmail integration is now configured!');
        console.log('='.repeat(60));
        console.log();
        console.log('You can now use the Gmail API through the tRPC router.');
        console.log(`Tokens are stored at: ${tokenPath}`);
        console.log();
        console.log('Make sure this file is in your .gitignore!');
    }
    catch (err) {
        console.log('ERROR: Failed to exchange code for tokens');
        console.error(err);
        process.exit(1);
    }
}
main().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
});
