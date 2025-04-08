'use client';

import React from 'react';
import { LocalUserChoices } from '@livekit/components-react';

interface CustomPreJoinProps {
  defaults?: LocalUserChoices;
  onSubmit: (values: LocalUserChoices) => void;
  onError?: (error: any) => void;
}

// Create a ref type for the component
export interface CustomPreJoinRef {
  handleSubmit: () => void;
}

// Create the base component without ref
function CustomPreJoinBase({ defaults, onSubmit, onError }: CustomPreJoinProps) {
  const [username, setUsername] = React.useState(defaults?.username || '');
  const [videoEnabled, setVideoEnabled] = React.useState(defaults?.videoEnabled ?? true);
  const [audioEnabled, setAudioEnabled] = React.useState(defaults?.audioEnabled ?? true);
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = React.useState<string | undefined>(
    defaults?.videoDeviceId
  );
  const [selectedAudioDevice, setSelectedAudioDevice] = React.useState<string | undefined>(
    defaults?.audioDeviceId
  );

  // Load available devices
  React.useEffect(() => {
    async function loadDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((device) => device.kind === 'videoinput'));
        setAudioDevices(devices.filter((device) => device.kind === 'audioinput'));
      } catch (error) {
        console.error('Error loading devices:', error);
        if (onError) onError(error);
      }
    }
    loadDevices();
  }, [onError]);

  // This function will be called externally when the agent is ready
  const handleSubmit = React.useCallback(() => {
    if (!username) {
      alert('Please enter your name');
      return;
    }
    
    // Pass the user choices to the parent component
    // These values will be used by LiveKit to control the media devices
    onSubmit({
      username,
      videoEnabled,
      audioEnabled,
      videoDeviceId: selectedVideoDevice,
      audioDeviceId: selectedAudioDevice,
    });
  }, [username, videoEnabled, audioEnabled, selectedVideoDevice, selectedAudioDevice, onSubmit]);

  // For testing purposes - direct submit function
  const handleDirectSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSubmit();
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Waiting for agent banner at the top */}
      <div className="w-full p-4 bg-blue-600 text-white text-center">
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium">Waiting for agent to join...</p>
        </div>
        <p className="text-sm mt-1 opacity-80">You will be automatically connected when the agent is ready.</p>
      </div>
      
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Join Room</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column - User info */}
          <div className="space-y-6">
            <div className="w-full">
              <label className="block text-gray-700 text-lg font-semibold mb-2" htmlFor="username">
                Your Name
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
            
            <div className="w-full p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Media Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={videoEnabled}
                    onChange={(e) => setVideoEnabled(e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-gray-700 text-lg">Enable Video</span>
                </div>
                
                {videoEnabled && videoDevices.length > 0 && (
                  <div className="ml-8">
                    <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="videoDevice">
                      Camera
                    </label>
                    <select
                      id="videoDevice"
                      value={selectedVideoDevice}
                      onChange={(e) => setSelectedVideoDevice(e.target.value)}
                      className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={audioEnabled}
                    onChange={(e) => setAudioEnabled(e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-gray-700 text-lg">Enable Audio</span>
                </div>
                
                {audioEnabled && audioDevices.length > 0 && (
                  <div className="ml-8">
                    <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="audioDevice">
                      Microphone
                    </label>
                    <select
                      id="audioDevice"
                      value={selectedAudioDevice}
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                      className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            {/* Join Room Button for testing */}
            <div className="w-full mt-6">
              <button
                onClick={handleDirectSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
              >
                Join Room (Testing)
              </button>
            </div>
          </div>
          
          {/* Right column - Preview or instructions */}
          <div className="bg-gray-50 p-6 rounded-lg flex flex-col justify-center">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Room Information</h3>
            <p className="text-gray-600 mb-4">
              You are about to join a video conference room. Please make sure your camera and microphone are working properly before joining.
            </p>
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Tips:</h4>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>Find a quiet, well-lit location</li>
                <li>Test your microphone and camera before joining</li>
                <li>Close other applications that might use your camera</li>
                <li>Use headphones to prevent echo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create the forwardRef version
export const CustomPreJoin = React.forwardRef<CustomPreJoinRef, CustomPreJoinProps>((props, ref) => {
  const handleSubmitRef = React.useRef<(() => void) | null>(null);
  
  // Expose the handleSubmit function to be called externally
  React.useImperativeHandle(ref, () => ({
    handleSubmit: () => {
      if (handleSubmitRef.current) {
        handleSubmitRef.current();
      }
    }
  }), []);
  
  return <CustomPreJoinBase {...props} />;
});