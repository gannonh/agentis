#!/usr/bin/env node

/**
 * md-symlinks.js
 * 
 * Script to scan directories for .md files and create symlinks in Docs/sym-links
 * 
 * Usage:
 *   node md-symlinks.js [depth]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Default values
const DEFAULT_DEPTH = 3;
const MAX_DEPTH = process.argv[2] ? parseInt(process.argv[2], 10) : DEFAULT_DEPTH;
const TARGET_DIR = path.resolve(process.cwd(), 'Docs/sym-links');
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build'];

// Help text
function showHelp() {
  console.log(`Usage: node ${path.basename(__filename)} [depth]`);
  console.log();
  console.log('Creates symlinks to all Markdown (.md) files found in the current directory');
  console.log('and subdirectories, placing them in the Docs/sym-links directory.');
  console.log();
  console.log('Arguments:');
  console.log(`  depth    Maximum directory depth to search (default: ${DEFAULT_DEPTH})`);
  console.log();
  console.log('Examples:');
  console.log(`  node ${path.basename(__filename)}         # Search with default depth of ${DEFAULT_DEPTH}`);
  console.log(`  node ${path.basename(__filename)} 5       # Search with a maximum depth of 5`);
  console.log();
}

// Show help if requested
if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  showHelp();
  process.exit(0);
}

// Validate depth argument
if (process.argv[2] && (isNaN(MAX_DEPTH) || MAX_DEPTH < 1)) {
  console.error('Error: Depth must be a positive number');
  process.exit(1);
}

// Make sure target directory exists
try {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`Creating symlinks in: ${TARGET_DIR}`);
} catch (err) {
  console.error(`Error creating target directory: ${err.message}`);
  process.exit(1);
}

console.log(`Scanning for .md files (max depth: ${MAX_DEPTH})...`);

/**
 * Walk directory recursively to find markdown files
 */
function walkDir(dir, depth = 0) {
  if (depth > MAX_DEPTH) return [];
  
  let results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), fullPath);
    const stat = fs.statSync(fullPath);
    
    // Skip excluded directories
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        results = results.concat(walkDir(fullPath, depth + 1));
      }
    } else if (file.endsWith('.md')) {
      results.push(relativePath);
    }
  }
  
  return results;
}

try {
  // Find all .md files
  const mdFiles = walkDir(process.cwd());
  
  // Create symlinks
  for (const file of mdFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    const baseName = path.basename(file);
    const dirName = path.dirname(file).replace(/^\.\//, '').replace(/\//g, '_');
    
    // Create a unique name to avoid collisions
    const linkName = `${dirName}___${baseName}`;
    const linkPath = path.join(TARGET_DIR, linkName);
    
    try {
      // Remove existing symlink if it exists
      if (fs.existsSync(linkPath)) {
        fs.unlinkSync(linkPath);
      }
      
      // Create the symlink
      fs.symlinkSync(fullPath, linkPath);
      console.log(`Created symlink: ${linkName} -> ${file}`);
    } catch (err) {
      console.error(`Error creating symlink for ${file}: ${err.message}`);
    }
  }
  
  console.log(`Done! Created symlinks to all .md files in ${TARGET_DIR}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}