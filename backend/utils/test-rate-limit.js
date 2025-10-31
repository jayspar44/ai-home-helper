#!/usr/bin/env node

/**
 * Rate Limit Test Script
 *
 * Tests the AI endpoint rate limiter by sending 105 rapid requests
 * to the shopping list endpoint and verifying that:
 * - First 100 requests succeed (200 OK)
 * - Last 5 requests are rate limited (429)
 *
 * Usage:
 *   node utils/test-rate-limit.js           # Keep test items
 *   node utils/test-rate-limit.js --cleanup # Auto-delete test items
 *
 * Prerequisites:
 *   - Backend server running on localhost:3001
 *   - Test user credentials in .env file:
 *       TEST_USER_EMAIL=test-ratelimit@example.com
 *       TEST_USER_PASSWORD=your-password
 */

require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// Parse command line args
const shouldCleanup = process.argv.includes('--cleanup');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Authenticate with Firebase and get ID token
 */
async function authenticateUser() {
  console.log(`\n🔐 Authenticating test user (${TEST_EMAIL})...`);

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error(`${colors.red}✗ Error: TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env${colors.reset}`);
    console.log('\nAdd these to your .env file:');
    console.log('TEST_USER_EMAIL=test-ratelimit@example.com');
    console.log('TEST_USER_PASSWORD=your-password\n');
    process.exit(1);
  }

  if (!FIREBASE_API_KEY) {
    console.error(`${colors.red}✗ Error: FIREBASE_API_KEY must be set in .env${colors.reset}`);
    console.log('\nAdd this to your .env file:');
    console.log('FIREBASE_API_KEY=your-firebase-web-api-key\n');
    process.exit(1);
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          returnSecureToken: true
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Authentication failed');
    }

    console.log(`${colors.green}✓ Authenticated successfully${colors.reset}`);
    console.log(`${colors.gray}  User ID: ${data.localId}${colors.reset}`);

    return {
      idToken: data.idToken,
      userId: data.localId
    };
  } catch (error) {
    console.error(`${colors.red}✗ Authentication failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Fetch user's primary home ID
 */
async function fetchHomeId(idToken) {
  console.log(`\n🏠 Fetching home ID...`);

  try {
    const response = await fetch(`${BACKEND_URL}/api/user/me`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    const userData = await response.json();
    const homeId = userData.primaryHomeId;

    if (!homeId) {
      throw new Error('User has no primary home ID');
    }

    console.log(`${colors.green}✓ Home ID: ${homeId}${colors.reset}`);
    return homeId;
  } catch (error) {
    console.error(`${colors.red}✗ Failed to fetch home ID: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Send a single request to add a shopping list item
 */
async function sendRequest(idToken, homeId, itemNumber) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/shopping-list/${homeId}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: `Rate limit test item ${itemNumber}`
      })
    });

    return {
      status: response.status,
      ok: response.ok,
      headers: {
        rateLimit: response.headers.get('RateLimit-Limit'),
        rateRemaining: response.headers.get('RateLimit-Remaining'),
        rateReset: response.headers.get('RateLimit-Reset')
      },
      data: response.ok ? await response.json() : null,
      error: !response.ok ? await response.json() : null
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: { message: error.message }
    };
  }
}

/**
 * Delete all test items from shopping list
 */
async function cleanupTestItems(idToken, homeId, itemIds) {
  console.log(`\n🧹 Cleaning up ${itemIds.length} test items...`);

  let deletedCount = 0;
  let failedCount = 0;

  for (const itemId of itemIds) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/shopping-list/${homeId}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        deletedCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      failedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`${colors.green}✓ Deleted ${deletedCount} items${colors.reset}`);
  }
  if (failedCount > 0) {
    console.log(`${colors.yellow}⚠ Failed to delete ${failedCount} items${colors.reset}`);
  }
}

/**
 * Main test execution
 */
async function runTest() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}         AI Rate Limiter Test${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);

  // Step 1: Authenticate
  const { idToken, userId } = await authenticateUser();

  // Step 2: Get home ID
  const homeId = await fetchHomeId(idToken);

  // Step 3: Run rate limit test
  console.log(`\n📊 Testing rate limiter: POST /api/shopping-list/:homeId/items`);
  console.log(`${colors.gray}   Target: 105 requests (expect 100 success, 5 rate limited)${colors.reset}\n`);

  const totalRequests = 105;
  const expectedSuccess = 100;
  const startTime = Date.now();

  // Send all requests in parallel for speed
  console.log(`⏳ Sending ${totalRequests} requests...`);
  const promises = [];
  for (let i = 1; i <= totalRequests; i++) {
    promises.push(sendRequest(idToken, homeId, i));
  }

  const results = await Promise.all(promises);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Analyze results
  const successResults = results.filter(r => r.ok);
  const rateLimitedResults = results.filter(r => r.status === 429);
  const errorResults = results.filter(r => !r.ok && r.status !== 429);

  const itemIds = successResults
    .filter(r => r.data?.item?.id)
    .map(r => r.data.item.id);

  // Extract rate limit info from first rate limited response
  const rateLimitInfo = rateLimitedResults[0]?.headers || results[results.length - 1]?.headers;

  // Display results
  console.log(`${colors.green}✓ Completed in ${duration}s${colors.reset}\n`);

  console.log(`${colors.cyan}Results:${colors.reset}`);

  // Success results
  if (successResults.length === expectedSuccess) {
    console.log(`  ${colors.green}✓ Requests 1-${expectedSuccess}: SUCCESS (${successResults.length} × 200 OK)${colors.reset}`);
  } else if (successResults.length < expectedSuccess) {
    console.log(`  ${colors.yellow}⚠ Requests 1-100: PARTIAL SUCCESS (${successResults.length} × 200 OK, expected ${expectedSuccess})${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✗ Requests 1-100: TOO MANY SUCCESS (${successResults.length} × 200 OK, expected ${expectedSuccess})${colors.reset}`);
  }

  // Rate limited results
  const expectedRateLimited = totalRequests - expectedSuccess;
  if (rateLimitedResults.length === expectedRateLimited) {
    console.log(`  ${colors.green}✓ Requests 101-105: RATE LIMITED (${rateLimitedResults.length} × 429)${colors.reset}`);
  } else if (rateLimitedResults.length === 0) {
    console.log(`  ${colors.red}✗ Requests 101-105: NO RATE LIMITING (0 × 429, expected ${expectedRateLimited})${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠ Requests 101-105: PARTIAL RATE LIMITING (${rateLimitedResults.length} × 429, expected ${expectedRateLimited})${colors.reset}`);
  }

  // Other errors
  if (errorResults.length > 0) {
    console.log(`  ${colors.red}✗ Other errors: ${errorResults.length} requests failed${colors.reset}`);
  }

  // Rate limit info
  if (rateLimitInfo && (rateLimitInfo.rateLimit || rateLimitInfo.rateRemaining)) {
    console.log(`\n${colors.cyan}Rate Limit Info:${colors.reset}`);
    if (rateLimitInfo.rateLimit) {
      console.log(`  Limit: ${rateLimitInfo.rateLimit} requests/hour`);
    }
    if (rateLimitInfo.rateRemaining !== null) {
      console.log(`  Remaining: ${rateLimitInfo.rateRemaining}/${rateLimitInfo.rateLimit || 100}`);
    }
    if (rateLimitInfo.rateReset) {
      const resetDate = new Date(parseInt(rateLimitInfo.rateReset) * 1000);
      const minutesUntilReset = Math.ceil((resetDate - Date.now()) / 60000);
      console.log(`  Resets: ${resetDate.toISOString()} (in ${minutesUntilReset}m)`);
    }
  }

  // Sample error message from rate limited request
  if (rateLimitedResults.length > 0 && rateLimitedResults[0].error) {
    console.log(`\n${colors.cyan}Rate Limit Error Message:${colors.reset}`);
    console.log(`  ${colors.gray}"${rateLimitedResults[0].error.message}"${colors.reset}`);
  }

  // Test items info
  console.log(`\n${colors.cyan}Test Items:${colors.reset} ${successResults.length} items created`);
  if (!shouldCleanup) {
    console.log(`  ${colors.gray}(use --cleanup flag to auto-delete)${colors.reset}`);
  }

  // Cleanup if requested
  if (shouldCleanup && itemIds.length > 0) {
    await cleanupTestItems(idToken, homeId, itemIds);
  }

  // Final verdict
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  const testPassed =
    successResults.length === expectedSuccess &&
    rateLimitedResults.length === expectedRateLimited &&
    errorResults.length === 0;

  if (testPassed) {
    console.log(`${colors.green}✅ RATE LIMITING WORKING CORRECTLY${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ RATE LIMITING TEST FAILED${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error(`\n${colors.red}✗ Unexpected error: ${error.message}${colors.reset}\n`);
  process.exit(1);
});
