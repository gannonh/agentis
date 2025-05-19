/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for the Arcade Toolkit Selector component
 */
import { describe, expect, it, jest } from '@jest/globals';
import type { ArcadeAgentisTool } from '../types';
import { createToolkitSelector } from '../ToolkitSelector';

describe('ToolkitSelector', () => {
  // Mock toolkit data
  const mockToolkits: ArcadeAgentisTool[] = [
    {
      id: 'arcade-github',
      name: 'GitHub',
      description: 'GitHub integration',
      category: 'Developer Tools',
      icon: 'github-icon.png',
      isArcade: true,
      arcadeToolkitId: 'github',
      requiresAuth: true,
      authType: 'oauth',
      authProvider: 'arcade',
      tools: [
        {
          name: 'CreateIssue',
          fullyQualifiedName: 'github.CreateIssue',
          description: 'Create a GitHub issue',
          parameters: [
            {
              name: 'repository',
              description: 'Repository name',
              required: true,
              type: 'string',
            },
          ],
          originalTool: {} as any,
        },
      ],
    },
    {
      id: 'arcade-google',
      name: 'Google',
      description: 'Google services integration',
      category: 'Productivity',
      icon: 'google-icon.png',
      isArcade: true,
      arcadeToolkitId: 'google',
      requiresAuth: true,
      authType: 'oauth',
      authProvider: 'arcade',
      tools: [
        {
          name: 'SendEmail',
          fullyQualifiedName: 'google.SendEmail',
          description: 'Send an email via Gmail',
          parameters: [
            {
              name: 'to',
              description: 'Recipient email',
              required: true,
              type: 'string',
            },
          ],
          originalTool: {} as any,
        },
      ],
    },
  ];

  // Mock auth status
  const mockAuthStatus = {
    github: { isAuthenticated: true },
    google: { isAuthenticated: false },
  };

  // Mock auth functions
  const mockStartAuth = jest.fn();
  const mockCheckAuth = jest.fn();

  it('should create a toolkit selector with the correct configuration', () => {
    const selector = createToolkitSelector({
      toolkits: mockToolkits,
      authStatus: mockAuthStatus,
      onStartAuth: mockStartAuth,
      onCheckAuth: mockCheckAuth,
    });

    expect(selector).toHaveProperty('getAvailableToolkits');
    expect(selector).toHaveProperty('getAuthenticatedToolkits');
    expect(selector).toHaveProperty('startAuthentication');
    expect(selector).toHaveProperty('checkAuthenticationStatus');
    expect(selector).toHaveProperty('isAuthenticated');
  });

  describe('getAvailableToolkits', () => {
    it('should return all available toolkits', () => {
      const selector = createToolkitSelector({
        toolkits: mockToolkits,
        authStatus: mockAuthStatus,
        onStartAuth: mockStartAuth,
        onCheckAuth: mockCheckAuth,
      });

      const availableToolkits = selector.getAvailableToolkits();
      expect(availableToolkits).toHaveLength(2);
      expect(availableToolkits[0].name).toBe('GitHub');
      expect(availableToolkits[1].name).toBe('Google');
    });

    it('should filter toolkits by category if specified', () => {
      const selector = createToolkitSelector({
        toolkits: mockToolkits,
        authStatus: mockAuthStatus,
        onStartAuth: mockStartAuth,
        onCheckAuth: mockCheckAuth,
      });

      const devTools = selector.getAvailableToolkits('Developer Tools');
      expect(devTools).toHaveLength(1);
      expect(devTools[0].name).toBe('GitHub');

      const productivity = selector.getAvailableToolkits('Productivity');
      expect(productivity).toHaveLength(1);
      expect(productivity[0].name).toBe('Google');
    });
  });

  describe('getAuthenticatedToolkits', () => {
    it('should return only authenticated toolkits', () => {
      const selector = createToolkitSelector({
        toolkits: mockToolkits,
        authStatus: mockAuthStatus,
        onStartAuth: mockStartAuth,
        onCheckAuth: mockCheckAuth,
      });

      const authenticatedToolkits = selector.getAuthenticatedToolkits();
      expect(authenticatedToolkits).toHaveLength(1);
      expect(authenticatedToolkits[0].name).toBe('GitHub');
    });
  });

  describe('isAuthenticated', () => {
    it('should return authentication status for a toolkit', () => {
      const selector = createToolkitSelector({
        toolkits: mockToolkits,
        authStatus: mockAuthStatus,
        onStartAuth: mockStartAuth,
        onCheckAuth: mockCheckAuth,
      });

      expect(selector.isAuthenticated('github')).toBe(true);
      expect(selector.isAuthenticated('google')).toBe(false);
    });

    it('should return false for unknown toolkits', () => {
      const selector = createToolkitSelector({
        toolkits: mockToolkits,
        authStatus: mockAuthStatus,
        onStartAuth: mockStartAuth,
        onCheckAuth: mockCheckAuth,
      });

      expect(selector.isAuthenticated('unknown')).toBe(false);
    });
  });

  describe('startAuthentication', () => {
    it('should call the onStartAuth function with the correct toolkit ID', () => {
      const selector = createToolkitSelector({
        toolkits: mockToolkits,
        authStatus: mockAuthStatus,
        onStartAuth: mockStartAuth,
        onCheckAuth: mockCheckAuth,
      });

      selector.startAuthentication('google');
      expect(mockStartAuth).toHaveBeenCalledWith('google');
    });
  });

  describe('checkAuthenticationStatus', () => {
    it('should call the onCheckAuth function with the correct toolkit ID', () => {
      const selector = createToolkitSelector({
        toolkits: mockToolkits,
        authStatus: mockAuthStatus,
        onStartAuth: mockStartAuth,
        onCheckAuth: mockCheckAuth,
      });

      selector.checkAuthenticationStatus('github');
      expect(mockCheckAuth).toHaveBeenCalledWith('github');
    });
  });
});
