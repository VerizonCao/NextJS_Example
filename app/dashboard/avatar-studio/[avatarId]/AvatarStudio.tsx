'use client'

import { useState, useEffect, useRef } from 'react'
import { LiveKitRoom, LocalUserChoices, useRoomContext, VideoConference } from '@livekit/components-react'
import { Room, RoomOptions, VideoCodec, VideoPresets } from 'livekit-client'
import { CustomPreJoin } from '@/app/ui/rita/prejoin'
import { ConnectionDetails } from '@/lib/types'
import { VideoConferenceCustom } from '@/app/components/VideoConferenceCustom'
import { startStreamingSession } from '@/app/lib/actions'
import { incrementAvatarRequestCounter } from '@/app/lib/actions';
import React from 'react'

// Constants
const totalMaskSize = 29
const latentDescription = [
    "Gaze & eyebrow 1", // 4
    "Eyebrow tight Left/Right", // 6
    "Eyebrow tight Up/Down", // 7
    "Left cheek", // 9
    "Shoulder Balance adjustment", // 10
    "Right head width", // 12
    "Head Move Left/Right", // 15
    "Head Move Up/Down", // 16
    "Right cheek", // 21
    "Right Mouth Corner", // 22
    "Left head width", // 30
    "Left Eye Left/Right", // 33
    "Left Eye Blink",    // 34
    "Left eye adjustment", // 39
    "Left Eye Roll Up/Down", // 40
    "Smile / Displease", // 43
    "Right Eye Left/Right", // 45
    "Right Eye Blink", // 46
    "Right eye adjustment", // 48
    "Right Eye Up/Down", // 49
    "Left Mouth Corner ", // 51
    "Show Teeth / Tongue", // 52
    "Mouth Shape 1", // 53
    "Lower Lip Left/Right", // 57
    "Lower Lip Up/Down", // 58
    "Lower Lip In/Out", // 59
    "Upper Lip Left/Right", // 60
    "Upper Lip Up/Down", // 61
    "Mouth Shape 2", // 62
]

interface ExpressionInfo {
  category: string;
  name: string;
  description: string;
  transition_duration: number;
  speech_mouth_ratio: number;
}

interface ExpressionData {
  info: ExpressionInfo;
  exp_values: number[];
}

interface ExpressionLibrary {
  [category: string]: {
    [expressionName: string]: ExpressionData;
  };
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
  const [isLoading, setIsLoading] = useState(true)
  const [videoFps, setVideoFps] = useState(0)
  const [audioFps, setAudioFps] = useState(0)
  const [status, setStatus] = useState('Disconnected')
  const [logs, setLogs] = useState<string[]>(['Connection logs will appear here...'])
  const [expValues, setExpValues] = useState<number[]>(new Array(totalMaskSize).fill(0))
  const [defaultExpValues, setDefaultExpValues] = useState<number[]>(new Array(totalMaskSize).fill(0))
  const [expressionInfo, setExpressionInfo] = useState<ExpressionInfo>({
    category: '',
    name: '',
    description: '',
    transition_duration: 10,
    speech_mouth_ratio: 0.15
  })
  const [isAddingNewExpression, setIsAddingNewExpression] = useState(false)
  const [expressionLibrary, setExpressionLibrary] = useState<ExpressionLibrary>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedExpression, setSelectedExpression] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)
  const [editingTransitionDuration, setEditingTransitionDuration] = useState(10)
  const [editingSpeechMouthRatio, setEditingSpeechMouthRatio] = useState(0.15)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `${timestamp} - ${message}`])
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }

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
        videoCaptureDefaults: { deviceId: preJoinDefaults.videoDeviceId, resolution: VideoPresets.h720 },
        publishDefaults: {
          dtx: false,
          videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
          red: true,
          videoCodec: 'VP8' as VideoCodec,
        },
        audioCaptureDefaults: { deviceId: preJoinDefaults.audioDeviceId },
        adaptiveStream: { pixelDensity: 'screen' },
        dynacast: true,
      }

      const newRoom = new Room(roomOptions)
      await newRoom.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken)
      setRoom(newRoom)
      setHasConnected(true)
      setIsStreaming(true)
      setStatus('Loading Data...')
      addLog('LiveKit connection established')

      // Start streaming session
      try {
        await startStreamingSession({
          instruction: "test",
          seconds: 300,
          room: `${avatarId}-room`,
          avatarSource: avatarUri,
          avatar_id: avatarId,
        });
        await incrementAvatarRequestCounter(avatarId);
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

  const handleStopStreaming = async () => {
    try {
      setStatus('Disconnecting...')
      addLog('Stopping stream connection...')

      if (room) {
        await room.disconnect()
        setRoom(null)
      }

      // Reset all states
      setPreJoinChoices(undefined)
      setConnectionDetails(undefined)
      setHasConnected(false)
      setIsStreaming(false)
      setStatus('Disconnected')
      setVideoFps(0)
      setAudioFps(0)
      setIsLoading(true)  // Set loading to true to lock controls
      setLogs(['Connection logs will appear here...'])  // Reset logs to initial state

      // Reset expression-related states
      setExpValues(new Array(totalMaskSize).fill(0))
      setDefaultExpValues(new Array(totalMaskSize).fill(0))
      setExpressionInfo({
        category: '',
        name: '',
        description: '',
        transition_duration: 10,
        speech_mouth_ratio: 0.15
      })
      setEditingTransitionDuration(10)
      setEditingSpeechMouthRatio(0.15)
      setIsDirty(false)
      setIsAddingNewExpression(false)
      setSelectedCategory('')
      setSelectedExpression('')
      setExpressionLibrary({})  // Reset the expression library

      addLog('Stream disconnected successfully')
    } catch (error) {
      console.error('Error stopping stream:', error)
      setStatus('Error - Disconnection Failed')
      addLog(`Error stopping stream: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    const expressions = expressionLibrary[category];
    if (expressions) {
      const expressionNames = Object.keys(expressions);
      if (expressionNames.length > 0) {
        handleExpressionSelect(category, expressionNames[0]);
      }
    }
  }

  const handleExpressionSelect = (
    category: string,
    expressionName: string,
    expressionDataFromState?: ExpressionData // optional
  ) => {
    setSelectedCategory(category);
    setSelectedExpression(expressionName);
    
    const categoryData = expressionLibrary[category];
    const expressionData = expressionDataFromState ?? (categoryData && categoryData[expressionName]);

    if (expressionData) {
      setExpValues(expressionData.exp_values);
      setDefaultExpValues(expressionData.exp_values);
      setExpressionInfo({
        category: category,
        name: expressionName,
        description: expressionData.info.description,
        transition_duration: expressionData.info.transition_duration,
        speech_mouth_ratio: expressionData.info.speech_mouth_ratio
      });
      setEditingTransitionDuration(expressionData.info.transition_duration);
      setEditingSpeechMouthRatio(expressionData.info.speech_mouth_ratio);
    }

    // Send selection data to backend
    if (room && room.state === 'connected') {
      try {
        const selectData = {
          type: 'select_expression',
          data: {
            category: category,
            name: expressionName
          }
        };

        room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(selectData)),
          { reliable: true }
        );
        addLog(`Selecting expression: ${category}/${expressionName}`);
      } catch (error) {
        console.error('Error sending expression selection:', error);
        addLog(`Error sending expression selection: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleDataMessage = (payload: Uint8Array) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload));
      
      if (data.type === 'expression_select_response') {
        if (data.success) {
          addLog(data.message);
        } else {
          console.error('Error selecting expression:', data.error);
          addLog(`Error selecting expression: ${data.error}`);
        }
      } else if (data.type === 'expression_save_response') {
        if (data.success) {
          addLog(data.message);
          setIsDirty(false);
        
          const updatedInfo = {
            ...expressionInfo, // local latest edits
            transition_duration: expressionInfo.transition_duration,
            speech_mouth_ratio: expressionInfo.speech_mouth_ratio,
          };
        
          if (isAddingNewExpression) {
            setIsAddingNewExpression(false);
            const newExpression = {
              info: updatedInfo,
              exp_values: [...expValues],
            };
        
            setExpressionLibrary(prev => {
              const newLibrary = { ...prev };
              if (!newLibrary[updatedInfo.category]) {
                newLibrary[updatedInfo.category] = {};
              }
              newLibrary[updatedInfo.category][updatedInfo.name] = newExpression;
              return newLibrary;
            });
        
            // Select the newly created expression
            setSelectedCategory(updatedInfo.category);
            setSelectedExpression(updatedInfo.name);
            setDefaultExpValues([...expValues]);
            setExpressionInfo(updatedInfo); // 🔥 important: refresh info
        
          } else {
            setExpressionLibrary(prev => {
              const newLibrary = { ...prev };
              if (newLibrary[selectedCategory] && newLibrary[selectedCategory][selectedExpression]) {
                newLibrary[selectedCategory][selectedExpression] = {
                  ...newLibrary[selectedCategory][selectedExpression],
                  info: updatedInfo,
                  exp_values: [...expValues],
                  // info: { ...updatedInfo },  // 🔥 Only trust updatedInfo
                  // exp_values: [...expValues] // 🔥 Always trust latest exp_values
                };
              }
              return newLibrary;
            });
        
            setDefaultExpValues([...expValues]);
            setExpressionInfo(updatedInfo); // 🔥 important: refresh info
          }
        }        
      } else if (data.type === 'expression_delete_response') {
        if (data.success) {
          addLog(data.message);
      
          setExpressionLibrary(prev => {
            const newLibrary = { ...prev };
            if (newLibrary[selectedCategory]) {
              delete newLibrary[selectedCategory][selectedExpression];
              if (Object.keys(newLibrary[selectedCategory]).length === 0) {
                delete newLibrary[selectedCategory];
              }
            }
            return newLibrary;
          });
      
          // After deletion, try to auto-select a new valid expression
          setTimeout(() => {
            const updatedLibrary = expressionLibrary; // ← careful: this needs to be fresh if setExpressionLibrary is async
      
            const categories = Object.keys(updatedLibrary).sort();
            if (categories.length > 0) {
              const categoryToSelect = categories[0];
              const expressions = updatedLibrary[categoryToSelect];
              if (expressions) {
                const expressionNames = Object.keys(expressions);
                if (expressionNames.length > 0) {
                  const firstExpression = expressionNames[0];
                  handleExpressionSelect(categoryToSelect, firstExpression);
                  addLog(`Auto selected ${categoryToSelect}/${firstExpression} after deletion`);
                  return;
                }
              }
            }
      
            // No expressions left
            setSelectedCategory('');
            setSelectedExpression('');
            setExpValues(new Array(totalMaskSize).fill(0));
            setDefaultExpValues(new Array(totalMaskSize).fill(0));
            setExpressionInfo({
              category: '',
              name: '',
              description: '',
              transition_duration: 10,
              speech_mouth_ratio: 0.15,
            });
            addLog('All expressions deleted, reset to blank');
          }, 0);
      
        } else {
          console.error('Error deleting expression:', data.error);
          addLog(`Error deleting expression: ${data.error}`);
        }
      } else if (data.type === 'initial_categories_and_expressions') {
        if (data.error) {
          console.error('Error receiving initial categories:', data.error);
          addLog(`Error receiving initial categories: ${data.error}`);
          setStatus('Error - Data Load Failed');
          return;
        }
  
        console.log("Received expression library!!:", data.expressions);
        setExpressionLibrary(data.expressions); // async update, DON'T rely on it immediately
        setIsLoading(false); // Set loading to false when initial data is received
        setStatus('Connected'); // Set status to Connected only after data is loaded
        
        const categories = Object.keys(data.expressions).sort();
        if (categories.length > 0) {
          const neutralCategory = categories.find(cat => cat.toLowerCase() === 'neutral');
          const categoryToSelect = neutralCategory || categories[0];
  
          const expressions = data.expressions[categoryToSelect];
          if (expressions) {
            const expressionNames = Object.keys(expressions);
            if (expressionNames.length > 0) {
              const firstExpression = expressionNames[0];
              // ** directly call handleExpressionSelect using data.expressions, not expressionLibrary **
              setSelectedCategory(categoryToSelect);
              setSelectedExpression(firstExpression);
              const expressionData = expressions[firstExpression];
              if (expressionData) {
                setExpValues(expressionData.exp_values);
                setDefaultExpValues(expressionData.exp_values);
                setExpressionInfo(expressionData.info);
                setIsDirty(false);
                addLog(`Auto selected ${categoryToSelect}/${firstExpression}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing data message:', error);
      addLog(`Error processing data message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  useEffect(() => {
    if (!room) return

    const sendExpressionData = () => {
      if (room.state !== 'connected' || !isDirty) return
      setIsDirty(false)
      try {
        room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({
            type: 'expression_values',
            values: expValues,
            timestamp: Date.now()
          })),
          { reliable: true }
        )
      } catch (error) {
        console.error('Error sending expression data:', error)
      }
    }

    let cleanup: (() => void) | undefined

    if (room.state === 'connected') {
      const interval = setInterval(sendExpressionData, 20)
      cleanup = () => clearInterval(interval)
    }

    room.on('connected', () => {
      const interval = setInterval(sendExpressionData, 20)
      cleanup = () => clearInterval(interval)
    })

    room.on('disconnected', () => {
      if (cleanup) cleanup()
    })

    room.on('dataReceived', handleDataMessage)

    return () => {
      if (cleanup) cleanup()
      room.off('dataReceived', handleDataMessage)
    }
  }, [room, expValues, isDirty])

  const handleExpressionChange = (index: number, value: number) => {
    setExpValues(prev => {
      const newValues = [...prev]
      newValues[index] = value
      return newValues
    })
    setIsDirty(true)
  }

  const resetExpression = () => {
    setExpValues([...defaultExpValues])
    setIsDirty(true)
    addLog('Expression values reset to default')
  }

  const saveExpression = async () => {
    if (!room || room.state !== 'connected') {
      addLog('Error: Not connected to room');
      return;
    }

    try {
      // First update the local state
      const updatedInfo = {
        ...expressionInfo,
        transition_duration: editingTransitionDuration,
        speech_mouth_ratio: editingSpeechMouthRatio,
      };

      console.log("current expression info:", expressionInfo);
      console.log("update expression info:", updatedInfo);

      if (isAddingNewExpression) {
        // Update local state for new expression
        setExpressionLibrary(prev => {
          const newLibrary = { ...prev };
          if (!newLibrary[updatedInfo.category]) {
            newLibrary[updatedInfo.category] = {};
          }
          newLibrary[updatedInfo.category][updatedInfo.name] = {
            info: updatedInfo,
            exp_values: [...expValues]
          };
          return newLibrary;
        });
        handleExpressionSelect(updatedInfo.category, updatedInfo.name, {
          info: updatedInfo,
          exp_values: [...expValues]
        });
      } else {
        // Update local state for existing expression
        setExpressionLibrary(prev => {
          const newLibrary = { ...prev };
          console.log("updated expression value 2:", updatedInfo);
          if (newLibrary[selectedCategory] && newLibrary[selectedCategory][selectedExpression]) {
            newLibrary[selectedCategory][selectedExpression] = {
              ...newLibrary[selectedCategory][selectedExpression],
              info: updatedInfo,
              exp_values: [...expValues]
            };
          }
          console.log("new library:", newLibrary);
          return newLibrary;
        });
        handleExpressionSelect(selectedCategory, selectedExpression, {
          info: updatedInfo,
          exp_values: [...expValues]
        });
      }

      // Then send the data to server
      if (isAddingNewExpression) {
        const newExpressionData = {
          type: 'save_new_expression',
          data: {
            category: updatedInfo.category,
            name: updatedInfo.name,
            description: updatedInfo.description,
            transition_duration: updatedInfo.transition_duration,
            speech_mouth_ratio: updatedInfo.speech_mouth_ratio,
            exp_values: expValues
          }
        };

        room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(newExpressionData)),
          { reliable: true }
        );
        addLog('Sending new expression data...');
      } else {
        const editedExpressionData = {
          type: 'save_edited_expression',
          data: {
            category: selectedCategory,
            name: selectedExpression,
            transition_duration: updatedInfo.transition_duration,
            speech_mouth_ratio: updatedInfo.speech_mouth_ratio,
            exp_values: expValues
          }
        };

        room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(editedExpressionData)),
          { reliable: true }
        );
        addLog('Sending edited expression data...');
      }
    } catch (error) {
      console.error('Error saving expression:', error);
      addLog(`Error saving expression: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addNewExpression = () => {
    setIsAddingNewExpression(true)
    setExpressionInfo({
      category: '',
      name: '',
      description: '',
      transition_duration: 10,
      speech_mouth_ratio: 0.15
    })
    addLog('Preparing to add new expression')
  }

  const deleteExpression = async () => {
    if (!room || room.state !== 'connected') {
      addLog('Error: Not connected to room');
      return;
    }

    if (!selectedCategory || !selectedExpression) {
      addLog('Error: No expression selected');
      return;
    }

    try {
      const deleteData = {
        type: 'delete_expression',
        data: {
          category: selectedCategory,
          name: selectedExpression
        }
      };

      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(deleteData)),
        { reliable: true }
      );
      addLog('Sending delete request...');
    } catch (error) {
      console.error('Error sending delete request:', error);
      addLog(`Error sending delete request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // useEffect to automatically start streaming on component mount
  useEffect(() => {
    // Check if not already streaming and essential props are available
    if (!isStreaming && avatarId) {
      addLog('Component mounted, attempting to auto-start streaming...');
      handleStartStreaming();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="flex gap-4 h-screen p-4">
      {/* Left Panel - Video Stream */}
      <div className="w-[33.33%] bg-black/40 rounded-lg shadow flex flex-col">
        <div className="flex-1 p-2 flex flex-col">
          <div className="w-[80%] mx-auto aspect-[9/16] bg-black rounded overflow-hidden">
            {!isStreaming ? (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-white text-lg">
                  {status === 'Disconnected' || status === 'Connecting...' || status === 'Loading Data...' ? status : 'Click Start Streaming to begin'}
                </div>
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
                  <div className="w-full h-full">
                    <VideoConferenceCustom 
                      hideControlBar={true}
                    />
                  </div>
                </LiveKitRoom>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleStartStreaming}
              disabled={isStreaming}
              className={`flex-1 px-4 py-2 rounded transition-colors ${
                isStreaming 
                  ? 'bg-black/60 text-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isStreaming ? 'Streaming...' : 'Start Streaming'}
            </button>
            <button
              onClick={handleStopStreaming}
              disabled={!isStreaming}
              className={`flex-1 px-4 py-2 rounded transition-colors ${
                !isStreaming 
                  ? 'bg-black/60 text-gray-300 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Stop Streaming
            </button>
          </div>
          <div className="bg-black/40 p-2 rounded">
            <div className="text-sm font-medium text-gray-200">Status: {status}</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Expression Editor */}
      <div className="flex-1 bg-black/40 rounded-lg shadow flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Expression Editor</h2>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          {/* Top Row - Expression Browser and Info */}
          <div className="flex gap-4">
            {/* Left Column - Expression Library */}
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2 text-white">Expression library</h3>
              <div className="border border-white/10 rounded-lg overflow-hidden flex h-[200px]">
                <div className="flex-1 border-r border-white/10 bg-black/40 overflow-y-auto">
                  <h3 className="p-2 bg-black/60 border-b border-white/10 text-white">Categories</h3>
                  <ul className="list-none p-0 m-0">
                    {Object.keys(expressionLibrary).map((category) => (
                      <li
                        key={category}
                        className={`p-2 cursor-pointer hover:bg-black/60 text-gray-200 ${
                          selectedCategory === category ? 'bg-blue-900/50' : ''
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !isLoading && handleCategorySelect(category)}
                      >
                        {category}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-2 overflow-y-auto">
                  <h3 className="p-2 bg-black/60 border-b border-white/10 text-white">Expressions</h3>
                  <ul className="list-none p-0 m-0">
                    {selectedCategory && expressionLibrary[selectedCategory] && 
                      Object.keys(expressionLibrary[selectedCategory]).map((expressionName) => (
                        <li
                          key={expressionName}
                          className={`p-2 cursor-pointer hover:bg-black/60 text-gray-200 ${
                            selectedExpression === expressionName ? 'bg-blue-900/50' : ''
                          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => !isLoading && handleExpressionSelect(selectedCategory, expressionName)}
                        >
                          {expressionName}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column - Expression Info */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <h3 id="expressionInfoHeading" className="text-lg font-medium text-white">Expression Info</h3>
                <div className="flex gap-2">
                  <button
                    onClick={addNewExpression}
                    className={`bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isLoading}
                  >
                    Add New
                  </button>
                  <button
                    onClick={deleteExpression}
                    className={`bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ display: selectedCategory && selectedExpression ? 'block' : 'none' }}
                    disabled={isLoading}
                  >
                    Delete Expression
                  </button>
                </div>
              </div>
              <div className="bg-black/40 p-4 rounded-lg">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1 text-gray-200">Category:</label>
                      <input
                        type="text"
                        id="expCategoryInput"
                        value={expressionInfo.category}
                        onChange={(e) => setExpressionInfo(prev => ({ ...prev, category: e.target.value }))}
                        className={`w-full p-2 border border-white/10 rounded bg-black/60 text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!isAddingNewExpression || isLoading}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1 text-gray-200">Name:</label>
                      <input
                        type="text"
                        id="expNameInput"
                        value={expressionInfo.name}
                        onChange={(e) => setExpressionInfo(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full p-2 border border-white/10 rounded bg-black/60 text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!isAddingNewExpression || isLoading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-200">Description:</label>
                    <textarea
                      id="expDescriptionInput"
                      value={expressionInfo.description}
                      onChange={(e) => setExpressionInfo(prev => ({ ...prev, description: e.target.value }))}
                      className={`w-full p-2 border border-white/10 rounded bg-black/60 text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      rows={1}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1 text-gray-200">Transition Duration (1-30):</label>
                      <input
                        type="number"
                        id="expTransitionDuration"
                        min="1"
                        max="30"
                        value={editingTransitionDuration}
                        onChange={(e) => setEditingTransitionDuration(Number(e.target.value))}
                        className={`w-full p-2 border border-white/10 rounded bg-black/60 text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1 text-gray-200">Speech Mouth Ratio (0.05-0.3):</label>
                      <input
                        type="number"
                        id="expSpeechMouthRatio"
                        min="0.05"
                        max="0.3"
                        step="0.01"
                        value={editingSpeechMouthRatio}
                        onChange={(e) => setEditingSpeechMouthRatio(Number(e.target.value))}
                        className={`w-full p-2 border border-white/10 rounded bg-black/60 text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expression Controls */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-white">Expression Controls</h3>
              <button
                id="loadDefaultExpButton"
                onClick={() => {
                  setExpValues(new Array(totalMaskSize).fill(0))
                  setIsDirty(true)
                }}
                className={`bg-black/60 text-white px-3 py-1 rounded text-sm hover:bg-black/80 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                Load Default
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 550px)' }}>
              <div className="grid grid-cols-2 gap-4">
                {expValues.map((value, index) => (
                  <div key={index} className="bg-black/40 p-3 rounded">
                    <label className="block text-sm font-medium mb-1 text-gray-200">
                      {index < latentDescription.length ? latentDescription[index] : `Param ${index}`}
                    </label>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={value}
                      onChange={(e) => handleExpressionChange(index, Number(e.target.value))}
                      className={`w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isLoading}
                    />
                    <div className="text-sm text-gray-400 text-center">
                      Value: {value.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-2 border-t border-white/10">
              <button
                id="resetExpButton"
                onClick={resetExpression}
                className={`flex-1 bg-black/60 text-white px-4 py-2 rounded hover:bg-black/80 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                Discard Changes
              </button>
              <button
                id="saveExpButton"
                onClick={saveExpression}
                className={`flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                Save Expression Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 