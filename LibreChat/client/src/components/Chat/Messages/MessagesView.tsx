import { useState } from 'react';
import { useRecoilValue } from 'recoil';
import { CSSTransition } from 'react-transition-group';
import type { TMessage } from 'librechat-data-provider';
import { useScreenshot, useMessageScrolling, useLocalize } from '~/hooks';
import ScrollToBottom from '~/components/Messages/ScrollToBottom';
import MultiMessage from './MultiMessage';
import ProactiveMCPAuth from './ProactiveMCPAuth';
import { cn } from '~/utils';
import store from '~/store';

export default function MessagesView({
  messagesTree: _messagesTree,
}: {
  messagesTree?: TMessage[] | null;
}) {
  const localize = useLocalize();
  const fontSize = useRecoilValue(store.fontSize);
  const { screenshotTargetRef } = useScreenshot();
  const scrollButtonPreference = useRecoilValue(store.showScrollButton);
  const [currentEditId, setCurrentEditId] = useState<number | string | null>(-1);

  const {
    conversation,
    scrollableRef,
    messagesEndRef,
    showScrollButton,
    handleSmoothToRef,
    debouncedHandleScroll,
  } = useMessageScrolling(_messagesTree);

  const { conversationId } = conversation ?? {};

  // Helper function to determine if we should show ProactiveMCPAuth
  const shouldShowProactiveMCPAuth = (_messagesTree: TMessage[] | null) => {
    console.log('🔍 [MessagesView] shouldShowProactiveMCPAuth called with:', _messagesTree?.length || 0, 'messages');
    
    if (!_messagesTree || _messagesTree.length === 0) {
      console.log('🔍 [MessagesView] No messages tree, returning false');
      return false;
    }

    // Flatten the message tree to get all messages in order
    const flatMessages: TMessage[] = [];
    const flattenMessages = (messages: TMessage[]) => {
      for (const message of messages) {
        flatMessages.push(message);
        if (message.children && message.children.length > 0) {
          flattenMessages(message.children);
        }
      }
    };
    flattenMessages(_messagesTree);

    // Check if we have at least one user message (simplified condition for testing)
    const userMessages = flatMessages.filter(m => m.role === 'user');
    const assistantMessages = flatMessages.filter(m => m.role === 'assistant');

    const shouldShow = userMessages.length >= 1;
    console.log('🔍 [MessagesView] shouldShowProactiveMCPAuth result:', shouldShow, {
      flatMessagesCount: flatMessages.length,
      userMessagesCount: userMessages.length,
      assistantMessagesCount: assistantMessages.length,
      flatMessages: flatMessages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content.substring(0, 50) : String(m.content).substring(0, 50) }))
    });

    return shouldShow;
  };

  // Function to render messages with ProactiveMCPAuth inserted at the right position
  const renderMessagesWithAuth = (_messagesTree: TMessage[] | null) => {
    if (!_messagesTree || _messagesTree.length === 0) {
      return (
        <div
          className={cn(
            'flex w-full items-center justify-center p-3 text-text-secondary',
            fontSize,
          )}
        >
          {localize('com_ui_nothing_found')}
        </div>
      );
    }

    // Flatten the message tree to get all messages for auth detection
    const flatMessages: TMessage[] = [];
    const flattenMessages = (messages: TMessage[]) => {
      for (const message of messages) {
        flatMessages.push(message);
        if (message.children && message.children.length > 0) {
          flattenMessages(message.children);
        }
      }
    };
    flattenMessages(_messagesTree);

    return (
      <>
        <div ref={screenshotTargetRef}>
          {/* Show auth UI after first user message */}
          <ProactiveMCPAuth
            messages={flatMessages}
            conversationId={conversationId ?? null}
          />
          <MultiMessage
            key={conversationId}
            messagesTree={_messagesTree}
            messageId={conversationId ?? null}
            setCurrentEditId={setCurrentEditId}
            currentEditId={currentEditId ?? null}
          />
        </div>
      </>
    );
  };

  return (
    <>
      <div className="relative flex-1 overflow-hidden overflow-y-auto">
        <div className="relative h-full">
          <div
            className="scrollbar-gutter-stable"
            onScroll={debouncedHandleScroll}
            ref={scrollableRef}
            style={{
              height: '100%',
              overflowY: 'auto',
              width: '100%',
            }}
          >
            <div className="flex flex-col pb-9 dark:bg-transparent">
              {renderMessagesWithAuth(_messagesTree)}
              <div
                id="messages-end"
                className="group h-0 w-full flex-shrink-0"
                ref={messagesEndRef}
              />
            </div>
          </div>

          <CSSTransition
            in={showScrollButton && scrollButtonPreference}
            timeout={{
              enter: 550,
              exit: 700,
            }}
            classNames="scroll-animation"
            unmountOnExit={true}
            appear={true}
          >
            <ScrollToBottom scrollHandler={handleSmoothToRef} />
          </CSSTransition>
        </div>
      </div>
    </>
  );
}
