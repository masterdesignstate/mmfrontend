'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, ApiUser } from '@/services/api';

interface ProfileData {
  id: string;
  creationDate: string;
  name: string;
  username: string;
  age: number;
  live: string;
  answers: number;
  friend: number | null;
  hookup: number | null;
  date: number | null;
  partner: number | null;
  male: number | null;
  female: number | null;
  restrictionType: string;
}

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        setError(null);

        const users = await apiService.getUsers();

        // Transform API users to ProfileData format
        const transformedProfiles: ProfileData[] = users.map((user: ApiUser) => {
          const questionAnswers = user.question_answers || {};

          return {
            id: user.id,
            creationDate: formatDate(user.date_joined || ''),
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
            username: user.username,
            age: user.age || 0,
            live: user.live || '',
            answers: user.questions_answered_count || 0,
            male: questionAnswers.male || null,
            female: questionAnswers.female || null,
            friend: questionAnswers.friend || null,
            hookup: questionAnswers.hookup || null,
            date: questionAnswers.date || null,
            partner: questionAnswers.partner || null,
            restrictionType: user.is_banned ? 'Restricted' : 'None'
          };
        });

        setProfiles(transformedProfiles);
      } catch (err) {
        console.error('Error fetching profiles:', err);
        setError('Failed to fetch profiles');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = searchTerm === '' ||
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.live.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Sort profiles
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];

    // Handle null values
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue === null) return sortDirection === 'asc' ? -1 : 1;

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
    setSortField('');
    setSortDirection('asc');
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <i className="fas fa-sort text-gray-400 ml-1"></i>;
    }
    return sortDirection === 'asc'
      ? <i className="fas fa-sort-up text-[#672DB7] ml-1"></i>
      : <i className="fas fa-sort-down text-[#672DB7] ml-1"></i>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <span>Profiles</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">All Profiles</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Profiles</h1>
          <p className="text-gray-600 mt-2">View and manage user profiles</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button
            onClick={resetFilters}
            className="text-red-600 hover:text-red-800 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors duration-200 cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] cursor-text"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex flex-col">
                    <span>Sr #</span>
                    <span className="mt-1"><SortIcon field="id" /></span>
                  </div>
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
                  onClick={() => handleSort('live')}
                >
                  <div className="flex flex-col">
                    <span>Live</span>
                    <span className="mt-1"><SortIcon field="live" /></span>
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
              {currentProfiles.map((profile, index) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.creationDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.age || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.live || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.answers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      profile.restrictionType === 'None'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {profile.restrictionType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.male ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.female ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.friend ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.hookup ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.date ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {profile.partner ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => router.push(`/dashboard/profiles/${profile.id}`)}
                      className="text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer"
                      title="View Profile"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination and Results Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-900">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedProfiles.length)} of {sortedProfiles.length} results
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-900">Per page</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <i className="fas fa-chevron-left"></i>
            </button>

            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-[#672DB7] text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
