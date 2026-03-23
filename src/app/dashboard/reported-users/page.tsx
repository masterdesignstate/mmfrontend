'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface ReportedUser {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_photo?: string;
  };
  report_ids: string[];
  report_reason: string;
  report_date: string;
  report_count: number;
  status: string;
  severity: string;
  reporter_count: number;
  last_reported: string;
  current_restriction?: boolean;
  restriction_type?: string;
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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedUserForAction, setSelectedUserForAction] = useState<ReportedUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [restrictDuration, setRestrictDuration] = useState(30);

  const fetchReportedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getReportedUsers() as ReportedUser[];
      setUsers(data);
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

  const handleUserSelect = (userId: string) => {
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
    setRestrictDuration(30);
    setShowActionModal(true);
  };

  const resolveReportsForUser = async (reportedUser: ReportedUser, action: string) => {
    for (const reportId of reportedUser.report_ids) {
      if (action === 'restrict') {
        await apiService.resolveReport(reportId, action, restrictDuration);
      } else {
        await apiService.resolveReport(reportId, action);
      }
    }
  };

  const executeAction = async () => {
    if (!selectedAction) return;
    setActionLoading(true);
    try {
      if (selectedUserForAction) {
        await resolveReportsForUser(selectedUserForAction, selectedAction);
        setUsers(prev => prev.filter(u => u.id !== selectedUserForAction!.id));
        setSelectedUsers(prev => prev.filter(id => id !== selectedUserForAction!.id));
      } else {
        for (const userId of selectedUsers) {
          const user = users.find(u => u.id === userId);
          if (user) await resolveReportsForUser(user, selectedAction);
        }
        setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
        setSelectedUsers([]);
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7]"></div>
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
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 cursor-pointer"
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
          <h1 className="text-3xl font-bold text-gray-900">Reported Users</h1>
          <p className="text-gray-600 mt-2">Manage users who have been reported by others</p>
        </div>
        <div className="flex items-center space-x-3">
          {showBulkActions && (
            <>
              <button
                onClick={() => handleAction('dismiss')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium cursor-pointer"
              >
                <i className="fas fa-times mr-2"></i>
                Dismiss ({selectedUsers.length})
              </button>
              <button
                onClick={() => handleAction('restrict')}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium cursor-pointer"
              >
                <i className="fas fa-ban mr-2"></i>
                Restrict ({selectedUsers.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button onClick={resetFilters} className="text-red-600 hover:text-red-800 font-medium cursor-pointer">
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search users, email, or reason"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] bg-white cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] bg-white cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Date From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
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
                    className="rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7] cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('report_date')}
                >
                  Date <SortIcon field="report_date" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      className="rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7] cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                        src={user.user.profile_photo || '/assets/usxr.png'}
                        alt={`${user.user.first_name} ${user.user.last_name}`}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.user.first_name} {user.user.last_name}
                          {user.current_restriction && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Banned
                            </span>
                          )}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAction('dismiss', user)}
                        className="text-gray-600 hover:text-gray-800 cursor-pointer"
                        title="Dismiss"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                      <button
                        onClick={() => handleAction('restrict', user)}
                        className="text-orange-600 hover:text-orange-800 cursor-pointer"
                        title="Temporary Restrict"
                      >
                        <i className="fas fa-clock"></i>
                      </button>
                      <button
                        onClick={() => handleAction('permanent', user)}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
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
      {sortedUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-900">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedUsers.length)} of {sortedUsers.length}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#672DB7] bg-white cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) pageNum = i + 1;
                else if (currentPage <= 4) pageNum = i + 1;
                else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
                else pageNum = currentPage - 3 + i;

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
                className="px-3 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {sortedUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <i className="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reported Users</h3>
          <p className="text-gray-600">There are currently no users with active reports.</p>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowActionModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                selectedAction === 'dismiss' ? 'bg-gray-100' :
                selectedAction === 'restrict' ? 'bg-orange-50' : 'bg-red-50'
              }`}>
                <i className={`fas ${
                  selectedAction === 'dismiss' ? 'fa-times text-gray-600' :
                  selectedAction === 'restrict' ? 'fa-clock text-orange-600' : 'fa-ban text-red-600'
                } text-xl`}></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedAction === 'dismiss' && 'Dismiss Report'}
                {selectedAction === 'restrict' && 'Temporary Restriction'}
                {selectedAction === 'permanent' && 'Permanent Ban'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedAction === 'dismiss' && 'This will dismiss the report(s) without any action.'}
                {selectedAction === 'restrict' && 'Set a temporary suspension duration for this user.'}
                {selectedAction === 'permanent' && 'This user will be permanently banned from the platform.'}
              </p>
            </div>

            {/* Duration Picker for restrict action */}
            {selectedAction === 'restrict' && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Suspension Duration</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[7, 14, 30, 90].map(days => (
                    <button
                      key={days}
                      onClick={() => setRestrictDuration(days)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                        restrictDuration === days
                          ? 'bg-[#672DB7] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={restrictDuration}
                    onChange={(e) => setRestrictDuration(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#672DB7]"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">days</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className={`w-full py-2.5 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors disabled:opacity-50 ${
                  selectedAction === 'dismiss' ? 'bg-gray-600 hover:bg-gray-700' :
                  selectedAction === 'restrict' ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i> Processing...
                  </span>
                ) : (
                  selectedAction === 'dismiss' ? 'Dismiss Report' :
                  selectedAction === 'restrict' ? `Suspend for ${restrictDuration} days` :
                  'Permanently Ban'
                )}
              </button>
              <button
                onClick={() => setShowActionModal(false)}
                disabled={actionLoading}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
