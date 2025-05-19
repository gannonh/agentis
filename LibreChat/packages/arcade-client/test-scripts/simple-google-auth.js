/**
 * Simple Google auth test using the compiled package
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

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
const CALLBACK_URL = process.env.ARCADE_CALLBACK_URL || 'http://localhost:3080/api/arcade/callback';
const USER_ID = 'test-user-id-123';
const TOOLKIT_NAME = 'Google.ListEmails'; // Use a specific Google tool
const BASE_URL = 'https://api.arcade.dev/v1';

console.log('🚀 Starting Google auth test with Arcade demo account...');

// Check API health
async function healthCheck() {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ARCADE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data.healthy;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Request authorization
async function requestAuth() {
  try {
    const response = await fetch(`${BASE_URL}/tools/authorize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ARCADE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool_name: TOOLKIT_NAME,
        user_id: USER_ID
      })
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
        'Authorization': `Bearer ${ARCADE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Auth status check failed:', error);
    throw error;
  }
}

// Open URL in default browser
function openBrowser(url) {
  const command = process.platform === 'win32' 
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error while polling auth status: ${error}`);
      return null;
    }
  }
  
  console.error('❌ Timed out waiting for authentication to complete');
  return null;
}

// Main function
async function main() {
  // Check API health
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.error('❌ Arcade API is not healthy');
    return;
  }
  console.log('✅ Arcade API is healthy');
  
  // Request auth
  console.log(`🔑 Requesting authorization for ${TOOLKIT_NAME}...`);
  const authResponse = await requestAuth();
  console.log('Authorization response:', JSON.stringify(authResponse, null, 2));
  
  if (authResponse.status === 'pending' && authResponse.url) {
    console.log(`✅ Got auth URL: ${authResponse.url}`);
    console.log('👉 Opening browser for authentication...');
    
    // Open the auth URL in the default browser
    openBrowser(authResponse.url);
    
    // Poll for auth status
    await pollAuthStatus(authResponse.id);
  } else if (authResponse.status === 'completed') {
    console.log('✅ Authentication is already completed');
    console.log('Auth context:', authResponse.context);
  } else {
    console.error('❌ Failed to start authentication process');
  }
}

// Run the main function
main().catch(console.error);