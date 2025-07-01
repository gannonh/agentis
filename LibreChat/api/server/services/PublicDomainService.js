/**
 * @fileoverview Public Domain Detection Service
 * @module server/services/PublicDomainService
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '#config/index.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set to store public domains for O(1) lookup performance
let publicDomainsSet = new Set();
let domainsLoaded = false;

/**
 * Extracts the domain from an email address
 * @param {string} email - The email address
 * @returns {string} The domain part of the email (lowercase)
 * @throws {Error} If email is invalid
 * @example
 * extractDomain('user@gmail.com') // returns 'gmail.com'
 * extractDomain('test@YAHOO.COM') // returns 'yahoo.com'
 */
export function extractDomain(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email string is required');
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  return email.split('@')[1].toLowerCase();
}

/**
 * Loads public domains from the public-email-domains.txt file
 * @returns {Promise<boolean>} True if loaded successfully, false on error
 */
export async function loadPublicDomains() {
  try {
    // Construct path to the public domains file
    const filePath = join(__dirname, '../../services/public-email-domains.txt');
    
    logger.debug('Loading public domains from:', filePath);
    
    const fileContent = await readFile(filePath, 'utf-8');
    
    // Parse file content - each line is a domain
    const domains = fileContent
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0 && !line.startsWith('#')); // Filter out empty lines and comments
    
    // Clear existing set and populate with new domains
    publicDomainsSet.clear();
    domains.forEach(domain => publicDomainsSet.add(domain));
    
    domainsLoaded = true;
    
    logger.info(`✅ Loaded ${domains.length} public email domains`);
    return true;
  } catch (error) {
    logger.error('❌ Failed to load public domains:', error);
    
    // On error, clear the domains and mark as not loaded
    publicDomainsSet.clear();
    domainsLoaded = false;
    
    return false;
  }
}

/**
 * Returns the number of loaded public domains
 * @returns {number} The count of public domains
 */
export function getPublicDomainsCount() {
  return publicDomainsSet.size;
}

/**
 * Checks if a domain or email address uses a public email provider
 * @param {string} input - Email address or domain to check
 * @returns {boolean} True if the domain is public, false otherwise
 * @example
 * isPublicDomain('user@gmail.com') // returns true
 * isPublicDomain('gmail.com') // returns true
 * isPublicDomain('user@company.com') // returns false
 * isPublicDomain('company.com') // returns false
 */
export function isPublicDomain(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  let domain;
  
  try {
    // Check if input looks like an email (contains @)
    if (input.includes('@')) {
      domain = extractDomain(input);
    } else {
      // Treat as domain directly
      domain = input.trim().toLowerCase();
    }
  } catch (error) {
    // If domain extraction fails, it's not a valid email/domain
    return false;
  }

  // Ensure domains are loaded
  if (!domainsLoaded) {
    logger.warn('Public domains not loaded yet, attempting to load...');
    // For synchronous usage, we'll return false if not loaded
    // In production, this should be loaded at startup
    return false;
  }

  // O(1) lookup in the Set
  return publicDomainsSet.has(domain);
}

// Auto-load domains when module is imported
// This ensures domains are available for synchronous usage
loadPublicDomains().catch(error => {
  logger.error('Failed to auto-load public domains on module import:', error);
});