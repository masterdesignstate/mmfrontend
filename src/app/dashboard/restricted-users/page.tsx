'use client';

import { useState, useEffect } from 'react';
import { apiService, ApiUser } from '@/services/api';

// Type definition for restricted user
interface RestrictedUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_photo?: string;
  restriction_reason?: string;
  restriction_date?: string;
  restriction_type?: string;
  restriction_duration?: number;
  is_banned: boolean;
  last_seen?: string;
  live?: string;
  age?: number;
}

const restrictionTypes = ["All", "Temporary", "Permanent"];
const statusTypes = ["All", "Active", "Expired"];
const severityTypes = ["All", "Low", "Medium", "High"];

export default function RestrictedUsersPage() {
  const [users, setUsers] = useState<RestrictedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestrictionType, setSelectedRestrictionType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedUserForAction, setSelectedUserForAction] = useState<RestrictedUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch restricted users from API
  const fetchRestrictedUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all users and filter for banned ones
      const allUsers = await apiService.getUsers();
      const restrictedUsers: RestrictedUser[] = allUsers
        .filter((user: ApiUser) => user.is_banned)
        .map((user: ApiUser) => ({
          id: user.id,
          username: user.username,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email,
          profile_photo: user.profile_photo,
          restriction_reason: undefined,
          restriction_date: undefined,
          restriction_type: undefined,
          restriction_duration: undefined,
          is_banned: user.is_banned || false,
          last_seen: undefined,
          live: user.live,
          age: user.age
        }));

      setUsers(restrictedUsers);
    } catch (err) {
      console.error('Error fetching restricted users:', err);
      setError('Failed to fetch restricted users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestrictedUsers();
  }, []);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRestrictionType = selectedRestrictionType === 'All' ||
      (selectedRestrictionType === 'Temporary' && user.restriction_type === 'temporary') ||
      (selectedRestrictionType === 'Permanent' && user.restriction_type === 'permanent');

    const matchesDateRange = (!startDate || (user.restriction_date && user.restriction_date >= startDate)) &&
                           (!endDate || (user.restriction_date && user.restriction_date <= endDate));

    return matchesSearch && matchesRestrictionType && matchesDateRange;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];

    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = sortedUsers.slice(startIndex, endIndex);

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
    setSelectedRestrictionType('All');
    setSelectedStatus('All');
    setSelectedSeverity('All');
    setStartDate('');
    setEndDate('');
    setSortField('');
    setSortDirection('asc');
    setCurrentPage(1);
    setSelectedUsers([]);
    setShowBulkActions(false);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <i className="fas fa-sort text-gray-400 ml-1"></i>;
    }
    return sortDirection === 'asc'
      ? <i className="fas fa-sort-up text-[#672DB7] ml-1"></i>
      : <i className="fas fa-sort-down text-[#672DB7] ml-1"></i>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            <span>Restricted Users</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">All Restricted</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Restricted Users</h1>
          <p className="text-gray-600 mt-2">View and manage restricted user accounts</p>
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] cursor-text"
              />
            </div>
          </div>

          {/* Restriction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Restriction Type</label>
            <select
              value={selectedRestrictionType}
              onChange={(e) => setSelectedRestrictionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900"
            >
              {restrictionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Restricted From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white shadow-sm transition-all duration-200 hover:border-gray-400 text-gray-900 cursor-text"
            />
          </div>

          {/* Date Until */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Restricted Until</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white shadow-sm transition-all duration-200 hover:border-gray-400 text-gray-900 cursor-text"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('username')}
                >
                  Username
                  <SortIcon field="username" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('age')}
                >
                  Age
                  <SortIcon field="age" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restriction Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restricted Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.age || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.live || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      user.restriction_type === 'permanent'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.restriction_type || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.restriction_date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{user.restriction_reason || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      className="text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer"
                      title="View Details"
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
            Showing {startIndex + 1} to {Math.min(endIndex, sortedUsers.length)} of {sortedUsers.length} results
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

      {/* Empty State */}
      {sortedUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <i className="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Restricted Users</h3>
          <p className="text-gray-600">There are currently no restricted users in the system.</p>
        </div>
      )}
    </div>
  );
}
