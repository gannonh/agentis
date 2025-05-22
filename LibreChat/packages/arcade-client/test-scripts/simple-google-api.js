/**
 * Simple Google API call test using the Arcade API
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import readline from 'readline';

// Polyfill __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

if (!process.env.ARCADE_API_KEY) {
  console.error('❌ ARCADE_API_KEY is not set in .env file');
  process.exit(1);
}

const ARCADE_API_KEY = process.env.ARCADE_API_KEY;
const USER_ID = 'test-user-id-123';
const BASE_URL = 'https://api.arcade.dev/v1';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('🚀 Starting Google API test with Arcade...');

// Request authorization
async function requestAuth(toolName) {
  try {
    const response = await fetch(`${BASE_URL}/tools/authorize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ARCADE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool_name: toolName,
        user_id: USER_ID,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Authorization request failed:', error);
    throw error;
  }
}

// Check auth status
async function checkAuthStatus(authId) {
  try {
    const response = await fetch(`${BASE_URL}/auth/status?id=${authId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ARCADE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Auth status check failed:', error);
    throw error;
  }
}

// Execute tool
async function executeTool(toolName, params) {
  try {
    const response = await fetch(`${BASE_URL}/tools/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ARCADE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool_name: toolName,
        user_id: USER_ID,
        input: params,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Tool execution failed:', error);
    throw error;
  }
}

// Open URL in default browser
function openBrowser(url) {
  const command =
    process.platform === 'win32'
      ? `start "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(command, (error) => {
    if (error) {
      console.error(`❌ Failed to open browser: ${error.message}`);
      console.log(`📋 Please manually open this URL: ${url}`);
    }
  });
}

// Poll auth status
async function pollAuthStatus(authId, attempts = 30) {
  console.log(`🔄 Polling authentication status...`);

  for (let i = 0; i < attempts; i++) {
    try {
      const status = await checkAuthStatus(authId);
      console.log(`Poll attempt ${i + 1}/${attempts}: Status=${status.status}`);

      if (status.status === 'completed') {
        console.log('✅ Authentication completed successfully!');
        console.log('Auth context:', status.context);
        return status;
      } else if (status.status === 'failed') {
        console.error('❌ Authentication failed');
        return status;
      }

      // Wait for 2 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error while polling auth status: ${error}`);
      return null;
    }
  }

  console.error('❌ Timed out waiting for authentication to complete');
  return null;
}

// Test Gmail API
async function testGmail() {
  console.log('📧 Testing Gmail API...');

  try {
    const result = await executeTool('Google.ListEmails', {
      maxResults: 5,
      labelIds: ['INBOX'],
    });

    console.log('✅ Gmail API call succeeded!');
    console.log('Result:', JSON.stringify(result.output?.value, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Gmail API call failed:', error);
    throw error;
  }
}

// Test Calendar API
async function testCalendar() {
  console.log('📅 Testing Calendar API...');

  try {
    const result = await executeTool('Google.ListEvents', {
      calendarId: 'primary',
      maxResults: 5,
      timeMin: new Date().toISOString(),
    });

    console.log('✅ Calendar API call succeeded!');
    console.log('Result:', JSON.stringify(result.output?.value, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Calendar API call failed:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Ask user which Google API to test
    const choice = await new Promise((resolve) => {
      rl.question(
        '\n📝 Choose a Google API to test:\n1. Gmail (list emails)\n2. Calendar (list events)\nYour choice (1-2): ',
        (answer) => {
          resolve(answer.trim());
        }
      );
    });

    // Get the tool name based on the choice
    const toolName = choice === '1' ? 'Google.ListEmails' : 'Google.ListEvents';

    // Start authorization for the chosen tool
    console.log(`🔑 Requesting authorization for ${toolName}...`);
    const authResponse = await requestAuth(toolName);

    if (authResponse.status === 'pending' && authResponse.url) {
      console.log(`✅ Got auth URL: ${authResponse.url}`);
      console.log('👉 Opening browser for authentication...');

      // Open the auth URL in the default browser
      openBrowser(authResponse.url);

      // Poll for auth status
      const status = await pollAuthStatus(authResponse.id);

      if (status && status.status === 'completed') {
        // Execute the API call based on the user's choice
        if (choice === '1') {
          await testGmail();
        } else if (choice === '2') {
          await testCalendar();
        }
      }
    } else if (authResponse.status === 'completed') {
      console.log('✅ Authentication is already completed');

      // Execute the API call based on the user's choice
      if (choice === '1') {
        await testGmail();
      } else if (choice === '2') {
        await testCalendar();
      }
    } else {
      console.error('❌ Failed to start authentication process');
      console.error('Response:', authResponse);
    }
  } catch (error) {
    console.error('❌ An error occurred:', error);
  } finally {
    rl.close();
  }
}

// Run the main function
main().catch(console.error);
