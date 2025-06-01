import { memo, useMemo, ReactElement } from 'react';
import { useRecoilValue } from 'recoil';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import Markdown from '~/components/Chat/Messages/Content/Markdown';
import AuthCodeParser from '~/components/Messages/Content/AuthCodeParser';
import { useChatContext, useMessageContext } from '~/Providers';
import { cn } from '~/utils';
import store from '~/store';

type TextPartProps = {
  text: string;
  showCursor: boolean;
  isCreatedByUser: boolean;
};

type ContentType =
  | ReactElement<React.ComponentProps<typeof Markdown>>
  | ReactElement<React.ComponentProps<typeof MarkdownLite>>
  | ReactElement;

const TextPart = memo(({ text, isCreatedByUser, showCursor }: TextPartProps) => {
  const { messageId } = useMessageContext();
  const { isSubmitting, latestMessage } = useChatContext();
  const enableUserMsgMarkdown = useRecoilValue(store.enableUserMsgMarkdown);
  const showCursorState = useMemo(() => showCursor && isSubmitting, [showCursor, isSubmitting]);
  const isLatestMessage = useMemo(
    () => messageId === latestMessage?.messageId,
    [messageId, latestMessage?.messageId],
  );

  const content: ContentType = useMemo(() => {
    // Check if this text contains Google Sheets authentication keywords
    const needsGoogleSheetsAuth = text.toLowerCase().includes('authenticate with google sheets') ||
                                  text.toLowerCase().includes('connect to google sheets') ||
                                  text.toLowerCase().includes('authentication button');
    
    if (needsGoogleSheetsAuth && !isCreatedByUser) {
      // This looks like an authentication message, use AuthCodeParser to add auth button
      return <AuthCodeParser content={text} isAuthMessage={true} />;
    }
    
    // Normal text processing
    if (!isCreatedByUser) {
      return <Markdown content={text} isLatestMessage={isLatestMessage} />;
    } else if (enableUserMsgMarkdown) {
      return <MarkdownLite content={text} />;
    } else {
      return <>{text}</>;
    }
  }, [isCreatedByUser, enableUserMsgMarkdown, text, isLatestMessage]);

  return (
    <div
      className={cn(
        isSubmitting ? 'submitting' : '',
        showCursorState && !!text.length ? 'result-streaming' : '',
        'markdown prose message-content dark:prose-invert light w-full break-words',
        isCreatedByUser && !enableUserMsgMarkdown && 'whitespace-pre-wrap',
        isCreatedByUser ? 'dark:text-gray-20' : 'dark:text-gray-100',
      )}
    >
      {content}
    </div>
  );
});

export default TextPart;
