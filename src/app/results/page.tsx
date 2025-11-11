'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ReactSlider from 'react-slider';
import { apiService, type ApiUser, type CompatibilityResult } from '@/services/api';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
import HamburgerMenu from '@/components/HamburgerMenu';

interface ResultProfile {
  id: string;
  user: ApiUser;
  compatibility: CompatibilityResult;
  status: 'approved' | 'liked' | 'matched';
  isLiked: boolean;
  isMatched: boolean;
  tags: string[]; // Add tags to the interface
}

// Generate dummy profiles (fallback only)
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

    const name = names[i % names.length];
    const age = 23 + (i % 10);
    const compatibilityScore = 65 + (i * 5) % 35;

    profiles.push({
      id: `profile-${i}`,
      user: {
        id: `profile-${i}`,
        username: name.toLowerCase(),
        first_name: name,
        last_name: '',
        email: `${name.toLowerCase()}@example.com`,
        age: age,
        city: locations[i % locations.length],
        profile_photo: `/assets/girls/${girlImages[i % girlImages.length]}`,
        bio: `Hi, I'm ${name}!`
      },
      compatibility: {
        overall_compatibility: compatibilityScore,
        compatible_with_me: compatibilityScore + Math.random() * 10 - 5,
        im_compatible_with: compatibilityScore + Math.random() * 10 - 5,
        mutual_questions_count: Math.floor(Math.random() * 20) + 10
      },
      status,
      isLiked,
      isMatched,
      tags: [], // Add empty tags array for dummy profiles
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
  const [visibleCount, setVisibleCount] = useState(15); // Show 3 rows initially (5 columns x 3 rows)
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortOption, setSortOption] = useState<'compatibility' | 'distance' | 'age-asc' | 'age-desc' | 'recent'>('compatibility');
  const [sortedProfiles, setSortedProfiles] = useState<ResultProfile[]>([]);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

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
    tags: [] as string[],
    requiredOnly: false
  });

  // Fetch tags for a specific user
  const fetchUserTags = async (userId: string): Promise<string[]> => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId) return [];

    try {
      const response = await fetch(
        `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${currentUserId}&result_user_id=${userId}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.tags || [];
      }
    } catch (error) {
      console.error('Error fetching tags for user:', userId, error);
    }
    return [];
  };

  // Fetch tags for multiple users in parallel
  const fetchTagsForProfiles = async (profiles: ResultProfile[]): Promise<ResultProfile[]> => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId) return profiles;

    try {
      // Fetch tags for all users in parallel
      const tagPromises = profiles.map(async (profile) => {
        const tags = await fetchUserTags(profile.user.id);
        return { ...profile, tags };
      });

      return await Promise.all(tagPromises);
    } catch (error) {
      console.error('Error fetching tags for profiles:', error);
      return profiles;
    }
  };

  // Fetch compatible users from API
  const fetchCompatibleUsers = async (page = 1, applyFilters = false) => {
    console.log(`🚀 fetchCompatibleUsers called: page=${page}, applyFilters=${applyFilters}`);

    try {
      setLoading(true);
      setError(null);

      const params: {
        page: number;
        page_size: number;
        compatibility_type?: string;
        min_compatibility?: number;
        max_compatibility?: number;
        required_only?: boolean;
        tags?: string[];
        user_id?: string;
      } = {
        page,
        page_size: 15
      };

      if (applyFilters) {
        // Map compatibility type names to API format
        const compatibilityTypeMap: Record<string, string> = {
          'overall': 'overall_compatibility',
          'compatible_with_me': 'compatible_with_me',
          'im_compatible_with': 'im_compatible_with'
        };

        params.compatibility_type = compatibilityTypeMap[filters.compatibilityType] || 'overall_compatibility';
        params.min_compatibility = filters.compatibility.min;
        params.max_compatibility = filters.compatibility.max;
        params.required_only = filters.requiredOnly;
        
        // Add tag filters
        if (filters.tags && filters.tags.length > 0) {
          params.tags = filters.tags;
        }
        
        // Add user_id for proper filtering
        const currentUserId = localStorage.getItem('user_id');
        if (currentUserId) {
          params.user_id = currentUserId;
        }

        console.log('📊 API params with filters:', params);
      } else {
        // Add user_id for non-filtered calls too
        const currentUserId = localStorage.getItem('user_id');
        if (currentUserId) {
          params.user_id = currentUserId;
        }
        console.log('📊 API params (no filters):', params);
      }

      console.log('🌐 Calling apiService.getCompatibleUsers...');
      const response = await apiService.getCompatibleUsers(params);
      console.log('✅ API response received:', response);

      // Transform API response to match ResultProfile interface
      const transformedProfiles: ResultProfile[] = response.results.map((item) => ({
        id: item.user.id,
        user: item.user,
        compatibility: item.compatibility,
        status: 'approved', // Default status - could be determined by user tags/reactions
        isLiked: false, // Could be determined by user tags
        isMatched: false, // Could be determined by user tags
        tags: [] // Initialize empty tags array
      }));

      // Fetch tags for all profiles
      console.log('🏷️ Fetching tags for profiles...');
      const profilesWithTags = await fetchTagsForProfiles(transformedProfiles);
      console.log('✅ Tags fetched for profiles:', profilesWithTags.map(p => ({ id: p.user.id, tags: p.tags })));

      if (page === 1) {
        setProfiles(profilesWithTags);
      } else {
        setProfiles(prev => [...prev, ...profilesWithTags]);
      }

      setTotalCount(response.total_count || response.count);
      setHasNextPage(response.has_next || false);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error fetching compatible users:', error);
      setError('Failed to load compatible users. Please try again.');

      // Fallback to dummy data if API fails
      if (page === 1) {
        setProfiles(generateDummyProfiles());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompatibleUsers(1, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply sorting whenever profiles or sortOption changes
  useEffect(() => {
    if (profiles.length > 0) {
      setSortedProfiles(sortProfiles(profiles));
    }
  }, [profiles, sortOption]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside detection for sort dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSortDropdown &&
        sortDropdownRef.current &&
        sortButtonRef.current &&
        !sortDropdownRef.current.contains(event.target as Node) &&
        !sortButtonRef.current.contains(event.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown]);

  const handleShowMore = async () => {
    if (visibleCount < profiles.length) {
      // Show all current profiles
      setVisibleCount(profiles.length);
    } else if (hasNextPage) {
      // Load next page
      await fetchCompatibleUsers(currentPage + 1, filtersApplied);
      // After loading, update visibleCount to show the new profiles
      setVisibleCount(prev => prev + 15);
    }
  };

  // Toggle tag via API
  const toggleTagAPI = async (userId: string, tagName: string) => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId) return;

    try {
      const response = await fetch(`${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/tag/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          result_user_id: userId,
          tag: tagName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle tag');
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling tag:', error);
      throw error;
    }
  };

  // Check if there's a match (both users liked each other)
  const checkForMatch = async (userId: string, currentTags: string[]) => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId) return false;

    try {
      const iLikedThem = currentTags.includes('like');
      if (!iLikedThem) return false;

      // Check if they've liked me
      const theirTagsResponse = await fetch(
        `${getApiUrl(API_ENDPOINTS.USER_RESULTS)}/user_tags/?user_id=${userId}&result_user_id=${currentUserId}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (theirTagsResponse.ok) {
        const theirData = await theirTagsResponse.json();
        const theirNormalizedTags = (theirData.tags || []).map((tag: string) => tag.toLowerCase());
        return theirNormalizedTags.includes('like');
      }
    } catch (error) {
      console.error('Error checking for match:', error);
    }
    return false;
  };

  // Handle heart button click with seamless progression logic (matching profile page behavior)
  const handleHeartClick = async (profileId: string) => {
    const currentUserId = localStorage.getItem('user_id');
    if (!currentUserId) return;

    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    const currentTags = profile.tags.map(t => t.toLowerCase());
    const hasMatch = profile.isMatched;

    // Determine what to do based on current state
    let action = '';
    if (hasMatch || currentTags.includes('like')) {
      // If matched or liked, remove like tag (go back to approve or no tags)
      action = 'remove_like';
    } else if (currentTags.includes('approve')) {
      // If approved, remove approve and add like
      action = 'approve_to_like';
    } else {
      // If no tags, add approve
      action = 'add_approve';
    }

    // Update UI optimistically
    let newTags = [...currentTags];

    switch (action) {
      case 'remove_like':
        newTags = newTags.filter(tag => tag !== 'like');
        setProfiles(prev => prev.map(p =>
          p.id === profileId ? { ...p, tags: newTags, isLiked: false, isMatched: false, status: newTags.includes('approve') ? 'approved' : 'approved' } : p
        ));
        break;
      case 'approve_to_like':
        newTags = newTags.filter(tag => tag !== 'approve');
        newTags.push('like');
        setProfiles(prev => prev.map(p =>
          p.id === profileId ? { ...p, tags: newTags, isLiked: true, status: 'liked' } : p
        ));
        break;
      case 'add_approve':
        newTags.push('approve');
        setProfiles(prev => prev.map(p =>
          p.id === profileId ? { ...p, tags: newTags, status: 'approved' } : p
        ));
        break;
    }

    // Sync with backend
    try {
      switch (action) {
        case 'remove_like':
          await toggleTagAPI(profileId, 'Like');
          // Check for match after removing like
          const stillMatched = await checkForMatch(profileId, newTags);
          setProfiles(prev => prev.map(p =>
            p.id === profileId ? { ...p, isMatched: stillMatched } : p
          ));
          break;
        case 'approve_to_like':
          await toggleTagAPI(profileId, 'Approve');
          await toggleTagAPI(profileId, 'Like');
          // Check for match after adding like
          const nowMatched = await checkForMatch(profileId, newTags);
          setProfiles(prev => prev.map(p =>
            p.id === profileId ? { ...p, isMatched: nowMatched } : p
          ));
          break;
        case 'add_approve':
          await toggleTagAPI(profileId, 'Approve');
          break;
      }

      // Refresh tags from server to stay in sync
      const updatedTags = await fetchUserTags(profileId);
      setProfiles(prev => prev.map(p =>
        p.id === profileId ? { ...p, tags: updatedTags } : p
      ));
    } catch (error) {
      console.error('Error updating progression:', error);
      // Optionally revert optimistic update on error
    }
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

  const handleFilterTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const toggleRequiredOnly = () => {
    setFilters(prev => ({
      ...prev,
      requiredOnly: !prev.requiredOnly
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      compatibilityType: 'overall',
      compatibility: { min: 0, max: 100 },
      distance: { min: 1, max: 50 },
      age: { min: 18, max: 35 },
      tags: [],
      requiredOnly: false
    });
    setFiltersApplied(false);
  };

  const applyFiltersAndClose = async () => {
    console.log('🔍 Applying filters:', filters);

    try {
      // Mark that filters have been applied
      setFiltersApplied(true);

      // Reset to first page and fetch with filters
      setCurrentPage(1);
      setVisibleCount(15);

      console.log('📡 Calling fetchCompatibleUsers with filters...');
      await fetchCompatibleUsers(1, true);
      console.log('✅ Fetch completed successfully');

      // Close the modal
      setShowFilterModal(false);

    } catch (error) {
      console.error('❌ Error applying filters:', error);
      setError('Failed to apply filters. Please try again.');
      // Still close the modal even on error to avoid stuck state
      setShowFilterModal(false);
    }
  };

  // Sort profiles based on selected sort option
  const sortProfiles = (profilesToSort: ResultProfile[]) => {
    const sorted = [...profilesToSort];

    switch (sortOption) {
      case 'compatibility':
        // Sort by overall compatibility (highest first)
        sorted.sort((a, b) => b.compatibility.overall_compatibility - a.compatibility.overall_compatibility);
        break;
      case 'distance':
        // Sort by distance (closest first) - Note: distance field not yet in API
        // For now, sort by a placeholder or random
        sorted.sort(() => Math.random() - 0.5);
        break;
      case 'age-asc':
        // Sort by age (youngest to oldest)
        sorted.sort((a, b) => (a.user.age || 25) - (b.user.age || 25));
        break;
      case 'age-desc':
        // Sort by age (oldest to youngest)
        sorted.sort((a, b) => (b.user.age || 25) - (a.user.age || 25));
        break;
      case 'recent':
        // Sort by recent activity - using profile ID as proxy for now
        // In production, would use last_seen or online_status
        sorted.sort(() => Math.random() - 0.5);
        break;
      default:
        break;
    }

    return sorted;
  };

  const handleSortOptionSelect = (option: typeof sortOption) => {
    setSortOption(option);
    setShowSortDropdown(false);
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
                className="w-[220px] sm:w-[400px] pl-8 sm:pl-10 pr-3 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>

            <button
              onClick={() => setShowFilterModal(true)}
              className={`ml-2 sm:ml-4 inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto px-0 py-0 sm:px-4 sm:py-3 border rounded-full text-sm font-medium hover:bg-gray-50 focus:outline-none cursor-pointer relative overflow-hidden ${
                filtersApplied ? 'border-black text-black' : 'border-gray-300 text-gray-700 bg-white'
              }`}
            >
              {filtersApplied && (
                <div className="absolute inset-0 bg-black opacity-[0.05]"></div>
              )}
              <span className="relative z-10 flex items-center">
                <svg className="w-4 h-4 text-black sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                <span className="hidden sm:inline">Filter</span>
              </span>
            </button>

            <div className="relative ml-2">
              <button
                ref={sortButtonRef}
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto px-0 py-0 sm:px-4 sm:py-3 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <svg className="w-4 h-4 inline text-black sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span className="hidden sm:inline">Sort</span>
              </button>

              {/* Sort Dropdown */}
              {showSortDropdown && (
                <div
                  ref={sortDropdownRef}
                  className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-50"
                >
                  <button
                    onClick={() => handleSortOptionSelect('compatibility')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-black">Compatibility</div>
                    <div className="text-sm text-gray-500">Most compatible</div>
                  </button>

                  <button
                    onClick={() => handleSortOptionSelect('distance')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-black">Distance</div>
                    <div className="text-sm text-gray-500">Closest to you</div>
                  </button>

                  <button
                    onClick={() => handleSortOptionSelect('age-asc')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-black">Age</div>
                    <div className="text-sm text-gray-500">From youngest to oldest</div>
                  </button>

                  <button
                    onClick={() => handleSortOptionSelect('age-desc')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-black">Age</div>
                    <div className="text-sm text-gray-500">From oldest to youngest</div>
                  </button>

                  <button
                    onClick={() => handleSortOptionSelect('recent')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-black">Recent</div>
                    <div className="text-sm text-gray-500">Recently online</div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute right-4">
          <HamburgerMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Title and Count */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Results</h1>
          <p className="text-base text-gray-500">
            Showing {profiles.length} of {totalCount > 0 ? totalCount : 'many'} people
          </p>
        </div>

        {loading && profiles.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading compatible users...</div>
          </div>
        ) : error && profiles.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedProfiles.slice(0, visibleCount).map(profile => {
              // Get the appropriate compatibility score based on selected type
              const getCompatibilityScore = () => {
                switch (filters.compatibilityType) {
                  case 'compatible_with_me':
                    return profile.compatibility.compatible_with_me;
                  case 'im_compatible_with':
                    return profile.compatibility.im_compatible_with;
                  default:
                    return profile.compatibility.overall_compatibility;
                }
              };

              const compatibilityScore = getCompatibilityScore();
              const firstName = profile.user.first_name || profile.user.username;
              const age = profile.user.age || 25;
              const profilePhoto = profile.user.profile_photo || '/assets/default-avatar.png';

              return (
                <div key={profile.id} className="relative">
                  <CardWithProgressBorder percentage={compatibilityScore}>
                    <div
                      onClick={() => router.push(`/profile/${profile.user.id}`)}
                      className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      {/* Status Indicator */}
                      <div className="absolute top-0 left-0 z-20 p-0 cursor-pointer">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHeartClick(profile.id);
                          }}
                          className="flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                        >
                          {profile.isMatched ? (
                            <Image
                              src="/assets/purpleheart.png"
                              alt="Matched"
                              width={36}
                              height={36}
                            />
                          ) : profile.tags.map(t => t.toLowerCase()).includes('like') ? (
                            <Image
                              src="/assets/redheart.png"
                              alt="Liked"
                              width={36}
                              height={36}
                            />
                          ) : profile.tags.map(t => t.toLowerCase()).includes('approve') ? (
                            <Image
                              src="/assets/strokeheart.png"
                              alt="Approved"
                              width={36}
                              height={36}
                            />
                          ) : (
                            <Image
                              src="/assets/approve.png"
                              alt="Approve"
                              width={36}
                              height={36}
                            />
                          )}
                        </button>
                      </div>

                      {/* Profile Image */}
                      <div className="relative aspect-square bg-gray-200">
                        <Image
                          src={profilePhoto}
                          alt={firstName}
                          fill
                          className="object-cover"
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* Profile Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          <h3 className="font-semibold text-xl">
                            {firstName}, {age}
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
              );
            })}
          </div>
        )}

        {/* Show More Button */}
        {(visibleCount < profiles.length || hasNextPage) && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleShowMore}
              disabled={loading}
              className="px-8 py-3 bg-[#ECECEC] text-black rounded-full hover:bg-gray-300 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Show More'}
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
            className="bg-white rounded-3xl shadow-lg w-full max-w-xl mx-4 h-[80vh] flex flex-col"
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
              {/* Compatibility Type Picker */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-black">Compatibility Type</h3>
                  <div className="relative group">
                    <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center cursor-help">
                      <span className="text-[11px] font-semibold text-[#672DB7] leading-none">?</span>
                    </div>
                    <div className="absolute left-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="space-y-2">
                        <div>
                          <span className="font-semibold">Compatible with Me:</span> How well they match what you&apos;re looking for
                        </div>
                        <div>
                          <span className="font-semibold">I&apos;m Compatible with:</span> How well you match what they&apos;re looking for
                        </div>
                        <div>
                          <span className="font-semibold">Overall:</span> The combined score of both compatibilities
                        </div>
                      </div>
                      <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
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

              {/* Required Toggle */}
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold text-black">Required</h4>
                  <div className="relative group">
                    <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center cursor-help">
                      <span className="text-[11px] font-semibold text-[#672DB7] leading-none">?</span>
                    </div>
                    <div className="absolute left-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      When enabled, compatibility scores will be calculated using only the required questions instead of all questions you&apos;ve answered.
                      <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleRequiredOnly}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ backgroundColor: filters.requiredOnly ? '#672DB7' : '#ADADAD' }}
                  aria-pressed={filters.requiredOnly}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                    style={{ transform: filters.requiredOnly ? 'translateX(20px)' : 'translateX(2px)' }}
                  />
                </button>
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
                    'Approved', 'Approved Me', 'Hot', 'Maybe', 'Liked',
                    'Liked Me', 'Matched', 'Required', 'Pending', 'Saved', 'Not Approved', 'Hidden'
                  ].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleFilterTagToggle(tag)}
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
