'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

// Type definition for restricted user
interface RestrictedUser {
  id: number;
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

// Type definition for API response
interface ApiUser {
  id: number;
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
  const [sortDirection, setSortDirection] = useState('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
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
      
      // Use dummy data since no users are actually restricted yet
      const dummyData: RestrictedUser[] = [
        {
          id: 1,
          username: 'john_doe',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
          restriction_reason: 'Inappropriate behavior in chat',
          restriction_date: '2024-01-15T10:30:00Z',
          restriction_type: 'temporary',
          restriction_duration: 7,
          is_banned: true,
          last_seen: '2024-01-14T18:45:00Z',
          live: 'New York, NY',
          age: 28
        },
        {
          id: 2,
          username: 'sarah_smith',
          first_name: 'Sarah',
          last_name: 'Smith',
          email: 'sarah.smith@example.com',
          profile_photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
          restriction_reason: 'Multiple violations of community guidelines',
          restriction_date: '2024-01-12T14:20:00Z',
          restriction_type: 'permanent',
          restriction_duration: 0,
          is_banned: true,
          last_seen: '2024-01-12T13:15:00Z',
          live: 'Los Angeles, CA',
          age: 32
        },
        {
          id: 3,
          username: 'mike_wilson',
          first_name: 'Mike',
          last_name: 'Wilson',
          email: 'mike.wilson@example.com',
          profile_photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
          restriction_reason: 'Spam messages to multiple users',
          restriction_date: '2024-01-10T09:15:00Z',
          restriction_type: 'temporary',
          restriction_duration: 14,
          is_banned: true,
          last_seen: '2024-01-10T08:30:00Z',
          live: 'Chicago, IL',
          age: 25
        },
        {
          id: 4,
          username: 'emily_davis',
          first_name: 'Emily',
          last_name: 'Davis',
          email: 'emily.davis@example.com',
          profile_photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
          restriction_reason: 'Fake profile information',
          restriction_date: '2024-01-08T16:45:00Z',
          restriction_type: 'temporary',
          restriction_duration: 30,
          is_banned: true,
          last_seen: '2024-01-08T15:20:00Z',
          live: 'Austin, TX',
          age: 29
        },
        {
          id: 5,
          username: 'david_brown',
          first_name: 'David',
          last_name: 'Brown',
          email: 'david.brown@example.com',
          profile_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
          restriction_reason: 'Harassment of other users',
          restriction_date: '2024-01-05T11:30:00Z',
          restriction_type: 'permanent',
          restriction_duration: 0,
          is_banned: true,
          last_seen: '2024-01-05T10:45:00Z',
          live: 'Seattle, WA',
          age: 31
        },
        {
          id: 6,
          username: 'lisa_johnson',
          first_name: 'Lisa',
          last_name: 'Johnson',
          email: 'lisa.johnson@example.com',
          profile_photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
          restriction_reason: 'Inappropriate profile picture',
          restriction_date: '2024-01-03T13:20:00Z',
          restriction_type: 'temporary',
          restriction_duration: 3,
          is_banned: false,
          last_seen: '2024-01-06T14:30:00Z',
          live: 'Miami, FL',
          age: 27
        },
        {
          id: 7,
          username: 'alex_chen',
          first_name: 'Alex',
          last_name: 'Chen',
          email: 'alex.chen@example.com',
          profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
          restriction_reason: 'Multiple account creation',
          restriction_date: '2024-01-01T08:15:00Z',
          restriction_type: 'permanent',
          restriction_duration: 0,
          is_banned: true,
          last_seen: '2024-01-01T07:30:00Z',
          live: 'San Francisco, CA',
          age: 26
        },
        {
          id: 8,
          username: 'rachel_taylor',
          first_name: 'Rachel',
          last_name: 'Taylor',
          email: 'rachel.taylor@example.com',
          profile_photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
          restriction_reason: 'Violation of age policy',
          restriction_date: '2023-12-28T15:45:00Z',
          restriction_type: 'temporary',
          restriction_duration: 21,
          is_banned: false,
          last_seen: '2024-01-18T12:15:00Z',
          live: 'Denver, CO',
          age: 24
        }
      ];
      
      setUsers(dummyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch restricted users');
      console.error('Error fetching restricted users:', err);
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
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.restriction_reason && user.restriction_reason.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRestrictionType = selectedRestrictionType === 'All' || 
      user.restriction_type === selectedRestrictionType;
    
    const matchesStatus = selectedStatus === 'All' || 
      (selectedStatus === 'Active' && user.is_banned) ||
      (selectedStatus === 'Expired' && !user.is_banned);

    const matchesSeverity = selectedSeverity === 'All'; // You can add severity logic here
    
    const matchesDateRange = (!startDate || !user.restriction_date || user.restriction_date >= startDate) &&
                           (!endDate || !user.restriction_date || user.restriction_date <= endDate);
    
    return matchesSearch && matchesRestrictionType && matchesStatus && matchesSeverity && matchesDateRange;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];
    
    if (sortDirection === 'asc') {
      return (aValue ?? '') > (bValue ?? '') ? 1 : -1;
    } else {
      return (aValue ?? '') < (bValue ?? '') ? 1 : -1;
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

  const handleUserSelect = (userId: number) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        const newSelected = prev.filter(id => id !== userId);
        setShowBulkActions(newSelected.length > 0);
        return newSelected;
      } else {
        const newSelected = [...prev, userId];
        setShowBulkActions(true);
        return newSelected;
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([]);
      setShowBulkActions(false);
    } else {
      setSelectedUsers(currentUsers.map(u => u.id));
      setShowBulkActions(true);
    }
  };

  const handleAction = (action: string, user?: RestrictedUser) => {
    setSelectedAction(action);
    setSelectedUserForAction(user || null);
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!selectedAction) return;

    setActionLoading(true);
    try {
      if (selectedAction === 'remove') {
        if (selectedUserForAction) {
          // Remove restriction for single user
          await apiService.removeRestriction(selectedUserForAction.id.toString());
          setUsers(prev => prev.filter(u => u.id !== selectedUserForAction!.id));
          setSelectedUsers(prev => prev.filter(id => id !== selectedUserForAction!.id));
        } else {
          // Remove restrictions for bulk selected users
          for (const userId of selectedUsers) {
            await apiService.removeRestriction(userId.toString());
          }
          setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
          setSelectedUsers([]);
        }
      } else if (selectedAction === 'extend') {
        // Extend restriction logic - you can implement this
        console.log('Extend restriction:', selectedUserForAction || selectedUsers);
      } else if (selectedAction === 'permanent') {
        // Make restriction permanent
        if (selectedUserForAction) {
          await apiService.restrictUser(selectedUserForAction.id.toString(), {
            restriction_type: 'permanent',
            duration: 0,
            reason: 'Made permanent by admin'
          });
          setUsers(prev => prev.map(u => 
            u.id === selectedUserForAction.id 
              ? { ...u, restriction_type: 'Permanent', restriction_duration: 0 }
              : u
          ));
        } else {
          for (const userId of selectedUsers) {
            await apiService.restrictUser(userId.toString(), {
              restriction_type: 'permanent',
              duration: 0,
              reason: 'Made permanent by admin'
            });
          }
          setUsers(prev => prev.map(u => 
            selectedUsers.includes(u.id)
              ? { ...u, restriction_type: 'Permanent', restriction_duration: 0 }
              : u
          ));
        }
      }
      
      setShowActionModal(false);
      setSelectedAction('');
      setSelectedUserForAction(null);
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error executing action:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (isBanned: boolean) => {
    return isBanned 
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';
  };

  const getRestrictionTypeColor = (type?: string) => {
    switch (type) {
      case 'permanent':
        return 'bg-red-100 text-red-800';
      case 'temporary':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-[#672DB7] mb-4"></i>
          <p className="text-gray-600">Loading restricted users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
          <div>
            <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <button 
              onClick={fetchRestrictedUsers}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
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
            <span className="text-gray-900">List</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Restricted Users</h1>
          <p className="text-gray-600 mt-2">Manage users with active restrictions</p>
        </div>
        <div className="flex items-center space-x-3">
          {showBulkActions && (
            <>
              <button
                onClick={() => handleAction('remove')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium cursor-pointer"
              >
                <i className="fas fa-unlock mr-2"></i>
                Remove Restrictions ({selectedUsers.length})
              </button>
              <button
                onClick={() => handleAction('permanent')}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium cursor-pointer"
              >
                <i className="fas fa-ban mr-2"></i>
                Make Permanent ({selectedUsers.length})
              </button>
            </>
          )}
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
                placeholder="Search users, email, or reason"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7]"
              />
            </div>
          </div>

          {/* Restriction Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Restriction Type</label>
            <select
              value={selectedRestrictionType}
              onChange={(e) => setSelectedRestrictionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
            >
              {restrictionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
            >
              {statusTypes.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Severity Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
            >
              {severityTypes.map(severity => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restriction Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('restriction_date')}
                >
                  Restricted Date
                  <SortIcon field="restriction_date" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserSelect(user.id)}
                      className="rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7]"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.profile_photo ? (
                          <img 
                            className="h-10 w-10 rounded-full object-cover"
                            src={user.profile_photo}
                            alt={`${user.first_name} ${user.last_name}`}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#672DB7] flex items-center justify-center">
                            <i className="fas fa-user text-white"></i>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{user.restriction_reason || 'No reason provided'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRestrictionTypeColor(user.restriction_type)}`}>
                      {user.restriction_type || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor('Medium')}`}>
                      Medium
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.is_banned)}`}>
                      {user.is_banned ? 'Active' : 'Expired'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.restriction_date ? new Date(user.restriction_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleAction('remove', user)}
                        className="text-green-600 hover:text-green-800 transition-colors duration-200 cursor-pointer"
                        title="Remove Restriction"
                      >
                        <i className="fas fa-unlock"></i>
                      </button>
                      <button 
                        onClick={() => handleAction('extend', user)}
                        className="text-orange-600 hover:text-orange-800 transition-colors duration-200 cursor-pointer"
                        title="Extend Restriction"
                      >
                        <i className="fas fa-clock"></i>
                      </button>
                      <button 
                        onClick={() => handleAction('permanent', user)}
                        className="text-red-600 hover:text-red-800 transition-colors duration-200 cursor-pointer"
                        title="Make Permanent"
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
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
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
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            {/* Page Numbers */}
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
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {sortedUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <i className="fas fa-user-slash text-6xl text-gray-400 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Restricted Users</h3>
          <p className="text-gray-600">There are currently no users with active restrictions.</p>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm Action
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {selectedAction === 'remove' && 'Are you sure you want to remove the restriction(s)?'}
                {selectedAction === 'extend' && 'Are you sure you want to extend the restriction(s)?'}
                {selectedAction === 'permanent' && 'Are you sure you want to make the restriction(s) permanent?'}
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowActionModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-md text-white transition-colors duration-200 cursor-pointer disabled:opacity-50 ${
                    selectedAction === 'remove' ? 'bg-green-600 hover:bg-green-700' :
                    selectedAction === 'extend' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : null}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 