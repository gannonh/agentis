/**
 * @fileoverview Tests for Public Domain Detection Service
 * @module server/services/PublicDomainService.test
 */

import { describe, it, expect, beforeAll, vi, beforeEach, afterEach } from 'vitest';

// Mock fs/promises for error testing
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises');
  return {
    ...actual,
    readFile: vi.fn(),
  };
});

import { readFile } from 'fs/promises';
import {
  isPublicDomain,
  extractDomain,
  loadPublicDomains,
  getPublicDomainsCount,
} from '../PublicDomainService.js';

describe('PublicDomainService', () => {
  beforeAll(async () => {
    // For most tests, we want to use the real file data
    // Let's unmock the readFile for the initial load
    vi.restoreAllMocks();

    // Re-import the actual readFile
    const actualFs = await vi.importActual('fs/promises');
    vi.mocked(readFile).mockImplementation(actualFs.readFile);

    // Load real domains for most tests
    await loadPublicDomains();
  });

  describe('extractDomain', () => {
    it('should extract domain from valid email', () => {
      expect(extractDomain('user@gmail.com')).toBe('gmail.com');
      expect(extractDomain('test@yahoo.com')).toBe('yahoo.com');
      expect(extractDomain('admin@company.org')).toBe('company.org');
    });

    it('should handle email with subdomains', () => {
      expect(extractDomain('user@mail.google.com')).toBe('mail.google.com');
      expect(extractDomain('test@subdomain.company.com')).toBe('subdomain.company.com');
    });

    it('should handle case insensitive emails', () => {
      expect(extractDomain('User@GMAIL.COM')).toBe('gmail.com');
      expect(extractDomain('TEST@Yahoo.Com')).toBe('yahoo.com');
    });

    it('should throw error for invalid email formats', () => {
      expect(() => extractDomain('')).toThrow('Valid email string is required');
      expect(() => extractDomain(null)).toThrow('Valid email string is required');
      expect(() => extractDomain(undefined)).toThrow('Valid email string is required');
      expect(() => extractDomain(123)).toThrow('Valid email string is required');
    });

    it('should throw error for malformed emails', () => {
      expect(() => extractDomain('invalid-email')).toThrow('Invalid email format');
      expect(() => extractDomain('user@')).toThrow('Invalid email format');
      expect(() => extractDomain('@domain.com')).toThrow('Invalid email format');
      expect(() => extractDomain('user@domain')).toThrow('Invalid email format');
    });
  });

  describe('isPublicDomain', () => {
    describe('with email addresses', () => {
      it('should return true for common public email domains', () => {
        expect(isPublicDomain('user@gmail.com')).toBe(true);
        expect(isPublicDomain('test@yahoo.com')).toBe(true);
        expect(isPublicDomain('admin@hotmail.com')).toBe(true);
        expect(isPublicDomain('user@outlook.com')).toBe(true);
      });

      it('should return false for corporate/private domains', () => {
        expect(isPublicDomain('user@company.com')).toBe(false);
        expect(isPublicDomain('test@mycorp.org')).toBe(false);
        expect(isPublicDomain('admin@startup.io')).toBe(false);
      });

      it('should handle case insensitive emails', () => {
        expect(isPublicDomain('USER@GMAIL.COM')).toBe(true);
        expect(isPublicDomain('Test@Yahoo.Com')).toBe(true);
        expect(isPublicDomain('ADMIN@COMPANY.COM')).toBe(false);
      });

      it('should handle subdomains correctly', () => {
        // If subdomain is not in public list, should return false
        expect(isPublicDomain('user@mail.company.com')).toBe(false);
        // But if the subdomain itself is public, should return true
        expect(isPublicDomain('user@mail.ru')).toBe(true); // mail.ru is a known public domain
      });
    });

    describe('with domain strings', () => {
      it('should return true for public domains', () => {
        expect(isPublicDomain('gmail.com')).toBe(true);
        expect(isPublicDomain('yahoo.com')).toBe(true);
        expect(isPublicDomain('hotmail.com')).toBe(true);
      });

      it('should return false for private domains', () => {
        expect(isPublicDomain('company.com')).toBe(false);
        expect(isPublicDomain('mycorp.org')).toBe(false);
      });

      it('should handle case insensitive domains', () => {
        expect(isPublicDomain('GMAIL.COM')).toBe(true);
        expect(isPublicDomain('Yahoo.Com')).toBe(true);
        expect(isPublicDomain('COMPANY.COM')).toBe(false);
      });
    });

    describe('input validation', () => {
      it('should return false for invalid inputs', () => {
        expect(isPublicDomain('')).toBe(false);
        expect(isPublicDomain(null)).toBe(false);
        expect(isPublicDomain(undefined)).toBe(false);
        expect(isPublicDomain(123)).toBe(false);
        expect(isPublicDomain({})).toBe(false);
        expect(isPublicDomain([])).toBe(false);
      });

      it('should return false for malformed email/domain', () => {
        expect(isPublicDomain('invalid-input')).toBe(false);
        expect(isPublicDomain('@')).toBe(false);
        expect(isPublicDomain('user@')).toBe(false);
        expect(isPublicDomain('@domain.com')).toBe(false);
      });
    });
  });

  describe('loadPublicDomains', () => {
    it('should load domains from file successfully', async () => {
      const result = await loadPublicDomains();
      expect(result).toBe(true);
    });

    it('should populate domains set with expected domains', async () => {
      await loadPublicDomains();
      const count = getPublicDomainsCount();

      // Should have loaded a substantial number of domains
      expect(count).toBeGreaterThan(1000);

      // Should include known public domains
      expect(isPublicDomain('gmail.com')).toBe(true);
      expect(isPublicDomain('yahoo.com')).toBe(true);
      expect(isPublicDomain('hotmail.com')).toBe(true);
    });

    it('should handle file loading errors gracefully', async () => {
      // Store current state
      const originalCount = getPublicDomainsCount();

      // Mock readFile to reject with an error for this test only
      vi.mocked(readFile).mockRejectedValueOnce(new Error('File not found'));

      // Should not throw, but should return false
      const result = await loadPublicDomains();
      expect(result).toBe(false);

      // Verify that domains count is 0 when loading fails
      expect(getPublicDomainsCount()).toBe(0);

      // Verify that isPublicDomain returns false when domains not loaded
      expect(isPublicDomain('gmail.com')).toBe(false);

      // Restore the working state for other tests by reloading with real data
      const actualFs = await vi.importActual('fs/promises');
      vi.mocked(readFile).mockImplementation(actualFs.readFile);
      await loadPublicDomains();

      // Verify we're back to working state
      expect(getPublicDomainsCount()).toBeGreaterThan(0);
    });
  });

  describe('getPublicDomainsCount', () => {
    it('should return the number of loaded domains', async () => {
      await loadPublicDomains();
      const count = getPublicDomainsCount();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('performance characteristics', () => {
    it('should perform domain lookup in O(1) time', async () => {
      await loadPublicDomains();

      // Test with large number of lookups to ensure O(1) performance
      const testDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'company.com', 'mycorp.org'];

      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const domain = testDomains[i % testDomains.length];
        isPublicDomain(domain);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete many lookups very quickly (less than 100ms for 10k lookups)
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('edge cases', () => {
    it('should handle international domains', () => {
      // Some international domains that might be in the public list
      expect(typeof isPublicDomain('邮箱.com')).toBe('boolean');
      expect(typeof isPublicDomain('пример.рф')).toBe('boolean');
    });

    it('should handle domains with numbers and hyphens', () => {
      expect(typeof isPublicDomain('123-mail.com')).toBe('boolean');
      expect(typeof isPublicDomain('10minutemail.com')).toBe('boolean');
    });

    it('should handle very long domain names', () => {
      const longDomain = 'a'.repeat(50) + '.com';
      expect(typeof isPublicDomain(longDomain)).toBe('boolean');
    });
  });
});
