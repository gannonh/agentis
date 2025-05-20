const puppeteer = require('puppeteer');

async function runTest(username, password) {
  console.log(`Starting test with username: ${username}`);
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to login page
    await page.goto('http://localhost:3080/login');
    console.log('Navigated to login page');

    // Fill login form
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', username);
    await page.type('input[name="password"]', password);
    console.log('Filled login form');

    // Click login button
    await page.click('button[type="submit"]');
    console.log('Submitted login form');

    // Wait for redirect to chat
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Successfully logged in, redirected to chat page');

    // Wait for chat interface to load
    await page.waitForSelector('.chat-input-area');
    console.log('Chat interface loaded');

    // Switch to the "Actions" tab or MCP tools if available
    try {
      // Wait a bit for UI to be fully loaded
      await page.waitForTimeout(2000);
      
      // Look for toolbox or action buttons
      const actionButtonSelector = 'button.actionSelector';
      const hasActionButton = await page.$(actionButtonSelector) !== null;
      
      if (hasActionButton) {
        await page.click(actionButtonSelector);
        console.log('Clicked action selector button');
        
        // Wait for action menu to appear
        await page.waitForTimeout(1000);
        
        // Look for MCP tools (adjust selector as needed)
        const mcpToolSelector = '.tool-item[data-tool-name="googlesheets"]';
        const hasMcpTool = await page.$(mcpToolSelector) !== null;
        
        if (hasMcpTool) {
          await page.click(mcpToolSelector);
          console.log('Selected MCP tool');
        } else {
          console.log('MCP tool not found in action menu');
        }
      } else {
        console.log('Action selector button not found');
      }
    } catch (error) {
      console.error('Error navigating to MCP tools:', error);
    }

    // Keep the browser open for observation
    console.log('Test completed successfully. Check the logs for MCP connection information.');
    console.log('Press Ctrl+C to close the browser when done.');
    
    // Keep the script running
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
  }
}

// For testing purposes, call the function directly
// Replace these with the actual credentials
if (process.argv.length >= 4) {
  const username = process.argv[2];
  const password = process.argv[3];
  runTest(username, password);
} else {
  console.log('Usage: node testConnection.js username password');
}