/**
 * ProactiveMCPAuth component that displays authentication buttons
 * after the first user message when agents have MCP tools requiring auth
 */

import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import type { TMessage } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { useAgentsMapContext } from '~/Providers/AgentsMapContext';
import { useChatContext } from '~/Providers/ChatContext';
import ComposioAuthButton from '~/components/Composio/ComposioAuthButton';
import { 
  getConversationAuthServices, 
  shouldShowAuthUI 
} from '~/utils/mcpAuth';
import { useAvailableAgentToolsQuery } from '~/data-provider/Agents/queries';
import store from '~/store';
import { ephemeralAgentByConvoId } from '~/store/agents';

interface ProactiveMCPAuthProps {
  messages: TMessage[];
  conversationId: string | null;
}

export default function ProactiveMCPAuth({ messages, conversationId }: ProactiveMCPAuthProps) {
  console.log('🔍 [ProactiveMCPAuth] COMPONENT RENDERED!', { messages: messages?.length, conversationId });
  
  const { isAuthenticated } = useAuthContext();
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const ephemeralAgent = useRecoilValue(ephemeralAgentByConvoId(conversationId || 'new'));
  
  const [authServices, setAuthServices] = useState<string[]>([]);
  const [shouldShow, setShouldShow] = useState(false);

  // Fetch all available tools/plugins
  const { data: allTools = [] } = useAvailableAgentToolsQuery();

  // Debug logging
  console.log('[ProactiveMCPAuth] Debug Info:', {
    conversationId,
    conversation,
    agentsMap,
    ephemeralAgent,
    allTools: allTools?.length || 0,
    messages: messages?.length || 0,
    isAuthenticated
  });

  useEffect(() => {
    // Get the agent - either from conversation agent_id or ephemeral state
    let agent = null;
    
    console.log('[ProactiveMCPAuth] Getting agent...', {
      agentId: conversation?.agent_id,
      hasAgentsMap: !!agentsMap,
      agentFromMap: conversation?.agent_id ? agentsMap?.[conversation.agent_id] : null,
      ephemeralAgent
    });
    
    if (conversation?.agent_id && agentsMap?.[conversation.agent_id]) {
      agent = agentsMap[conversation.agent_id];
      console.log('[ProactiveMCPAuth] Using agent from map:', agent);
    } else if (ephemeralAgent) {
      // For ephemeral agents, we need to construct a compatible agent object
      // Ephemeral agents store MCP server names directly
      agent = {
        tools: ephemeralAgent.mcp?.map(serverName => {
          // Find a tool from this server to get the proper tool key format
          const serverTool = allTools.find(tool => 
            tool.pluginKey && tool.pluginKey.endsWith(`_mcp_${serverName}`)
          );
          // Return a representative tool key for auth detection
          return serverTool?.pluginKey || `placeholder_mcp_${serverName}`;
        }) || []
      };
      console.log('[ProactiveMCPAuth] Using ephemeral agent:', agent);
    }

    // Detect auth services
    const services = getConversationAuthServices(conversation, agent, allTools);
    console.log('[ProactiveMCPAuth] Detected auth services:', services);
    setAuthServices(services);

    // Determine if we should show the auth UI
    const show = shouldShowAuthUI(messages, services);
    console.log('[ProactiveMCPAuth] Should show auth UI:', show, {
      messagesLength: messages?.length,
      userMessages: messages?.filter(m => m.role === 'user').length,
      assistantMessages: messages?.filter(m => m.role === 'assistant').length,
      servicesLength: services.length
    });
    setShouldShow(show);
  }, [conversation, agentsMap, ephemeralAgent, messages, allTools]);

  if (!shouldShow || authServices.length === 0) {
    console.log('🚫 [ProactiveMCPAuth] NOT SHOWING AUTH UI:', {
      shouldShow,
      authServicesLength: authServices.length,
      authServices,
      reason: !shouldShow ? 'shouldShow is false' : 'no auth services detected'
    });
    return null;
  }

  console.log('✅ [ProactiveMCPAuth] SHOWING AUTH UI!', { authServices });

  return (
    <div className="mx-auto max-w-3xl px-4 py-3">
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Authentication Required</span>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This conversation uses tools that require authentication:
          </p>
          
          <div className="flex flex-wrap gap-2">
            {authServices.map((service) => (
              <div key={service} className="max-w-xs">
                <ComposioAuthButton
                  service={service}
                  inline={true}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}