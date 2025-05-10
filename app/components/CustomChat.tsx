import { type ChatMessage, type ChatOptions } from '@livekit/components-core';
import * as React from 'react';
import { useChat } from '@livekit/components-react';
import type { MessageFormatter } from '@livekit/components-react';
import { ChatEntry } from '@livekit/components-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export interface CustomChatProps extends React.HTMLAttributes<HTMLDivElement>, ChatOptions {
  messageFormatter?: MessageFormatter;
  position?: 'left' | 'right';
  tileRef?: React.RefObject<HTMLDivElement | null>;
  prompt?: string;
  scene?: string;
  bio?: string;
  avatar_name?: string;
  presignedUrl?: string;
}

export function CustomChat({
  messageFormatter,
  messageDecoder,
  messageEncoder,
  channelTopic,
  position = 'right',
  tileRef,
  prompt,
  scene,
  bio,
  avatar_name,
  presignedUrl,
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
    if (!tileRef?.current) {
      return;
    }
    
    const rect = tileRef.current.getBoundingClientRect();
    const parentRect = tileRef.current.closest('.lk-video-conference-inner')?.getBoundingClientRect();
    
    if (!parentRect) {
      return;
    }
    
    // Calculate position relative to the parent container
    const top = rect.top - parentRect.top;
    const left = rect.right - parentRect.left;
    
    // Force a reflow to ensure the position is applied correctly
    requestAnimationFrame(() => {
      setChatStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: '600px',
        height: `${rect.height}px`,
        backgroundColor: '#1a1a1e',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      });
    });
  }, [tileRef]);

  // Add effect to handle tileRef changes
  React.useEffect(() => {
    if (tileRef?.current) {
      updatePosition();
    }
  }, [tileRef?.current, updatePosition]);

  React.useEffect(() => {
    if (!tileRef?.current) {
      return;
    }
    
    const observer = new ResizeObserver(() => {
      // Add a small delay to ensure DOM is ready
      requestAnimationFrame(updatePosition);
    });
    
    observer.observe(tileRef.current);
    window.addEventListener('resize', () => {
      requestAnimationFrame(updatePosition);
    });
    
    // Initial position with a small delay
    const timeoutId = setTimeout(() => {
      updatePosition();
    }, 100);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timeoutId);
    };
  }, [updatePosition, tileRef]);

  // Add a new effect to handle visibility changes
  React.useEffect(() => {
    if (props.style?.display === 'flex') {
      // When chat becomes visible, update position after a short delay
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(updatePosition);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [props.style?.display, updatePosition]);

  // Add console log to check received props
  React.useEffect(() => {
    console.log('CustomChat received props:', {
      prompt,
      scene,
      bio,
      avatar_name,
      presignedUrl
    });
  }, [prompt, scene, bio, avatar_name, presignedUrl]);


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
      <Card className="flex flex-col w-full h-full items-center justify-between p-[18px] relative bg-[#1a1a1e] rounded-[4.72px] border-none">
        <CardContent className="flex flex-col items-start gap-[16.2px] relative self-stretch w-full flex-1 overflow-hidden p-0">
          <div className="flex flex-col items-start gap-[16.2px] relative self-stretch w-full flex-shrink-0 pt-6 px-4">
            {/* User profile section */}
            <div className="flex items-center gap-[15.12px] relative self-stretch w-full">
              <img
                className="relative w-20 h-20 object-cover rounded-full"
                alt="Profile"
                src={presignedUrl || "https://c.animaapp.com/ma3i21k1TwXiJe/img/ellipse-1.svg"}
              />
              <div className="flex flex-col items-start gap-[7.56px] relative flex-1 grow">
                <div className="relative self-stretch mt-[-0.94px] font-['Montserrat',Helvetica] font-bold text-white text-lg tracking-[0] leading-[normal]">
                  {avatar_name || 'Ruby Runolfsson'}
                </div>
                <div className="relative self-stretch font-['Montserrat',Helvetica] font-medium text-white text-sm tracking-[0] leading-[normal]">
                  {scene || 'Created by Desiree Nolan'}
                </div>
                <div className="relative self-stretch font-['Montserrat',Helvetica] font-medium text-white text-sm tracking-[0] leading-[normal]">
                  {bio || prompt || 'The beautiful range of Apple Naturalé that has an exciting mix of natural ingredients. With the Goodness of 100% Natural Ingredients'}
                </div>
              </div>
            </div>

            <Separator className="relative self-stretch w-full h-px mb-[-0.05px]" />
          </div>

          {/* Chat messages */}
          <ul 
            className="custom-chat-messages" 
            ref={ulRef}
            style={{ 
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              listStyle: 'none',
              margin: 0,
              width: '100%'
            }}
          >
            {chatMessages.map((msg, idx, allMsg) => {
              const hideName = idx >= 1 && allMsg[idx - 1].from === msg.from;

              return (
                <div key={msg.id ?? idx} className="mb-2">
                  <ChatEntry
                    hideName={hideName}
                    hideTimestamp={true}
                    entry={msg}
                    messageFormatter={messageFormatter}
                  />
                </div>
              );
            })}
          </ul>
        </CardContent>

        {/* Message input area */}
        <form 
          className="custom-chat-form flex-shrink-0" 
          onSubmit={handleSubmit}
          style={{
            padding: '1rem',
            borderTop: '1px solid #2a2a2e',
            display: 'flex',
            gap: '0.5rem',
            width: '100%'
          }}
        >
          <Input
            className="flex items-center gap-2.5 px-3 py-2 relative flex-1 grow bg-[#222327] rounded-2xl border border-solid border-[#d2d5da40] text-white text-xs font-['Montserrat',Helvetica] font-normal"
            disabled={isSending}
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            onInput={(ev: React.FormEvent<HTMLInputElement>) => ev.stopPropagation()}
            onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement>) => ev.stopPropagation()}
            onKeyUp={(ev: React.KeyboardEvent<HTMLInputElement>) => ev.stopPropagation()}
          />
          <Button 
            type="submit"
            className="inline-flex items-center justify-center gap-2.5 px-5 py-2 relative flex-[0_0_auto] bg-[#5856d6] rounded-xl hover:bg-[#4a49b3]"
            disabled={isSending}
          >
            <span className="relative w-fit mt-[-1.00px] font-['Montserrat',Helvetica] font-medium text-white text-sm tracking-[0] leading-6 whitespace-nowrap">
              Send
            </span>
          </Button>
        </form>
      </Card>
    </div>
  );
} 