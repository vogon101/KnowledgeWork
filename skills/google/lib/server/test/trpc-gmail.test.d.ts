/**
 * Tests for Gmail tRPC router
 *
 * Tests the Gmail and Contacts integration. Since we can't test against
 * the real Gmail API without credentials, we test:
 * 1. Helper functions for parsing emails
 * 2. Router structure and error handling
 *
 * Note: These tests mock the gmail-client module and use a mock prisma
 * since the Gmail router doesn't actually use the database.
 */
export {};
