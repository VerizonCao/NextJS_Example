import { Track } from 'livekit-client';
import * as React from 'react';
import { supportsScreenSharing } from '@livekit/components-core';
import { Mic, MicOff, MessageSquare, LogOut } from 'lucide-react';

import { ConnectionQualityIndicator, 
    MediaDeviceMenu,
    DisconnectButton,
    TrackToggle,
    ChatIcon, GearIcon, LeaveIcon,
    useLocalParticipantPermissions, usePersistentUserChoices,
    ChatToggle,
    // mergeProps,
    // useMediaQuery,
    useMaybeLayoutContext,
    StartMediaButton,
    // SettingsMenuToggle,
} from '@livekit/components-react';


/** @public */
export type ControlBarControls = {
  microphone?: boolean;
  camera?: boolean;
  chat?: boolean;
  screenShare?: boolean;
  leave?: boolean;
  settings?: boolean;
};

/** @public */
export interface ControlBarProps extends React.HTMLAttributes<HTMLDivElement> {
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
  variation?: 'minimal' | 'verbose' | 'textOnly';
  controls?: ControlBarControls;
  /**
   * If `true`, the user's device choices will be persisted.
   * This will enable the user to have the same device choices when they rejoin the room.
   * @defaultValue true
   * @alpha
   */
  saveUserChoices?: boolean;
}

/**
 * The `ControlBar` prefab gives the user the basic user interface to control their
 * media devices (camera, microphone and screen share), open the `Chat` and leave the room.
 *
 * @remarks
 * This component is build with other LiveKit components like `TrackToggle`,
 * `DeviceSelectorButton`, `DisconnectButton` and `StartAudio`.
 *
 * @example
 * ```tsx
 * <LiveKitRoom>
 *   <ControlBar />
 * </LiveKitRoom>
 * ```
 * @public
 */
export function ControlBarCustom({
  variation,
  controls,
  saveUserChoices = true,
  onDeviceError,
  ...props
}: ControlBarProps) {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isMicEnabled, setIsMicEnabled] = React.useState(true);
  const layoutContext = useMaybeLayoutContext();
  React.useEffect(() => {
    if (layoutContext?.widget.state?.showChat !== undefined) {
      setIsChatOpen(layoutContext?.widget.state?.showChat);
    }
  }, [layoutContext?.widget.state?.showChat]);
//   const isTooLittleSpace = useMediaQuery(`(max-width: ${isChatOpen ? 1000 : 760}px)`);

//   const defaultVariation = isTooLittleSpace ? 'minimal' : 'verbose';
  const defaultVariation = 'minimal'
  variation ??= defaultVariation;

  const visibleControls = { leave: true, camera: false, screenShare: false, ...controls };

  const localPermissions = useLocalParticipantPermissions();

  if (!localPermissions) {
    visibleControls.camera = false;
    visibleControls.chat = false;
    visibleControls.microphone = false;
    visibleControls.screenShare = false;
  } else {
    visibleControls.camera ??= localPermissions.canPublish;
    visibleControls.microphone ??= localPermissions.canPublish;
    visibleControls.screenShare ??= localPermissions.canPublish;
    visibleControls.chat ??= localPermissions.canPublishData && controls?.chat;
  }

  const showIcon = React.useMemo(
    () => variation === 'minimal' || variation === 'verbose',
    [variation],
  );
  const showText = React.useMemo(
    () => variation === 'textOnly' || variation === 'verbose',
    [variation],
  );

  const browserSupportsScreenSharing = supportsScreenSharing();

  const [isScreenShareEnabled, setIsScreenShareEnabled] = React.useState(false);

  const onScreenShareChange = React.useCallback(
    (enabled: boolean) => {
      setIsScreenShareEnabled(enabled);
    },
    [setIsScreenShareEnabled],
  );

//   const htmlProps = mergeProps({ className: 'lk-control-bar' }, props);

  const {
    saveAudioInputEnabled,
    saveVideoInputEnabled,
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
  } = usePersistentUserChoices({ preventSave: !saveUserChoices });

  const microphoneOnChange = React.useCallback(
    (enabled: boolean, isUserInitiated: boolean) => {
      setIsMicEnabled(enabled);
      if (isUserInitiated) {
        saveAudioInputEnabled(enabled);
      }
    },
    [saveAudioInputEnabled],
  );

  const cameraOnChange = React.useCallback(
    (enabled: boolean, isUserInitiated: boolean) =>
      isUserInitiated ? saveVideoInputEnabled(enabled) : null,
    [saveVideoInputEnabled],
  );

  return (
    <div className="flex flex-col items-end justify-end gap-8 absolute bottom-8 right-8">
      {visibleControls.microphone && (
        <TrackToggle
          source={Track.Source.Microphone}
          showIcon={false}
          onChange={microphoneOnChange}
          onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Microphone, error })}
          className="relative w-14 h-14 bg-[rgba(36,36,40,0.75)] rounded-full flex items-center justify-center"
        >
          {isMicEnabled ? (
            <Mic className="w-7 h-7 text-white" />
          ) : (
            <MicOff className="w-7 h-7 text-white" />
          )}
        </TrackToggle>
      )}
      {visibleControls.camera && (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Camera}
            showIcon={showIcon}
            onChange={cameraOnChange}
            onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Camera, error })}
          >
            {showText && 'Camera'}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu
              kind="videoinput"
              onActiveDeviceChange={(_kind, deviceId) =>
                saveVideoInputDeviceId(deviceId ?? 'default')
              }
            />
          </div>
        </div>
      )}
      {visibleControls.screenShare && browserSupportsScreenSharing && (
        <TrackToggle
          source={Track.Source.ScreenShare}
          captureOptions={{ audio: true, selfBrowserSurface: 'include' }}
          showIcon={showIcon}
          onChange={onScreenShareChange}
          onDeviceError={(error) => onDeviceError?.({ source: Track.Source.ScreenShare, error })}
        >
          {showText && (isScreenShareEnabled ? 'Stop screen share' : 'Share screen')}
        </TrackToggle>
      )}
      {visibleControls.chat && (
        <ChatToggle
          className="relative w-14 h-14 bg-[rgba(36,36,40,0.75)] rounded-full flex items-center justify-center"
        >
          <MessageSquare className="w-7 h-7 text-white" />
        </ChatToggle>
      )}
      {visibleControls.settings 
    //   && 
    //   (
    //     <SettingsMenuToggle>
    //       {showIcon && <GearIcon />}
    //       {showText && 'Settings'}
    //     </SettingsMenuToggle>
    //   )
      }
      {visibleControls.leave && (
        <DisconnectButton
          className="relative w-14 h-14 bg-[rgba(36,36,40,0.75)] rounded-full flex items-center justify-center"
        >
          <LogOut className="w-7 h-7 text-white" />
        </DisconnectButton>
      )}
      <StartMediaButton />
    </div>
  );
}
