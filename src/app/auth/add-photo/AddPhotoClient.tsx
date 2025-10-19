'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { uploadToAzureBlob } from '@/utils/azureUpload';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function AddPhotoClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get('user_id');

  useEffect(() => {
    const loadQuestions = async () => {
      if (!userId) return;

      const questionsParam = searchParams.get('questions');
      if (questionsParam) {
        try {
          const parsedQuestions = JSON.parse(questionsParam);
          setQuestions(parsedQuestions);
          console.log('📋 Loaded questions from URL params:', parsedQuestions);
          return;
        } catch (error) {
          console.error('Error parsing questions from URL:', error);
        }
      }

      setLoadingQuestions(true);
      try {
        const response = await fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?question_number=1&question_number=2`);
        if (response.ok) {
          const data = await response.json();
          setQuestions(data.results || []);
          console.log('📋 Loaded questions from backend:', data.results);
        } else {
          console.error('Failed to load questions');
        }
      } catch (error) {
        console.error('Error loading questions:', error);
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [userId, searchParams]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
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
    const startTime = Date.now();

    try {
      console.log('🚀 Starting Azure upload for user:', userId);

      const photoUrl = await uploadToAzureBlob(
        selectedFile,
        userId,
        (progress) => setUploadProgress(progress)
      );

      console.log('✅ Azure upload successful:', photoUrl);

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

        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < 1000) {
          await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
        }

        const params = new URLSearchParams({
          user_id: userId,
          questions: JSON.stringify(questions)
        });
        router.push(`/auth/introcard?${params.toString()}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile photo');
      }
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="w-full bg-white border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center">
            <Image
              src="/assets/mmlogox.png"
              alt="Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </div>

          <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px-120px)] px-6 pb-32">
        <div className="max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Add a profile picture
          </h1>

          <p className="text-gray-600 mb-8 text-xl">
            You&apos;ll need a photo to get started. You can make changes later.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

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
                {previewUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={previewUrl}
                      alt="Selected photo preview"
                      fill
                      className="object-cover rounded-lg"
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg">
                        <p className="text-white text-lg mb-2">Uploading...</p>
                        <div className="w-3/4 bg-white bg-opacity-30 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-white h-full rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-white text-sm mt-2">{uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="photo-upload"
                    className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                  >
                    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
                      <div className="mb-4">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16l3.6-4.5a1 1 0 011.59 0L12 16m0 0l3.6-4.5a1 1 0 011.59 0L21 16m-9 0v6m0-6l3.6-4.5m-7.2 0L3 16M3 20h18" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-700 mb-2">
                        Upload a photo
                      </h2>
                      <p className="text-gray-500">
                        Recommended: clear headshot, bright lighting, no group photos.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={uploading ? undefined : handleContinue}
            className={`w-full py-4 rounded-full font-semibold text-lg transition-colors ${
              uploading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-black text-white hover:bg-gray-900'
            }`}
          >
            {uploading ? 'Uploading...' : 'Continue'}
          </button>
        </div>
      </main>
    </div>
  );
}
