import React, { useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { actionDelimiter, actionDomainSeparator, Constants } from 'librechat-data-provider';
import type { TAttachment } from 'librechat-data-provider';
import useLocalize from '~/hooks/useLocalize';
import { useMCPServerConfig } from '~/hooks/useLibreChatConfig';
import ProgressCircle from './ProgressCircle';
import InProgressCall from './InProgressCall';
import Attachment from './Parts/Attachment';
import CancelledIcon from './CancelledIcon';
import ProgressText from './ProgressText';
import FinishedIcon from './FinishedIcon';
import ToolPopover from './ToolPopover';
import WrenchIcon from './WrenchIcon';
import { useProgress } from '~/hooks';
import { logger, getToolDisplayName } from '~/utils';

const radius = 56.08695652173913;
const circumference = 2 * Math.PI * radius;

export default function ToolCall({
  initialProgress = 0.1,
  isSubmitting,
  name,
  args: _args = '',
  output,
  attachments,
  auth,
}: {
  initialProgress: number;
  isSubmitting: boolean;
  name: string;
  args: string | Record<string, unknown>;
  output?: string | null;
  attachments?: TAttachment[];
  auth?: string;
  expires_at?: number;
}) {
  const localize = useLocalize();
  const { function_name, domain, isMCPToolCall } = useMemo(() => {
    if (typeof name !== 'string') {
      return { function_name: '', domain: null, isMCPToolCall: false };
    }

    if (name.includes(Constants.mcp_delimiter)) {
      const [func, server] = name.split(Constants.mcp_delimiter);
      return {
        function_name: func || '',
        domain: server && (server.replaceAll(actionDomainSeparator, '.') || null),
        isMCPToolCall: true,
      };
    }

    const [func, _domain] = name.includes(actionDelimiter)
      ? name.split(actionDelimiter)
      : [name, ''];
    return {
      function_name: func || '',
      domain: _domain && (_domain.replaceAll(actionDomainSeparator, '.') || null),
      isMCPToolCall: false,
    };
  }, [name]);

  // Get MCP server config if this is an MCP tool
  const mcpServerConfig = useMCPServerConfig(isMCPToolCall ? domain : null);

  // DEBUG: Show debug info when localStorage flag is set
  // To enable: localStorage.setItem('debug-tool-display-names', 'true')
  // To disable: localStorage.removeItem('debug-tool-display-names')
  const debugValue =
    typeof window !== 'undefined' ? localStorage.getItem('debug-tool-display-names') : null;
  const isDebugEnabled = debugValue === 'true';

  const debugInfo =
    isMCPToolCall && isDebugEnabled
      ? {
          function_name,
          domain,
          mcpServerConfig: mcpServerConfig
            ? {
                name: mcpServerConfig.name,
                toolDisplayNames: mcpServerConfig.toolDisplayNames,
              }
            : null,
          name,
          displayNameResult: mcpServerConfig
            ? getToolDisplayName(function_name, domain || undefined, mcpServerConfig)
            : 'no-config',
        }
      : null;

  const error =
    typeof output === 'string' && output.toLowerCase().includes('error processing tool');

  const args = useMemo(() => {
    if (typeof _args === 'string') {
      return _args;
    }

    try {
      return JSON.stringify(_args, null, 2);
    } catch (e) {
      logger.error(
        'client/src/components/Chat/Messages/Content/ToolCall.tsx - Failed to stringify args',
        e,
      );
      return '';
    }
  }, [_args]) as string | undefined;

  const hasInfo = useMemo(
    () => (args?.length ?? 0) > 0 || (output?.length ?? 0) > 0,
    [args, output],
  );

  const authDomain = useMemo(() => {
    const authURL = auth ?? '';
    if (!authURL) {
      return '';
    }
    try {
      const url = new URL(authURL);
      return url.hostname;
    } catch (e) {
      return '';
    }
  }, [auth]);

  const progress = useProgress(error === true ? 1 : initialProgress);
  const cancelled = (!isSubmitting && progress < 1) || error === true;
  const offset = circumference - progress * circumference;

  const renderIcon = () => {
    if (progress < 1 && authDomain.length > 0) {
      return (
        <div
          className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-full bg-transparent text-text-secondary"
          style={{ opacity: 1, transform: 'none' }}
          data-projection-id="849"
        >
          <div>{React.createElement(ShieldCheck as any)}</div>
        </div>
      );
    } else if (progress < 1) {
      return (
        <InProgressCall progress={progress} isSubmitting={isSubmitting} error={error}>
          <div
            className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-full bg-transparent text-white"
            style={{ opacity: 1, transform: 'none' }}
            data-projection-id="849"
          >
            <div>
              <WrenchIcon />
            </div>
            <ProgressCircle radius={radius} circumference={circumference} offset={offset} />
          </div>
        </InProgressCall>
      );
    }

    return cancelled ? <CancelledIcon /> : <FinishedIcon />;
  };

  const getFinishedText = () => {
    if (cancelled) {
      return localize('com_ui_error');
    }

    // Get a user-friendly display name for the tool
    let displayName = function_name;

    if (isMCPToolCall === true) {
      // For MCP tools, use our enhanced display name utility with config
      displayName = getToolDisplayName(function_name, domain || undefined, mcpServerConfig);
      return localize('com_assistants_completed_function', { 0: displayName });
    }

    if (domain != null && domain && domain.length !== Constants.ENCODED_DOMAIN_LENGTH) {
      return localize('com_assistants_completed_action', { 0: domain });
    }

    // For all other tools (including agent tools), try to get the display name
    displayName = getToolDisplayName(function_name, domain || undefined, mcpServerConfig);
    return localize('com_assistants_completed_function', { 0: displayName });
  };

  return (
    // @ts-ignore - React type mismatch between different versions
    <Popover.Root>
      <div className="my-2.5 flex flex-wrap items-center gap-2.5">
        <div className="flex w-full items-center gap-2.5">
          <div className="relative h-5 w-5 shrink-0">{renderIcon()}</div>
          <ProgressText
            progress={cancelled ? 1 : progress}
            inProgressText={
              isMCPToolCall
                ? localize('com_assistants_running_function', {
                    0: getToolDisplayName(function_name, domain || undefined, mcpServerConfig),
                  })
                : localize('com_assistants_running_action')
            }
            authText={
              !cancelled && authDomain.length > 0 ? localize('com_ui_requires_auth') : undefined
            }
            finishedText={getFinishedText()}
            hasInput={hasInfo}
            popover={true}
          />
          {hasInfo && (
            <ToolPopover
              input={args ?? ''}
              output={output}
              domain={authDomain || (domain ?? '')}
              function_name={function_name}
              pendingAuth={authDomain.length > 0 && !cancelled && progress < 1}
            />
          )}
        </div>
        {auth != null && auth && progress < 1 && !cancelled && (
          <div className="flex w-full flex-col gap-2.5">
            <div className="mb-1 mt-2">
              <a
                className="inline-flex items-center justify-center gap-2 rounded-3xl bg-surface-tertiary px-4 py-2 text-sm font-medium hover:bg-surface-hover"
                href={auth}
                target="_blank"
                rel="noopener noreferrer"
              >
                {localize('com_ui_sign_in_to_domain', { 0: authDomain })}
              </a>
            </div>
            <p className="flex items-center text-xs text-text-secondary">
              {React.createElement(TriangleAlert as any, {
                className: 'mr-1.5 inline-block h-4 w-4',
              })}
              {localize('com_assistants_allow_sites_you_trust')}
            </p>
          </div>
        )}
      </div>
      {attachments?.map((attachment, index) => <Attachment attachment={attachment} key={index} />)}

      {/* DEBUG: Display debug info on screen */}
      {debugInfo && (
        <div className="mt-2 rounded-lg border border-yellow-300 bg-yellow-100 p-3 font-mono text-xs text-yellow-800">
          <div className="mb-2 font-bold text-yellow-900">🐛 TOOL DEBUG:</div>
          <div>
            <strong>function_name:</strong> {debugInfo.function_name}
          </div>
          <div>
            <strong>domain:</strong> {debugInfo.domain || 'null'}
          </div>
          <div>
            <strong>name:</strong> {debugInfo.name}
          </div>
          <div>
            <strong>mcpServerConfig:</strong> {debugInfo.mcpServerConfig ? 'LOADED' : 'NULL'}
          </div>
          <div>
            <strong>displayNameResult:</strong> {debugInfo.displayNameResult}
          </div>
          {debugInfo.mcpServerConfig && (
            <div className="ml-4 mt-1">
              <div>
                <strong>config.name:</strong> {debugInfo.mcpServerConfig.name}
              </div>
              <div>
                <strong>toolDisplayNames:</strong>{' '}
                {JSON.stringify(debugInfo.mcpServerConfig.toolDisplayNames, null, 2)}
              </div>
            </div>
          )}
        </div>
      )}
    </Popover.Root>
  );
}
