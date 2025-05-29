import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useWatch, useFormContext } from 'react-hook-form';
import { QueryKeys, EModelEndpoint, AgentCapabilities } from 'librechat-data-provider';
import type { TPlugin } from 'librechat-data-provider';
import { useAvailableAgentToolsQuery } from '~/data-provider';
import type { AgentForm, AgentPanelProps, IconComponentTypes } from '~/common';
import { cn, defaultTextProps, removeFocusOutlines, getEndpointField, getIconKey } from '~/utils';
import { useToastContext, useFileMapContext } from '~/Providers';
import Action from '~/components/SidePanel/Builder/Action';
import { ToolSelectDialog } from '~/components/Tools';
import { icons } from '~/hooks/Endpoint/Icons';
import { processAgentOption, groupAgentToolsByServer, getToolDisplayName } from '~/utils';
import { Spinner } from '~/components/svg';
import Instructions from './Instructions';
import AgentAvatar from './AgentAvatar';
import FileContext from './FileContext';
import FileSearch from './FileSearch';
import Artifacts from './Artifacts';
import AgentTool from './AgentTool';
import AgentToolGroup from './AgentToolGroup';
import CodeForm from './Code/Form';
import { useLocalize } from '~/hooks';
import { Panel } from '~/common';

const labelClass = 'mb-2 text-token-text-primary block font-medium';
const inputClass = cn(
  defaultTextProps,
  'flex w-full px-3 py-2 border-border-light bg-surface-secondary focus-visible:ring-2 focus-visible:ring-ring-primary',
  removeFocusOutlines,
);

export default function AgentConfig({
  setAction,
  actions = [],
  agentsConfig,
  createMutation,
  setActivePanel,
  endpointsConfig,
}: AgentPanelProps) {
  const fileMap = useFileMapContext();
  const queryClient = useQueryClient();

  const { data: allToolsData, isLoading: toolsLoading } = useAvailableAgentToolsQuery();
  const allTools = useMemo(() => allToolsData ?? [], [allToolsData]);
  const { showToast } = useToastContext();
  const localize = useLocalize();

  const [showToolDialog, setShowToolDialog] = useState(false);

  const methods = useFormContext<AgentForm>();

  const { control } = methods;
  const provider = useWatch({ control, name: 'provider' });
  const model = useWatch({ control, name: 'model' });
  const agent = useWatch({ control, name: 'agent' });
  const tools = useWatch({ control, name: 'tools' });
  const agent_id = useWatch({ control, name: 'id' });

  const toolsEnabled = useMemo(
    () => agentsConfig?.capabilities?.includes(AgentCapabilities.tools) ?? false,
    [agentsConfig],
  );
  const actionsEnabled = useMemo(
    () => agentsConfig?.capabilities?.includes(AgentCapabilities.actions) ?? false,
    [agentsConfig],
  );
  const artifactsEnabled = useMemo(
    () => agentsConfig?.capabilities?.includes(AgentCapabilities.artifacts) ?? false,
    [agentsConfig],
  );
  const ocrEnabled = useMemo(
    () => agentsConfig?.capabilities?.includes(AgentCapabilities.ocr) ?? false,
    [agentsConfig],
  );
  const fileSearchEnabled = useMemo(
    () => agentsConfig?.capabilities?.includes(AgentCapabilities.file_search) ?? false,
    [agentsConfig],
  );
  const codeEnabled = useMemo(
    () => agentsConfig?.capabilities?.includes(AgentCapabilities.execute_code) ?? false,
    [agentsConfig],
  );

  const context_files = useMemo(() => {
    if (typeof agent === 'string') {
      return [];
    }

    if (agent?.id !== agent_id) {
      return [];
    }

    if (agent.context_files) {
      return agent.context_files;
    }

    const _agent = processAgentOption({
      agent,
      fileMap,
    });
    return _agent.context_files ?? [];
  }, [agent, agent_id, fileMap]);

  const knowledge_files = useMemo(() => {
    if (typeof agent === 'string') {
      return [];
    }

    if (agent?.id !== agent_id) {
      return [];
    }

    if (agent.knowledge_files) {
      return agent.knowledge_files;
    }

    const _agent = processAgentOption({
      agent,
      fileMap,
    });
    return _agent.knowledge_files ?? [];
  }, [agent, agent_id, fileMap]);

  const code_files = useMemo(() => {
    if (typeof agent === 'string') {
      return [];
    }

    if (agent?.id !== agent_id) {
      return [];
    }

    if (agent.code_files) {
      return agent.code_files;
    }

    const _agent = processAgentOption({
      agent,
      fileMap,
    });
    return _agent.code_files ?? [];
  }, [agent, agent_id, fileMap]);

  const handleAddActions = useCallback(() => {
    if (!agent_id) {
      showToast({
        message: localize('com_assistants_actions_disabled'),
        status: 'warning',
      });
      return;
    }
    setActivePanel(Panel.actions);
  }, [agent_id, setActivePanel, showToast, localize]);

  // Group tools by MCP server
  const { mcpServerGroups, individualTools } = useMemo(() => {
    return groupAgentToolsByServer(tools, allTools);
  }, [tools, allTools]);

  // Function to remove a tool
  const removeTool = useCallback(
    (toolKey: string) => {
      if (toolKey) {
        const newTools = (tools || []).filter((t) => t !== toolKey);
        methods.setValue('tools', newTools);
      }
    },
    [tools, methods],
  );

  // Function to remove a group of tools
  const removeServerGroup = useCallback(
    (serverName: string) => {
      if (serverName && mcpServerGroups[serverName]) {
        const toolsToRemove = mcpServerGroups[serverName].map((t) => t.pluginKey);
        const newTools = (tools || []).filter((t) => !toolsToRemove.includes(t));
        methods.setValue('tools', newTools);
      }
    },
    [mcpServerGroups, tools, methods],
  );

  const providerValue = typeof provider === 'string' ? provider : provider?.value;
  let Icon: IconComponentTypes | null | undefined;
  let endpointType: EModelEndpoint | undefined;
  let endpointIconURL: string | undefined;
  let iconKey: string | undefined;

  if (providerValue !== undefined) {
    endpointType = getEndpointField(endpointsConfig, providerValue as string, 'type');
    endpointIconURL = getEndpointField(endpointsConfig, providerValue as string, 'iconURL');
    iconKey = getIconKey({
      endpoint: providerValue as string,
      endpointsConfig,
      endpointType,
      endpointIconURL,
    });
    Icon = icons[iconKey];
  }

  return (
    <>
      <div className="h-auto bg-white px-4 pt-3 dark:bg-transparent">
        {/* Avatar & Name */}
        <div className="mb-4">
          <AgentAvatar
            agent_id={agent_id}
            createMutation={createMutation}
            avatar={agent?.['avatar'] ?? null}
          />
          <label className={labelClass} htmlFor="name">
            {localize('com_ui_name')}
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                value={field.value ?? ''}
                maxLength={256}
                className={inputClass}
                id="name"
                type="text"
                placeholder={localize('com_agents_name_placeholder')}
                aria-label="Agent name"
              />
            )}
          />
          <Controller
            name="id"
            control={control}
            render={({ field }) => (
              <p className="h-3 text-xs italic text-text-secondary" aria-live="polite">
                {field.value}
              </p>
            )}
          />
        </div>
        {/* Description */}
        <div className="mb-4">
          <label className={labelClass} htmlFor="description">
            {localize('com_ui_description')}
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                value={field.value ?? ''}
                maxLength={512}
                className={inputClass}
                id="description"
                type="text"
                placeholder={localize('com_agents_description_placeholder')}
                aria-label="Agent description"
              />
            )}
          />
        </div>
        {/* Instructions */}
        <Instructions />
        {/* Model and Provider */}
        <div className="mb-4">
          <label className={labelClass} htmlFor="provider">
            {localize('com_ui_model')} <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setActivePanel(Panel.model)}
            className="btn btn-neutral border-token-border-light relative h-10 w-full rounded-lg font-medium"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <div className="flex w-full items-center gap-2">
              {Icon && (
                <div className="shadow-stroke relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-black dark:bg-white">
                  <Icon
                    className="h-2/3 w-2/3"
                    endpoint={providerValue as string}
                    endpointType={endpointType}
                    iconURL={endpointIconURL}
                  />
                </div>
              )}
              <span>{model != null && model ? model : localize('com_ui_select_model')}</span>
            </div>
          </button>
        </div>
        {(codeEnabled || fileSearchEnabled || artifactsEnabled || ocrEnabled) && (
          <div className="mb-4 flex w-full flex-col items-start gap-3">
            <label className="text-token-text-primary block font-medium">
              {localize('com_assistants_capabilities')}
            </label>
            {/* Code Execution */}
            {codeEnabled && <CodeForm agent_id={agent_id} files={code_files} />}
            {/* File Context (OCR) */}
            {ocrEnabled && <FileContext agent_id={agent_id} files={context_files} />}
            {/* Artifacts */}
            {artifactsEnabled && <Artifacts />}
            {/* File Search */}
            {fileSearchEnabled && <FileSearch agent_id={agent_id} files={knowledge_files} />}
          </div>
        )}
        {/* Agent Tools & Actions */}
        <div className="mb-4">
          <label className={labelClass}>
            {`${toolsEnabled === true ? localize('com_ui_tools') : ''}
              ${toolsEnabled === true && actionsEnabled === true ? ' + ' : ''}
              ${actionsEnabled === true ? localize('com_assistants_actions') : ''}`}
          </label>
          <div className="space-y-2">
            {/* Loading spinner for tools */}
            {toolsLoading && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Spinner size="1.2em" />
                <span className="text-text-secondary">{localize('com_ui_loading')}</span>
              </div>
            )}

            {/* MCP Server Tool Groups */}
            {!toolsLoading &&
              Object.entries(mcpServerGroups).map(([serverName, serverTools]) => (
                <AgentToolGroup
                  key={`group-${serverName}`}
                  serverName={serverName}
                  tools={serverTools}
                  allTools={allTools}
                  agent_id={agent_id}
                  onRemoveTool={removeTool}
                  onRemoveGroup={() => removeServerGroup(serverName)}
                />
              ))}

            {/* Individual Tools */}
            {!toolsLoading &&
              individualTools.map((tool) => {
                // Add display name enhancement to individual tools
                const enhancedTool = {
                  ...tool,
                  // If it's an MCP tool, extract the server name and apply formatting
                  displayName: tool.pluginKey.includes('_mcp_')
                    ? (() => {
                        const parts = tool.pluginKey.split('_mcp_');
                        const serverName = parts[parts.length - 1];
                        // Extract the actual tool name from the plugin key if possible
                        let toolName = tool.name || tool.pluginKey;

                        // For Composio tools, the tool name is often in the format SERVERTYPE_TOOLACTION
                        // Extract this from the pluginKey if needed
                        if (
                          tool.pluginKey.includes('COMPOSIO_') ||
                          tool.pluginKey.includes(`${serverName.toUpperCase()}_`)
                        ) {
                          const keyParts = tool.pluginKey.split('_mcp_')[0].split('_');
                          // Get the last part if it's a simple key, or reconstruct the tool name
                          // for more complex keys
                          if (keyParts.length > 1) {
                            // Join all parts except the last one (which is often 'plugin')
                            toolName = keyParts.join('_');
                          }
                        }

                        return getToolDisplayName(toolName, serverName);
                      })()
                    : tool.name,
                };

                // Add the enhanced tool to allTools array so it can be found by the AgentTool component
                const enhancedAllTools = [...allTools];
                const toolIndex = enhancedAllTools.findIndex((t) => t.pluginKey === tool.pluginKey);
                if (toolIndex >= 0) {
                  enhancedAllTools[toolIndex] = enhancedTool;
                }

                return (
                  <AgentTool
                    key={`tool-${tool.pluginKey}`}
                    tool={enhancedTool} // Pass the entire enhanced tool object
                    allTools={enhancedAllTools}
                    agent_id={agent_id}
                  />
                );
              })}

            {/* Actions */}
            {!toolsLoading &&
              actions
                .filter((action) => action.agent_id === agent_id)
                .map((action, i) => (
                  <Action
                    key={i}
                    action={action}
                    onClick={() => {
                      setAction(action);
                      setActivePanel(Panel.actions);
                    }}
                  />
                ))}
            {!toolsLoading && (
              <div className="flex space-x-2">
                {(toolsEnabled ?? false) && (
                  <button
                    type="button"
                    onClick={() => setShowToolDialog(true)}
                    className="btn btn-neutral border-token-border-light relative h-9 w-full rounded-lg font-medium"
                    aria-haspopup="dialog"
                  >
                    <div className="flex w-full items-center justify-center gap-2">
                      {localize('com_assistants_add_tools')}
                    </div>
                  </button>
                )}
                {(actionsEnabled ?? false) && (
                  <button
                    type="button"
                    disabled={!agent_id}
                    onClick={handleAddActions}
                    className="btn btn-neutral border-token-border-light relative h-9 w-full rounded-lg font-medium"
                    aria-haspopup="dialog"
                  >
                    <div className="flex w-full items-center justify-center gap-2">
                      {localize('com_assistants_add_actions')}
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ToolSelectDialog
        isOpen={showToolDialog}
        setIsOpen={setShowToolDialog}
        toolsFormKey="tools"
        endpoint={EModelEndpoint.agents}
      />
    </>
  );
}
