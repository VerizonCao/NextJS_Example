import type {
  MessageDecoder,
  MessageEncoder,
  TrackReferenceOrPlaceholder,
  WidgetState,
} from '@livekit/components-core';
import { isWeb, log } from '@livekit/components-core';
import { RoomEvent, Track } from 'livekit-client';
import * as React from 'react';
import type { MessageFormatter } from '@livekit/components-react';
import {
  ConnectionStateToast,
  ControlBar,
  GridLayout,
  LayoutContextProvider,
  RoomAudioRenderer,
  useCreateLayoutContext,
  useTracks,
} from '@livekit/components-react';

import { ParticipantTileCustom } from './PaticipantTileCustom';
import { ControlBarCustom } from './ControlBarCustom';
import { CustomChat } from './CustomChat';

export interface VideoConferenceProps extends React.HTMLAttributes<HTMLDivElement> {
  chatMessageFormatter?: MessageFormatter;
  chatMessageEncoder?: MessageEncoder;
  chatMessageDecoder?: MessageDecoder;
  SettingsComponent?: React.ComponentType;
  hideControlBar?: boolean;
  alwaysHideChat?: boolean;
  prompt?: string;
  scene?: string;
  bio?: string;
  avatar_name?: string;
  presignedUrl?: string;
}

export function VideoConferenceCustom({
  chatMessageFormatter,
  chatMessageDecoder,
  chatMessageEncoder,
  SettingsComponent,
  hideControlBar = false,
  alwaysHideChat = false,
  prompt,
  scene,
  bio,
  avatar_name,
  presignedUrl,
  ...props
}: VideoConferenceProps) {
  const [widgetState, setWidgetState] = React.useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const [isChatVisible, setIsChatVisible] = React.useState(!alwaysHideChat);
  const [isUserInitiated, setIsUserInitiated] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const tileRef = React.useRef<HTMLDivElement | null>(null);
  const [controlBarStyle, setControlBarStyle] = React.useState<React.CSSProperties>({
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 10,
    transform: 'translate(-100%, -100%) scale(1.2)',
    transformOrigin: 'bottom right',
  });

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const updatePosition = React.useCallback(() => {
    if (!tileRef.current) return;
    const rect = tileRef.current.getBoundingClientRect();
    setControlBarStyle({
      position: 'absolute',
      left: `${rect.right - 10}px`,
      top: `${rect.bottom - 10}px`,
      transform: 'translate(-100%, -100%) scale(1.2)',
      transformOrigin: 'bottom right',
      zIndex: 10,
    });
  }, []);

  React.useEffect(() => {
    const observer = new ResizeObserver(updatePosition);
    if (tileRef.current) {
      observer.observe(tileRef.current);
    }

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(updatePosition);
    }, 100);
    
    window.addEventListener('resize', updatePosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timeoutId);
    };
  }, [updatePosition]);

  const layoutContext = useCreateLayoutContext();

  // Add effect to log widgetState changes
  React.useEffect(() => {
    console.log('widgetState changed:', widgetState);
  }, [widgetState]);

  // Add effect to log state changes
  React.useEffect(() => {
    console.log('Chat visibility changed to:', isChatVisible);
  }, [isChatVisible]);

  React.useEffect(() => {
    if (!alwaysHideChat) {
      const timeoutId = setTimeout(() => {
        setIsChatVisible(true);
        setTimeout(() => {
          if (tileRef.current) {
            const event = new Event('resize');
            window.dispatchEvent(event);
          }
        }, 200);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [alwaysHideChat]);

  // Add a new effect to handle tileRef changes
  React.useEffect(() => {
    if (tileRef.current) {
      // Force a resize event when tileRef becomes available
      const event = new Event('resize');
      window.dispatchEvent(event);
    }
  }, [tileRef.current]);

  return (
    <div className="lk-video-conference" {...props}>
      {isWeb() && (
        <LayoutContextProvider
          value={layoutContext}
          onWidgetChange={(state) => {
            // Ignore LiveKit's chat state changes
          }}
        >
          <div className="lk-video-conference-inner" style={{ 
            position: 'relative', 
            display: 'flex', 
            width: alwaysHideChat ? '100%' : (isChatVisible ? '27%' : '30%'),
            marginLeft: alwaysHideChat ? '0%' : (isChatVisible ? '20%' : '33%'),
            height: '95%', 
            marginTop: '2.5%'
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              {!hideControlBar && (
                <div style={controlBarStyle}>
                  <ControlBarCustom 
                    controls={{ chat: true, settings: !!SettingsComponent }} 
                    onChatClick={() => {
                      if (!alwaysHideChat) {
                        setIsChatVisible(prev => !prev);
                      }
                    }}
                  />
                </div>
              )}
              <div className="lk-grid-layout-wrapper">
                <GridLayout tracks={tracks}>
                  <ParticipantTileCustom ref={tileRef} />
                </GridLayout>
              </div>
            </div>
            {tileRef.current && !alwaysHideChat && (
              <CustomChat
                style={{ display: isChatVisible ? 'flex' : 'none' }}
                messageFormatter={chatMessageFormatter}
                position="right"
                tileRef={tileRef}
              />
            )}
          </div>
          {SettingsComponent && widgetState.showSettings && (
            <div className="lk-settings-menu-modal">
              <SettingsComponent />
            </div>
          )}
        </LayoutContextProvider>
      )}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}
