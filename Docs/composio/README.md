# Composio MCP Integration UI Enhancement Project

## Background

Agentis has integrated with Composio to provide MCP (Model Context Protocol) tools such as Google Sheets integration. However, the current UI implementation presents each MCP tool as an individual item in the Agent Builder interface, which creates a cluttered user experience when multiple tools are added from various MCP servers.

This project aims to improve the UX by grouping tools by MCP server, similar to how Claude Desktop handles tool grouping, and by expanding the main tools modal to support more tools.

## Current Challenges

1. **Individual Tool Representation**:
   - Each MCP tool (like "Batch get", "Create google sheet") is displayed as a separate card
   - Helper tools required for authentication must be manually added
   - No visual indication that certain tools belong to the same MCP server

2. **Limited UI Space**:
   - The tool selection modal only has 2 rows, limiting the number of visible tools
   - Adding multiple MCP tools quickly clutters the Agent Builder UI

3. **User Experience Issues**:
   - Users must individually select each tool they want to use
   - Configuration of MCP tools becomes tedious when many tools are needed

## Proposed Solution

We propose a new UI that:

1. **Groups Tools by MCP Server**:
   - Display a single card for each MCP server (e.g., "Google Sheets")
   - When adding a server, show a secondary UI to select specific tools
   - Auto-include required helper tools without showing them in the UI

2. **Expands the Main Tools Modal**:
   - Increase from 2 rows to 4 rows to accommodate more tools
   - Improve the grid layout for better space utilization

3. **Improves Tool Organization in Agent Builder**:
   - Group tools by server in collapsible sections
   - Provide expand/collapse functionality for better space management

## Implementation Details

### 1. UI Components

#### New Components

1. **MCPServerCard**:
   - Displays server name, icon, and description
   - Provides a single "Add" button to access all tools from that server

2. **MCPServerToolSelect**:
   - Secondary dialog that appears when adding a server
   - Shows all available tools with checkboxes
   - Includes a "Select All" option
   - Automatically includes helper tools

3. **AgentToolGroup**:
   - Collapsible group of tools in the Agent Builder
   - Shows/hides tools from a specific MCP server
   - Allows removing individual tools or the entire group

#### Modified Components

1. **ToolSelectDialog**:
   - Updated to support 4-row grid layout
   - Modified to show both regular tools and MCP server cards
   - Enhanced to handle the new server-based selection flow

2. **AgentPanel**:
   - Updated to support both individual tools and grouped MCP tools
   - Enhanced to handle adding/removing tool groups

### 2. Data Flow

1. **Tool Discovery and Grouping**:
   - Enhanced query to group tools by MCP server
   - Server metadata added to each group
   - Helper tools identified and managed separately

2. **Tool Selection Process**:
   - User selects an MCP server from the main dialog
   - Secondary dialog shows available tools from that server
   - User selects which tools to include
   - Helper tools are automatically included

3. **Tool Display in Agent**:
   - Tools are grouped by server in the Agent Builder
   - Groups can be expanded/collapsed for better management

### 3. Technical Implementation

#### Backend Enhancements

- Update the `MCPManager` to support server-based operations
- Enhance API endpoints to handle tool groups
- Ensure helper tools are properly managed

#### Frontend Enhancements

- Create new React components for the server-based UI
- Modify existing components to support grouping
- Update the state management to handle tool groups

## Development Timeline

1. **Phase 1: Core Components (Week 1)**
   - Create MCPServerCard component
   - Update ToolSelectDialog grid layout
   - Implement tool grouping logic

2. **Phase 2: Tool Selection (Week 2)**
   - Create MCPServerToolSelect component
   - Implement server-based tool selection
   - Handle helper tools logic

3. **Phase 3: Agent Builder UI (Week 3)**
   - Create AgentToolGroup component
   - Update Agent Builder to support grouped tools
   - Implement expand/collapse functionality

4. **Phase 4: Testing and Refinement (Week 4)**
   - Test with multiple MCP servers
   - Refine UI based on feedback
   - Optimize performance

## Benefits

1. **Improved User Experience**:
   - More intuitive tool organization
   - Reduced clutter in the interface
   - Easier management of related tools

2. **Better Scalability**:
   - Support for many more tools without UI crowding
   - Clear visual hierarchy for tool organization

3. **Simplified MCP Tool Management**:
   - Automatic inclusion of necessary helper tools
   - Batch addition of related tools

## Visual Mockups

### Main Tools Dialog (4-row grid with server cards)

```
┌───────────────────────────────────┐ ┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│                                   │ │                                   │ │                                   │
│  ┌─────┐                          │ │  ┌─────┐                          │ │  ┌─────┐                          │
│  │     │  Google Sheets           │ │  │     │  Traversal               │ │  │     │  Regular Tool 1         │
│  └─────┘                          │ │  └─────┘                          │ │  └─────┘                          │
│           [Add]                   │ │           [Add]                   │ │           [Add]                   │
│                                   │ │                                   │ │                                   │
│  Google Sheets integration with   │ │  Robust search API tailored for   │ │  Description of regular tool...   │
│  multiple spreadsheet tools...    │ │  LLM Agents...                    │ │                                   │
└───────────────────────────────────┘ └───────────────────────────────────┘ └───────────────────────────────────┘

┌───────────────────────────────────┐ ┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│                                   │ │                                   │ │                                   │
│  ┌─────┐                          │ │  ┌─────┐                          │ │  ┌─────┐                          │
│  │     │  Regular Tool 2          │ │  │     │  Regular Tool 3          │ │  │     │  Regular Tool 4          │
│  └─────┘                          │ │  └─────┘                          │ │  └─────┘                          │
│           [Add]                   │ │           [Remove]                │ │           [Add]                   │
│                                   │ │                                   │ │                                   │
│  Description of regular tool...   │ │  Description of regular tool...   │ │  Description of regular tool...   │
│                                   │ │                                   │ │                                   │
└───────────────────────────────────┘ └───────────────────────────────────┘ └───────────────────────────────────┘
```

### Server Tool Selection Dialog

```
┌─────────────────────────────────────────────────────┐
│ Select Tools for Google Sheets                    ✕ │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ☑ Select All                                        │
│                                                     │
│ ☑ Batch get                                         │
│   Get data from multiple cells in a spreadsheet     │
│                                                     │
│ ☑ Batch update                                      │
│   Update multiple cells in a spreadsheet            │
│                                                     │
│ ☑ Clear values                                      │
│   Clear values from a specified range               │
│                                                     │
│ ☑ Create google sheet                               │
│   Create a new Google Sheets document               │
│                                                     │
│                                                     │
│ ℹ️ Helper tools will be automatically included      │
│    These tools are required for authentication      │
│    and connection to Google Sheets.                 │
│                                                     │
│                                                     │
│                  [Cancel]  [Add Selected]           │
└─────────────────────────────────────────────────────┘
```

### Agent Builder with Grouped Tools

```
┌─────────────────────────────────────────────────────┐
│ Tools                                     [Add Tool] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ▼ Google Sheets (6 tools)                         ✕ │
│   ├─ Batch get                                    ✕ │
│   ├─ Batch update                                 ✕ │
│   ├─ Clear values                                 ✕ │
│   ├─ Create google sheet                          ✕ │
│   ├─ Find worksheet by title                      ✕ │
│   └─ Format cell                                  ✕ │
│                                                     │
│ ▶ Traversal (1 tool)                              ✕ │
│                                                     │
│ Regular Tool 3                                    ✕ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Next Steps

1. Review this design proposal with stakeholders
2. Create detailed technical specifications
3. Implement the backend changes
4. Develop the new UI components
5. Test with various MCP server configurations
6. Deploy and gather user feedback

## Related Documentation

- [Implementation Plan](./implementation-plan.md) - Detailed technical implementation plan
- [Composio MCP Documentation](https://docs.composio.dev/mcp/) - Official Composio MCP documentation