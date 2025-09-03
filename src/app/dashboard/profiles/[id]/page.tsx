'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Mock profile data - in real app this would come from API
const generateMockProfile = (id: string) => {
  const names = [
    'Alex Johnson', 'Sarah Wilson', 'Michael Brown', 'Emily Davis', 'David Miller',
    'Jessica Garcia', 'Christopher Rodriguez', 'Ashley Martinez', 'Matthew Anderson',
    'Amanda Taylor', 'Daniel Thomas', 'Samantha Jackson', 'James White', 'Nicole Harris',
    'Ryan Martin', 'Elizabeth Thompson', 'Kevin Garcia', 'Jennifer Martinez', 'Brandon Lee',
    'Michelle Lewis', 'Jason Walker', 'Stephanie Hall', 'Justin Allen', 'Rebecca Young',
    'Andrew Hernandez', 'Laura King', 'Anthony Wright', 'Kimberly Lopez', 'Mark Hill',
    'Amy Scott', 'Steven Green', 'Carol Adams', 'Joshua Baker', 'Lisa Gonzalez',
    'Kenneth Nelson', 'Sharon Carter', 'Paul Mitchell', 'Donna Perez', 'Edward Roberts',
    'Helen Turner', 'Ronald Phillips', 'Maria Campbell', 'Timothy Parker', 'Nancy Evans',
    'Jason Edwards', 'Betty Collins', 'Jeff Stewart', 'Dorothy Sanchez', 'Frank Morris'
  ];

  const cities = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
    'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit'
  ];

  const profileId = parseInt(id);
  const nameIndex = (profileId - 1) % names.length;
  const liveIndex = (profileId - 1) % cities.length;
  
  const name = names[nameIndex];
  const username = `user${profileId}`;
  const age = 18 + (profileId % 40);
  const live = cities[liveIndex];
  const answers = 5 + (profileId % 25);
  
  // Deterministic date based on profile ID
  const baseDate = new Date(2023, 0, 1);
  const daysToAdd = (profileId * 7) % 730;
  const creationDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const month = String(creationDate.getMonth() + 1).padStart(2, '0');
  const day = String(creationDate.getDate()).padStart(2, '0');
  const year = creationDate.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;

  // Mock data for relationship preferences
  const friend = 1 + (profileId % 6);
  const hookup = 1 + ((profileId + 1) % 6);
  const date = 1 + ((profileId + 2) % 6);
  const partner = 1 + ((profileId + 3) % 6);
  const male = 1 + ((profileId + 4) % 6);
  const female = 1 + ((profileId + 5) % 6);

  return {
    id: profileId,
    creationDate: formattedDate,
    name: `${name} ${profileId}`,
    username,
    age,
    live,
    answers,
    friend,
    hookup,
    date,
    partner,
    male,
    female,
    // Additional details
    email: `${username}@example.com`,
    bio: `Hi, I'm ${name}! I love meeting new people and exploring new places. Looking for someone to share adventures with.`,
    height: 160 + (profileId % 30), // 160-189 cm
    education: ['Bachelor\'s Degree', 'Master\'s Degree', 'High School', 'PhD', 'Associate\'s Degree'][profileId % 5],
    interests: ['Travel', 'Music', 'Sports', 'Reading', 'Cooking', 'Photography', 'Gaming', 'Fitness'][profileId % 8],
    lastActive: new Date(Date.now() - (profileId * 1000 * 60 * 60)).toLocaleString(),
    profileCompleted: Math.min(85 + (profileId % 15), 100), // 85-100%
    photos: profileId <= 5 ? profileId : 0, // Some profiles have photos
    verified: profileId % 3 === 0, // Every 3rd profile is verified
    premium: profileId % 5 === 0, // Every 5th profile is premium
  };
};

export default function ProfileDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const profileData = generateMockProfile(params.id);
      setProfile(profileData);
      setLoading(false);
    }, 500);
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-[#672DB7] mb-4"></i>
          <p className="text-gray-600">Loading profile details...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-user-slash text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile Details</h1>
            <p className="text-gray-600">Viewing profile for {profile.name}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-[#672DB7] text-white rounded-lg hover:bg-[#5a259f] transition-colors">
            <i className="fas fa-edit mr-2"></i>
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <i className="fas fa-user text-3xl text-gray-400"></i>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                  {profile.verified && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      <i className="fas fa-check-circle mr-1"></i>
                      Verified
                    </span>
                  )}
                  {profile.premium && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      <i className="fas fa-crown mr-1"></i>
                      Premium
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-2">@{profile.username}</p>
                <p className="text-gray-700 mb-4">{profile.bio}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span><i className="fas fa-map-marker-alt mr-1"></i>{profile.live}</span>
                  <span><i className="fas fa-birthday-cake mr-1"></i>{profile.age} years old</span>
                  <span><i className="fas fa-envelope mr-1"></i>{profile.email}</span>
                </div>
              </div>
            </div>
          </div>




        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <i className="fas fa-chart-bar mr-2"></i>
              Profile Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Profile Completion</span>
                <span className="font-semibold">{profile.profileCompleted}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#672DB7] h-2 rounded-full" 
                  style={{ width: `${profile.profileCompleted}%` }}
                ></div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Questions Answered</span>
                <span className="font-semibold">{profile.answers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Photos Uploaded</span>
                <span className="font-semibold">{profile.photos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="font-semibold">{profile.creationDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Active</span>
                <span className="font-semibold text-sm">{profile.lastActive}</span>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
} 