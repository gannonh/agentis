import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MCPServerToolSelect from '../MCPServerToolSelect';

// Mock localize hook
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string, args?: { [key: string]: unknown }) => {
    if (key === 'com_ui_select_tools_for') return `Select tools for ${args?.[0]}`;
    if (key === 'com_ui_select_tools_description')
      return 'Select the tools you want to add to your agent';
    if (key === 'com_ui_select_all_tools') return 'Select All';
    if (key === 'com_ui_helper_tools') return 'Helper tools';
    if (key === 'com_ui_helper_tools_description')
      return 'Helper tools will be included automatically';
    if (key === 'com_ui_add_selected') return 'Add Selected';
    if (key === 'com_ui_cancel') return 'Cancel';
    return key;
  },
}));

describe('MCPServerToolSelect', () => {
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

  const mockHelperTools = [
    {
      name: 'Auth Helper',
      pluginKey: 'auth_helper_mcp_googlesheets',
      description: 'Authentication for Google Sheets',
      isHelper: true,
    },
  ];

  const defaultProps = {
    isOpen: true,
    setIsOpen: jest.fn(),
    serverName: 'Google Sheets',
    tools: mockTools,
    helperTools: mockHelperTools,
    onConfirm: jest.fn(),
  };

  it('renders correctly when open', () => {
    render(<MCPServerToolSelect {...defaultProps} />);

    // Check dialog title
    expect(screen.getByText('Select tools for Google Sheets')).toBeInTheDocument();

    // Check dialog description
    expect(screen.getByText('Select the tools you want to add to your agent')).toBeInTheDocument();

    // Check tools are displayed
    expect(screen.getByText('Create Sheet')).toBeInTheDocument();
    expect(screen.getByText('Update Sheet')).toBeInTheDocument();

    // Check helper tools section is displayed
    // Checking if there's a heading that contains the text "Helper tools"
    const helperToolsHeading = screen.getByRole('heading', { name: /Helper tools/ });
    expect(helperToolsHeading).toBeInTheDocument();
    
    // Check for the helper tools description
    expect(screen.getByText('Helper tools will be included automatically')).toBeInTheDocument();

    // Check buttons are displayed
    expect(screen.getByText('Add Selected')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls setIsOpen(false) when Cancel button is clicked', () => {
    render(<MCPServerToolSelect {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.setIsOpen).toHaveBeenCalledWith(false);
  });

  it('calls setIsOpen(false) when close icon is clicked', () => {
    render(<MCPServerToolSelect {...defaultProps} />);

    // Find the close button (it's the one with aria-label="Close dialog")
    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(defaultProps.setIsOpen).toHaveBeenCalledWith(false);
  });

  it('selects all tools when "Select All" is checked', () => {
    render(<MCPServerToolSelect {...defaultProps} />);

    // Find and click the Select All checkbox
    const selectAllLabel = screen.getByLabelText('Select All');
    fireEvent.click(selectAllLabel);

    // Check that all tool checkboxes are now checked
    const toolCheckboxes = screen.getAllByRole('checkbox');
    expect(toolCheckboxes[0]).toBeChecked(); // Select All checkbox
    expect(toolCheckboxes[1]).toBeChecked(); // First tool
    expect(toolCheckboxes[2]).toBeChecked(); // Second tool
  });

  it('calls onConfirm with selected tools when Add Selected is clicked', () => {
    render(<MCPServerToolSelect {...defaultProps} />);

    // Select the first tool (helper tools are automatically included)
    const firstToolLabel = screen.getByText('Create Sheet').closest('label');
    if (firstToolLabel) {
      fireEvent.click(firstToolLabel);
    }

    // Click Add Selected button
    const addSelectedButton = screen.getByText('Add Selected');
    fireEvent.click(addSelectedButton);

    // Check that onConfirm was called with the correct tools
    expect(defaultProps.onConfirm).toHaveBeenCalledWith([
      'auth_helper_mcp_googlesheets', // Helper tool
      'create_sheet_mcp_googlesheets', // First tool that we checked
    ]);

    // Check that dialog was closed
    expect(defaultProps.setIsOpen).toHaveBeenCalledWith(false);
  });
});
