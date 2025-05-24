import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MCPServerCard from '../MCPServerCard';

// Mock localize hook
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string, args?: { [key: string]: unknown }) => {
    if (key === 'com_ui_logo') return `Logo for ${args?.[0]}`;
    if (key === 'com_ui_add') return 'Add';
    if (key === 'com_ui_tools_available') return `${args?.[0]} tools available`;
    return key;
  },
}));

describe('MCPServerCard', () => {
  const mockTools = [
    {
      name: 'Tool 1',
      pluginKey: 'tool_1_mcp_googlesheets',
      description: 'Description of Tool 1',
    },
    {
      name: 'Tool 2',
      pluginKey: 'tool_2_mcp_googlesheets',
      description: 'Description of Tool 2',
    },
  ];

  const defaultProps = {
    serverName: 'Google Sheets',
    description: 'Google Sheets integration with multiple tools',
    tools: mockTools,
    onAddServer: jest.fn(),
  };

  it('renders correctly with provided data', () => {
    render(<MCPServerCard {...defaultProps} />);

    // Check server name is displayed
    expect(screen.getByText('Google Sheets')).toBeInTheDocument();

    // Check description is displayed
    expect(screen.getByText('Google Sheets integration with multiple tools')).toBeInTheDocument();

    // Check tools count is displayed
    expect(screen.getByText('2 tools available')).toBeInTheDocument();

    // Check Add button is displayed
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders with default icon when no icon is provided', () => {
    render(<MCPServerCard {...defaultProps} />);

    // Check that the component renders without crashing
    expect(screen.getByText('Google Sheets')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders with custom icon when provided', () => {
    const propsWithIcon = {
      ...defaultProps,
      icon: 'https://example.com/icon.png',
    };

    render(<MCPServerCard {...propsWithIcon} />);

    // Check that img element exists with the correct src
    const imgElement = screen.getByAltText('Logo for Google Sheets');
    expect(imgElement).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('calls onAddServer when Add button is clicked', () => {
    render(<MCPServerCard {...defaultProps} />);

    // Find and click the Add button
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    // Check if onAddServer was called
    expect(defaultProps.onAddServer).toHaveBeenCalledTimes(1);
  });
});
