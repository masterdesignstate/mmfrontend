'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
  const names = ['Amber', 'Sarah', 'Emily', 'Jessica', 'Ashley', 'Megan', 'Rachel', 'Lauren', 'Brittany', 'Taylor'];
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

  for (let i = 0; i < 10; i++) {
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

  useEffect(() => {
    setProfiles(generateDummyProfiles());
  }, []);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
            className="mr-2"
          />
        </div>
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {profiles.map(profile => (
            <div key={profile.id} className="relative">
              <CardWithProgressBorder percentage={profile.compatibility}>
                <div className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  {/* Status Indicator */}
                  <div className="absolute top-2 left-2 z-20">
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
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white">
                      <h3 className="font-medium text-sm leading-tight">
                        {profile.name}, {profile.age}
                      </h3>
                      <p className="text-xs opacity-90 mt-0.5">{profile.location}</p>
                    </div>
                  </div>
                </div>
              </CardWithProgressBorder>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}