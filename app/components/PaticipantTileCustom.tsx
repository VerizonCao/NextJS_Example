import * as React from 'react';
import type { Participant } from 'livekit-client';
import { Track } from 'livekit-client';
import type { ParticipantClickEvent, TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { isTrackReference, isTrackReferencePinned } from '@livekit/components-core';
import { ConnectionQualityIndicator, 
    ParticipantName, 
    TrackMutedIndicator,
    ParticipantContext,
    TrackRefContext,
    useEnsureTrackRef,
    useFeatureContext,
    useMaybeLayoutContext,
    useMaybeParticipantContext,
    useMaybeTrackRefContext,
    FocusToggle,
    ParticipantPlaceholder,
    LockLockedIcon,
    ScreenShareIcon,
    VideoTrack,
    AudioTrack,
    useParticipantTile,
    useIsEncrypted,
} from '@livekit/components-react';

/**
 * The `ParticipantContextIfNeeded` component only creates a `ParticipantContext`
 * if there is no `ParticipantContext` already.
 * @example
 * ```tsx
 * <ParticipantContextIfNeeded participant={trackReference.participant}>
 *  ...
 * </ParticipantContextIfNeeded>
 * ```
 * @public
 */
export function ParticipantContextIfNeeded(
  props: React.PropsWithChildren<{
    participant?: Participant;
  }>,
) {
  const hasContext = !!useMaybeParticipantContext();
  return props.participant && !hasContext ? (
    <ParticipantContext.Provider value={props.participant}>
      {props.children}
    </ParticipantContext.Provider>
  ) : (
    <>{props.children}</>
  );
}

/**
 * Only create a `TrackRefContext` if there is no `TrackRefContext` already.
 * @internal
 */
export function TrackRefContextIfNeeded(
  props: React.PropsWithChildren<{
    trackRef?: TrackReferenceOrPlaceholder;
  }>,
) {
  const hasContext = !!useMaybeTrackRefContext();
  return props.trackRef && !hasContext ? (
    <TrackRefContext.Provider value={props.trackRef}>{props.children}</TrackRefContext.Provider>
  ) : (
    <>{props.children}</>
  );
}

/** @public */
export interface ParticipantTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The track reference to display. */
  trackRef?: TrackReferenceOrPlaceholder;
  disableSpeakingIndicator?: boolean;

  onParticipantClick?: (event: ParticipantClickEvent) => void;
}

/**
 * The `ParticipantTile` component is the base utility wrapper for displaying a visual representation of a participant.
 * This component can be used as a child of the `TrackLoop` component or by passing a track reference as property.
 *
 * @example Using the `ParticipantTile` component with a track reference:
 * ```tsx
 * <ParticipantTile trackRef={trackRef} />
 * ```
 * @example Using the `ParticipantTile` component as a child of the `TrackLoop` component:
 * ```tsx
 * <TrackLoop>
 *  <ParticipantTile />
 * </TrackLoop>
 * ```
 * @public
 */
export const ParticipantTileCustom: (
    props: ParticipantTileProps & React.RefAttributes<HTMLDivElement>,
  ) => React.ReactNode = /* @__PURE__ */ React.forwardRef<HTMLDivElement, ParticipantTileProps>( 
    function ParticipantTile(
      { trackRef, children, onParticipantClick, disableSpeakingIndicator, ...htmlProps }: ParticipantTileProps,
      ref,
    ) {
      const trackReference = useEnsureTrackRef(trackRef);
      const { elementProps } = useParticipantTile<HTMLDivElement>({
        htmlProps,
        disableSpeakingIndicator,
        onParticipantClick,
        trackRef: trackReference,
      });
  
      const isEncrypted = useIsEncrypted(trackReference.participant);
      const layoutContext = useMaybeLayoutContext();
      const autoManageSubscription = useFeatureContext()?.autoSubscription;
      
      const handleSubscribe = React.useCallback(
        (subscribed: boolean) => {
          if (
            trackReference.source &&
            !subscribed &&
            layoutContext &&
            layoutContext.pin.dispatch &&
            isTrackReferencePinned(trackReference, layoutContext.pin.state)
          ) {
            layoutContext.pin.dispatch({ msg: 'clear_pin' });
          }
        },
        [trackReference, layoutContext],
      );
  
      // Check if the participant is the local participant
      if (trackReference.participant?.isLocal) {
        return null; // Hide the local participant
      }
  
      return (
        <div
          ref={ref}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '810px',  // Fixed width (adjusted to 900px)
            height: '1440px', // Fixed height (adjusted to 1600px)
            maxWidth: '100%', // Prevents overflow if screen is smaller
            maxHeight: '100%', // Prevents overflow if screen is smaller
            overflow: 'hidden', // Avoids any content overflow
            display: 'flex',  // Use flex to center the content inside
            justifyContent: 'center',
            alignItems: 'center', // Center the content vertically and horizontally
            ...htmlProps.style, // Retain any additional styles
          }}
          {...elementProps}
        >
          <TrackRefContextIfNeeded trackRef={trackReference}>
            <ParticipantContextIfNeeded participant={trackReference.participant}>
              {children ?? (
                <>
                  {isTrackReference(trackReference) &&
                  (trackReference.publication?.kind === 'video' ||
                    trackReference.source === Track.Source.Camera ||
                    trackReference.source === Track.Source.ScreenShare) ? (
                    <VideoTrack
                      trackRef={trackReference}
                      onSubscriptionStatusChanged={handleSubscribe}
                      manageSubscription={autoManageSubscription}
                      style={{
                        objectFit: 'cover',  // Ensures the video fills the container
                        width: '100%',
                        height: '100%',
                      }}
                    />
                  ) : (
                    isTrackReference(trackReference) && (
                      <AudioTrack
                        trackRef={trackReference}
                        onSubscriptionStatusChanged={handleSubscribe}
                      />
                    )
                  )}
                  
                  {/* Add space between the video and metadata */}
                  <div className="lk-participant-placeholder">
                    <ParticipantPlaceholder />
                  </div>
                  <div className="lk-participant-metadata" style={{ paddingTop: '20px' }}>
                    {/* Padding applied to create space between the video and the metadata */}
                    <div className="lk-participant-metadata-item">
                      {trackReference.source === Track.Source.Camera ? (
                        <>
                          {isEncrypted && <LockLockedIcon style={{ marginRight: '0.25rem' }} />}
                          <TrackMutedIndicator
                            trackRef={{
                              participant: trackReference.participant,
                              source: Track.Source.Microphone,
                            }}
                            show={'muted'}
                          ></TrackMutedIndicator>
                          <ParticipantName />
                        </>
                      ) : (
                        <>
                          <ScreenShareIcon style={{ marginRight: '0.25rem' }} />
                          <ParticipantName>&apos;s screen</ParticipantName>
                        </>
                      )}
                    </div>
                    <ConnectionQualityIndicator className="lk-participant-metadata-item" />
                  </div>
                </>
              )}
              <FocusToggle trackRef={trackReference} />
            </ParticipantContextIfNeeded>
          </TrackRefContextIfNeeded>
        </div>
      );
    },
  );
  
  
  
