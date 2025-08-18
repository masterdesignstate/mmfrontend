'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const cities = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
    'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit'
  ];

  const profiles = [];
  
  for (let i = 1; i <= 200; i++) {
    // Use deterministic values based on index
    const nameIndex = (i - 1) % names.length;
    const usernameIndex = (i - 1) % usernames.length;
    const cityIndex = (i - 1) % cities.length;
    
    const name = names[nameIndex];
    const username = i <= 20 ? usernames[usernameIndex] + i : '';
    const age = 18 + (i % 40); // Age 18-57 based on index
    const city = cities[cityIndex];
    const answers = 5 + (i % 25); // 5-29 based on index
    
    // Deterministic date based on index - format as MM/DD/YYYY
    const baseDate = new Date(2023, 0, 1);
    const daysToAdd = (i * 7) % 730; // Spread over 2 years
    const creationDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const month = String(creationDate.getMonth() + 1).padStart(2, '0');
    const day = String(creationDate.getDate()).padStart(2, '0');
    const year = creationDate.getFullYear();
    const formattedDate = `${month}/${day}/${year}`;

    // Mock data for new columns - using 1-6 scale
    const friend = 1 + (i % 6); // 1-6 based on index
    const hookup = 1 + ((i + 1) % 6); // 1-6 based on index
    const date = 1 + ((i + 2) % 6); // 1-6 based on index
    const partner = 1 + ((i + 3) % 6); // 1-6 based on index
    const male = 1 + ((i + 4) % 6); // 1-6 based on index
    const female = 1 + ((i + 5) % 6); // 1-6 based on index
    
    // Mock restricted status - every 10th user is restricted
    const isRestricted = i % 10 === 0;

    profiles.push({
      id: i,
      creationDate: formattedDate,
      name: `${name} ${i}`,
      username,
      age,
      city,
      answers,
      friend,
      hookup,
      date,
      partner,
      male,
      female,
      isRestricted
    });
  }
  
  return profiles;
};

// Generate mock data once outside component
const mockProfiles = generateMockProfiles();

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState(mockProfiles);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [viewMode, setViewMode] = useState('table'); // table or grid
  const [restrictedFilter, setRestrictedFilter] = useState('all'); // all, restricted, not-restricted
  const [restrictDays, setRestrictDays] = useState(7);
  const itemsPerPage = 10;

    // Filter and search profiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = searchTerm === '' || 
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = (!startDate || profile.creationDate >= startDate) &&
                             (!endDate || profile.creationDate <= endDate);
    
    const matchesRestrictedFilter = 
      restrictedFilter === 'all' ||
      (restrictedFilter === 'restricted' && profile.isRestricted) ||
      (restrictedFilter === 'not-restricted' && !profile.isRestricted);
    
    return matchesSearch && matchesDateRange && matchesRestrictedFilter;
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
    setRestrictedFilter('all');
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

  const handleProfileClick = (profileId: number) => {
    router.push(`/dashboard/profiles/${profileId}`);
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
                Restricted Status
              </label>
              <select
                value={restrictedFilter}
                onChange={(e) => setRestrictedFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white shadow-sm transition-all duration-200 hover:border-gray-400 text-gray-900 cursor-pointer"
              >
                <option value="all">All Users</option>
                <option value="restricted">Restricted Users</option>
                <option value="not-restricted">Non-Restricted Users</option>
              </select>
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
            <i className="fas fa-hourglass-half absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="number"
              min={1}
              value={restrictDays}
              onChange={(e) => setRestrictDays(parseInt(e.target.value || '1', 10))}
              placeholder="Restrict days"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-transparent cursor-text w-36"
            />
          </div>
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
                  Photo
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('creationDate')}
                >
                  <div className="flex flex-col">
                    <span>Created</span>
                    <span className="mt-1"><SortIcon field="creationDate" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex flex-col">
                    <span>Name</span>
                    <span className="mt-1"><SortIcon field="name" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('username')}
                >
                  <div className="flex flex-col">
                    <span>User</span>
                    <span className="mt-1"><SortIcon field="username" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('age')}
                >
                  <div className="flex flex-col">
                    <span>Age</span>
                    <span className="mt-1"><SortIcon field="age" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('city')}
                >
                  <div className="flex flex-col">
                    <span>City</span>
                    <span className="mt-1"><SortIcon field="city" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('answers')}
                >
                  <div className="flex flex-col">
                    <span>Answers</span>
                    <span className="mt-1"><SortIcon field="answers" /></span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restriction Type
                </th>
                {/* Move Male/Female before Friend */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('male')}
                >
                  <div className="flex flex-col">
                    <span>Male</span>
                    <span className="mt-1"><SortIcon field="male" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('female')}
                >
                  <div className="flex flex-col">
                    <span>Female</span>
                    <span className="mt-1"><SortIcon field="female" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('friend')}
                >
                  <div className="flex flex-col">
                    <span>Friend</span>
                    <span className="mt-1"><SortIcon field="friend" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('hookup')}
                >
                  <div className="flex flex-col">
                    <span>Hookup</span>
                    <span className="mt-1"><SortIcon field="hookup" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex flex-col">
                    <span>Date</span>
                    <span className="mt-1"><SortIcon field="date" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('partner')}
                >
                  <div className="flex flex-col">
                    <span>Partner</span>
                    <span className="mt-1"><SortIcon field="partner" /></span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentProfiles.map((profile) => (
                <tr 
                  key={profile.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleProfileClick(profile.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
                        <i 
                          className="fas fa-user" 
                          style={{
                            color: '#6b7280',
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
                    {profile.age > 0 ? profile.age : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.city || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.answers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.id % 2 === 0 ? 'Text' : 'Reported'}
                  </td>
                  {/* Male / Female moved before relationship columns */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {profile.male}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {profile.female}
                    </span>
                  </td>
                  {/* Relationship columns unified color */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {profile.friend}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {profile.hookup}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {profile.date}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {profile.partner}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className={`transition-colors duration-200 cursor-pointer ${
                          profile.isRestricted 
                            ? 'text-black hover:text-black' 
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        title={profile.isRestricted ? 'Unrestrict User' : `Restrict ${restrictDays} day(s)`}
                      >
                        <i className={`fas ${profile.isRestricted ? 'fa-lock' : 'fa-unlock'}`}></i>
                      </button>
                      {/* Non-permanent ban */}
                      <button 
                        className="text-yellow-600 hover:text-yellow-800 transition-colors duration-200 cursor-pointer"
                        title="Ban User"
                      >
                        <i className="fas fa-user-slash"></i>
                      </button>
                      {/* Temporary restriction */}
                      <button 
                        className="text-orange-600 hover:text-orange-800 transition-colors duration-200 cursor-pointer"
                        title="Temporary Restriction"
                      >
                        <i className="fas fa-clock"></i>
                      </button>
                      {/* Permanent ban (last) */}
                      <button 
                        className="text-red-600 hover:text-red-800 transition-colors duration-200 cursor-pointer"
                        title="Permanent Ban"
                      >
                        <i className="fas fa-ban"></i>
                      </button>
                    </div>
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