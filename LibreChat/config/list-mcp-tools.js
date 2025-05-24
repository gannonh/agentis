#!/usr/bin/env node

/**
 * This script lists all MCP server and tool names from your LibreChat configuration.
 * Usage: node list-mcp-tools.js
 * 
 * It will output a template for your librechat.yaml configuration with
 * display names for all found MCP servers and tools.
 */

const fs = require('fs');
const yaml = require('yaml');
const path = require('path');

// Path to your librechat.yaml
const configPath = path.resolve(__dirname, '../librechat.yaml');

try {
  // Read and parse the YAML file
  const configFile = fs.readFileSync(configPath, 'utf8');
  const config = yaml.parse(configFile);

  // Check if mcpServers exists in the config
  if (!config.mcpServers) {
    console.log('No MCP servers configured in your librechat.yaml file.');
    process.exit(0);
  }

  console.log('MCP Servers and Tools in your configuration:');
  console.log('-------------------------------------------');
  
  // Output template
  let template = '';

  // Process each MCP server
  for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
    console.log(`\nServer: ${serverName}`);
    
    template += `  ${serverName}:\n`;
    template += `    displayName: "${formatServerName(serverName)}"\n`;
    
    // Find available tools by querying the server (not implemented in this version)
    // For now, just use existing toolDisplayNames if available
    
    if (serverConfig.toolDisplayNames) {
      console.log('  Tools:');
      template += `    toolDisplayNames:\n`;
      
      for (const [toolName, displayName] of Object.entries(serverConfig.toolDisplayNames)) {
        console.log(`  - ${toolName}: "${displayName}"`);
        template += `      ${toolName}: "${displayName}"\n`;
      }
    } else {
      console.log('  No tools with display names configured.');
      template += `    toolDisplayNames:\n`;
      template += `      # Add your tool display names here\n`;
      template += `      # EXAMPLE_TOOL_NAME: "Friendly Tool Name"\n`;
    }
  }

  console.log('\n\nYAML Configuration Template:');
  console.log('----------------------------');
  console.log('mcpServers:');
  console.log(template);
  
  console.log('\nTo discover all available tools for a server, you need to:');
  console.log('1. Start the application and open the browser tools (F12)');
  console.log('2. Open the Network tab and filter for XHR requests');
  console.log('3. Navigate to the Tools section and select a server');
  console.log('4. Look for API calls to "/api/endpoints" or "/api/tools"');
  console.log('5. Inspect the response to find the tool names');
  
} catch (error) {
  console.error('Error reading or parsing librechat.yaml:', error);
}

/**
 * Format a server name into a user-friendly display format
 */
function formatServerName(serverName) {
  // Special case handling
  const specialCases = {
    'github': 'GitHub',
    'googlesheets': 'Google Sheets',
    'googledocs': 'Google Docs',
    'googledrive': 'Google Drive',
    'oauth2': 'OAuth 2.0',
    'firebase-mcp': 'Firebase',
    'firebase-mcp-dev': 'Firebase (Dev)',
    'firebase-mcp-npm': 'Firebase',
    'memento-mcp-dev': 'Memento',
    'memento-mcp-npx': 'Memento',
    'composio': 'Composio',
  };

  // Return special case if it exists
  if (specialCases[serverName.toLowerCase()]) {
    return specialCases[serverName.toLowerCase()];
  }

  // Remove common suffixes
  let cleanName = serverName
    .replace(/-mcp(-[a-z]+)?$/i, '') // Remove -mcp, -mcp-dev, etc.
    .replace(/-client$/i, '');        // Remove -client
  
  // Handle hyphenated names by splitting and capitalizing each part
  if (cleanName.includes('-')) {
    return cleanName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Basic word boundary detection for camelCase or PascalCase
  cleanName = cleanName.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Capitalize first letter of the entire string
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}