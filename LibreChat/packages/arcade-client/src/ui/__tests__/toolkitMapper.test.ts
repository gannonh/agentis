/**
 * Tests for the Arcade toolkit UI mapper
 */
import { describe, expect, it } from '@jest/globals';
import { mapToolkitToUIComponent, mapToolkitsToAgentisTool } from '../toolkitMapper';
import type { ArcadeToolkitConfig, ArcadeToolResponse } from '../../types';

describe('Arcade Toolkit UI Mapper', () => {
  // Mock toolkit configuration for testing
  const mockToolkitConfig: ArcadeToolkitConfig = {
    id: 'github',
    name: 'GitHub',
    category: 'Developer Tools',
    description: 'GitHub integration',
    icon: 'github-icon.png',
  };

  // Mock Arcade tool responses
  const mockGitHubTools: ArcadeToolResponse[] = [
    {
      name: 'CreateIssue',
      fully_qualified_name: 'github.CreateIssue',
      description: 'Create a GitHub issue',
      input: {
        parameters: [
          {
            name: 'repository',
            description: 'Repository in the format owner/repo',
            required: true,
            value_schema: { val_type: 'string' }
          },
          {
            name: 'title',
            description: 'Issue title',
            required: true,
            value_schema: { val_type: 'string' }
          },
          {
            name: 'body',
            description: 'Issue body',
            required: false,
            value_schema: { val_type: 'string' }
          }
        ]
      },
      output: {
        description: 'Created issue information',
        value_schema: { val_type: 'object' }
      },
      toolkit: {
        name: 'github',
        description: 'GitHub API integration',
      }
    },
    {
      name: 'ListIssues',
      fully_qualified_name: 'github.ListIssues',
      description: 'List issues in a repository',
      input: {
        parameters: [
          {
            name: 'repository',
            description: 'Repository in the format owner/repo',
            required: true,
            value_schema: { val_type: 'string' }
          },
          {
            name: 'state',
            description: 'Issue state (open, closed, all)',
            required: false,
            value_schema: { val_type: 'string' }
          }
        ]
      },
      output: {
        description: 'List of issues',
        value_schema: { val_type: 'array', inner_val_type: 'object' }
      },
      toolkit: {
        name: 'github',
        description: 'GitHub API integration',
      }
    }
  ];

  describe('mapToolkitToUIComponent', () => {
    it('should map a toolkit config to UI configuration object', () => {
      const uiConfig = mapToolkitToUIComponent(mockToolkitConfig);
      
      // Verify the UI configuration has the correct properties
      expect(uiConfig).toHaveProperty('id');
      expect(uiConfig).toHaveProperty('name');
      expect(uiConfig).toHaveProperty('description');
      expect(uiConfig).toHaveProperty('category');
      expect(uiConfig).toHaveProperty('icon');
      
      // Verify the values are mapped correctly
      expect(uiConfig.id).toBe('arcade-github');
      expect(uiConfig.name).toBe('GitHub');
      expect(uiConfig.description).toBe('GitHub integration');
      expect(uiConfig.category).toBe('Developer Tools');
      expect(uiConfig.icon).toBe('github-icon.png');
      
      // Verify additional Arcade-specific properties
      expect(uiConfig.isArcade).toBe(true);
      expect(uiConfig.arcadeToolkitId).toBe('github');
      expect(uiConfig.requiresAuth).toBe(true);
      expect(uiConfig.authType).toBe('oauth');
    });

    it('should use default icon if none provided', () => {
      const configWithoutIcon = { ...mockToolkitConfig, icon: undefined };
      const uiConfig = mapToolkitToUIComponent(configWithoutIcon);
      
      expect(uiConfig.icon).toBe('default-icon.png');
    });
  });

  describe('mapToolkitsToAgentisTool', () => {
    it('should map a toolkit and its tools to an Agentis tool configuration', () => {
      const agentisTool = mapToolkitsToAgentisTool(mockToolkitConfig, mockGitHubTools);
      
      // Verify basic properties
      expect(agentisTool.id).toBe('arcade-github');
      expect(agentisTool.name).toBe('GitHub');
      expect(agentisTool.description).toBe('GitHub integration');
      
      // Verify tools are included in the mapping
      expect(agentisTool.tools).toHaveLength(2);
      expect(agentisTool.tools[0].name).toBe('CreateIssue');
      expect(agentisTool.tools[1].name).toBe('ListIssues');
      
      // Verify tool parameters are properly mapped
      expect(agentisTool.tools[0].parameters).toHaveLength(3);
      expect(agentisTool.tools[0].parameters[0].name).toBe('repository');
      expect(agentisTool.tools[0].parameters[0].required).toBe(true);
      expect(agentisTool.tools[0].parameters[0].type).toBe('string');
    });

    it('should handle empty tools list', () => {
      const agentisTool = mapToolkitsToAgentisTool(mockToolkitConfig, []);
      
      expect(agentisTool.tools).toHaveLength(0);
    });

    it('should preserve authentication information', () => {
      const agentisTool = mapToolkitsToAgentisTool(mockToolkitConfig, mockGitHubTools);
      
      expect(agentisTool.requiresAuth).toBe(true);
      expect(agentisTool.authType).toBe('oauth');
      expect(agentisTool.authProvider).toBe('arcade');
    });
  });
});