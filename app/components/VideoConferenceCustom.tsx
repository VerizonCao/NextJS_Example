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
}

export function VideoConferenceCustom({
  chatMessageFormatter,
  chatMessageDecoder,
  chatMessageEncoder,
  SettingsComponent,
  hideControlBar = false,
  ...props
}: VideoConferenceProps) {
  const [widgetState, setWidgetState] = React.useState<WidgetState>({
    showChat: true,
    unreadMessages: 0,
    showSettings: false,
  });
  const [isUserInitiated, setIsUserInitiated] = React.useState(false);

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

  React.useEffect(() => {
    // Ensure chat is visible after initial render
    const timeoutId = setTimeout(() => {
      setWidgetState(prev => ({ ...prev, showChat: true }));
    }, 100);
  
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="lk-video-conference" {...props}>
      {isWeb() && (
        <LayoutContextProvider
          value={layoutContext}
          onWidgetChange={(state) => {
            // Only update if the state actually changed
            if (JSON.stringify(state) !== JSON.stringify(widgetState)) {
              if (state.showChat !== widgetState.showChat) {
                // Only allow changing showChat if it's user initiated
                if (!isUserInitiated) {
                  return;
                }
                // Reset the user initiated flag after handling the change
                setIsUserInitiated(false);
              }
              setWidgetState(prev => ({ ...prev, ...state }));
              // Update position when chat state changes
              if (state.showChat !== widgetState.showChat) {
                setTimeout(updatePosition, 100);
              }
            }
          }}
        >
          <div className="lk-video-conference-inner" style={{ position: 'relative', display: 'flex', width: '97%', height: '100%'}}>
            <div style={{ flex: 1, position: 'relative' }}>
              {!hideControlBar && (
                <div style={controlBarStyle}>
                  <ControlBarCustom 
                    controls={{ chat: true, settings: !!SettingsComponent }} 
                    onChatClick={() => {
                      setIsUserInitiated(true);
                      setWidgetState(prev => ({ ...prev, showChat: !prev.showChat }));
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
            <CustomChat
              style={{ display: widgetState.showChat ? 'flex' : 'none' }}
              messageFormatter={chatMessageFormatter}
              position="right"
              tileRef={tileRef}
            />
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
