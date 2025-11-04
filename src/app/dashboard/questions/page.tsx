'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, Question } from '@/services/api';

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedApproved, setSelectedApproved] = useState('All');
  const [selectedMandatory, setSelectedMandatory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('question_number');
  const [sortDirection, setSortDirection] = useState('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const fetchedQuestions = await apiService.getQuestions();
        // Sort by question_number by default
        const sortedQuestions = fetchedQuestions.sort((a, b) => {
          const aNum = a.question_number || 0;
          const bNum = b.question_number || 0;
          return aNum - bNum;
        });
        setQuestions(sortedQuestions);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Failed to fetch questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Get unique tags from questions
  const allTags = Array.from(new Set(questions.flatMap(q => q.tags.map(tag => tag.name)))).sort();

  // Show delete confirmation modal
  const showDeleteConfirmModal = (question: Question) => {
    setQuestionToDelete(question);
    setShowDeleteConfirm(true);
  };

  // Delete question function
  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      setDeletingQuestionId(questionToDelete.id);
      await apiService.deleteQuestion(questionToDelete.id);
      
      // Remove the deleted question from the local state
      setQuestions(prev => prev.filter(q => q.id !== questionToDelete.id));
      
      console.log('Question deleted successfully');
      setShowDeleteConfirm(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question. Please try again.');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  // Helpers
  const formatToMDYY = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const yy = String(d.getFullYear()).slice(-2);
    return `${m}/${day}/${yy}`;
  };

  // Filter questions
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = searchTerm === '' || 
      question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (question.question_name && question.question_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = selectedTag === 'All' || question.tags.some(tag => tag.name === selectedTag);
    
    const matchesApproved = selectedApproved === 'All' || 
      (selectedApproved === 'Yes' && question.question_type === 'mandatory') ||
      (selectedApproved === 'No' && question.question_type !== 'mandatory');
    
    const matchesMandatory = selectedMandatory === 'All' || 
      (selectedMandatory === 'Yes' && question.is_required_for_match) ||
      (selectedMandatory === 'No' && !question.is_required_for_match);
    
    const matchesDateRange = (!startDate || question.created_at >= startDate) &&
                           (!endDate || question.created_at <= endDate);
    
    return matchesSearch && matchesTag && matchesApproved && matchesMandatory && matchesDateRange;
  });

  // Sort questions
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (!sortField) return 0;
    
    // Question number sort (default)
    if (sortField === 'question_number') {
      const aNum = a.question_number || 0;
      const bNum = b.question_number || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
    // Date sort (Created)
    if (sortField === 'created_at') {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    }

    // Tag sort (alphabetical by first tag)
    if (sortField === 'tag') {
      const aTag = (a.tags && a.tags[0] ? a.tags[0].name : '').toLowerCase();
      const bTag = (b.tags && b.tags[0] ? b.tags[0].name : '').toLowerCase();
      if (aTag === bTag) return 0;
      return sortDirection === 'asc' ? (aTag > bTag ? 1 : -1) : (aTag < bTag ? 1 : -1);
    }

    // Mandatory sort (booleans)
    if (sortField === 'is_required_for_match') {
      const aBool = a.is_required_for_match ? 1 : 0;
      const bBool = b.is_required_for_match ? 1 : 0;
      return sortDirection === 'asc' ? aBool - bBool : bBool - aBool;
    }

    // Question text sort (case-insensitive)
    if (sortField === 'text') {
      const aQ = (a.text || '').toLowerCase();
      const bQ = (b.text || '').toLowerCase();
      if (aQ === bQ) return 0;
      return sortDirection === 'asc' ? (aQ > bQ ? 1 : -1) : (aQ < bQ ? 1 : -1);
    }

    // Question name sort (case-insensitive)
    if (sortField === 'question_name') {
      const aName = (a.question_name || '').toLowerCase();
      const bName = (b.question_name || '').toLowerCase();
      if (aName === bName) return 0;
      return sortDirection === 'asc' ? (aName > bName ? 1 : -1) : (aName < bName ? 1 : -1);
    }

    return 0;
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
    setSelectedApproved('All');
    setSelectedMandatory('All');
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
      ? <i className="fas fa-sort-up text-[#672DB7] ml-1"></i>
      : <i className="fas fa-sort-down text-[#672DB7] ml-1"></i>;
  };

  const handleRowClick = (questionId: string) => {
    router.push(`/dashboard/questions/edit/${questionId}`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading questions...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (currentQuestions.length === 0) {
    return (
      <div className="text-center py-8">
        No questions found. <br />
        <button 
          onClick={() => router.push('/dashboard/questions/create')}
          className="bg-[#672DB7] text-white px-6 py-3 rounded-lg hover:bg-[#5a2a9e] transition-colors duration-200 font-medium cursor-pointer"
        >
          <i className="fas fa-plus mr-2"></i>
          New question
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <span>Questions</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">List</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Questions</h1>
        </div>
        <button 
          onClick={() => router.push('/dashboard/questions/create')}
          className="bg-[#672DB7] text-white px-6 py-3 rounded-lg hover:bg-[#5a2a9e] transition-colors duration-200 font-medium cursor-pointer"
        >
          <i className="fas fa-plus mr-2"></i>
          New question
        </button>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Tag Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900"
            >
              <option value="All">All</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Approved Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Approved</label>
            <select
              value={selectedApproved}
              onChange={(e) => setSelectedApproved(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900"
            >
              <option value="All">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Mandatory Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mandatory</label>
            <select
              value={selectedMandatory}
              onChange={(e) => setSelectedMandatory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900"
            >
              <option value="All">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Removed created from/until filters per request */}

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] cursor-text"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedTag !== 'All' || selectedApproved !== 'All' || selectedMandatory !== 'All' || searchTerm) && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Active filters:</span>
            {selectedTag !== 'All' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border border-black">
                Tag: {selectedTag}
                <button
                  onClick={() => setSelectedTag('All')}
                  className="ml-2 hover:text-gray-600"
                  title="Remove filter"
                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            {selectedApproved !== 'All' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border border-black">
                Approved: {selectedApproved}
                <button
                  onClick={() => setSelectedApproved('All')}
                  className="ml-2 hover:text-gray-600"
                  title="Remove filter"
                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            {selectedMandatory !== 'All' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border border-black">
                Mandatory: {selectedMandatory}
                <button
                  onClick={() => setSelectedMandatory('All')}
                  className="ml-2 hover:text-gray-600"
                  title="Remove filter"
                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border border-black">
                Search: {searchTerm}
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 hover:text-gray-600"
                  title="Remove filter"
                >
                  <i className="fas fa-times"></i>
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('question_number')}
                >
                  <div className="flex flex-col">
                    <span>NO.</span>
                    <span className="mt-1"><SortIcon field="question_number" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('question_name')}
                >
                  <div className="flex flex-col">
                    <span>Question Name</span>
                    <span className="mt-1"><SortIcon field="question_name" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('group_number')}
                >
                  <div className="flex flex-col">
                    <span>Group No.</span>
                    <span className="mt-1"><SortIcon field="group_number" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('text')}
                >
                  <div className="flex flex-col">
                    <span>Question</span>
                    <span className="mt-1"><SortIcon field="text" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('tag')}
                >
                  <div className="flex flex-col">
                    <span>Tag</span>
                    <span className="mt-1"><SortIcon field="tag" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('is_required_for_match')}
                >
                  <div className="flex flex-col">
                    <span>Mandatory</span>
                    <span className="mt-1"><SortIcon field="is_required_for_match" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex flex-col">
                    <span>Created</span>
                    <span className="mt-1"><SortIcon field="created_at" /></span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentQuestions.map((question) => (
                <tr 
                  key={question.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  onClick={() => handleRowClick(question.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.question_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {question.question_name || 'N/A'}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.group_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{question.text}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {question.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border border-black"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.is_required_for_match ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatToMDYY(question.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {/* Single toggle: check if approved, x if not */}
                      <button 
                        onClick={() => setQuestions(prev => prev.map(q => q.id === question.id ? { ...q, is_required_for_match: !q.is_required_for_match } : q))}
                        className={`transition-colors duration-200 cursor-pointer ${question.is_required_for_match ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                        title={question.is_required_for_match ? 'Mandatory' : 'Optional'}
                      >
                        <i className={`fas ${question.is_required_for_match ? 'fa-check' : 'fa-times'}`}></i>
                      </button>
                      <button 
                        onClick={() => showDeleteConfirmModal(question)}
                        disabled={deletingQuestionId === question.id}
                        className={`transition-colors duration-200 cursor-pointer ${
                          deletingQuestionId === question.id 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-red-500 hover:text-red-700'
                        }`}
                        title="Delete question"
                      >
                        {deletingQuestionId === question.id ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-trash"></i>
                        )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && questionToDelete && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteConfirm(false);
            setQuestionToDelete(null);
          }}
        >
                    <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Delete Question</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete the question &ldquo;{questionToDelete.text}&rdquo;? 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setQuestionToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteQuestion}
                disabled={deletingQuestionId === questionToDelete.id}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingQuestionId === questionToDelete.id ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 