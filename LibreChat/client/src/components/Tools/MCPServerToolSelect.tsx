import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { Check, X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import type { TPlugin } from 'librechat-data-provider';

interface MCPServerToolSelectProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  serverName: string;
  displayName?: string; // Display name for the server (optional)
  tools: TPlugin[];
  helperTools: TPlugin[];
  onConfirm: (selectedTools: string[]) => void;
}

/**
 * Secondary dialog that appears when a user clicks "Add" on an MCP server card.
 * Shows all available tools for that server with checkboxes for selection.
 */
function MCPServerToolSelect({
  isOpen,
  setIsOpen,
  serverName,
  displayName,
  tools,
  helperTools,
  onConfirm,
}: MCPServerToolSelectProps) {
  const localize = useLocalize();
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Compute helper tool keys only once when the component mounts
  // or when helperTools changes
  useEffect(() => {
    const helperToolKeys = helperTools.map(tool => tool.pluginKey);
    
    if (selectAll) {
      setSelectedTools([...helperToolKeys, ...tools.map(tool => tool.pluginKey)]);
    } else {
      setSelectedTools([...helperToolKeys]);
    }
  }, [selectAll, helperTools, tools]);

  const handleToggle = (pluginKey: string) => {
    // Make sure we don't remove helper tools (which should always be included)
    const helperToolKeys = helperTools.map(tool => tool.pluginKey);
    
    if (selectedTools.includes(pluginKey)) {
      // Only remove if it's not a helper tool
      if (!helperToolKeys.includes(pluginKey)) {
        setSelectedTools(selectedTools.filter(key => key !== pluginKey));
      }
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
                  {localize('com_ui_select_tools_for', { 0: displayName || serverName })}
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
            <div className="flex items-center justify-between px-2 py-4 border-b border-border-medium mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={() => setSelectAll(!selectAll)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {localize('com_ui_select_all_tools')}
              </label>
              <span className="text-xs text-text-tertiary font-medium">
                {tools.length} {localize('com_ui_tools')}
              </span>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {tools.map(tool => (
                <div
                  key={tool.pluginKey}
                  className="flex items-center justify-between rounded px-2 py-3 hover:bg-surface-hover transition-colors duration-150"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.pluginKey)}
                      onChange={() => handleToggle(tool.pluginKey)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">{tool.displayName || tool.name}</span>
                      <span className="text-xs text-text-secondary">{tool.description}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            
            {helperTools.length > 0 && (
              <div className="mt-4 rounded-md bg-blue-50 p-4 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-blue-500" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {localize('com_ui_helper_tools')} ({helperTools.length})
                    </h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                      <p>
                        {localize('com_ui_helper_tools_description')}
                      </p>
                    </div>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                      {helperTools.map(tool => tool.displayName || tool.name).join(', ')}
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