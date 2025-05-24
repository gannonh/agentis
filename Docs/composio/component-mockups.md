# Component Mockups for Composio MCP Integration

## 1. Main Tool Selection Dialog (Expanded to 4 rows)

The primary tool selection dialog will be expanded to show 4 rows of tools instead of 2, and will include both regular tools and MCP server cards.

```tsx
// ToolSelectDialog.tsx (modified)
<DialogPanel
  className="relative w-full transform overflow-hidden overflow-y-auto rounded-lg bg-surface-secondary text-left shadow-xl transition-all max-sm:h-full sm:mx-7 sm:my-8 sm:max-w-2xl lg:max-w-5xl xl:max-w-7xl"
  style={{ minHeight: '810px' }} // Increased from 610px to accommodate 4 rows
>
  {/* Dialog header and search remain the same */}
  
  <div className="p-4 sm:p-6 sm:pt-4">
    <div className="mt-4 flex flex-col gap-4">
      {/* Search bar remains the same */}
      
      <div
        ref={gridRef}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        style={{ minHeight: '610px' }} // Increased from 410px to accommodate 4 rows
      >
        {filteredItems.map((item) => {
          if (item.type === 'mcp_server') {
            return (
              <MCPServerCard
                key={item.serverName}
                serverName={item.serverName}
                description={item.description}
                icon={item.icon}
                tools={item.tools}
                onAddServer={() => openServerToolSelection(item)}
              />
            );
          } else {
            return (
              <ToolItem
                key={item.pluginKey}
                tool={item}
                isInstalled={getValues(toolsFormKey).includes(item.pluginKey)}
                onAddTool={() => onAddTool(item.pluginKey)}
                onRemoveTool={() => onRemoveTool(item.pluginKey)}
              />
            );
          }
        })}
      </div>
    </div>
    
    {/* Pagination remains the same */}
  </div>
</DialogPanel>
```

## 2. MCP Server Card Component

This new component will represent an MCP server as a single card in the main tool selection dialog.

```tsx
// MCPServerCard.tsx
import { Wrench, PlusCircleIcon } from 'lucide-react';
import { useLocalize } from '~/hooks';
import type { TPlugin } from 'librechat-data-provider';

interface MCPServerCardProps {
  serverName: string;
  description: string;
  icon?: string;
  tools: TPlugin[];
  onAddServer: () => void;
}

function MCPServerCard({ serverName, description, icon, tools, onAddServer }: MCPServerCardProps) {
  const localize = useLocalize();
  
  return (
    <div className="flex flex-col gap-4 rounded border border-border-medium bg-transparent p-6">
      <div className="flex gap-4">
        <div className="h-[70px] w-[70px] shrink-0">
          <div className="relative h-full w-full">
            {icon ? (
              <img
                src={icon}
                alt={localize('com_ui_logo', { 0: serverName })}
                className="h-full w-full rounded-[5px] bg-white"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[5px] border border-border-medium bg-transparent">
                <Wrench className="h-8 w-8 text-text-secondary" />
              </div>
            )}
            <div className="absolute inset-0 rounded-[5px] ring-1 ring-inset ring-black/10"></div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-start justify-between">
          <div className="mb-2 line-clamp-1 max-w-full text-lg leading-5 text-text-primary">
            {serverName}
          </div>
          <button
            className="btn btn-primary relative"
            aria-label={`${localize('com_ui_add')} ${serverName}`}
            onClick={onAddServer}
          >
            <div className="flex w-full items-center justify-center gap-2">
              {localize('com_ui_add')}
              <PlusCircleIcon className="flex h-4 w-4 items-center stroke-2" />
            </div>
          </button>
        </div>
      </div>
      <div className="line-clamp-3 h-[60px] text-sm text-text-secondary">{description}</div>
      <div className="text-xs text-text-tertiary">
        {localize('com_ui_tools_available', { 0: tools.length })}
      </div>
    </div>
  );
}

export default MCPServerCard;
```

## 3. MCP Server Tool Selection Dialog

This secondary dialog will appear when a user clicks "Add" on an MCP server card, showing all available tools for that server with checkboxes.

```tsx
// MCPServerToolSelect.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { Check, X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import type { TPlugin } from 'librechat-data-provider';

interface MCPServerToolSelectProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  serverName: string;
  tools: TPlugin[];
  helperTools: TPlugin[];
  onConfirm: (selectedTools: string[]) => void;
}

function MCPServerToolSelect({
  isOpen,
  setIsOpen,
  serverName,
  tools,
  helperTools,
  onConfirm,
}: MCPServerToolSelectProps) {
  const localize = useLocalize();
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Always include helper tools
  const helperToolKeys = helperTools.map(tool => tool.pluginKey);
  
  useEffect(() => {
    if (selectAll) {
      setSelectedTools([...helperToolKeys, ...tools.map(tool => tool.pluginKey)]);
    } else {
      setSelectedTools([...helperToolKeys]);
    }
  }, [selectAll, helperToolKeys, tools]);

  const handleToggle = (pluginKey: string) => {
    if (selectedTools.includes(pluginKey)) {
      setSelectedTools(selectedTools.filter(key => key !== pluginKey));
    } else {
      setSelectedTools([...selectedTools, pluginKey]);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedTools);
    setIsOpen(false);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-[103]"
    >
      <div className="fixed inset-0 bg-surface-primary opacity-60 transition-opacity dark:opacity-80" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="relative w-full transform overflow-hidden rounded-lg bg-surface-secondary text-left shadow-xl transition-all sm:mx-7 sm:my-8 sm:max-w-lg">
          <div className="flex items-center justify-between border-b-[1px] border-border-medium px-4 pb-4 pt-5 sm:p-6">
            <div className="flex items-center">
              <div className="text-center sm:text-left">
                <DialogTitle className="text-lg font-medium leading-6 text-text-primary">
                  {localize('com_ui_select_tools_for', { 0: serverName })}
                </DialogTitle>
                <Description className="text-sm text-text-secondary">
                  {localize('com_ui_select_tools_description')}
                </Description>
              </div>
            </div>
            <div>
              <button
                onClick={() => setIsOpen(false)}
                className="inline-block rounded-full text-text-secondary transition-colors hover:text-text-primary"
                aria-label="Close dialog"
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between px-2 py-4">
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={() => setSelectAll(!selectAll)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {localize('com_ui_select_all_tools')}
              </label>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {tools.map(tool => (
                <div
                  key={tool.pluginKey}
                  className="flex items-center justify-between rounded px-2 py-3 hover:bg-surface-hover"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.pluginKey)}
                      onChange={() => handleToggle(tool.pluginKey)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">{tool.name}</span>
                      <span className="text-xs text-text-secondary">{tool.description}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            
            {helperTools.length > 0 && (
              <div className="mt-4 rounded-md bg-blue-50 p-3 dark:bg-blue-950">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {localize('com_ui_helper_tools')}
                    </h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                      <p>
                        {localize('com_ui_helper_tools_description')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="btn btn-primary w-full sm:ml-3 sm:w-auto"
                onClick={handleConfirm}
              >
                {localize('com_ui_add_selected')}
              </button>
              <button
                type="button"
                className="mt-3 w-full sm:mt-0 sm:w-auto btn btn-neutral"
                onClick={() => setIsOpen(false)}
              >
                {localize('com_ui_cancel')}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default MCPServerToolSelect;
```

## 4. Agent Tool Group Component

This component will display tools grouped by MCP server in the Agent Builder, with an expand/collapse feature.

```tsx
// AgentToolGroup.tsx
import { useState } from 'react';
import { ChevronRight, ChevronDown, X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import AgentTool from './AgentTool';
import type { TPlugin } from 'librechat-data-provider';

interface AgentToolGroupProps {
  serverName: string;
  tools: TPlugin[];
  onRemoveTool: (pluginKey: string) => void;
  onRemoveGroup: () => void;
}

function AgentToolGroup({ serverName, tools, onRemoveTool, onRemoveGroup }: AgentToolGroupProps) {
  const localize = useLocalize();
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mb-2 rounded-md border border-border-medium">
      <div 
        className="flex cursor-pointer items-center justify-between bg-surface-hover p-2 hover:bg-surface-active"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? 
            <ChevronDown className="h-4 w-4 text-text-secondary" /> : 
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          }
          <span className="font-medium text-text-primary">{serverName}</span>
          <span className="text-sm text-text-tertiary">
            ({tools.length} {localize('com_ui_tools')})
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveGroup();
          }}
          className="rounded p-1 hover:bg-surface-danger hover:text-text-danger"
          aria-label={localize('com_ui_remove_all')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {isExpanded && (
        <div className="border-t border-border-medium p-2">
          {tools.map(tool => (
            <AgentTool
              key={tool.pluginKey}
              tool={tool}
              onRemove={() => onRemoveTool(tool.pluginKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentToolGroup;
```

## 5. Modified Agent Tool Panel Component

This is an updated version of the AgentTool panel to support both individual tools and grouped tools.

```tsx
// Modified AgentPanel.tsx (partial)
function AgentToolsSection({ agent, updateAgent }) {
  const { data: availableTools } = useAvailableToolsQuery(EModelEndpoint.agents);
  const [toolSelectOpen, setToolSelectOpen] = useState(false);
  
  // Group tools by MCP server
  const toolGroups = useMemo(() => {
    if (!agent.tools || !availableTools) return {};
    
    const groups: Record<string, TPlugin[]> = {};
    
    // Find all selected tools that are MCP tools
    agent.tools.forEach((toolKey: string) => {
      const tool = availableTools.find(t => t.pluginKey === toolKey);
      if (!tool) return;
      
      // Check if it's an MCP tool
      if (tool.pluginKey.includes(CONSTANTS.mcp_delimiter)) {
        const parts = tool.pluginKey.split(CONSTANTS.mcp_delimiter);
        const serverName = parts[parts.length - 1];
        
        if (!groups[serverName]) {
          groups[serverName] = [];
        }
        
        groups[serverName].push(tool);
      }
    });
    
    return groups;
  }, [agent.tools, availableTools]);
  
  // Get non-MCP tools
  const individualTools = useMemo(() => {
    if (!agent.tools || !availableTools) return [];
    
    return agent.tools
      .filter((toolKey: string) => {
        const tool = availableTools.find(t => t.pluginKey === toolKey);
        return tool && !tool.pluginKey.includes(CONSTANTS.mcp_delimiter);
      })
      .map((toolKey: string) => {
        return availableTools.find(t => t.pluginKey === toolKey);
      })
      .filter(Boolean);
  }, [agent.tools, availableTools]);
  
  const removeGroup = (serverName: string) => {
    // Remove all tools from this MCP server
    const toolKeysToRemove = toolGroups[serverName].map(tool => tool.pluginKey);
    updateAgent({
      ...agent,
      tools: agent.tools.filter((key: string) => !toolKeysToRemove.includes(key))
    });
  };
  
  const removeTool = (toolKey: string) => {
    updateAgent({
      ...agent,
      tools: agent.tools.filter((key: string) => key !== toolKey)
    });
  };
  
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-md font-medium text-text-primary">
          {localize('com_ui_tools')}
        </h3>
        <button
          onClick={() => setToolSelectOpen(true)}
          className="btn btn-sm btn-primary"
        >
          {localize('com_ui_add_tools')}
        </button>
      </div>
      
      {/* MCP Server Tool Groups */}
      {Object.entries(toolGroups).map(([serverName, tools]) => (
        <AgentToolGroup
          key={serverName}
          serverName={serverName}
          tools={tools}
          onRemoveTool={removeTool}
          onRemoveGroup={() => removeGroup(serverName)}
        />
      ))}
      
      {/* Individual Tools */}
      {individualTools.map(tool => (
        <AgentTool
          key={tool.pluginKey}
          tool={tool}
          onRemove={() => removeTool(tool.pluginKey)}
        />
      ))}
      
      {/* Tool Select Dialog */}
      <ToolSelectDialog
        isOpen={toolSelectOpen}
        setIsOpen={setToolSelectOpen}
        endpoint={EModelEndpoint.agents}
        toolsFormKey="tools"
      />
    </div>
  );
}
```

## 6. Data Processing for Server Grouping

This logic will group MCP tools by server during the data fetching process.

```tsx
// Enhanced useAvailableToolsQuery implementation or wrapper
export const useGroupedToolsQuery = (endpoint: AssistantsEndpoint | EModelEndpoint.agents) => {
  const { data: allTools, ...queryResult } = useAvailableToolsQuery(endpoint);
  
  const groupedData = useMemo(() => {
    if (!allTools) return { mcpServers: [], regularTools: [] };
    
    const regularTools: TPlugin[] = [];
    const mcpServerMap: Record<string, { 
      serverName: string;
      description: string;
      icon?: string;
      tools: TPlugin[];
      helperTools: TPlugin[];
    }> = {};
    
    // Process all tools
    allTools.forEach(tool => {
      // Check if it's an MCP tool
      if (tool.pluginKey.includes(CONSTANTS.mcp_delimiter)) {
        const parts = tool.pluginKey.split(CONSTANTS.mcp_delimiter);
        const serverName = parts[parts.length - 1];
        const isHelperTool = tool.pluginKey.toLowerCase().includes('composio_check') || 
                             tool.pluginKey.toLowerCase().includes('composio_initiate') ||
                             tool.pluginKey.toLowerCase().includes('helper');
        
        // Initialize server entry if needed
        if (!mcpServerMap[serverName]) {
          mcpServerMap[serverName] = {
            serverName,
            description: `${serverName} MCP Server`,
            tools: [],
            helperTools: [],
            icon: tool.icon, // All tools from same server should have same icon
          };
        }
        
        // Add to appropriate category
        if (isHelperTool) {
          mcpServerMap[serverName].helperTools.push(tool);
        } else {
          mcpServerMap[serverName].tools.push(tool);
        }
      } else {
        // Regular non-MCP tool
        regularTools.push(tool);
      }
    });
    
    return {
      mcpServers: Object.values(mcpServerMap),
      regularTools
    };
  }, [allTools]);
  
  return {
    ...queryResult,
    data: groupedData,
  };
};
```

These component mockups provide a comprehensive view of how the new UI for Composio MCP integration will look and function. The design emphasizes grouping tools by server, providing a cleaner user experience, and simplifying the process of adding related tools.