'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

// Type definition for picture moderation item
interface PictureModerationItem {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    profile_photo?: string;
    join_date?: string;
    location?: string;
    age?: number;
  };
  submitted_date: string;
  status: 'pending' | 'approved' | 'rejected';
  moderation_reason?: string;
  previous_rejections: number;
}

export default function PictureModerationPage() {
  const formatToMDYY = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const yy = String(d.getFullYear()).slice(-2);
    return `${m}/${day}/${yy}`;
  };
  const [items, setItems] = useState<PictureModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('submitted_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedItemForRejection, setSelectedItemForRejection] = useState<PictureModerationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch picture moderation queue from API
  const fetchPictureModerationQueue = async () => {
    try {
      setLoading(true);
      setError(null);

      const queueData = await apiService.getPictureModerationQueue() as PictureModerationItem[];
      // Ensure we always have an array, even if API returns null/undefined
      setItems(Array.isArray(queueData) ? queueData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch picture moderation queue');
      console.error('Error fetching picture moderation queue:', err);
      setItems([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPictureModerationQueue();
  }, []);

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      `${item.user.first_name} ${item.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
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
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedItems.slice(startIndex, endIndex);

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
    setSortField('submitted_date');
    setSortDirection('desc');
    setCurrentPage(1);
    setSelectedItems([]);
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

  const handleItemSelect = (itemId: number) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        const newSelected = prev.filter(id => id !== itemId);
        setShowBulkActions(newSelected.length > 0);
        return newSelected;
      } else {
        const newSelected = [...prev, itemId];
        setShowBulkActions(true);
        return newSelected;
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
      setShowBulkActions(false);
    } else {
      setSelectedItems(currentItems.map(i => i.id));
      setShowBulkActions(true);
    }
  };

  const handleApprove = async (item: PictureModerationItem) => {
    setActionLoading(true);
    try {
      await apiService.approvePicture(item.id.toString());
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedItems(prev => prev.filter(id => id !== item.id));
    } catch (err) {
      console.error('Error approving picture:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve picture');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (item: PictureModerationItem) => {
    setSelectedItemForRejection(item);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const executeRejection = async () => {
    if (!selectedItemForRejection || !rejectionReason.trim()) return;

    setActionLoading(true);
    try {
      await apiService.rejectPicture(selectedItemForRejection.id.toString(), rejectionReason);
      setItems(prev => prev.filter(i => i.id !== selectedItemForRejection.id));
      setSelectedItems(prev => prev.filter(id => id !== selectedItemForRejection.id));
      setShowRejectionModal(false);
      setSelectedItemForRejection(null);
      setRejectionReason('');
    } catch (err) {
      console.error('Error rejecting picture:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject picture');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    setActionLoading(true);
    try {
      for (const itemId of selectedItems) {
        await apiService.approvePicture(itemId.toString());
      }
      setItems(prev => prev.filter(i => !selectedItems.includes(i.id)));
      setSelectedItems([]);
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error bulk approving pictures:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve pictures');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = () => {
    // For bulk reject, you might want to show a modal with a common reason
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-[#672DB7] mb-4"></i>
          <p className="text-gray-600">Loading picture moderation queue...</p>
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
              onClick={fetchPictureModerationQueue}
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
            <span>Picture Moderation</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">Queue</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Picture Moderation Queue</h1>
          <p className="text-gray-600 mt-2">Review and approve user profile pictures</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-[#672DB7] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white text-[#672DB7] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
          {showBulkActions && (
            <>
              <button
                onClick={handleBulkApprove}
                disabled={actionLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50"
              >
                <i className="fas fa-check mr-2"></i>
                Approve All ({selectedItems.length})
              </button>
              <button
                onClick={handleBulkReject}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50"
              >
                <i className="fas fa-times mr-2"></i>
                Reject All ({selectedItems.length})
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search users or username"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7]"
              />
            </div>
          </div>

          {/* Status filter removed */}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <img 
                  src={item.user.profile_photo || '/assets/default-avatar.jpg'} 
                  alt={`${item.user.first_name} ${item.user.last_name}`}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute top-2 right-2">
                    <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleItemSelect(item.id)}
                      className="h-6 w-6 rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7]"
                  />
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">
                      @{(item.user.first_name + item.user.last_name).toLowerCase()}
                  </h3>
                    {/* Pending label removed */}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{item.user.first_name} {item.user.last_name}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>Submitted: {formatToMDYY(item.submitted_date)}</span>
                  <span>Rejections: {item.previous_rejections}</span>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={actionLoading}
                    className="flex-1 bg-[rgb(52,199,89)] text-white py-2 px-3 rounded-md hover:bg-[rgb(46,179,80)] transition-colors duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  >
                    <i className="fas fa-check mr-2"></i>
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(item)}
                    disabled={actionLoading}
                    className="flex-1 bg-[rgb(255,56,60)] text-white py-2 px-3 rounded-md hover:bg-[rgb(230,50,54)] transition-colors duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === currentItems.length && currentItems.length > 0}
                      onChange={handleSelectAll}
                      className="h-5 w-5 rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Picture
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('submitted_date')}
                  >
                    Submitted
                    <SortIcon field="submitted_date" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Previous Rejections
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleItemSelect(item.id)}
                        className="h-5 w-5 rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img 
                        src={item.user.profile_photo || '/assets/default-avatar.jpg'} 
                        alt={`${item.user.first_name} ${item.user.last_name}`}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">@{(item.user.first_name + item.user.last_name).toLowerCase()}</div>
                        <div className="text-sm text-gray-500">{item.user.first_name} {item.user.last_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatToMDYY(item.submitted_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.previous_rejections}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => handleApprove(item)}
                          disabled={actionLoading}
                          className="text-green-600 hover:text-green-800 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                          title="Approve"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button 
                          onClick={() => handleReject(item)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-800 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                          title="Reject"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination and Results Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-900">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedItems.length)} of {sortedItems.length} results
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
      {sortedItems.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <i className="fas fa-images text-6xl text-gray-400 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pictures to Moderate</h3>
          <p className="text-gray-600">There are currently no pictures awaiting moderation.</p>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Reject Picture
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Please provide a reason for rejecting this picture:
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] resize-none"
                rows={4}
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRejection}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : null}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 