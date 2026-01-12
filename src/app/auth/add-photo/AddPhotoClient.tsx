'use client';

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
      setPreviewUrl(URL.createObjectURL(file));
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile photo');
      }

      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
      }

      const params = new URLSearchParams({
        user_id: userId,
        questions: JSON.stringify(questions)
      });

      router.push(`/auth/introcard?${params.toString()}`);
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
                <div className="flex flex-col items-center justify-center h-full">
                  {previewUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="relative">
                        {uploading && (
                          <svg className="absolute inset-0 w-72 h-72 -top-4 -left-4 transform -rotate-90" style={{ zIndex: 10 }}>
                            <circle
                              cx="144"
                              cy="144"
                              r="132"
                              stroke="#e5e7eb"
                              strokeWidth="3"
                              fill="none"
                            />
                            <circle
                              cx="144"
                              cy="144"
                              r="132"
                              stroke="#672DB7"
                              strokeWidth="3"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 132}`}
                              strokeDashoffset={`${2 * Math.PI * 132 * (1 - uploadProgress / 100)}`}
                              className="transition-all duration-500 ease-out"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}

                        <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-white shadow-lg relative">
                          <Image
                            src={previewUrl}
                            alt="Profile preview"
                            width={256}
                            height={256}
                            className="w-full h-full object-cover"
                          />

                          {uploading && (
                            <>
                              <div className="absolute inset-0 bg-black" style={{ opacity: 0.15, zIndex: 5 }}></div>
                              <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
                                <span className="text-white text-2xl font-bold">{uploadProgress}%</span>
                              </div>
                            </>
                          )}
                        </div>

                        {!uploading && (
                          <button
                            onClick={() => document.getElementById('photo-upload')?.click()}
                            className="absolute -top-2 -right-2 w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Change photo"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-8">
                        <Image
                          src="/assets/kamm.png"
                          alt="Camera icon"
                          width={80}
                          height={80}
                          className="mx-auto"
                        />
                      </div>

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

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '15%' }}></div>
        </div>

        <div className="flex justify-between items-center px-6 py-4">
          <button
            onClick={() => router.back()}
            className="text-gray-900 font-medium hover:text-gray-500 transition-colors cursor-pointer"
          >
            Back
          </button>

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
