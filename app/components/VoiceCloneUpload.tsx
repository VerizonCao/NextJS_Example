import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Play, Pause, X } from 'lucide-react';
import { cloneVoice } from '@/app/lib/actions';

interface VoiceCloneUploadProps {
  onVoiceCloned: (voiceId: string, originalAudioUrl: string) => void;
}

export default function VoiceCloneUpload({ onVoiceCloned }: VoiceCloneUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handlePlayPause = () => {
    if (!previewUrl) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(previewUrl);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  const handleClear = () => {
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsPlaying(false);
    setError(null);
  };

  const handleCloneVoice = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await cloneVoice(formData);

      if (result.success && result.voice_id) {
        onVoiceCloned(result.voice_id, previewUrl!);
        handleClear();
      } else {
        setError(result.message || 'Failed to clone voice');
        console.error('Voice clone error:', result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Voice clone error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-4 bg-[#222327] rounded-xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
            id="voice-file"
          />
          <label
            htmlFor="voice-file"
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1e] text-white rounded-lg cursor-pointer hover:bg-[#2a2b30] transition-colors"
          >
            <Upload size={20} />
            <span>Upload Audio</span>
          </label>
          {selectedFile && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="text-[#5856d6] hover:text-[#3c34b5]"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}

        {selectedFile && (
          <Button
            onClick={handleCloneVoice}
            disabled={isLoading}
            className="w-full bg-[#5856d6] hover:bg-[#3c34b5] text-white"
          >
            {isLoading ? 'Cloning...' : 'Clone Voice'}
          </Button>
        )}
      </div>
    </div>
  );
} 