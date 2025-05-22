import { useState } from 'react';
import { ChevronRight, ChevronDown, X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import AgentTool from './AgentTool';
import { getServerDisplayName, getToolDisplayName } from '~/utils/tools';
import type { TPlugin } from 'librechat-data-provider';

interface AgentToolGroupProps {
  serverName: string;
  tools: TPlugin[];
  allTools: TPlugin[];
  agent_id?: string;
  onRemoveTool: (pluginKey: string) => void;
  onRemoveGroup: () => void;
}

/**
 * AgentToolGroup component displays a collapsible group of tools
 * from the same MCP server in the Agent Builder.
 */
function AgentToolGroup({
  serverName,
  tools,
  allTools,
  agent_id = '',
  onRemoveTool,
  onRemoveGroup,
}: AgentToolGroupProps) {
  const localize = useLocalize();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="hover:border-border-hover mb-3 rounded-md border border-border-medium shadow-sm transition-all duration-200">
      <div
        className="flex cursor-pointer items-center justify-between bg-surface-hover p-3 transition-colors duration-200 hover:bg-surface-active"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          )}
          <span className="font-medium text-text-primary">{getServerDisplayName(serverName)}</span>
          <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-tertiary">
            {tools.length} {localize('com_ui_tools')}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveGroup();
          }}
          className="hover:bg-surface-danger hover:text-text-danger rounded p-1 transition-colors duration-150"
          aria-label={localize('com_ui_remove_all')}
          title={localize('com_ui_remove_all')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2 border-t border-border-medium bg-surface-primary p-3">
          {tools.map((tool) => {
            // Enhance the tool with a display name if needed
            if (!tool.displayName && tool.pluginKey) {
              // If it's an MCP tool, extract the server name and apply formatting
              if (tool.pluginKey.includes('_mcp_')) {
                const parts = tool.pluginKey.split('_mcp_');
                const toolServerName = parts[parts.length - 1];
                // For server tools, the tool name is often in a standard format
                const toolName = tool.name || tool.pluginKey.split('_mcp_')[0];
                tool = {
                  ...tool,
                  displayName: getToolDisplayName(toolName, toolServerName || serverName),
                };
              }
            }

            return (
              <AgentTool
                key={tool.pluginKey}
                tool={tool} // Pass the enhanced tool object
                allTools={allTools}
                agent_id={agent_id}
                onRemoveTool={() => onRemoveTool(tool.pluginKey)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AgentToolGroup;
