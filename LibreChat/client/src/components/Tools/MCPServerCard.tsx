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

/**
 * MCPServerCard component displays an MCP server as a card in the tool selection dialog.
 * When clicked, it opens a secondary dialog to select specific tools from the server.
 */
function MCPServerCard({ 
  serverName, 
  description, 
  icon, 
  tools, 
  onAddServer 
}: MCPServerCardProps) {
  const localize = useLocalize();
  
  return (
    <div className="flex flex-col gap-4 rounded border border-border-medium bg-transparent p-6 hover:border-border-hover transition-colors duration-200">
      <div className="flex gap-4">
        <div className="h-[70px] w-[70px] shrink-0">
          <div className="relative h-full w-full">
            {icon ? (
              <img
                src={icon}
                alt={localize('com_ui_logo', { 0: serverName })}
                className="h-full w-full rounded-[5px] bg-white object-contain p-1"
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
          <div className="mb-2 line-clamp-1 max-w-full text-lg font-medium leading-5 text-text-primary">
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
      <div className="text-xs text-text-tertiary font-medium">
        {localize('com_ui_tools_available', { 0: tools.length })}
      </div>
    </div>
  );
}

export default MCPServerCard;