import React from 'react';
import { Agent } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { getIconKey } from '~/utils';
import { icons } from '~/hooks/Endpoint/Icons';

interface AgentCTAProps {
  agent: Agent;
  onStartChat: (agent: Agent) => void;
}

const toolIcons: Record<string, React.FC<{ className?: string }>> = {
  execute_code: ({ className }) => (
    <div className={className} data-testid="tool-icon-execute_code">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
      </svg>
    </div>
  ),
  file_search: ({ className }) => (
    <div className={className} data-testid="tool-icon-file_search">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      </svg>
    </div>
  ),
};

export default function AgentCTA({ agent, onStartChat }: AgentCTAProps) {
  const localize = useLocalize();

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

  const tools = agent.tools || [];

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Start chat with ${agentName}`}
      className="group w-full rounded-lg border border-gray-200 bg-white p-4 text-center transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
    >
      <div className="flex flex-col items-center space-y-3">
        {/* Row 1: Tool Icons */}
        <div className="flex items-center justify-center">
          {tools.length > 0 ? (
            <div className="flex items-center gap-1">
              {/* Display up to 3 tool icons */}
              {tools.slice(0, 3).map((tool, index) => {
                const ToolIcon = toolIcons[tool];
                if (!ToolIcon) return null;
                
                return (
                  <div
                    key={tool}
                    className={`h-6 w-6 text-gray-600 dark:text-gray-300 ${
                      index > 0 ? '-ml-1' : ''
                    }`}
                    style={{ zIndex: 3 - index }}
                  >
                    <ToolIcon className="w-full h-full" />
                  </div>
                );
              })}
              
              {/* Show count if more than 3 tools */}
              {tools.length > 3 && (
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                  +{tools.length - 3}
                </span>
              )}
            </div>
          ) : (
            // Show a placeholder if no tools
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-600"></div>
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
      </div>
    </button>
  );
}
