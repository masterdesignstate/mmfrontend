'use client';

import { useState } from 'react';

// Generate mock data for 200 profiles - deterministic to prevent hydration errors
const generateMockProfiles = () => {
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

  const usernames = [
    'coolguy123', 'musiclover', 'adventurer', 'bookworm', 'techgeek', 'artist',
    'runner', 'chef', 'photographer', 'gamer', 'traveler', 'dancer', 'writer',
    'designer', 'teacher', 'doctor', 'engineer', 'lawyer', 'nurse', 'pilot'
  ];

  const taglines = [
    'Living life to the fullest', 'Adventure awaits', 'Carpe Diem', 'Dream big',
    'Stay positive', 'Love and light', 'Make it happen', 'Never give up',
    'Life is beautiful', 'Follow your dreams', 'Be yourself', 'Stay strong',
    'Keep smiling', 'Live laugh love', 'Chase your passion', 'Create your destiny',
    'Embrace the journey', 'Find your purpose', 'Spread kindness', 'Stay curious'
  ];

  const cities = [
    '10001', '10002', '10003', '90210', '90211', '90212', '78701', '78702',
    '78703', '33101', '33102', '33103', '60601', '60602', '60603', '94101',
    '94102', '94103', '98101', '98102', '98103', '02101', '02102', '02103'
  ];

  const profiles = [];
  
  for (let i = 1; i <= 200; i++) {
    // Use deterministic values based on index
    const nameIndex = (i - 1) % names.length;
    const usernameIndex = (i - 1) % usernames.length;
    const taglineIndex = (i - 1) % taglines.length;
    const cityIndex = (i - 1) % cities.length;
    
    const name = names[nameIndex];
    const username = i <= 20 ? usernames[usernameIndex] + i : '';
    const gender = i % 2 === 0 ? 1 : 5; // Alternating gender
    const age = 18 + (i % 40); // Age 18-57 based on index
    const relationship = 1 + (i % 3); // 1-3 based on index
    const answers = 5 + (i % 25); // 5-29 based on index
    const tagline = i <= 50 ? taglines[taglineIndex] : '';
    const zip = cities[cityIndex];
    
    // Deterministic date based on index
    const baseDate = new Date(2023, 0, 1);
    const daysToAdd = (i * 7) % 730; // Spread over 2 years
    const creationDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const formattedDate = creationDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit' 
    });

    profiles.push({
      id: i,
      creationDate: formattedDate,
      name: `${name} ${i}`,
      username,
      age,
      gender,
      zip,
      relationship,
      answers,
      tagline
    });
  }
  
  return profiles;
};

// Generate mock data once outside component
const mockProfiles = generateMockProfiles();

const genderMap = {
  1: 'Female',
  5: 'Male'
};

const relationshipMap = {
  1: 'Single',
  2: 'In Relationship',
  3: 'Married'
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState(mockProfiles);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [viewMode, setViewMode] = useState('table'); // table or grid
  const itemsPerPage = 10;

  // Filter and search profiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = searchTerm === '' || 
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.tagline.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = (!startDate || profile.creationDate >= startDate) &&
                           (!endDate || profile.creationDate <= endDate);
    
    return matchesSearch && matchesDateRange;
  });

  // Sort profiles
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (sortField === 'age') {
      aValue = parseInt(aValue) || 0;
      bValue = parseInt(bValue) || 0;
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedProfiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProfiles = sortedProfiles.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSortField('');
    setSortDirection('asc');
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <i className="fas fa-sort text-gray-400 ml-1"></i>;
    }
    return sortDirection === 'asc' 
      ? <i className="fas fa-sort-up text-blue-500 ml-1"></i>
      : <i className="fas fa-sort-down text-blue-500 ml-1"></i>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profiles</h1>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Created From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white shadow-sm transition-all duration-200 hover:border-gray-400 text-gray-900 cursor-text"
                placeholder="Select Start Date"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Created Until
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white shadow-sm transition-all duration-200 hover:border-gray-400 text-gray-900 cursor-text"
                placeholder="Select Until Date"
              />
            </div>
          </div>
          <button
            onClick={resetFilters}
            className="text-red-600 hover:text-red-800 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Search and View Options */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedProfiles.length)} of {sortedProfiles.length} profiles
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent cursor-text"
            />
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dp
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('creationDate')}
                >
                  Creation Date
                  <SortIcon field="creationDate" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Name
                  <SortIcon field="name" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('username')}
                >
                  Uname
                  <SortIcon field="username" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('age')}
                >
                  Age
                  <SortIcon field="age" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('gender')}
                >
                  Gender
                  <SortIcon field="gender" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('zip')}
                >
                  Zip
                  <SortIcon field="zip" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('relationship')}
                >
                  Relationship
                  <SortIcon field="relationship" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('answers')}
                >
                  Answers
                  <SortIcon field="answers" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tag line
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          profile.gender === 1 
                            ? 'bg-pink-100' 
                            : 'bg-blue-100'
                        }`}
                      >
                        <i 
                          className="fas fa-user" 
                          style={{
                            color: profile.gender === 1 ? '#ec4899' : '#3b82f6',
                            fontSize: '1rem'
                          }}
                        ></i>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.creationDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {profile.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.username || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.age > 0 ? `${profile.age} years` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.gender ? genderMap[profile.gender as keyof typeof genderMap] || profile.gender : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.zip || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.relationship ? relationshipMap[profile.relationship as keyof typeof relationshipMap] || profile.relationship : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.answers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.tagline || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? 'bg-[#672DB7] text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {/* Show ellipsis if there are more pages */}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="px-2 text-gray-500">...</span>
              )}
              
              {/* Show last page if not already shown */}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              )}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 