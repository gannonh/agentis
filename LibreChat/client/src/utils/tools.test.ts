import {
  formatServerName,
  formatToolName,
  getServerDisplayName,
  getToolDisplayName,
} from './tools';

describe('MCP Display Name Utils', () => {
  describe('formatServerName', () => {
    test('handles special cases correctly', () => {
      expect(formatServerName('github')).toBe('GitHub');
      expect(formatServerName('googlesheets')).toBe('Google Sheets');
      expect(formatServerName('firebase-mcp-dev')).toBe('Firebase (Dev)');
    });

    test('removes -mcp suffix', () => {
      expect(formatServerName('custom-mcp')).toBe('Custom');
      expect(formatServerName('custom-mcp-dev')).toBe('Custom');
    });

    test('handles hyphenated names correctly', () => {
      expect(formatServerName('custom-service')).toBe('Custom Service');
      expect(formatServerName('my-custom-tool')).toBe('My Custom Tool');
    });

    test('handles camelCase correctly', () => {
      expect(formatServerName('myCustomTool')).toBe('My Custom Tool');
      expect(formatServerName('dataProcessor')).toBe('Data Processor');
    });
  });

  describe('formatToolName', () => {
    test('formats tool names correctly with server name', () => {
      expect(formatToolName('GOOGLESHEETS_BATCH_GET', 'googlesheets')).toBe('Batch Get');
      expect(formatToolName('github_get_pull_request', 'github')).toBe('Get Pull Request');
    });

    test('formats tool names correctly without server name', () => {
      expect(formatToolName('GOOGLESHEETS_BATCH_GET', 'googlesheets')).toBe('Batch Get');
      expect(formatToolName('SHEETS_GET_CELL_VALUES')).toBe('Sheets Get Cell Values');
    });

    test('handles underscore separation', () => {
      expect(formatToolName('ADD_COMMENT_TO_ISSUE')).toBe('Add Comment To Issue');
      expect(formatToolName('GET_USER_PROFILE')).toBe('Get User Profile');
    });
  });

  describe('getServerDisplayName', () => {
    test('prefers config display name when available', () => {
      const config = { displayName: 'Custom Server Name' };
      expect(getServerDisplayName('some-server', config)).toBe('Custom Server Name');
    });

    test('falls back to formatted name when no config is provided', () => {
      expect(getServerDisplayName('googlesheets')).toBe('Google Sheets');
    });

    test('falls back to formatted name when config has no display name', () => {
      const config = { someOtherSetting: true } as any;
      expect(getServerDisplayName('my-server', config)).toBe('My Server');
    });
  });

  describe('getToolDisplayName', () => {
    test('prefers config display name when available', () => {
      const config = {
        toolDisplayNames: { GOOGLESHEETS_BATCH_GET: 'Custom Tool Name' },
      };
      expect(getToolDisplayName('GOOGLESHEETS_BATCH_GET', 'googlesheets', config)).toBe(
        'Custom Tool Name',
      );
    });

    test('falls back to formatted name when no config is provided', () => {
      expect(getToolDisplayName('GOOGLESHEETS_BATCH_GET', 'googlesheets')).toBe('Batch Get');
    });

    test('falls back to formatted name when tool not in config', () => {
      const config = {
        toolDisplayNames: { SOME_OTHER_TOOL: 'Other Tool' },
      };
      expect(getToolDisplayName('GOOGLESHEETS_BATCH_GET', 'googlesheets', config)).toBe(
        'Batch Get',
      );
    });
  });
});
