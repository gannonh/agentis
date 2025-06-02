import React, { useMemo } from 'react';
import { Agent } from 'librechat-data-provider';
import { useListAgentsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { Spinner } from '~/components/svg';
import AgentCTA from './AgentCTA';

interface AgentDiscoveryProps {
  onStartChat: (agent: Agent) => void;
}

export default function AgentDiscovery({ onStartChat }: AgentDiscoveryProps) {
  const localize = useLocalize();
  const { data: agentsData, isLoading, error } = useListAgentsQuery();

  const featuredAgents = useMemo(() => {
    if (!agentsData?.data) return [];

    return agentsData.data.filter((agent: Agent) => agent.featured === true).slice(0, 6); // Limit to 6 featured agents
  }, [agentsData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Spinner size="1.2em" />
        <span className="text-gray-600 dark:text-gray-400">{localize('com_ui_loading')}</span>
      </div>
    );
  }

  if (error || !featuredAgents.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">{localize('com_agents_no_featured')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          {localize('com_agents_discovery_title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {localize('com_agents_discovery_subtitle')}
        </p>
      </div>

      {/* Agent Grid */}
      <div
        data-testid="agent-discovery-grid"
        className="flex flex-wrap justify-center gap-4"
      >
        {featuredAgents.map((agent) => (
          <AgentCTA key={agent.id} agent={agent} onStartChat={onStartChat} />
        ))}
      </div>
    </div>
  );
}
