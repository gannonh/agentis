import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentToolGroup from '../AgentToolGroup';

// Mock the AgentTool component
jest.mock('../AgentTool', () => ({
  __esModule: true,
  default: ({ tool, onRemoveTool }) => (
    <div data-testid={`agent-tool-${tool}`}>
      {tool}
      <button onClick={onRemoveTool} data-testid={`remove-tool-${tool}`}>Remove Tool</button>
    </div>
  ),
}));

// Mock localize hook
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => {
    if (key === 'com_ui_tools') return 'tools';
    if (key === 'com_ui_remove_all') return 'Remove all';
    return key;
  },
}));

describe('AgentToolGroup', () => {
  const mockTools = [
    {
      name: 'Create Sheet',
      pluginKey: 'create_sheet_mcp_googlesheets',
      description: 'Create a new Google Sheet',
    },
    {
      name: 'Update Sheet',
      pluginKey: 'update_sheet_mcp_googlesheets',
      description: 'Update a Google Sheet',
    },
  ];

  const defaultProps = {
    serverName: 'Google Sheets',
    tools: mockTools,
    allTools: [...mockTools],
    agent_id: 'agent-123',
    onRemoveTool: jest.fn(),
    onRemoveGroup: jest.fn(),
  };

  it('renders correctly with collapsed state', () => {
    render(<AgentToolGroup {...defaultProps} />);

    // Check server name is displayed
    expect(screen.getByText('Google Sheets')).toBeInTheDocument();
    
    // Check tools count is displayed
    expect(screen.getByText('2', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('tools', { exact: false })).toBeInTheDocument();
    
    // Check that tools are not visible when collapsed
    expect(screen.queryByTestId('agent-tool-create_sheet_mcp_googlesheets')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-tool-update_sheet_mcp_googlesheets')).not.toBeInTheDocument();
  });

  it('expands to show tools when clicked', () => {
    render(<AgentToolGroup {...defaultProps} />);
    
    // Click on the header to expand
    fireEvent.click(screen.getByText('Google Sheets'));
    
    // Check that tools are now visible
    expect(screen.getByTestId('agent-tool-create_sheet_mcp_googlesheets')).toBeInTheDocument();
    expect(screen.getByTestId('agent-tool-update_sheet_mcp_googlesheets')).toBeInTheDocument();
  });

  it('calls onRemoveGroup when remove button is clicked', () => {
    render(<AgentToolGroup {...defaultProps} />);
    
    // Find and click the remove button (X icon)
    const removeButton = screen.getByLabelText('Remove all');
    fireEvent.click(removeButton);
    
    // Check that onRemoveGroup was called
    expect(defaultProps.onRemoveGroup).toHaveBeenCalledTimes(1);
  });

  it('calls onRemoveTool when a tool\'s remove button is clicked', () => {
    render(<AgentToolGroup {...defaultProps} />);
    
    // Expand the group
    fireEvent.click(screen.getByText('Google Sheets'));
    
    // Find and click the remove button for the first tool
    const removeButton = screen.getByTestId('remove-tool-create_sheet_mcp_googlesheets');
    fireEvent.click(removeButton);
    
    // Check that onRemoveTool was called with the correct tool key
    expect(defaultProps.onRemoveTool).toHaveBeenCalledWith('create_sheet_mcp_googlesheets');
  });
});