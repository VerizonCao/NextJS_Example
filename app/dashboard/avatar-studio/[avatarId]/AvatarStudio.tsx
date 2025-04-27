'use client'

import { useState, useEffect, useRef } from 'react'
import { LiveKitRoom, LocalUserChoices, useRoomContext, VideoConference } from '@livekit/components-react'
import { Room, RoomOptions, VideoCodec, VideoPresets } from 'livekit-client'
import { CustomPreJoin } from '@/app/ui/rita/prejoin'
import { ConnectionDetails } from '@/lib/types'
import { VideoConferenceCustom } from '@/app/components/VideoConferenceCustom'
import { startStreamingSession } from '@/app/lib/actions'
import React from 'react'

// Constants
const totalMaskSize = 44
const latentDescription = [
  "index 0", "index 1", "index 3", "Gaze 1", "Eyebrow tight Left/Right",
  "Eyebrow tight Up/Down", "index 9", "index 10", "index 12", "index 13",
  "Head Move Left/Right", "Head Move Up/Down", "index 18", "index 19",
  "index 21", "Right Mouth Corner", "index 24", "index 25", "index 27",
  "index 28", "index 30", "index 31", "index 32", "Left Eye Left/Right",
  "Left Eye Blink", "index 39", "Left Eye Roll Up/Down", "index 42",
  "Smile / Displease", "Right Eye Left/Right", "Right Eye Blink", "index 48",
  "Right Eye Up/Down", "Left Mouth Corner", "Show Teeth / Tongue",
  "Mouth Shape 1", "index 54", "index 55", "Lower Lip Left/Right",
  "Lower Lip Up/Down", "Lower Lip In/Out", "Upper Lip Left/Right",
  "Upper Lip Up/Down", "Mouth Shape2"
]

interface ExpressionInfo {
  category: string
  name: string
  description: string
  transitionDuration: number
  speechMouthRatio: number
}

const CONN_DETAILS_ENDPOINT = process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details'

interface AvatarStudioProps {
  avatarId: string
  avatarUri?: string
}

export default function AvatarStudio({ avatarId, avatarUri }: AvatarStudioProps) {
  // Refs
  const logsRef = useRef<HTMLDivElement>(null)

  // LiveKit state
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>(undefined)
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | undefined>(undefined)
  const [room, setRoom] = useState<Room | null>(null)
  const [hasConnected, setHasConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  // Expression state
  const [videoFps, setVideoFps] = useState(0)
  const [audioFps, setAudioFps] = useState(0)
  const [status, setStatus] = useState('Ready')
  const [logs, setLogs] = useState<string[]>(['Connection logs will appear here...'])
  const [expValues, setExpValues] = useState<number[]>(new Array(totalMaskSize).fill(0))
  const [defaultExpValues, setDefaultExpValues] = useState<number[]>(new Array(totalMaskSize).fill(0))
  const [expressionInfo, setExpressionInfo] = useState<ExpressionInfo>({
    category: '',
    name: '',
    description: '',
    transitionDuration: 10,
    speechMouthRatio: 0.15
  })
  const [isAddingNewExpression, setIsAddingNewExpression] = useState(false)
  const [expressionLibrary, setExpressionLibrary] = useState<Record<string, string[]>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedExpression, setSelectedExpression] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)

  // Add log message
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `${timestamp} - ${message}`])
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }

  // Handle start streaming
  const handleStartStreaming = async () => {
    try {
      setStatus('Connecting...')
      addLog('Starting stream connection...')

      const preJoinDefaults = {
        username: 'user',
        videoEnabled: true,
        audioEnabled: true,
        videoDeviceId: undefined,
        audioDeviceId: undefined,
      }
      setPreJoinChoices(preJoinDefaults)

      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin)
      url.searchParams.append('roomName', `${avatarId}-room`)
      url.searchParams.append('participantName', preJoinDefaults.username)
      
      const connectionDetailsResp = await fetch(url.toString())
      const connectionDetailsData = await connectionDetailsResp.json()
      setConnectionDetails(connectionDetailsData)

      const roomOptions: RoomOptions = {
        videoCaptureDefaults: {
          deviceId: preJoinDefaults.videoDeviceId,
          resolution: VideoPresets.h720,
        },
        publishDefaults: {
          dtx: false,
          videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
          red: true,
          videoCodec: 'VP8' as VideoCodec,
        },
        audioCaptureDefaults: {
          deviceId: preJoinDefaults.audioDeviceId,
        },
        adaptiveStream: { pixelDensity: 'screen' },
        dynacast: true,
      }

      const newRoom = new Room(roomOptions)
      await newRoom.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken)
      setRoom(newRoom)
      setHasConnected(true)
      setIsStreaming(true)
      setStatus('Connected')
      addLog('LiveKit connection established')

      // Start streaming session
      try {
        await startStreamingSession({
          instruction: "test",
          seconds: 300,
          room: `${avatarId}-room`,
          avatarSource: avatarUri,
        });
        addLog('Streaming session started successfully');
      } catch (error) {
        console.error('Error starting streaming session:', error);
        addLog(`Error starting streaming session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error setting up LiveKit:', error)
      setStatus('Error - Connection Failed')
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Add data publishing functionality
  React.useEffect(() => {
    if (!room) return;

    const sendExpressionData = () => {
      // Only send data if room is connected and values are dirty
      if (room.state !== 'connected' || !isDirty) {
        return;
      }

      try {
        setIsDirty(false); // Reset dirty flag after successful send
        // Send expression values to all participants
        room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({
            type: 'expression_values',
            values: expValues,
            timestamp: Date.now()
          })),
          { reliable: true } // ensure data delivery
        );
      } catch (error) {
        console.error('Error sending expression data:', error);
      }
    };

    // Handle incoming data messages
    const handleDataMessage = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        
        if (data.type === 'initial_categories_and_expressions') {
          if (data.error) {
            console.error('Error receiving initial categories:', data.error);
            addLog(`Error receiving initial categories: ${data.error}`);
            return;
          }

          // Update expression library with received data
          setExpressionLibrary(data.expressions);
          addLog(`Received expression library with ${Object.keys(data.expressions).length} categories`);

          // Select the first category by default
          const categories = Object.keys(data.expressions).sort();
          if (categories.length > 0) {
            const neutralCategory = categories.find(cat => cat.toLowerCase() === 'neutral');
            const categoryToSelect = neutralCategory || categories[0];
            setSelectedCategory(categoryToSelect);
            
            // Select the first expression in the category
            const expressions = data.expressions[categoryToSelect];
            if (expressions && expressions.length > 0) {
              setSelectedExpression(expressions[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error processing data message:', error);
        addLog(`Error processing data message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Only start sending data when room is connected
    const handleRoomConnected = () => {
      sendExpressionData();
      const interval = setInterval(sendExpressionData, 40); // 10fps = 100ms interval
      return () => clearInterval(interval);
    };

    let cleanup: (() => void) | undefined;

    if (room.state === 'connected') {
      cleanup = handleRoomConnected();
    }

    room.on('connected', () => {
      cleanup = handleRoomConnected();
    });

    room.on('disconnected', () => {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
    });

    // Add data message listener
    room.on('dataReceived', handleDataMessage);

    return () => {
      if (cleanup) {
        cleanup();
      }
      room.off('dataReceived', handleDataMessage);
    };
  }, [room, expValues, isDirty]);

  // Handle expression value changes
  const handleExpressionChange = (index: number, value: number) => {
    setExpValues(prev => {
      const newValues = [...prev]
      newValues[index] = value
      return newValues
    })
    setIsDirty(true)
  }

  // Reset expression values
  const resetExpression = () => {
    setExpValues([...defaultExpValues])
    setIsDirty(true)
    addLog('Expression values reset to default')
  }

  // Save expression changes
  const saveExpression = async () => {
    try {
      addLog('Saving expression changes...')
      setStatus('Saving...')
      // TODO: Implement save to backend via LiveKit
      setDefaultExpValues([...expValues])
      addLog('Expression changes saved successfully')
      setStatus('Changes Saved')
    } catch (error) {
      console.error('Error saving expression:', error)
      setStatus('Error - Failed to save changes')
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Add new expression
  const addNewExpression = () => {
    setIsAddingNewExpression(true)
    setExpressionInfo({
      category: '',
      name: '',
      description: '',
      transitionDuration: 10,
      speechMouthRatio: 0.15
    })
    addLog('Preparing to add new expression')
  }

  return (
    <div className="flex gap-4">
      {/* Left Panel - Video Stream */}
      <div className="w-[800px] bg-white rounded-lg shadow p-4 flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Live Stream</h2>
        <div className="w-full h-[800px] bg-black rounded overflow-hidden">
          {!isStreaming ? (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <div className="text-white text-lg">Click Start Streaming to begin</div>
            </div>
          ) : !preJoinChoices || !room || !connectionDetails ? (
            <div className="w-full h-full flex items-center justify-center">
              <CustomPreJoin />
            </div>
          ) : (
            <div data-lk-theme="default" style={{ height: '100%', width: '100%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LiveKitRoom
                room={room}
                token={connectionDetails.participantToken}
                serverUrl={connectionDetails.serverUrl}
                video={preJoinChoices.videoEnabled}
                audio={preJoinChoices.audioEnabled}
              >
                <div className="flex w-[600px] h-full">
                  <VideoConferenceCustom />
                </div>
              </LiveKitRoom>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleStartStreaming}
            disabled={isStreaming}
            className={`flex-1 px-4 py-2 rounded transition-colors ${
              isStreaming 
                ? 'bg-gray-500 text-white cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isStreaming ? 'Streaming...' : 'Start Streaming'}
          </button>
          <button
            onClick={() => {}}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Stop Streaming
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-sm text-gray-600">Video FPS</div>
            <div className="text-lg font-medium">{videoFps.toFixed(1)}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-sm text-gray-600">Audio FPS</div>
            <div className="text-lg font-medium">{audioFps.toFixed(1)}</div>
          </div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-sm font-medium">Status: {status}</div>
        </div>
        <div
          ref={logsRef}
          className="flex-1 bg-gray-50 rounded p-2 overflow-y-auto font-mono text-sm"
        >
          {logs.map((log, index) => (
            <p key={index}>{log}</p>
          ))}
        </div>
      </div>

      {/* Right Panel - Expression Editor */}
      <div className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Expression Editor</h2>
        
        {/* Expression Browser */}
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 h-48">
            <div className="border-r bg-gray-50">
              <h3 className="p-2 bg-gray-100 border-b">Categories</h3>
              <div className="overflow-y-auto h-[calc(100%-2.5rem)]">
                {Object.keys(expressionLibrary).map(category => (
                  <div
                    key={category}
                    className={`p-2 cursor-pointer hover:bg-gray-100 ${
                      selectedCategory === category ? 'bg-green-100' : ''
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <h3 className="p-2 bg-gray-100 border-b">Expressions</h3>
              <div className="overflow-y-auto h-[calc(100%-2.5rem)]">
                {selectedCategory && expressionLibrary[selectedCategory]?.map(expression => (
                  <div
                    key={expression}
                    className={`p-2 cursor-pointer hover:bg-gray-100 ${
                      selectedExpression === expression ? 'bg-green-100' : ''
                    }`}
                    onClick={() => setSelectedExpression(expression)}
                  >
                    {expression}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Expression Info */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Expression Info</h3>
            <div className="flex gap-2">
              <button
                onClick={addNewExpression}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                Add New
              </button>
              <button
                className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                style={{ display: selectedCategory && selectedExpression ? 'block' : 'none' }}
              >
                Delete Expression
              </button>
            </div>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category:</label>
              <input
                type="text"
                value={expressionInfo.category}
                onChange={(e) => setExpressionInfo(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded"
                disabled={!isAddingNewExpression}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name:</label>
              <input
                type="text"
                value={expressionInfo.name}
                onChange={(e) => setExpressionInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border rounded"
                disabled={!isAddingNewExpression}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description:</label>
              <textarea
                value={expressionInfo.description}
                onChange={(e) => setExpressionInfo(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border rounded"
                rows={3}
                disabled={!isAddingNewExpression}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Transition Duration (1-30):</label>
              <input
                type="number"
                min="1"
                max="30"
                value={expressionInfo.transitionDuration}
                onChange={(e) => setExpressionInfo(prev => ({ ...prev, transitionDuration: Number(e.target.value) }))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Speech Mouth Ratio (0.05-0.3):</label>
              <input
                type="number"
                min="0.05"
                max="0.3"
                step="0.01"
                value={expressionInfo.speechMouthRatio}
                onChange={(e) => setExpressionInfo(prev => ({ ...prev, speechMouthRatio: Number(e.target.value) }))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Expression Controls */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Expression Controls</h3>
          <button
            onClick={() => {
              setExpValues(new Array(totalMaskSize).fill(0))
              setIsDirty(true)
            }}
            className="mb-4 bg-gray-500 text-white px-3 py-1 rounded text-sm"
          >
            Load Default
          </button>
          <div className="grid grid-cols-2 gap-4">
            {expValues.map((value, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded">
                <label className="block text-sm font-medium mb-1">
                  {index < latentDescription.length ? latentDescription[index] : `Param ${index}`}
                </label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={value}
                  onChange={(e) => handleExpressionChange(index, Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 text-center">
                  Value: {value.toFixed(3)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={resetExpression}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded"
            >
              Discard Changes
            </button>
            <button
              onClick={saveExpression}
              className="flex-1 bg-green-500 text-white px-4 py-2 rounded"
            >
              Save Expression Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 