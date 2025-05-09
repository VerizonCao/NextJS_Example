import { type ChatMessage, type ChatOptions } from '@livekit/components-core';
import * as React from 'react';
import { useChat } from '@livekit/components-react';
import type { MessageFormatter } from '@livekit/components-react';
import { ChatEntry } from '@livekit/components-react';

export interface CustomChatProps extends React.HTMLAttributes<HTMLDivElement>, ChatOptions {
  messageFormatter?: MessageFormatter;
  position?: 'left' | 'right';
  tileRef?: React.RefObject<HTMLDivElement | null>;
}

export function CustomChat({
  messageFormatter,
  messageDecoder,
  messageEncoder,
  channelTopic,
  position = 'right',
  tileRef,
  ...props
}: CustomChatProps) {
  const ulRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [chatStyle, setChatStyle] = React.useState<React.CSSProperties>({});

  const chatOptions: ChatOptions = React.useMemo(() => {
    return { messageDecoder, messageEncoder, channelTopic };
  }, [messageDecoder, messageEncoder, channelTopic]);

  const { chatMessages, send, isSending } = useChat(chatOptions);

  const updatePosition = React.useCallback(() => {
    if (!tileRef?.current) return;
    
    const rect = tileRef.current.getBoundingClientRect();
    const parentRect = tileRef.current.closest('.lk-video-conference-inner')?.getBoundingClientRect();
    
    if (!parentRect) return;
    
    // Calculate position relative to the parent container
    const top = rect.top - parentRect.top;
    const left = rect.right - parentRect.left;
    
    setChatStyle({
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      width: '400px',
      height: `${rect.height}px`,
      backgroundColor: '#1a1a1e',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
    });
  }, [tileRef]);

  React.useEffect(() => {
    if (!tileRef?.current) return;
    
    const observer = new ResizeObserver(() => {
      // Add a small delay to ensure DOM is ready
      requestAnimationFrame(updatePosition);
    });
    
    observer.observe(tileRef.current);
    window.addEventListener('resize', () => {
      requestAnimationFrame(updatePosition);
    });
    
    // Initial position with a small delay
    const timeoutId = setTimeout(updatePosition, 100);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timeoutId);
    };
  }, [updatePosition, tileRef]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (inputRef.current && inputRef.current.value.trim() !== '') {
      await send(inputRef.current.value);
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }

  React.useEffect(() => {
    if (ulRef) {
      ulRef.current?.scrollTo({ top: ulRef.current.scrollHeight });
    }
  }, [ulRef, chatMessages]);

  return (
    <div 
      {...props} 
      className="custom-chat"
      style={{
        ...chatStyle,
        ...props.style
      }}
    >
      <div className="custom-chat-header" style={{ padding: '1rem', borderBottom: '1px solid #2a2a2e' }}>
        Messages
      </div>

      <ul 
        className="custom-chat-messages" 
        ref={ulRef}
        style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          listStyle: 'none',
          margin: 0
        }}
      >
        {chatMessages.map((msg, idx, allMsg) => {
          const hideName = idx >= 1 && allMsg[idx - 1].from === msg.from;
          const hideTimestamp = idx >= 1 && msg.timestamp - allMsg[idx - 1].timestamp < 60_000;

          return (
            <ChatEntry
              key={msg.id ?? idx}
              hideName={hideName}
              hideTimestamp={hideName === false ? false : hideTimestamp}
              entry={msg}
              messageFormatter={messageFormatter}
            />
          );
        })}
      </ul>

      <form 
        className="custom-chat-form" 
        onSubmit={handleSubmit}
        style={{
          padding: '1rem',
          borderTop: '1px solid #2a2a2e',
          display: 'flex',
          gap: '0.5rem'
        }}
      >
        <input
          className="custom-chat-input"
          disabled={isSending}
          ref={inputRef}
          type="text"
          placeholder="Enter a message..."
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid #2a2a2e',
            backgroundColor: '#2a2a2e',
            color: 'white'
          }}
          onInput={(ev) => ev.stopPropagation()}
          onKeyDown={(ev) => ev.stopPropagation()}
          onKeyUp={(ev) => ev.stopPropagation()}
        />
        <button 
          type="submit" 
          className="custom-chat-button"
          disabled={isSending}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            backgroundColor: '#3a3a3e',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
} 