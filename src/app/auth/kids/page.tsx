'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function KidsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>('');

  // Hardcoded kids question IDs from Django database (question_number=10)
  const kidsQuestionIds = {
    'Have': '4be86e73-87be-4c81-a66a-5490255f3e3b',        // Group 1: Have Kids
    'Want': 'b3d3b8c8-f1ef-43ce-8e36-1b78b75848c6'         // Group 2: Want Kids
  };

  // Hardcoded kids labels
  const kidsLabels = ['WANT KIDS', 'HAVE KIDS'];

  // State for 2 kids sliders
  const kidsKeys = ['kids1', 'kids2'] as const;
  const meOpenKeys = ['kids1MeOpen', 'kids2MeOpen'] as const;
  const lookingOpenKeys = ['kids1LookingOpen', 'kids2LookingOpen'] as const;
  type KidsKey = (typeof kidsKeys)[number];
  type MeOpenKey = (typeof meOpenKeys)[number];
  type LookingOpenKey = (typeof lookingOpenKeys)[number];

  const [myKids, setMyKids] = useState<Record<KidsKey, number>>({
    kids1: 3, // Want Kids
    kids2: 3  // Have Kids
  });

  const [lookingFor, setLookingFor] = useState<Record<KidsKey, number>>({
    kids1: 3, // Want Kids
    kids2: 3  // Have Kids
  });

  const [openToAll, setOpenToAll] = useState<Record<MeOpenKey | LookingOpenKey, boolean>>({
    kids1MeOpen: false,
    kids2MeOpen: false,
    kids1LookingOpen: false,
    kids2LookingOpen: false
  });

  const [importance, setImportance] = useState({
    me: 1,
    lookingFor: 3
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Hardcoded slider labels for kids questions
  const kidsSliderLabels = ['YES', 'MAYBE', 'NO PREFERENCE', 'PREFER NO', 'DEFINITELY NO'];
  
  // Helper function to render all available answer labels at the top
  const renderTopLabels = (sliderIndex: number) => {
    const wantKidsLabels = ['DON\'T WANT', 'DOUBTFUL', 'UNSURE', 'EVENTUALLY', 'WANT'];
    const haveKidsLabels = ['DON\'T HAVE', '', '', '', 'HAVE'];
    
    const labels = sliderIndex === 0 ? wantKidsLabels : haveKidsLabels;
    
    return (
      <div className="relative text-xs text-gray-500 w-full" style={{ height: '14px' }}>
        {labels.map((label, index) => {
          const value = index + 1;
          let leftPosition;
          
          // Position labels to center on slider thumb positions
          if (value === 1) {
            leftPosition = '14px'; // Left edge of thumb (14px from left)
          } else if (value === 2) {
            leftPosition = '25%';
          } else if (value === 3) {
            leftPosition = '50%';
          } else if (value === 4) {
            leftPosition = '75%';
          } else if (value === 5) {
            leftPosition = 'calc(100% - 14px)'; // Right edge of thumb (14px from right)
          }
          
          return (
            <span 
              key={value}
              className="absolute text-xs text-gray-500" 
              style={{ left: leftPosition, transform: 'translateX(-50%)' }}
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  // Load user ID from URL params
  useEffect(() => {
    const userIdParam = searchParams.get('user_id');
    if (userIdParam) {
      console.log('📋 Set userId from URL param:', userIdParam);
      setUserId(userIdParam);
    }
  }, [searchParams]);

  const handleSliderChange = (section: 'myKids' | 'lookingFor', key: KidsKey, value: number) => {
    console.log(`🎚️ Slider changed: ${key} = ${value} (${section})`);
    
    if (section === 'myKids') {
      setMyKids(prev => ({ ...prev, [key]: value }));
    } else {
      setLookingFor(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleOpenToAllToggle = (key: MeOpenKey | LookingOpenKey) => {
    console.log(`🔄 OTA toggle: ${key}`);
    setOpenToAll(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMeImportanceChange = (value: number) => {
    setImportance(prev => ({ ...prev, me: value }));
  };

  const handleLookingForImportanceChange = (value: number) => {
    setImportance(prev => ({ ...prev, lookingFor: value }));
  };

  const handleNext = async () => {
    console.log('➡️ Next button clicked');
    console.log('👶 My Kids answers:', myKids);
    console.log('👶 Looking For answers:', lookingFor);
    console.log('👶 Open to all:', openToAll);

    setLoading(true);
    setError('');

    try {
      // Create user answers for both kids questions
      const userAnswers = [];

      // Kids 1 (Want Kids)
      userAnswers.push({
        user_id: userId,
        question_id: kidsQuestionIds.Want,
        me_answer: openToAll.kids1MeOpen ? 6 : myKids.kids1,
        me_open_to_all: openToAll.kids1MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.kids1LookingOpen ? 6 : lookingFor.kids1,
        looking_for_open_to_all: openToAll.kids1LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      });

      // Kids 2 (Have Kids)
      userAnswers.push({
        user_id: userId,
        question_id: kidsQuestionIds.Have,
        me_answer: openToAll.kids2MeOpen ? 6 : myKids.kids2,
        me_open_to_all: openToAll.kids2MeOpen,
        me_importance: importance.me,
        me_share: true,
        looking_for_answer: openToAll.kids2LookingOpen ? 6 : lookingFor.kids2,
        looking_for_open_to_all: openToAll.kids2LookingOpen,
        looking_for_importance: importance.lookingFor,
        looking_for_share: true
      });

      // Save answers in background (optimistic approach)
      const saveAnswersInBackground = async () => {
        try {
          console.log('🚀 Starting to save kids answers to backend...');
          console.log('📊 User answers:', userAnswers);

          for (const userAnswer of userAnswers) {
            const response = await fetch(getApiUrl(API_ENDPOINTS.ANSWERS), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userAnswer)
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ API request failed:', response.status, errorText);
            } else {
              const responseData = await response.json();
              console.log('✅ API request successful:', responseData);
            }
          }

          console.log('✅ All kids answers processed');
        } catch (error) {
          console.error('❌ Error saving kids answers to backend:', error);
        }
      };

      // Start background save (don't await)
      console.log('👶 About to start background save...');
      saveAnswersInBackground();
      console.log('👶 Background save function called');
      
      // Continue with navigation immediately
      console.log('👶 Continuing with navigation...');
      
      // Navigate to loading page immediately
      const params = new URLSearchParams({ 
        user_id: userId
      });
      
      router.push(`/auth/loading?${params.toString()}`);
    } catch (error) {
      console.error('Error saving kids answers:', error);
      setError(error instanceof Error ? error.message : 'Failed to save answers');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams({ 
      user_id: userId
    });
    
    router.push(`/auth/question/9?${params.toString()}`);
  };

  // Slider component - EXACT COPY from habits page
  const SliderComponent = ({ 
    value, 
    onChange,
    isOpenToAll = false,
    isImportance = false
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    isOpenToAll?: boolean;
    isImportance?: boolean;
  }) => {
    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isOpenToAll) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newValue = Math.round(percentage * 4) + 1; // 1-5 range
      onChange(Math.max(1, Math.min(5, newValue)));
    };

    const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.buttons === 1 && !isOpenToAll) { // Left mouse button
        handleSliderClick(e);
      }
    };

    const handleMouseDown = () => {
      document.body.style.userSelect = 'none';
      window.getSelection()?.removeAllRanges();
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = '';
    };

    const handleMouseLeave = () => {
      document.body.style.userSelect = '';
    };

    const handleDragStart = (e: React.DragEvent) => {
      e.preventDefault();
    };

    return (
      <div className="w-full h-5 relative flex items-center select-none"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDragStart={handleDragStart}
      >
          {!isOpenToAll && <span className="absolute left-2 text-xs text-gray-500 pointer-events-none z-10">1</span>}
          
          {/* Custom Slider Track */}
          <div 
            className="slider-track w-full h-5 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
            style={{
              width: '100%',
              backgroundColor: isOpenToAll ? '#672DB7' : '#F5F5F5',
              borderColor: isOpenToAll ? '#672DB7' : '#ADADAD'
            }}
            onClick={handleSliderClick}
            onMouseMove={handleSliderDrag}
            onMouseDown={handleSliderDrag}
            onDragStart={handleDragStart}
          />
          
          {/* Slider Thumb - OUTSIDE the track container */}
          {!isOpenToAll && (
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center text-sm font-semibold z-30 cursor-pointer"
              style={{
                backgroundColor: isImportance ? 'white' : '#672DB7',
                boxShadow: isImportance ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.12)',
                left: value === 1 ? '0px' : value === 5 ? 'calc(100% - 28px)' : `calc(${((value - 1) / 4) * 100}% - 14px)`
              }}
              onDragStart={handleDragStart}
            >
              <span style={{ color: isImportance ? '#672DB7' : 'white' }}>{value}</span>
            </div>
          )}
          
          {!isOpenToAll && <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">5</span>}
      </div>
    );
  };

  // Hardcoded OTA settings for kids questions
  const anyLookingForOpen = true; // All kids questions have open_to_all_looking_for = true
  const anyMeOpen = true; // Want Kids question has open_to_all_me = true

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
            className="mr-2"
          />
        </div>
        <button className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-6">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">10. Kids</h1>
            <p className="text-3xl font-bold text-black mb-12">
              What are your thoughts on kids?
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Looking For Section */}
          <div className="mb-10">
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: '#672DB7' }}>Them</h3>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div> {/* Empty placeholder for label column */}
              <div className="w-full">{/* Empty space for LESS/MORE labels if needed */}</div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {anyLookingForOpen ? 'OTA' : ''}
              </div>
            </div>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(8px, 2vw, 16px)'
              }}
            >
              {kidsKeys.map((kidsKey, index) => {
                const lookingOpenKey = lookingOpenKeys[index];

                return (
                  <React.Fragment key={`looking-${kidsKey}`}>
                    <div className="text-xs font-semibold text-gray-400">
                      {kidsLabels[index]}
                    </div>
                    <div className="relative">
                      {/* Labels above slider */}
                      <div className="mb-2">
                        {renderTopLabels(index)}
                      </div>
                      <SliderComponent
                        value={lookingFor[kidsKey]}
                        onChange={(value) => handleSliderChange('lookingFor', kidsKey, value)}
                        isOpenToAll={openToAll[lookingOpenKey]}
                      />
                    </div>
                    <div className="flex justify-center">
                      {true ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAll[lookingOpenKey]}
                              onChange={() => handleOpenToAllToggle(lookingOpenKey)}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAll[lookingOpenKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll[lookingOpenKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              <div className="text-xs font-semibold text-gray-400">IMPORTANCE</div>
              <div className="relative">
                {/* Add same spacing as kids sliders */}
                <div className="mb-2">
                  {/* Empty space to match kids sliders spacing */}
                </div>
                <SliderComponent
                  value={importance.lookingFor}
                  onChange={handleLookingForImportanceChange}
                  isOpenToAll={false}
                  isImportance={true}
                />
              </div>
              <div className="w-11 h-6"></div>
            </div>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mt-2"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div>
              <div className="relative text-xs text-gray-500 w-full">
                {importance.lookingFor === 1 && (
                  <span className="absolute" style={{ left: '14px', transform: 'translateX(-50%)' }}>TRIVIAL</span>
                )}
                {importance.lookingFor === 2 && (
                  <span className="absolute" style={{ left: '25%', transform: 'translateX(-50%)' }}>MINOR</span>
                )}
                {importance.lookingFor === 3 && (
                  <span className="absolute" style={{ left: '50%', transform: 'translateX(-50%)' }}>AVERAGE</span>
                )}
                {importance.lookingFor === 4 && (
                  <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>SIGNIFICANT</span>
                )}
                {importance.lookingFor === 5 && (
                  <span className="absolute" style={{ left: 'calc(100% - 14px)', transform: 'translateX(-50%)' }}>ESSENTIAL</span>
                )}
              </div>
              <div></div>
            </div>
          </div>

          {/* Me Section */}
          <div className="mb-6 pt-2">
            <h3 className="text-2xl font-bold text-center mb-1">Me</h3>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mb-2 mobile-grid-labels"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)'
              }}
            >
              <div></div> {/* Empty placeholder for label column */}
              <div className="w-full">{/* Empty space for LESS/MORE labels if needed */}</div>
              <div className="text-xs text-gray-500 text-center" style={{ marginLeft: '-15px' }}>
                {anyMeOpen ? 'OTA' : ''}
              </div>
            </div>

            <div
              className="grid items-center justify-center mx-auto w-full max-w-[640px] mobile-grid-rows"
              style={{
                gridTemplateColumns: 'minmax(88px, 0.28fr) minmax(0, 1fr) 60px',
                columnGap: 'clamp(12px, 5vw, 24px)',
                rowGap: 'clamp(8px, 2vw, 16px)'
              }}
            >
              {kidsKeys.map((kidsKey, index) => {
                const meOpenKey = meOpenKeys[index];

                return (
                  <React.Fragment key={`me-${kidsKey}`}>
                    <div className="text-xs font-semibold text-gray-400">
                      {kidsLabels[index]}
                    </div>
                    <div className="relative">
                      {/* Labels above slider */}
                      <div className="mb-2">
                        {renderTopLabels(index)}
                      </div>
                      <SliderComponent
                        value={myKids[kidsKey]}
                        onChange={(value) => handleSliderChange('myKids', kidsKey, value)}
                        isOpenToAll={openToAll[meOpenKey]}
                      />
                    </div>
                    <div className="flex justify-center">
                      {index === 0 ? (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={openToAll[meOpenKey]}
                              onChange={() => handleOpenToAllToggle(meOpenKey)}
                              className="sr-only"
                            />
                            <div className={`block w-11 h-6 rounded-full ${openToAll[meOpenKey] ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`}></div>
                            <div className={`dot absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition ${openToAll[meOpenKey] ? 'transform translate-x-5 bg-white' : 'bg-white'}`}></div>
                          </div>
                        </label>
                      ) : (
                        <div className="w-11 h-6"></div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Progress and Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-black" style={{ width: '100%' }}></div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center px-6 py-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="text-gray-900 font-medium hover:text-gray-700 transition-colors cursor-pointer"
          >
            Back
          </button>
          
          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={loading}
            className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Next'}
          </button>
        </div>
      </footer>
    </div>
  );
}