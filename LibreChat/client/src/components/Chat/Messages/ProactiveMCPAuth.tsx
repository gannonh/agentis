/**
 * ProactiveMCPAuth component that displays authentication buttons
 * after the first user message when agents have MCP tools requiring auth
 */

import { useEffect, useState, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import type { TMessage } from 'librechat-data-provider';
import type { TAgentOption } from '~/common/agents-types';
import { useAuthContext } from '~/hooks';
import { useAgentsMapContext } from '~/Providers/AgentsMapContext';
import { useChatContext } from '~/Providers/ChatContext';
import ComposioAuthButton from '~/components/Composio/ComposioAuthButton';
import { getConversationAuthServices, shouldShowAuthUI } from '~/utils/mcpAuth';
import { useAvailableAgentToolsQuery } from '~/data-provider/Agents/queries';
import store from '~/store';
import { ephemeralAgentByConvoId } from '~/store/agents';

interface ProactiveMCPAuthProps {
  messages: TMessage[];
  conversationId: string | null;
}

export default function ProactiveMCPAuth({ messages, conversationId }: ProactiveMCPAuthProps) {
  // console.log('🔍 [ProactiveMCPAuth] COMPONENT RENDERED!', { messages: messages?.length, conversationId });

  const { isAuthenticated } = useAuthContext();
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const ephemeralAgent = useRecoilValue(ephemeralAgentByConvoId(conversationId || 'new'));

  // Fetch all available tools/plugins
  const { data: allTools = [] } = useAvailableAgentToolsQuery();

  // Memoize stable values to prevent unnecessary re-renders
  const agentId = conversation?.agent_id;
  const messagesLength = messages?.length || 0;

  // Memoize the agent object to prevent recreation on every render
  const agent = useMemo(() => {
    if (agentId && agentsMap?.[agentId]) {
      return agentsMap[agentId];
    } else if (ephemeralAgent) {
      // For ephemeral agents, we need to construct a compatible agent object
      return {
        tools:
          ephemeralAgent.mcp?.map((serverName) => {
            // Find a tool from this server to get the proper tool key format
            const serverTool = allTools.find(
              (tool) => tool.pluginKey && tool.pluginKey.endsWith(`_mcp_${serverName}`),
            );
            // Return a representative tool key for auth detection
            return serverTool?.pluginKey || `placeholder_mcp_${serverName}`;
          }) || [],
      };
    }
    return null;
  }, [agentId, agentsMap, ephemeralAgent, allTools]);

  // Memoize auth services detection
  const authServices = useMemo(() => {
    return getConversationAuthServices(
      conversation,
      agent as TAgentOption | null | undefined,
      allTools,
    );
  }, [conversation, agent, allTools]);

  // Memoize should show logic
  const shouldShow = useMemo(() => {
    return shouldShowAuthUI(messages as unknown as Array<{ role: string }>, authServices);
  }, [messages, authServices]);

  if (!shouldShow || authServices.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-3">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Authentication Required</span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              This conversation uses tools that require authentication:
            </p>

            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))` }}
            >
              {authServices.map((service) => (
                <ComposioAuthButton key={service} service={service} inline={true} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
