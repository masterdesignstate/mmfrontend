'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

// Type definition for restricted word
interface RestrictedWord {
  id: number;
  text: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  added_date: string;
  added_by: string;
  usage_count: number;
  is_active: boolean;
}

const categories = ["All", "Profanity", "Sexual", "Violence", "Insult", "Hate Speech", "Religious"];
const severityTypes = ["All", "Low", "Medium", "High", "Critical"];

export default function RestrictedTextPage() {
  const [words, setWords] = useState<RestrictedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWordForAction, setSelectedWordForAction] = useState<RestrictedWord | null>(null);
  const [newWord, setNewWord] = useState('');
  const [newCategory, setNewCategory] = useState('Profanity');
  const [newSeverity, setNewSeverity] = useState<RestrictedWord['severity']>('medium');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch restricted words from API
  const fetchRestrictedWords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getRestrictedText();
      setWords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch restricted words');
      console.error('Error fetching restricted words:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestrictedWords();
  }, []);

  // Filter words
  const filteredWords = words.filter(word => {
    const matchesSearch = searchTerm === '' || 
      word.text.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || 
      word.category === selectedCategory;
    
    const matchesSeverity = selectedSeverity === 'All' || 
      word.severity === selectedSeverity.toLowerCase();
    
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  // Sort words
  const sortedWords = [...filteredWords].sort((a, b) => {
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
  const totalPages = Math.ceil(sortedWords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWords = sortedWords.slice(startIndex, endIndex);

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
    setSelectedCategory('All');
    setSelectedSeverity('All');
    setSortField('');
    setSortDirection('asc');
    setCurrentPage(1);
    setSelectedWords([]);
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

  const handleWordSelect = (wordId: number) => {
    setSelectedWords(prev => {
      if (prev.includes(wordId)) {
        const newSelected = prev.filter(id => id !== wordId);
        setShowBulkActions(newSelected.length > 0);
        return newSelected;
      } else {
        const newSelected = [...prev, wordId];
        setShowBulkActions(true);
        return newSelected;
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedWords.length === currentWords.length) {
      setSelectedWords([]);
      setShowBulkActions(false);
    } else {
      setSelectedWords(currentWords.map(w => w.id));
      setShowBulkActions(true);
    }
  };

  const handleAddWord = () => {
    setNewWord('');
    setNewCategory('Profanity');
    setNewSeverity('medium');
    setShowAddModal(true);
  };

  const executeAddWord = async () => {
    if (!newWord.trim()) return;

    setActionLoading(true);
    try {
      await apiService.createRestrictedWord({
        text: newWord.trim(),
        category: newCategory,
        severity: newSeverity
      });
      setShowAddModal(false);
      setNewWord('');
      fetchRestrictedWords(); // Refresh the list
    } catch (err) {
      console.error('Error adding word:', err);
      setError(err instanceof Error ? err.message : 'Failed to add word');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditWord = (word: RestrictedWord) => {
    setSelectedWordForAction(word);
    setNewWord(word.text);
    setNewCategory(word.category);
    setNewSeverity(word.severity);
    setShowEditModal(true);
  };

  const executeEditWord = async () => {
    if (!selectedWordForAction || !newWord.trim()) return;

    setActionLoading(true);
    try {
      await apiService.updateRestrictedWord(selectedWordForAction.id, {
        text: newWord.trim(),
        category: newCategory,
        severity: newSeverity
      });
      setShowEditModal(false);
      setSelectedWordForAction(null);
      setNewWord('');
      fetchRestrictedWords(); // Refresh the list
    } catch (err) {
      console.error('Error updating word:', err);
      setError(err instanceof Error ? err.message : 'Failed to update word');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWord = (word: RestrictedWord) => {
    setSelectedWordForAction(word);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!selectedWordForAction) return;

    setActionLoading(true);
    try {
      await apiService.deleteRestrictedWord(selectedWordForAction.id);
      setShowDeleteModal(false);
      setSelectedWordForAction(null);
      setWords(prev => prev.filter(w => w.id !== selectedWordForAction.id));
      setSelectedWords(prev => prev.filter(id => id !== selectedWordForAction.id));
    } catch (err) {
      console.error('Error deleting word:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete word');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = () => {
    setShowDeleteModal(true);
  };

  const executeBulkDelete = async () => {
    setActionLoading(true);
    try {
      for (const wordId of selectedWords) {
        await apiService.deleteRestrictedWord(wordId);
      }
      setShowDeleteModal(false);
      setWords(prev => prev.filter(w => !selectedWords.includes(w.id)));
      setSelectedWords([]);
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error bulk deleting words:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete words');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (word: RestrictedWord) => {
    try {
      await apiService.updateRestrictedWord(word.id, {
        text: word.text,
        category: word.category,
        severity: word.severity,
        is_active: !word.is_active
      });
      setWords(prev => prev.map(w => 
        w.id === word.id ? { ...w, is_active: !w.is_active } : w
      ));
    } catch (err) {
      console.error('Error toggling word status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update word status');
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Sexual':
        return 'bg-pink-100 text-pink-800';
      case 'Violence':
        return 'bg-red-100 text-red-800';
      case 'Hate Speech':
        return 'bg-purple-100 text-purple-800';
      case 'Profanity':
        return 'bg-orange-100 text-orange-800';
      case 'Insult':
        return 'bg-yellow-100 text-yellow-800';
      case 'Religious':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-[#672DB7] mb-4"></i>
          <p className="text-gray-600">Loading restricted words...</p>
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
              onClick={fetchRestrictedWords}
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
            <span>Restricted Text</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">List</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Restricted Words</h1>
          <p className="text-gray-600 mt-2">Manage words that trigger user restrictions</p>
        </div>
        <div className="flex items-center space-x-3">
          {showBulkActions && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium cursor-pointer"
            >
              <i className="fas fa-trash mr-2"></i>
              Delete Selected ({selectedWords.length})
            </button>
          )}
          <button
            onClick={handleAddWord}
            className="bg-[#672DB7] text-white px-4 py-2 rounded-lg hover:bg-[#5a2a9e] transition-colors duration-200 font-medium cursor-pointer"
          >
            <i className="fas fa-plus mr-2"></i>
            Add New Word
          </button>
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search words"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7]"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
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

      {/* Words Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedWords.length === currentWords.length && currentWords.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7]"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('text')}
                >
                  Word
                  <SortIcon field="text" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage Count
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('added_date')}
                >
                  Added Date
                  <SortIcon field="added_date" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentWords.map((word) => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedWords.includes(word.id)}
                      onChange={() => handleWordSelect(word.id)}
                      className="rounded border-gray-300 text-[#672DB7] focus:ring-[#672DB7]"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{word.text}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(word.category)}`}>
                      {word.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(word.severity)}`}>
                      {word.severity.charAt(0).toUpperCase() + word.severity.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {word.usage_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {word.added_date ? new Date(word.added_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      word.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {word.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditWord(word)}
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200 cursor-pointer"
                        title="Edit Word"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={() => handleToggleActive(word)}
                        className={`transition-colors duration-200 cursor-pointer ${
                          word.is_active 
                            ? 'text-orange-600 hover:text-orange-800' 
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        title={word.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <i className={`fas ${word.is_active ? 'fa-pause' : 'fa-play'}`}></i>
                      </button>
                      <button 
                        onClick={() => handleDeleteWord(word)}
                        className="text-red-600 hover:text-red-800 transition-colors duration-200 cursor-pointer"
                        title="Delete Word"
                      >
                        <i className="fas fa-trash"></i>
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
            Showing {startIndex + 1} to {Math.min(endIndex, sortedWords.length)} of {sortedWords.length} results
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
      {sortedWords.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <i className="fas fa-shield-alt text-6xl text-gray-400 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Restricted Words</h3>
          <p className="text-gray-600">There are currently no restricted words in the system.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {showAddModal ? 'Add New Word' : 'Edit Word'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Word</label>
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Enter word..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
                  >
                    {categories.filter(cat => cat !== 'All').map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as RestrictedWord['severity'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white"
                  >
                    {severityTypes.filter(sev => sev !== 'All').map(severity => (
                      <option key={severity} value={severity.toLowerCase()}>{severity}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setNewWord('');
                    setSelectedWordForAction(null);
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={showAddModal ? executeAddWord : executeEditWord}
                  disabled={actionLoading || !newWord.trim()}
                  className="px-4 py-2 bg-[#672DB7] text-white rounded-md hover:bg-[#5a2a9e] transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : null}
                  {showAddModal ? 'Add' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm Delete
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {selectedWordForAction 
                  ? `Are you sure you want to delete "${selectedWordForAction.text}"?`
                  : `Are you sure you want to delete ${selectedWords.length} selected word(s)?`
                }
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedWordForAction ? executeDelete : executeBulkDelete}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : null}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 