'use client';

import { useState } from 'react';

// Type definition for reported user
interface ReportedUser {
  id: number;
  name: string;
  email: string;
  profileImage: string;
  reportReason: string;
  reportDate: string;
  reportCount: number;
  status: 'Pending' | 'Under Review' | 'Resolved' | 'Dismissed';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  reporterCount: number;
  lastReported: string;
  currentRestriction: string;
}

// Mock data for reported users
const generateMockReportedUsers = () => {
  const users = [
    {
      id: 1,
      name: "Alex Thompson",
      email: "alex.t@email.com",
      profileImage: "/assets/avatar1.jpg",
      reportReason: "Inappropriate messages",
      reportDate: "Jan 28, 2025",
      reportCount: 3,
      status: "Pending",
      severity: "Medium",
      reporterCount: 2,
      lastReported: "Jan 27, 2025",
      currentRestriction: "None"
    },
    {
      id: 2,
      name: "Sarah Williams",
      email: "sarah.w@email.com",
      profileImage: "/assets/avatar2.jpg",
      reportReason: "Fake profile",
      reportDate: "Jan 25, 2025",
      reportCount: 5,
      status: "Under Review",
      severity: "High",
      reporterCount: 4,
      lastReported: "Jan 24, 2025",
      currentRestriction: "None"
    },
    {
      id: 3,
      name: "Mike Davis",
      email: "mike.d@email.com",
      profileImage: "/assets/avatar3.jpg",
      reportReason: "Harassment",
      reportDate: "Jan 22, 2025",
      reportCount: 2,
      status: "Resolved",
      severity: "Critical",
      reporterCount: 1,
      lastReported: "Jan 21, 2025",
      currentRestriction: "Temporary (30 days)"
    },
    {
      id: 4,
      name: "Lisa Brown",
      email: "lisa.b@email.com",
      profileImage: "/assets/avatar4.jpg",
      reportReason: "Spam behavior",
      reportDate: "Jan 20, 2025",
      reportCount: 7,
      status: "Pending",
      severity: "Medium",
      reporterCount: 3,
      lastReported: "Jan 19, 2025",
      currentRestriction: "None"
    },
    {
      id: 5,
      name: "David Wilson",
      email: "david.w@email.com",
      profileImage: "/assets/avatar5.jpg",
      reportReason: "Inappropriate content",
      reportDate: "Jan 18, 2025",
      reportCount: 1,
      status: "Dismissed",
      severity: "Low",
      reporterCount: 1,
      lastReported: "Jan 17, 2025",
      currentRestriction: "None"
    },
    {
      id: 6,
      name: "Emma Garcia",
      email: "emma.g@email.com",
      profileImage: "/assets/avatar6.jpg",
      reportReason: "Multiple violations",
      reportDate: "Jan 15, 2025",
      reportCount: 4,
      status: "Under Review",
      severity: "High",
      reporterCount: 2,
      lastReported: "Jan 14, 2025",
      currentRestriction: "None"
    },
    {
      id: 7,
      name: "Alex Rodriguez",
      email: "alex.r@email.com",
      profileImage: "/assets/avatar7.jpg",
      reportReason: "Suspicious activity",
      reportDate: "Jan 12, 2025",
      reportCount: 2,
      status: "Resolved",
      severity: "Medium",
      reporterCount: 1,
      lastReported: "Jan 11, 2025",
      currentRestriction: "Temporary (14 days)"
    },
    {
      id: 8,
      name: "Maria Johnson",
      email: "maria.j@email.com",
      profileImage: "/assets/avatar8.jpg",
      reportReason: "Terms of service violation",
      reportDate: "Jan 10, 2025",
      reportCount: 6,
      status: "Pending",
      severity: "Critical",
      reporterCount: 5,
      lastReported: "Jan 9, 2025",
      currentRestriction: "None"
    }
  ];

  return users;
};

const mockReportedUsers = generateMockReportedUsers();

const statusTypes = ["All", "Pending", "Under Review", "Resolved", "Dismissed"];
const severityTypes = ["All", "Low", "Medium", "High", "Critical"];

export default function ReportedUsersPage() {
  const [users, setUsers] = useState(mockReportedUsers);
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

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.reportReason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'All' || 
      user.status === selectedStatus;

    const matchesSeverity = selectedSeverity === 'All' || 
      user.severity === selectedSeverity;
    
    const matchesDateRange = (!startDate || user.reportDate >= startDate) &&
                           (!endDate || user.reportDate <= endDate);
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesDateRange;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];
    
    if (sortField === 'reportCount' || sortField === 'reporterCount') {
      const aNum = typeof aValue === 'number' ? aValue : 0;
      const bNum = typeof bValue === 'number' ? bValue : 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
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

  const executeAction = () => {
    if (selectedAction === 'dismiss') {
      if (selectedUserForAction) {
        // Dismiss report for single user
        setUsers(prev => prev.map(u => 
          u.id === selectedUserForAction.id 
            ? { ...u, status: 'Dismissed' as const }
            : u
        ));
      } else {
        // Dismiss reports for bulk selected users
        setUsers(prev => prev.map(u => 
          selectedUsers.includes(u.id) 
            ? { ...u, status: 'Dismissed' as const }
            : u
        ));
      }
    } else if (selectedAction === 'restrict') {
      // Apply restriction logic
      setUsers(prev => prev.map(u => {
        if (selectedUserForAction && u.id === selectedUserForAction.id) {
          return { ...u, status: 'Resolved' as const, currentRestriction: 'Temporary (30 days)' };
        }
        if (selectedUsers.includes(u.id)) {
          return { ...u, status: 'Resolved' as const, currentRestriction: 'Temporary (30 days)' };
        }
        return u;
      }));
    } else if (selectedAction === 'permanent') {
      // Apply permanent restriction
      setUsers(prev => prev.map(u => {
        if (selectedUserForAction && u.id === selectedUserForAction.id) {
          return { ...u, status: 'Resolved' as const, currentRestriction: 'Permanent' };
        }
        if (selectedUsers.includes(u.id)) {
          return { ...u, status: 'Resolved' as const, currentRestriction: 'Permanent' };
        }
        return u;
      }));
    } else if (selectedAction === 'review') {
      // Mark for review
      setUsers(prev => prev.map(u => {
        if (selectedUserForAction && u.id === selectedUserForAction.id) {
          return { ...u, status: 'Under Review' as const };
        }
        if (selectedUsers.includes(u.id)) {
          return { ...u, status: 'Under Review' as const };
        }
        return u;
      }));
    }
    
    setShowActionModal(false);
    setSelectedAction('');
    setSelectedUserForAction(null);
    setSelectedUsers([]);
    setShowBulkActions(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Under Review':
        return 'bg-blue-100 text-blue-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reported From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
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
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('reportCount')}
                >
                  Reports
                  <SortIcon field="reportCount" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('reporterCount')}
                >
                  Reporters
                  <SortIcon field="reporterCount" />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('reportDate')}
                >
                  Reported Date
                  <SortIcon field="reportDate" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Restriction
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
                        <div className="h-10 w-10 rounded-full bg-[#672DB7] flex items-center justify-center">
                          <i className="fas fa-user text-white"></i>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{user.reportReason}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(user.severity)}`}>
                      {user.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.reportCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.reporterCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.reportDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.currentRestriction}
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
                        onClick={() => handleAction('review', user)}
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer"
                        title="Mark for Review"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button 
                        onClick={() => handleAction('restrict', user)}
                        className="text-orange-600 hover:text-orange-800 transition-colors duration-200 cursor-pointer"
                        title="Apply Restriction"
                      >
                        <i className="fas fa-ban"></i>
                      </button>
                      <button 
                        onClick={() => handleAction('permanent', user)}
                        className="text-red-600 hover:text-red-800 transition-colors duration-200 cursor-pointer"
                        title="Permanent Ban"
                      >
                        <i className="fas fa-user-slash"></i>
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
                {selectedAction === 'dismiss' && 'Are you sure you want to dismiss this report(s)?'}
                {selectedAction === 'review' && 'Are you sure you want to mark this for review?'}
                {selectedAction === 'restrict' && 'Are you sure you want to apply a temporary restriction?'}
                {selectedAction === 'permanent' && 'Are you sure you want to apply a permanent ban?'}
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  className={`px-4 py-2 rounded-md text-white transition-colors duration-200 cursor-pointer ${
                    selectedAction === 'dismiss' ? 'bg-gray-600 hover:bg-gray-700' :
                    selectedAction === 'review' ? 'bg-blue-600 hover:bg-blue-700' :
                    selectedAction === 'restrict' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >
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