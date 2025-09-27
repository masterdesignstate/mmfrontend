'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ReactSlider from 'react-slider';

interface ResultProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  photo: string;
  compatibility: number; // 0-100
  status: 'approved' | 'liked' | 'matched';
  isLiked: boolean;
  isMatched: boolean;
}

// Generate dummy profiles
const generateDummyProfiles = (): ResultProfile[] => {
  const names = ['Amber', 'Sarah', 'Emily', 'Jessica', 'Ashley', 'Megan', 'Rachel', 'Lauren', 'Brittany', 'Taylor',
                  'Madison', 'Olivia', 'Emma', 'Sophia', 'Isabella', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail'];
  const locations = ['Austin, TX', 'Dallas, TX', 'Houston, TX', 'San Antonio, TX', 'Fort Worth, TX'];
  const girlImages = [
    'IMG_0369.PNG',
    'IMG_0412.JPG',
    'IMG_0422.PNG',
    'IMG_0426.JPG',
    'IMG_0432.JPG',
    'IMG_0459.JPG',
    'IMG_0501.JPG',
    'IMG_0533.JPG',
    'IMG_0550.JPG',
    'IMG_9894.JPG'
  ];
  const profiles: ResultProfile[] = [];

  for (let i = 0; i < 30; i++) {
    let status: 'approved' | 'liked' | 'matched';
    let isLiked = false;
    let isMatched = false;

    // Mix of different states to match the image
    if (i === 0 || i === 3) {
      // Show checkmark (matched state with purple heart)
      status = 'matched';
      isLiked = true;
      isMatched = true;
    } else if (i === 1 || i === 4) {
      // Show red heart (liked)
      status = 'liked';
      isLiked = true;
      isMatched = false;
    } else {
      // Show purple outline heart (approved)
      status = 'approved';
      isLiked = false;
      isMatched = false;
    }

    profiles.push({
      id: `profile-${i}`,
      name: names[i % names.length],
      age: 23 + (i % 10),
      location: locations[i % locations.length],
      photo: `/assets/girls/${girlImages[i % girlImages.length]}`, // Local high-quality images
      compatibility: 65 + (i * 5) % 35, // Random compatibility between 65-100
      status,
      isLiked,
      isMatched,
    });
  }

  return profiles;
};

// Card Progress Border Component
const CardWithProgressBorder = ({ percentage, children }: { percentage: number; children: React.ReactNode }) => {
  const borderWidth = 4; // Slightly thicker border

  return (
    <div className="relative p-1">
      {/* Progress border background with enhanced gradient purple */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `conic-gradient(from -90deg,
            #A855F7 0deg,
            #8B5CF6 ${percentage * 0.9}deg,
            #7C3AED ${percentage * 1.8}deg,
            #672DB7 ${percentage * 2.7}deg,
            #5B21B6 ${percentage * 3.6}deg,
            #5B21B6 ${percentage * 3.6 + 2}deg,
            #d1d5db ${percentage * 3.6 + 3}deg,
            #d1d5db 360deg)`,
        }}
      />

      {/* Inner content with proper spacing to create border effect */}
      <div className="relative bg-white rounded-2xl" style={{ margin: `${borderWidth}px` }}>
        {children}
      </div>
    </div>
  );
};

export default function ResultsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ResultProfile[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15); // Show 3 rows initially (5 columns x 3 rows)
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    compatibilityType: 'overall', // overall, me_to_them, them_to_me
    compatibility: {
      min: 0,
      max: 100
    },
    distance: {
      min: 1,
      max: 50
    },
    age: {
      min: 18,
      max: 35
    },
    tags: [] as string[]
  });

  useEffect(() => {
    setProfiles(generateDummyProfiles());
  }, []);

  const handleShowMore = () => {
    setVisibleCount(profiles.length); // Show all profiles
  };

  const DemoSlider = () => (
    <div className="mb-10">
      <h3 className="text-lg font-semibold text-black mb-3">Demo Slider</h3>
      <ReactSlider
        className="horizontal-slider"
        thumbClassName="example-thumb"
        trackClassName="example-track"
        defaultValue={[0, 100]}
        ariaLabel={['Lower thumb', 'Upper thumb']}
        ariaValuetext={(state) => `Thumb value ${state.valueNow}`}
        renderThumb={(props, state) => (
          <div {...props}>{state.valueNow}</div>
        )}
        pearling
        minDistance={10}
      />
      <style jsx global>{`
        .horizontal-slider {
          width: 100%;
          height: 25px;
        }

        .horizontal-slider .example-track {
          top: 50%;
          height: 8px;
          margin-top: -4px;
          border-radius: 9999px;
          background: #e5e7eb;
        }

        .horizontal-slider .example-track.example-track-1 {
          background: #7C3AED;
        }

        .horizontal-slider .example-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #7C3AED;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #7C3AED;
          cursor: grab;
          margin-top: -12px;
        }

        .horizontal-slider .example-thumb:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );

  const toggleLike = (profileId: string) => {
    setProfiles(prevProfiles =>
      prevProfiles.map(profile => {
        if (profile.id === profileId) {
          if (!profile.isLiked) {
            // Like the profile
            return { ...profile, isLiked: true, status: 'liked' };
          } else if (profile.isLiked && !profile.isMatched) {
            // Unlike the profile
            return { ...profile, isLiked: false, status: 'approved' };
          }
        }
        return profile;
      })
    );
  };

  // Dual range slider powered by react-slider for smooth dragging
  const DualRangeSlider = ({ min, max, value, onChange, label, unit = '' }: {
    min: number;
    max: number;
    value: { min: number; max: number };
    onChange: (value: { min: number; max: number }) => void;
    label: string;
    unit?: string;
  }) => {
    const [sliderValues, setSliderValues] = useState<[number, number]>([value.min, value.max]);
    const [sliderKey, setSliderKey] = useState(0);
    const sliderValuesRef = useRef(sliderValues);

    useEffect(() => {
      sliderValuesRef.current = sliderValues;
    }, [sliderValues]);

    useEffect(() => {
      if (value.min !== sliderValuesRef.current[0] || value.max !== sliderValuesRef.current[1]) {
        const next: [number, number] = [value.min, value.max];
        sliderValuesRef.current = next;
        setSliderValues(next);
        setSliderKey(prev => prev + 1);
      }
    }, [value.min, value.max]);

    return (
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-black mb-3">{label}</h3>

        <ReactSlider
          key={`${label}-${sliderKey}`}
          className="range-slider"
          thumbClassName="range-slider__thumb"
          trackClassName="range-slider__track"
          defaultValue={sliderValues}
          pearling
          minDistance={1}
          min={min}
          max={max}
          step={1}
          ariaLabel={[`${label} minimum`, `${label} maximum`]}
          ariaValuetext={(state) => `${label} value ${state.valueNow}${unit}`}
          renderThumb={(props) => <div {...props} />}
          onChange={(vals) => setSliderValues(vals as [number, number])}
          onAfterChange={(vals) => onChange({ min: vals[0], max: vals[1] })}
        />

        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>{`${sliderValues[0]}${unit}`}</span>
          <span>{`${sliderValues[1]}${unit}`}</span>
        </div>

        <style jsx global>{`
          .range-slider {
            width: 100%;
            height: 28px;
            position: relative;
          }

          .range-slider .range-slider__track {
            top: 50%;
            margin-top: -4px;
            height: 8px;
            border-radius: 9999px;
            background: #e5e7eb;
          }

          .range-slider .range-slider__track.range-slider__track-1 {
            background: #7C3AED;
          }

          .range-slider .range-slider__thumb {
            height: 24px;
            width: 24px;
            border-radius: 50%;
            background: #ffffff;
            border: none;
            box-shadow: 0 3px 10px rgba(45, 35, 66, 0.25);
            cursor: grab;
            top: 50%;
            transform: translate(-50%, -50%);
            outline: none;
          }

          .range-slider .range-slider__thumb:active {
            cursor: grabbing;
          }
        `}</style>
      </div>
    );
  };


  // Filter handling functions
  const handleCompatibilityTypeChange = (type: string) => {
    setFilters(prev => ({ ...prev, compatibilityType: type }));
  };

  const handleSliderChange = (category: 'compatibility' | 'distance' | 'age', value: { min: number; max: number }) => {
    setFilters(prev => ({ ...prev, [category]: value }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      compatibilityType: 'overall',
      compatibility: { min: 0, max: 100 },
      distance: { min: 1, max: 50 },
      age: { min: 18, max: 35 },
      tags: []
    });
  };

  const applyFiltersAndClose = () => {
    // TODO: Apply filters to profile data
    setShowFilterModal(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="relative flex items-center p-4 border-b border-gray-200">
        <div className="absolute left-4">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
          />
        </div>

        {/* Centered Search Bar */}
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center max-w-2xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search people"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[250px] sm:w-[400px] pl-8 sm:pl-10 pr-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>

            <button
              onClick={() => setShowFilterModal(true)}
              className="ml-4 px-4 py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1 inline text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              Filter
            </button>

            <button className="ml-2 px-4 py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg className="w-4 h-4 mr-1 inline text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Sort
            </button>
          </div>
        </div>

        <div className="absolute right-4">
          <div className="relative">
            <button
              className="p-2 cursor-pointer"
              onClick={() => setShowMenu(!showMenu)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
              <button
                onClick={() => {
                  router.push('/profile');
                  setShowMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                My Profile
              </button>
              <button
                onClick={() => {
                  router.push('/results');
                  setShowMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 bg-gray-50"
              >
                Results
              </button>
              <button
                onClick={() => {
                  router.push('/questions');
                  setShowMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                All Questions
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Title and Count */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Results</h1>
          <p className="text-base text-gray-500">Showing {profiles.length} people</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {profiles.slice(0, visibleCount).map(profile => (
            <div key={profile.id} className="relative">
              <CardWithProgressBorder percentage={profile.compatibility}>
                <div className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  {/* Status Indicator */}
                  <div className="absolute top-0 left-0 z-20">
                    {profile.status === 'approved' && !profile.isLiked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(profile.id);
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow"
                      >
                        <i className="far fa-heart text-[#672DB7] text-sm"></i>
                      </button>
                    )}
                    {profile.status === 'liked' && !profile.isMatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(profile.id);
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow"
                      >
                        <i className="fas fa-heart text-red-500 text-sm"></i>
                      </button>
                    )}
                    {profile.isMatched && (
                      <div className="w-7 h-7 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow">
                        <Image
                          src="/assets/purplecheck.png"
                          alt="Matched"
                          width={16}
                          height={16}
                        />
                      </div>
                    )}
                  </div>

                  {/* Profile Image */}
                  <div
                    className="relative aspect-square bg-gray-200"
                    onClick={() => router.push(`/profile/${profile.id}`)}
                  >
                    <Image
                      src={profile.photo}
                      alt={profile.name}
                      fill
                      className="object-cover"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Profile Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <h3 className="font-semibold text-xl">
                        {profile.name}, {profile.age}
                      </h3>
                    </div>

                    {/* Active Indicator - Green circle at bottom right */}
                    <div className="absolute bottom-2 right-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </CardWithProgressBorder>
            </div>
          ))}
        </div>

        {/* Show More Button */}
        {visibleCount < profiles.length && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleShowMore}
              className="px-8 py-3 bg-[#ECECEC] text-black rounded-full hover:bg-gray-300 transition-colors duration-200 font-medium"
            >
              Show More
            </button>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setShowFilterModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-lg w-full max-w-2xl mx-4 h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8 flex-1 overflow-y-auto">
              <DemoSlider />
              {/* Compatibility Type Picker */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-black">Compatibility Type</h3>
                  <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-[#672DB7]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="inline-flex items-center bg-white rounded-lg p-1.5 border border-gray-300">

                  <button
                    onClick={() => handleCompatibilityTypeChange('overall')}
                    className={`px-6 py-3 rounded-lg text-base font-semibold transition-all cursor-pointer ${
                      filters.compatibilityType === 'overall'
                        ? 'bg-white text-black shadow-sm border border-black'
                        : 'text-black hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    Overall
                  </button>
                  <button
                    onClick={() => handleCompatibilityTypeChange('compatible_with_me')}
                    className={`px-6 py-3 rounded-lg text-base font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      filters.compatibilityType === 'compatible_with_me'
                        ? 'bg-white text-black shadow-sm border border-black'
                        : 'text-black hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    Compatible with Me
                  </button>
                  <button
                    onClick={() => handleCompatibilityTypeChange('im_compatible_with')}
                    className={`px-6 py-3 rounded-lg text-base font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      filters.compatibilityType === 'im_compatible_with'
                        ? 'bg-white text-black shadow-sm border border-black'
                        : 'text-black hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    I&apos;m Compatible with
                  </button>
                </div>
              </div>

              {/* Compatibility Slider */}
              <DualRangeSlider
                min={0}
                max={100}
                value={filters.compatibility}
                onChange={(value) => handleSliderChange('compatibility', value)}
                label="Compatibility"
                unit="%"
              />
    

              {/* Distance Slider */}
              <DualRangeSlider
                min={1}
                max={100}
                value={filters.distance}
                onChange={(value) => handleSliderChange('distance', value)}
                label="Distance"
                unit="mi"
              />

              {/* Age Slider */}
              <DualRangeSlider
                min={18}
                max={80}
                value={filters.age}
                onChange={(value) => handleSliderChange('age', value)}
                label="Age"
              />

              {/* Tags Section */}
              <div className="mb-8">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    'Exercise', 'Diet', 'Drinking', 'Smoking', 'Children',
                    'Politics', 'Religion', 'Education', 'Music', 'Travel',
                    'Pets', 'Cooking', 'Books', 'Movies', 'Sports', 'Art',
                    'Gaming', 'Nature', 'Technology', 'Fashion'
                  ].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all border cursor-pointer ${
                        filters.tags.includes(tag)
                          ? 'bg-white text-gray-900 border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {filters.tags.includes(tag) && (
                        <div className="absolute inset-0 bg-black rounded-full" style={{ opacity: 0.05 }}></div>
                      )}
                      <span className="relative z-10">{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <button
                onClick={clearAllFilters}
                className="text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
              >
                Clear all
              </button>
              <button
                onClick={applyFiltersAndClose}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium cursor-pointer"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
