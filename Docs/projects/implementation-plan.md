# Composio MCP Server Integration UI Improvement Plan

## Overview

This document outlines plans to improve the UX for Composio MCP Server integration in the Agentis platform. Currently, each MCP tool is displayed individually in the Agent Builder UI, which creates a cluttered interface when multiple tools are added from multiple MCP servers. The proposed solution is to group tools by MCP server, similar to how Claude Desktop handles tool groups.

## Current Implementation

Currently, the MCP tools implementation has the following characteristics:

1. **Individual Tool Representation**:
   - Each MCP tool from Composio is displayed as an individual card in the tool selection modal
   - Tool names include the server name with a delimiter pattern: `toolName_mcp_serverName`
   - When added to an agent, each tool appears as a separate entity in the Agent Builder tool list

2. **Tool Selection Process**:
   - Users must individually add each tool they want to use
   - Composio helper tools are often needed but must be added separately
   - No visual indication that certain tools belong to the same MCP server

3. **UI Constraints**:
   - The tool selection modal is limited to a grid of 2 rows, which becomes crowded
   - No grouping mechanism for related tools

## Proposed Changes

### 1. Server-Based Tool Grouping

**Create Server Card Component**:
- Create a new `MCPServerCard.tsx` component that represents an entire MCP server
- The card will display server name, icon, and description
- Clicking "Add" will open a secondary dialog to select specific tools

**Server Card Design**:
```tsx
function MCPServerCard({ 
  serverName, 
  description, 
  icon, 
  tools, 
  onAddServer 
}: MCPServerCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded border border-border-medium bg-transparent p-6">
      <div className="flex gap-4">
        <div className="h-[70px] w-[70px] shrink-0">
          {/* Icon display logic */}
        </div>
        <div className="flex min-w-0 flex-col items-start justify-between">
          <div className="mb-2 line-clamp-1 max-w-full text-lg leading-5 text-text-primary">
            {serverName}
          </div>
          <button
            className="btn btn-primary relative"
            onClick={onAddServer}
          >
            {localize('com_ui_add')}
            <PlusCircleIcon className="flex h-4 w-4 items-center stroke-2" />
          </button>
        </div>
      </div>
      <div className="line-clamp-3 h-[60px] text-sm text-text-secondary">
        {description}
      </div>
    </div>
  );
}
```

### 2. Tool Selection Modal Enhancements

**Expanded Grid Layout**:
- Modify the existing `ToolSelectDialog.tsx` to support a 4-row grid layout
- Update the grid CSS to use a more efficient layout:
```css
.grid-rows-4 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```

**Server Tool Selection Dialog**:
- Create a new component `MCPServerToolSelect.tsx` for the secondary dialog
- This dialog will show all tools from a specific MCP server with checkboxes
- Automatically include Composio helper tools without showing them in UI
- Implement a "Select All" option for convenience

### 3. Expandable Tool Groups in Agent Builder

**Collapsible Tool Groups**:
- Modify the Agent Builder interface to support collapsible tool groups
- Group tools by server name in the agent builder panel
- Implement expand/collapse functionality for each group
- Create a new component `AgentToolGroup.tsx` for this purpose

**Design Mockup**:
```
GoogleSheets MCP [+]
  └── (When expanded)
      ├── Batch get
      ├── Batch update
      ├── Clear values
      ├── etc...
```

### 4. Backend Changes

**Tool Grouping Logic**:
- Enhance the `useAvailableToolsQuery` hook to group tools by MCP server
- Add server metadata to tool definitions for better UI display
- Modify the backend to handle batch tool selection

**MCPManager Enhancement**:
- Update the `MCPManager` class to support server-based tool operations
- Add functionality to batch-enable tools from a specific server
- Ensure helper tools are always included when a server is selected

## Implementation Steps

1. **Update Data Structures**:
   - Create new types for tool groups and server metadata
   - Modify existing queries to support grouping

2. **Backend Changes**:
   - Enhance the MCPManager to support server-based operations
   - Update API endpoints for tool management

3. **UI Components**:
   - Create new components for server cards and tool groups
   - Modify existing components to support the new design

4. **Testing**:
   - Test with multiple MCP servers to ensure grouping works correctly
   - Verify helper tools are correctly included
   - Test the expanded grid layout

## Benefits

1. **Improved User Experience**:
   - More intuitive tool organization by server
   - Reduced clutter in the tool selection interface
   - Easier management of related tools

2. **Better Scalability**:
   - Support for many more tools without UI crowding
   - Clear visual hierarchy for tool organization

3. **Consistent Helper Tool Management**:
   - Automatic inclusion of necessary helper tools
   - Reduced user error by hiding technical details

## Technical Design Details

### Data Flow

1. **Tool Discovery**:
   - `useAvailableToolsQuery` fetches all available tools
   - New processing logic groups tools by server name
   - Server metadata is added to each group

2. **Tool Selection**:
   - User selects a server from the main dialog
   - Secondary dialog shows all tools from that server
   - User selects which tools to include
   - Helper tools are automatically included

3. **Tool Display in Agent**:
   - Tools are grouped by server in the Agent Builder
   - Groups can be expanded/collapsed for better management

### Component Structure

```
ToolSelectDialog
├── RegularToolItem (for standard tools)
├── MCPServerCard (for MCP servers)
└── MCPServerToolSelect (secondary dialog)

AgentBuilder
├── RegularAgentTool
└── AgentToolGroup (collapsible group)
    └── AgentTool (individual tools)
```

## Next Steps

1. Implement the backend changes to support tool grouping
2. Create the new UI components
3. Update the tool selection workflow
4. Test with multiple MCP server configurations
5. Document the new user experience