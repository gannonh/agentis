import React from 'react';
import { Agent, EModelEndpoint, TPlugin } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { useAvailableToolsQuery } from '~/data-provider';
import { Wrench } from 'lucide-react';

interface AgentCTAProps {
  agent: Agent;
  onStartChat: (agent: Agent) => void;
}

export default function AgentCTA({ agent, onStartChat }: AgentCTAProps) {
  const localize = useLocalize();
  const { data: allTools = [] } = useAvailableToolsQuery(EModelEndpoint.agents);

  // Don't render if agent is not featured
  if (!agent.featured) {
    return null;
  }

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('AgentCTA clicked:', agent.name, agent.id);
    onStartChat(agent);
  };

  const agentName = agent.name || 'Unnamed Agent';
  const description = agent.description || '';
  const truncatedDescription =
    description.length > 120 ? description.substring(0, 120) + '...' : description;

  const toolKeys = agent.tools || [];
  
  // Get actual tool objects with icons - SIMPLE approach
  const agentTools = toolKeys
    .map(toolKey => allTools.find(tool => tool.pluginKey === toolKey || tool.name === toolKey))
    .filter((tool): tool is TPlugin => Boolean(tool));
    
  // Deduplicate by icon - only show unique icons
  const uniqueTools = agentTools.reduce((acc: TPlugin[], tool: TPlugin) => {
    if (!tool.icon) return acc;
    
    const existingTool = acc.find(t => t.icon === tool.icon);
    if (!existingTool) {
      acc.push(tool);
    }
    return acc;
  }, []);
  
  // Debug removed for production

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Start chat with ${agentName}`}
      className="group w-full rounded-lg border border-gray-200 bg-white p-4 text-center transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
    >
      <div className="flex flex-col items-center space-y-3">
        {/* Row 1: Tool Icons - Copy exact pattern from tools picker */}
        <div className="flex items-center justify-center">
          {uniqueTools.length > 0 ? (
            <div className="flex items-center gap-1">
              {/* Display up to 3 unique tool icons */}
              {uniqueTools.slice(0, 3).map((tool, index) => (
                <div
                  key={tool.pluginKey || tool.name}
                  className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-md ${
                    index > 0 ? '-ml-1' : ''
                  }`}
                  style={{ zIndex: 3 - index }}
                >
                  {tool.icon ? (
                    <img
                      src={tool.icon}
                      alt={tool.name}
                      className="h-full w-full rounded-md object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-md bg-gray-200 dark:bg-gray-600">
                      <Wrench className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Show a placeholder if no tools
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-200 dark:bg-gray-600">
              <Wrench className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </div>
          )}
        </div>

        {/* Row 2: Agent Name */}
        <h3 className="font-medium text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
          {agentName}
        </h3>

        {/* Row 3: Description */}
        {truncatedDescription && (
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
            {truncatedDescription}
          </p>
        )}

        {/* Row 4: Tool Count (if more than 3 tools) */}
        {agentTools.length > 3 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            +{agentTools.length - 3} more tools
          </span>
        )}
      </div>
    </button>
  );
}
