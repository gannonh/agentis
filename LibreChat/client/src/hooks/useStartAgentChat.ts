import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { Agent, EModelEndpoint } from 'librechat-data-provider';
import { useSetConvoContext } from '~/Providers';
import store from '~/store';

const useStartAgentChat = () => {
  const navigate = useNavigate();
  const { setConversation } = useSetConvoContext();
  const setSubmission = useSetRecoilState(store.submission);

  const startAgentChat = useCallback(
    (agent: Agent) => {
      // Create a new conversation configuration with the agent
      const newConversation = {
        conversationId: null,
        parentMessageId: null,
        messages: [],
        endpoint: EModelEndpoint.agents,
        agent_id: agent.id,
        model: agent.model,
        modelDisplayLabel: agent.name || 'Agent Chat',
        title: agent.name || 'New Agent Chat',
        // Add timestamp to make conversations unique
        createdAt: Date.now(),
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          instructions: agent.instructions,
          avatar: agent.avatar,
          provider: agent.provider,
          model: agent.model,
          tools: agent.tools,
          model_parameters: agent.model_parameters,
        },
        tools: agent.tools || [],
        // Spread agent model parameters into conversation
        ...(agent.model_parameters || {}),
      };

      // Set the conversation context
      setConversation(newConversation);

      // Clear any existing submission
      setSubmission({});

      // Navigate to new conversation with agent_id parameter
      navigate(`/c/new?agent_id=${agent.id}`);
    },
    [navigate, setConversation, setSubmission],
  );

  return startAgentChat;
};

export default useStartAgentChat;
