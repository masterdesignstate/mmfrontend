'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, Question } from '@/services/api';

const allTags = ["value", "lifestyle", "look", "trait", "hobby", "interest"];

export default function ApproveQuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch unapproved questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all questions including unapproved ones
        const allQuestions = await apiService.getQuestions(true);
        // Filter for unapproved questions (user-submitted questions that need approval)
        const unapproved = allQuestions.filter(q => !q.is_approved && q.submitted_by !== null);
        setQuestions(unapproved);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Failed to fetch questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Filter questions
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = searchTerm === '' ||
      question.text.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = selectedTag === 'All' || question.tags.some(tag => tag.name === selectedTag);

    const matchesDateRange = (!startDate || question.created_at >= startDate) &&
                           (!endDate || question.created_at <= endDate);

    return matchesSearch && matchesTag && matchesDateRange;
  });

  // Sort questions
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedQuestions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQuestions = sortedQuestions.slice(startIndex, endIndex);

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
    setSelectedTag('All');
    setStartDate('');
    setEndDate('');
    setSortField('');
    setSortDirection('asc');
    setCurrentPage(1);
    setSelectedQuestions([]);
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

  const handleQuestionSelect = (questionId: string) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        const newSelected = prev.filter(id => id !== questionId);
        setShowBulkActions(newSelected.length > 0);
        return newSelected;
      } else {
        const newSelected = [...prev, questionId];
        setShowBulkActions(true);
        return newSelected;
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === currentQuestions.length) {
      setSelectedQuestions([]);
      setShowBulkActions(false);
    } else {
      setSelectedQuestions(currentQuestions.map(q => q.id));
      setShowBulkActions(true);
    }
  };

  const handleApproveQuestion = async (questionId: string) => {
    try {
      setActionLoading(true);
      await apiService.approveQuestion(questionId);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
      setShowBulkActions(selectedQuestions.length > 1);
    } catch (error) {
      console.error('Error approving question:', error);
      setError('Failed to approve question');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectQuestion = async (questionId: string) => {
    try {
      setActionLoading(true);
      await apiService.rejectQuestion(questionId);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
      setShowBulkActions(selectedQuestions.length > 1);
    } catch (error) {
      console.error('Error rejecting question:', error);
      setError('Failed to reject question');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    try {
      setActionLoading(true);
      await Promise.all(selectedQuestions.map(id => apiService.approveQuestion(id)));
      setQuestions(prev => prev.filter(q => !selectedQuestions.includes(q.id)));
      setSelectedQuestions([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error bulk approving questions:', error);
      setError('Failed to approve questions');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    try {
      setActionLoading(true);
      await Promise.all(selectedQuestions.map(id => apiService.rejectQuestion(id)));
      setQuestions(prev => prev.filter(q => !selectedQuestions.includes(q.id)));
      setSelectedQuestions([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error bulk rejecting questions:', error);
      setError('Failed to reject questions');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
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
            <span>Approve Questions</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">Pending Approval</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Approve Questions</h1>
          <p className="text-gray-600 mt-2">Review and approve or reject submitted questions</p>
        </div>
        <div className="flex items-center space-x-3">
          {showBulkActions && (
            <>
              <button
                onClick={handleBulkApprove}
                disabled={actionLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50"
              >
                <i className="fas fa-check mr-2"></i>
                Approve Selected ({selectedQuestions.length})
              </button>
              <button
                onClick={handleBulkReject}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50"
              >
                <i className="fas fa-times mr-2"></i>
                Reject Selected ({selectedQuestions.length})
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
          {/* Tags Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900"
            >
              <option value="All">All</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Submitted From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white shadow-sm transition-all duration-200 hover:border-gray-400 text-gray-900 cursor-text"
              placeholder="Select Start Date"
            />
          </div>

          {/* Date Until */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Submitted Until</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white shadow-sm transition-all duration-200 hover:border-gray-400 text-gray-900 cursor-text"
              placeholder="Select Until Date"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search questions"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] cursor-text"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.length === currentQuestions.length && currentQuestions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7] cursor-pointer"
                  />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  Sr #
                  <SortIcon field="id" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted By
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  Submitted At
                  <SortIcon field="created_at" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentQuestions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question.id)}
                      onChange={() => handleQuestionSelect(question.id)}
                      className="rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7] cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.question_number || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{question.text}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {question.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border border-gray-300">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.submitted_by ? `${question.submitted_by.first_name} ${question.submitted_by.last_name}` : 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(question.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApproveQuestion(question.id)}
                        disabled={actionLoading}
                        className="text-green-600 hover:text-green-800 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                        title="Approve"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                      <button
                        onClick={() => handleRejectQuestion(question.id)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-800 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                        title="Reject"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/question/${question.id}`)}
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer"
                        title="View Details"
                      >
                        <i className="fas fa-eye"></i>
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
            Showing {startIndex + 1} to {Math.min(endIndex, sortedQuestions.length)} of {sortedQuestions.length} results
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
      {sortedQuestions.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <i className="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Questions Pending Approval</h3>
          <p className="text-gray-600">All submitted questions have been reviewed and processed.</p>
        </div>
      )}
    </div>
  );
}
