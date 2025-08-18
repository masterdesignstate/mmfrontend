'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { uploadToAzureBlob } from '@/utils/azureUpload';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function AddPhotoPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get user ID from URL parameters
  const userId = searchParams.get('user_id');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleContinue = async () => {
    if (!selectedFile || !userId) {
      setError('Please select a photo and ensure user ID is available');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      console.log('🚀 Starting Azure upload for user:', userId);
      
      // Upload to Azure Blob Storage
      const photoUrl = await uploadToAzureBlob(
        selectedFile, 
        userId,
        (progress) => setUploadProgress(progress)
      );
      
      console.log('✅ Azure upload successful:', photoUrl);
      
      // Update user profile with photo URL
      const response = await fetch(getApiUrl(API_ENDPOINTS.UPDATE_PROFILE_PHOTO), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          profile_photo_url: photoUrl
        })
      });

      if (response.ok) {
        console.log('✅ Profile photo updated successfully');
        // Navigate to gender selection page
        const params = new URLSearchParams({ user_id: userId });
        router.push(`/auth/gender?${params.toString()}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile photo');
      }
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-4">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Hamburger Menu */}
          <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px-120px)] px-6 pb-32">
        <div className="max-w-2xl w-full">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Add a profile picture
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-600 mb-8 text-xl">
            You'll need a photo to get started. You can make changes later.
          </p>
          
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {/* Upload Progress */}
          {uploading && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
              <div className="flex items-center justify-between mb-2">
                <span>Uploading photo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Photo Upload Area */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className={`block w-full h-[500px] rounded-lg ${
                previewUrl 
                  ? 'bg-transparent border-none' 
                  : 'bg-gray-100 border-2 border-dashed border-gray-400'
              }`}>
                <div className="flex flex-col items-center justify-center h-full">
                  {previewUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Profile Picture Preview */}
                      <div className="relative">
                        <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-white shadow-lg">
                          <Image
                            src={previewUrl}
                            alt="Profile preview"
                            width={256}
                            height={256}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Edit Button (Pencil Icon) */}
                        <button
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          className="absolute -top-2 -right-2 w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors cursor-pointer"
                          title="Change photo"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Camera Icon */}
                      <div className="mb-8">
                        <Image
                          src="/assets/kamm.png"
                          alt="Camera icon"
                          width={80}
                          height={80}
                          className="mx-auto"
                        />
                      </div>
                      
                      {/* Add Photo Button - Now Actually Tappable */}
                      <label
                        htmlFor="photo-upload"
                        className="px-8 py-3 bg-white border border-gray-400 rounded-md text-gray-900 hover:bg-gray-50 transition-colors text-base cursor-pointer hover:shadow-md"
                      >
                        Add photo
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '15%' }}></div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center px-6 py-4">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="text-gray-900 font-medium hover:text-gray-700 transition-colors cursor-pointer"
          >
            Back
          </button>
          
          {/* Next Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedFile || uploading}
            className={`px-8 py-3 rounded-md font-medium transition-colors ${
              selectedFile && !uploading
                ? 'bg-black text-white hover:bg-gray-800 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </div>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
