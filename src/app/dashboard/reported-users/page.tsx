'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

// Type definition for reported user
interface ReportedUser {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    profile_photo?: string;
  };
  report_reason: string;
  report_date: string;
  report_count: number;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reporter_count: number;
  last_reported: string;
  current_restriction?: string;
}

export default function ReportedUsersPage() {
  const [users, setUsers] = useState<ReportedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [selectedUserForAction, setSelectedUserForAction] = useState<ReportedUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch reported users from API
  const fetchReportedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use dummy data since no users are actually reported yet
      const dummyData: ReportedUser[] = [
        {
          id: 1,
          user: {
            id: 1,
            first_name: 'John',
            last_name: 'Smith',
            email: 'john.smith@example.com',
            profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
          },
          report_reason: 'Harassment and inappropriate messages',
          report_date: '2024-01-20T14:30:00Z',
          report_count: 3,
          status: 'pending',
          severity: 'high',
          reporter_count: 2,
          last_reported: '2024-01-20T14:30:00Z'
        },
        {
          id: 2,
          user: {
            id: 2,
            first_name: 'Sarah',
            last_name: 'Johnson',
            email: 'sarah.johnson@example.com',
            profile_photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'
          },
          report_reason: 'Fake profile and misleading information',
          report_date: '2024-01-19T11:15:00Z',
          report_count: 5,
          status: 'under_review',
          severity: 'medium',
          reporter_count: 3,
          last_reported: '2024-01-19T16:45:00Z'
        },
        {
          id: 3,
          user: {
            id: 3,
            first_name: 'Mike',
            last_name: 'Davis',
            email: 'mike.davis@example.com',
            profile_photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
          },
          report_reason: 'Spam messages to multiple users',
          report_date: '2024-01-18T09:45:00Z',
          report_count: 8,
          status: 'resolved',
          severity: 'critical',
          reporter_count: 6,
          last_reported: '2024-01-18T13:20:00Z',
          current_restriction: 'Temporary ban - 14 days'
        },
        {
          id: 4,
          user: {
            id: 4,
            first_name: 'Emily',
            last_name: 'Wilson',
            email: 'emily.wilson@example.com',
            profile_photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
          },
          report_reason: 'Inappropriate profile picture',
          report_date: '2024-01-17T16:20:00Z',
          report_count: 2,
          status: 'pending',
          severity: 'low',
          reporter_count: 1,
          last_reported: '2024-01-17T16:20:00Z'
        },
        {
          id: 5,
          user: {
            id: 5,
            first_name: 'David',
            last_name: 'Brown',
            email: 'david.brown@example.com',
            profile_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'
          },
          report_reason: 'Age misrepresentation',
          report_date: '2024-01-16T12:10:00Z',
          report_count: 1,
          status: 'dismissed',
          severity: 'medium',
          reporter_count: 1,
          last_reported: '2024-01-16T12:10:00Z'
        },
        {
          id: 6,
          user: {
            id: 6,
            first_name: 'Lisa',
            last_name: 'Taylor',
            email: 'lisa.taylor@example.com',
            profile_photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'
          },
          report_reason: 'Aggressive behavior in chat',
          report_date: '2024-01-15T10:30:00Z',
          report_count: 4,
          status: 'under_review',
          severity: 'high',
          reporter_count: 2,
          last_reported: '2024-01-15T14:15:00Z'
        },
        {
          id: 7,
          user: {
            id: 7,
            first_name: 'Alex',
            last_name: 'Chen',
            email: 'alex.chen@example.com',
            profile_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face'
          },
          report_reason: 'Multiple account creation',
          report_date: '2024-01-14T08:45:00Z',
          report_count: 6,
          status: 'resolved',
          severity: 'critical',
          reporter_count: 4,
          last_reported: '2024-01-14T11:30:00Z',
          current_restriction: 'Permanent ban'
        },
        {
          id: 8,
          user: {
            id: 8,
            first_name: 'Rachel',
            last_name: 'Martinez',
            email: 'rachel.martinez@example.com',
            profile_photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face'
          },
          report_reason: 'Inappropriate language in messages',
          report_date: '2024-01-13T15:20:00Z',
          report_count: 2,
          status: 'pending',
          severity: 'medium',
          reporter_count: 1,
          last_reported: '2024-01-13T15:20:00Z'
        }
      ];
      
      setUsers(dummyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reported users');
      console.error('Error fetching reported users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportedUsers();
  }, []);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      `${user.user.first_name} ${user.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.report_reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'All' || 
      user.status === selectedStatus.toLowerCase().replace(' ', '_');
    
    const matchesSeverity = selectedSeverity === 'All' || 
      user.severity === selectedSeverity.toLowerCase();
    
    const matchesDateRange = (!startDate || !user.report_date || user.report_date >= startDate) &&
                           (!endDate || !user.report_date || user.report_date <= endDate);
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesDateRange;
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

  const handleAction = (action: string, user?: ReportedUser) => {
    setSelectedAction(action);
    setSelectedUserForAction(user || null);
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!selectedAction) return;

    setActionLoading(true);
    try {
      if (selectedAction === 'dismiss') {
        if (selectedUserForAction) {
          await apiService.resolveReport(selectedUserForAction.id, 'dismiss');
          setUsers(prev => prev.filter(u => u.id !== selectedUserForAction!.id));
          setSelectedUsers(prev => prev.filter(id => id !== selectedUserForAction!.id));
        } else {
          for (const userId of selectedUsers) {
            await apiService.resolveReport(userId, 'dismiss');
          }
          setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
          setSelectedUsers([]);
        }
      } else if (selectedAction === 'restrict') {
        if (selectedUserForAction) {
          await apiService.resolveReport(selectedUserForAction.id, 'restrict');
          setUsers(prev => prev.filter(u => u.id !== selectedUserForAction!.id));
          setSelectedUsers(prev => prev.filter(id => id !== selectedUserForAction!.id));
        } else {
          for (const userId of selectedUsers) {
            await apiService.resolveReport(userId, 'restrict');
          }
          setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
          setSelectedUsers([]);
        }
      } else if (selectedAction === 'permanent') {
        if (selectedUserForAction) {
          await apiService.resolveReport(selectedUserForAction.id, 'permanent');
          setUsers(prev => prev.filter(u => u.id !== selectedUserForAction!.id));
          setSelectedUsers(prev => prev.filter(id => id !== selectedUserForAction!.id));
        } else {
          for (const userId of selectedUsers) {
            await apiService.resolveReport(userId, 'permanent');
          }
          setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
          setSelectedUsers([]);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
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
          <p className="text-gray-600">Loading reported users...</p>
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
              onClick={fetchReportedUsers}
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
            <span>Reported Users</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">List</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Reported Users</h1>
          <p className="text-gray-600 mt-2">Manage users who have been reported by others</p>
        </div>
        <div className="flex items-center space-x-3">
          {showBulkActions && (
            <>
              <button
                onClick={() => handleAction('dismiss')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium cursor-pointer"
              >
                <i className="fas fa-times mr-2"></i>
                Dismiss Reports ({selectedUsers.length})
              </button>
              <button
                onClick={() => handleAction('restrict')}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors duration-200 font-medium cursor-pointer"
              >
                <i className="fas fa-ban mr-2"></i>
                Apply Restrictions ({selectedUsers.length})
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

          {/* Status Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
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
              <option value="All">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7]"
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
                  Report Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reports
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('report_date')}
                >
                  Report Date
                  <SortIcon field="report_date" />
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
                        {user.user.profile_photo ? (
                          <img 
                            className="h-10 w-10 rounded-full object-cover"
                            src={user.user.profile_photo}
                            alt={`${user.user.first_name} ${user.user.last_name}`}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#672DB7] flex items-center justify-center">
                            <i className="fas fa-user text-white"></i>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.user.first_name} {user.user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{user.report_reason}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(user.severity)}`}>
                      {user.severity.charAt(0).toUpperCase() + user.severity.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.report_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.report_date ? new Date(user.report_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleAction('dismiss', user)}
                        className="text-gray-600 hover:text-gray-800 transition-colors duration-200 cursor-pointer"
                        title="Dismiss Report"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                      <button 
                        onClick={() => handleAction('restrict', user)}
                        className="text-orange-600 hover:text-orange-800 transition-colors duration-200 cursor-pointer"
                        title="Review & Restrict"
                      >
                        <i className="fas fa-eye"></i>
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
          <i className="fas fa-exclamation-triangle text-6xl text-gray-400 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reported Users</h3>
          <p className="text-gray-600">There are currently no users with active reports.</p>
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
                {selectedAction === 'dismiss' && 'Are you sure you want to dismiss the report(s)?'}
                {selectedAction === 'restrict' && 'Are you sure you want to restrict the user(s)?'}
                {selectedAction === 'permanent' && 'Are you sure you want to permanently ban the user(s)?'}
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
                    selectedAction === 'dismiss' ? 'bg-gray-600 hover:bg-gray-700' :
                    selectedAction === 'restrict' ? 'bg-orange-600 hover:bg-orange-700' :
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