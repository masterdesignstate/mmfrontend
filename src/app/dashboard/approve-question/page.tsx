'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Generate mock data for unapproved questions
const generateMockUnapprovedQuestions = () => {
  const questions = [
    {
      id: 1,
      question: "What's your favorite way to spend a weekend?",
      tags: ["Lifestyle", "Interest"],
      submittedBy: "user123",
      submittedAt: "Jan 28, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 2,
      question: "How do you handle stress in your daily life?",
      tags: ["Trait", "Lifestyle"],
      submittedBy: "user456",
      submittedAt: "Jan 27, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 3,
      question: "What's your ideal vacation destination?",
      tags: ["Interest", "Lifestyle"],
      submittedBy: "user789",
      submittedAt: "Jan 26, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 4,
      question: "How important is family in your life?",
      tags: ["Value", "Family"],
      submittedBy: "user101",
      submittedAt: "Jan 25, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 5,
      question: "What's your approach to personal finance?",
      tags: ["Lifestyle", "Value"],
      submittedBy: "user202",
      submittedAt: "Jan 24, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 6,
      question: "How do you prefer to communicate with others?",
      tags: ["Trait", "Lifestyle"],
      submittedBy: "user303",
      submittedAt: "Jan 23, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 7,
      question: "What's your favorite type of music?",
      tags: ["Interest", "Lifestyle"],
      submittedBy: "user404",
      submittedAt: "Jan 22, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 8,
      question: "How do you approach learning new things?",
      tags: ["Trait", "Value"],
      submittedBy: "user505",
      submittedAt: "Jan 21, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 9,
      question: "What's your ideal living environment?",
      tags: ["Lifestyle", "Value"],
      submittedBy: "user606",
      submittedAt: "Jan 20, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 10,
      question: "How do you handle disagreements in relationships?",
      tags: ["Trait", "Value"],
      submittedBy: "user707",
      submittedAt: "Jan 19, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 11,
      question: "What's your favorite hobby or pastime?",
      tags: ["Interest", "Lifestyle"],
      submittedBy: "user808",
      submittedAt: "Jan 18, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 12,
      question: "How do you approach decision-making?",
      tags: ["Trait", "Value"],
      submittedBy: "user909",
      submittedAt: "Jan 17, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 13,
      question: "What's your ideal work environment?",
      tags: ["Career", "Lifestyle"],
      submittedBy: "user1010",
      submittedAt: "Jan 16, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 14,
      question: "How do you handle change in your life?",
      tags: ["Trait", "Lifestyle"],
      submittedBy: "user1111",
      submittedAt: "Jan 15, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 15,
      question: "What's your favorite type of food?",
      tags: ["Interest", "Lifestyle"],
      submittedBy: "user1212",
      submittedAt: "Jan 14, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 16,
      question: "How do you approach personal growth?",
      tags: ["Value", "Trait"],
      submittedBy: "user1313",
      submittedAt: "Jan 13, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 17,
      question: "What's your ideal social setting?",
      tags: ["Lifestyle", "Trait"],
      submittedBy: "user1414",
      submittedAt: "Jan 12, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 18,
      question: "How do you handle criticism?",
      tags: ["Trait", "Value"],
      submittedBy: "user1515",
      submittedAt: "Jan 11, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 19,
      question: "What's your favorite way to relax?",
      tags: ["Lifestyle", "Interest"],
      submittedBy: "user1616",
      submittedAt: "Jan 10, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 20,
      question: "How do you approach goal-setting?",
      tags: ["Trait", "Value"],
      submittedBy: "user1717",
      submittedAt: "Jan 9, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 21,
      question: "What's your ideal weekend activity?",
      tags: ["Interest", "Lifestyle"],
      submittedBy: "user1818",
      submittedAt: "Jan 8, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 22,
      question: "How do you handle failure?",
      tags: ["Trait", "Value"],
      submittedBy: "user1919",
      submittedAt: "Jan 7, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 23,
      question: "What's your favorite type of entertainment?",
      tags: ["Interest", "Lifestyle"],
      submittedBy: "user2020",
      submittedAt: "Jan 6, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 24,
      question: "How do you approach problem-solving?",
      tags: ["Trait", "Value"],
      submittedBy: "user2121",
      submittedAt: "Jan 5, 2025",
      timesAnswered: 0,
      status: "pending"
    },
    {
      id: 25,
      question: "What's your ideal travel experience?",
      tags: ["Interest", "Lifestyle"],
      submittedBy: "user2222",
      submittedAt: "Jan 4, 2025",
      timesAnswered: 0,
      status: "pending"
    }
  ];

  return questions;
};

const mockUnapprovedQuestions = generateMockUnapprovedQuestions();

const allTags = ["Value", "Trait", "Lifestyle", "Interest", "Career", "Family"];

export default function ApproveQuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState(mockUnapprovedQuestions);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter questions
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = searchTerm === '' || 
      question.question.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTag === 'All' || question.tags.includes(selectedTag);
    
    const matchesDateRange = (!startDate || question.submittedAt >= startDate) &&
                           (!endDate || question.submittedAt <= endDate);
    
    return matchesSearch && matchesTag && matchesDateRange;
  });

  // Sort questions
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];
    
    if (sortField === 'timesAnswered') {
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

  const handleQuestionSelect = (questionId: number) => {
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

  const handleApproveQuestion = (questionId: number) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    setShowBulkActions(selectedQuestions.length > 1);
  };

  const handleRejectQuestion = (questionId: number) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    setShowBulkActions(selectedQuestions.length > 1);
  };

  const handleBulkApprove = () => {
    setQuestions(prev => prev.filter(q => !selectedQuestions.includes(q.id)));
    setSelectedQuestions([]);
    setShowBulkActions(false);
  };

  const handleBulkReject = () => {
    setQuestions(prev => prev.filter(q => !selectedQuestions.includes(q.id)));
    setSelectedQuestions([]);
    setShowBulkActions(false);
  };

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
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium cursor-pointer"
              >
                <i className="fas fa-check mr-2"></i>
                Approve Selected ({selectedQuestions.length})
              </button>
              <button
                onClick={handleBulkReject}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium cursor-pointer"
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
                <option key={tag} value={tag}>{tag}</option>
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
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted By
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('submittedAt')}
                >
                  Submitted At
                  <SortIcon field="submittedAt" />
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
                    {question.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{question.question}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {question.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#672DB7] text-white"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.submittedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.submittedAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleApproveQuestion(question.id)}
                        className="text-green-600 hover:text-green-800 transition-colors duration-200 cursor-pointer"
                        title="Approve"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                      <button 
                        onClick={() => handleRejectQuestion(question.id)}
                        className="text-red-500 hover:text-red-700 transition-colors duration-200 cursor-pointer"
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