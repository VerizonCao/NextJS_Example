import React, { useState, useCallback } from 'react';

interface DragDropImageUploadProps {
  onImageUpload: (file: File) => void;
  croppedImageUrl?: string | null;
}

const DragDropImageUpload: React.FC<DragDropImageUploadProps> = ({ onImageUpload, croppedImageUrl }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      onImageUpload(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, [onImageUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      onImageUpload(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, [onImageUpload]);

  // Use croppedImageUrl if available, otherwise use previewUrl
  const displayImage = croppedImageUrl || previewUrl;

  return (
    <div
      className={`relative w-[525.42px] h-[937.44px] rounded-xl border-2 border-dashed ${
        isDragging ? 'border-[#5856d6] bg-[#5856d6]/10' : 'border-[#2a2a2e]'
      } flex flex-col items-center justify-center cursor-pointer bg-[#222327] hover:bg-[#2a2a2e] transition-colors`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        accept="image/*"
        onChange={handleFileInput}
      />
      {displayImage ? (
        <img src={displayImage} alt="Uploaded preview" className="w-full h-full object-cover rounded-xl" />
      ) : (
        <>
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            ></path>
          </svg>
          <div className="text-center">
            <p className="mt-4 text-sm text-gray-400">Drag and drop your image here, or click to select a file</p>
            <p className="mt-2 text-sm text-gray-400">For best results, use a high resolution .jpg or .png of 9:16</p>
          </div>
        </>
      )}
    </div>
  );
};

export default DragDropImageUpload; 