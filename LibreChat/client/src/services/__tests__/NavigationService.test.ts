import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NavigationService } from '../NavigationService';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('NavigationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
        assign: vi.fn(),
        replace: vi.fn(),
      },
      writable: true,
    });
  });

  describe('navigateToLogin', () => {
    it('should use React Router navigate when available', () => {
      const service = new NavigationService();
      service.setNavigate(mockNavigate);
      
      service.navigateToLogin();
      
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    it('should throw error when navigate is not available', () => {
      const service = new NavigationService();
      
      expect(() => service.navigateToLogin()).toThrow(
        'NavigationService not initialized. Call setNavigate() first.'
      );
    });
  });

  describe('navigateToHome', () => {
    it('should use React Router navigate when available', () => {
      const service = new NavigationService();
      service.setNavigate(mockNavigate);
      
      service.navigateToHome();
      
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('should throw error when navigate is not available', () => {
      const service = new NavigationService();
      
      expect(() => service.navigateToHome()).toThrow(
        'NavigationService not initialized. Call setNavigate() first.'
      );
    });
  });

  describe('navigateToChat', () => {
    it('should use React Router navigate when available', () => {
      const service = new NavigationService();
      service.setNavigate(mockNavigate);
      
      service.navigateToChat();
      
      expect(mockNavigate).toHaveBeenCalledWith('/c/new', { replace: true });
    });

    it('should throw error when navigate is not available', () => {
      const service = new NavigationService();
      
      expect(() => service.navigateToChat()).toThrow(
        'NavigationService not initialized. Call setNavigate() first.'
      );
    });
  });

  describe('isExternalUrl', () => {
    it('should return true for external URLs', () => {
      const service = new NavigationService();
      
      expect(service.isExternalUrl('https://google.com')).toBe(true);
      expect(service.isExternalUrl('http://external.com')).toBe(true);
    });

    it('should return false for internal paths', () => {
      const service = new NavigationService();
      
      expect(service.isExternalUrl('/login')).toBe(false);
      expect(service.isExternalUrl('/c/new')).toBe(false);
    });
  });

  describe('handleRedirect', () => {
    it('should use React Router for internal paths', () => {
      const service = new NavigationService();
      service.setNavigate(mockNavigate);
      
      service.handleRedirect('/login');
      
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    it('should use window.location for external URLs', () => {
      const service = new NavigationService();
      service.setNavigate(mockNavigate);
      
      service.handleRedirect('https://external.com');
      
      expect(window.location.href).toBe('https://external.com');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should throw error when navigate is not available for internal paths', () => {
      const service = new NavigationService();
      
      expect(() => service.handleRedirect('/login')).toThrow(
        'NavigationService not initialized. Call setNavigate() first.'
      );
    });
  });
}); 