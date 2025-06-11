/**
 * @file UserService test suite
 * @description Tests for UserService functions including email domain matching
 */

const {
  extractEmailDomain,
  isWorkEmailDomain,
} = require('./UserService');

describe('UserService - Email Domain Matching', () => {

  describe('extractEmailDomain', () => {
    it('should extract domain from valid email', () => {
      expect(extractEmailDomain('user@company.com')).toBe('company.com');
      expect(extractEmailDomain('test@example.org')).toBe('example.org');
      expect(extractEmailDomain('USER@DOMAIN.COM')).toBe('domain.com'); // Should normalize case
    });

    it('should handle emails with subdomains', () => {
      expect(extractEmailDomain('user@mail.company.com')).toBe('mail.company.com');
    });

    it('should throw error for invalid emails', () => {
      expect(() => extractEmailDomain(null)).toThrow('Valid email is required');
      expect(() => extractEmailDomain('')).toThrow('Valid email is required');
      expect(() => extractEmailDomain('invalid-email')).toThrow('Invalid email format');
      expect(() => extractEmailDomain('user@')).toThrow('Invalid email format');
    });

    it('should handle edge cases', () => {
      expect(() => extractEmailDomain(123)).toThrow('Valid email is required');
      expect(() => extractEmailDomain({})).toThrow('Valid email is required');
    });
  });

  describe('isWorkEmailDomain', () => {
    it('should identify work domains correctly', () => {
      expect(isWorkEmailDomain('user@company.com')).toBe(true);
      expect(isWorkEmailDomain('employee@startup.io')).toBe(true);
      expect(isWorkEmailDomain('admin@enterprise.org')).toBe(true);
    });

    it('should identify personal domains correctly', () => {
      expect(isWorkEmailDomain('user@gmail.com')).toBe(false);
      expect(isWorkEmailDomain('test@yahoo.com')).toBe(false);
      expect(isWorkEmailDomain('person@hotmail.com')).toBe(false);
      expect(isWorkEmailDomain('user@outlook.com')).toBe(false);
      expect(isWorkEmailDomain('test@icloud.com')).toBe(false);
      expect(isWorkEmailDomain('person@aol.com')).toBe(false);
      expect(isWorkEmailDomain('user@protonmail.com')).toBe(false);
      expect(isWorkEmailDomain('test@mail.com')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isWorkEmailDomain('USER@GMAIL.COM')).toBe(false);
      expect(isWorkEmailDomain('User@Company.Com')).toBe(true);
    });
  });

});