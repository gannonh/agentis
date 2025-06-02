import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useLocalize } from '~/hooks';
import {
  Switch,
  HoverCard,
  HoverCardPortal,
  HoverCardContent,
  HoverCardTrigger,
} from '~/components/ui';
import { CircleHelpIcon } from '~/components/svg';
import { ESide } from '~/common';
import type { AgentForm } from '~/common';

export default function FeaturedToggle() {
  const { setValue, watch } = useFormContext<AgentForm>();
  const localize = useLocalize();

  const featured = watch('featured') ?? false;

  const handleToggle = (value: boolean) => {
    setValue('featured', value, { shouldDirty: true });
  };

  return (
    <div className="mb-4">
      <HoverCard openDelay={50}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div>{localize('com_agents_featured')}</div>
            <HoverCardTrigger>
              <CircleHelpIcon className="h-4 w-4 text-text-tertiary" />
            </HoverCardTrigger>
          </div>
          <HoverCardPortal>
            <HoverCardContent side={ESide.Top} className="w-80">
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  {localize('com_agents_featured_description')}
                </p>
              </div>
            </HoverCardContent>
          </HoverCardPortal>
          <Switch
            id="featured-toggle"
            checked={featured}
            onCheckedChange={handleToggle}
            className="ml-4"
            data-testid="featured-toggle"
          />
        </div>
      </HoverCard>
    </div>
  );
}
