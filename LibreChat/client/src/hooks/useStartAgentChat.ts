import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { Agent, EModelEndpoint, Constants } from 'librechat-data-provider';
import store from '~/store';

const useStartAgentChat = () => {
  const navigate = useNavigate();
  const { setConversation } = store.useCreateConversationAtom(0);
  const setSubmission = useSetRecoilState(store.submission);

  const startAgentChat = useCallback(
    (agent: Agent) => {
      // Create a new conversation configuration with the agent
      const newConversation = {
        conversationId: null,
        parentMessageId: Constants.NO_PARENT as string,
        messages: [],
        endpoint: EModelEndpoint.agents,
        agent_id: agent.id,
        model: agent.model,
        modelDisplayLabel: agent.name || 'Agent Chat',
        title: agent.name || 'New Agent Chat',
        // Add timestamp to make conversations unique
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        // Spread agent model parameters into conversation, filtering out null values
        ...(agent.model_parameters
          ? Object.fromEntries(
              Object.entries(agent.model_parameters).map(([key, value]) => [
                key,
                value === null ? undefined : value,
              ]),
            )
          : {}),
      };

      // Set the conversation context
      setConversation(newConversation);

      // Clear any existing submission
      setSubmission(null);

      // Navigate to new conversation with agent_id parameter
      navigate(`/c/new?agent_id=${agent.id}`);
    },
    [navigate, setConversation, setSubmission],
  );

  return startAgentChat;
};

export default useStartAgentChat;
