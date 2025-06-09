import { useState, useEffect, useMemo } from 'react';
import { EModelEndpoint } from 'librechat-data-provider';
import type { ActionsEndpoint } from '~/common';
import type { Action, TAgentsEndpoint, TEndpointsConfig } from 'librechat-data-provider';
import { useGetActionsQuery, useGetEndpointsQuery, useCreateAgentMutation } from '~/data-provider';
import { useChatContext, useToastContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import ActionsPanel from './ActionsPanel';
import AgentPanel from './AgentPanel';
import { Panel } from '~/common';

export default function AgentPanelSwitch() {
  const { conversation, index } = useChatContext();
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [activePanel, setActivePanel] = useState(Panel.builder);
  const [action, setAction] = useState<Action | undefined>(undefined);
  const [currentAgentId, setCurrentAgentId] = useState<string | undefined>(conversation?.agent_id);
  const { data: actions = [] } = useGetActionsQuery(conversation?.endpoint as ActionsEndpoint);
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const createMutation = useCreateAgentMutation({
    onSuccess: (data) => {
      setCurrentAgentId(data.id);
      showToast({
        message: `${localize('com_assistants_create_success')} ${
          data.name ?? localize('com_ui_agent')
        }`,
      });
    },
    onError: (err) => {
      const error = err as Error;
      showToast({
        message: `${localize('com_agents_create_error')}${
          error.message ? ` ${localize('com_ui_error')}: ${error.message}` : ''
        }`,
        status: 'error',
      });
    },
  });

  const agentsConfig = useMemo(
    () => (endpointsConfig?.[EModelEndpoint.agents] as TAgentsEndpoint | null) ?? null,
    [endpointsConfig],
  );

  useEffect(() => {
    const agent_id = conversation?.agent_id ?? '';
    if (agent_id) {
      setCurrentAgentId(agent_id);
    }
  }, [conversation?.agent_id]);

  if (!conversation?.endpoint) {
    return null;
  }

  const commonProps = {
    index,
    action,
    actions,
    setAction,
    activePanel,
    setActivePanel,
    setCurrentAgentId,
    agent_id: currentAgentId,
    createMutation,
  };

  if (activePanel === Panel.actions) {
    return <ActionsPanel {...commonProps} />;
  }

  return (
    <AgentPanel {...commonProps} agentsConfig={agentsConfig} endpointsConfig={endpointsConfig} />
  );
}
