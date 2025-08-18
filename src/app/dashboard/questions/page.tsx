'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Generate mock data for questions including mandatory questions
const generateMockQuestions = () => {
  const questions = [
    // Gender Questions
    {
      id: 1,
      question: "How strongly do you identify as Male?",
      tags: ["Gender"],
      isMandatory: true,
      timesAnswered: 89,
      isApproved: "Jan 27, 2025",
      createdAt: "Jan 20, 2025",
      approved: "Yes"
    },
    {
      id: 2,
      question: "How strongly do you identify as Female?",
      tags: ["Gender"],
      isMandatory: true,
      timesAnswered: 92,
      isApproved: "Jan 27, 2025",
      createdAt: "Jan 20, 2025",
      approved: "Yes"
    },
    // Relationship Questions
    {
      id: 3,
      question: "How much are you interested in friendship?",
      tags: ["Relationship"],
      isMandatory: true,
      timesAnswered: 78,
      isApproved: "Jan 26, 2025",
      createdAt: "Jan 19, 2025",
      approved: "Yes"
    },
    {
      id: 4,
      question: "How much are you interested in hookups?",
      tags: ["Relationship"],
      isMandatory: true,
      timesAnswered: 65,
      isApproved: "Jan 26, 2025",
      createdAt: "Jan 19, 2025",
      approved: "Yes"
    },
    {
      id: 5,
      question: "How much are you interested in dating?",
      tags: ["Relationship"],
      isMandatory: true,
      timesAnswered: 83,
      isApproved: "Jan 26, 2025",
      createdAt: "Jan 19, 2025",
      approved: "Yes"
    },
    {
      id: 6,
      question: "How much are you interested in a partner?",
      tags: ["Relationship"],
      isMandatory: true,
      timesAnswered: 76,
      isApproved: "Jan 26, 2025",
      createdAt: "Jan 19, 2025",
      approved: "Yes"
    },
    // Religion Question
    {
      id: 7,
      question: "How often do you follow religious practices?",
      tags: ["Religion"],
      isMandatory: true,
      timesAnswered: 71,
      isApproved: "Jan 25, 2025",
      createdAt: "Jan 18, 2025",
      approved: "Yes"
    },
    // Faith Questions
    {
      id: 8,
      question: "How strongly do you identify as Christian?",
      tags: ["Faith"],
      isMandatory: true,
      timesAnswered: 45,
      isApproved: "Jan 24, 2025",
      createdAt: "Jan 17, 2025",
      approved: "Yes"
    },
    {
      id: 9,
      question: "How strongly do you identify as Muslim?",
      tags: ["Faith"],
      isMandatory: true,
      timesAnswered: 38,
      isApproved: "Jan 24, 2025",
      createdAt: "Jan 17, 2025",
      approved: "Yes"
    },
    {
      id: 10,
      question: "How strongly do you identify as Hindu?",
      tags: ["Faith"],
      isMandatory: true,
      timesAnswered: 32,
      isApproved: "Jan 24, 2025",
      createdAt: "Jan 17, 2025",
      approved: "Yes"
    },
    {
      id: 11,
      question: "How strongly do you identify as Jewish?",
      tags: ["Faith"],
      isMandatory: true,
      timesAnswered: 28,
      isApproved: "Jan 24, 2025",
      createdAt: "Jan 17, 2025",
      approved: "Yes"
    },
    {
      id: 12,
      question: "How strongly do you identify as Buddhist?",
      tags: ["Faith"],
      isMandatory: true,
      timesAnswered: 35,
      isApproved: "Jan 24, 2025",
      createdAt: "Jan 17, 2025",
      approved: "Yes"
    },
    {
      id: 13,
      question: "How strongly do you identify as Atheist?",
      tags: ["Faith"],
      isMandatory: true,
      timesAnswered: 52,
      isApproved: "Jan 24, 2025",
      createdAt: "Jan 17, 2025",
      approved: "Yes"
    },
    {
      id: 14,
      question: "How strongly do you identify as Agnostic?",
      tags: ["Faith"],
      isMandatory: true,
      timesAnswered: 41,
      isApproved: "Jan 24, 2025",
      createdAt: "Jan 17, 2025",
      approved: "Yes"
    },
    // Exercise Question
    {
      id: 15,
      question: "How often do you exercise?",
      tags: ["Exercise"],
      isMandatory: true,
      timesAnswered: 89,
      isApproved: "Jan 23, 2025",
      createdAt: "Jan 16, 2025",
      approved: "Yes"
    },
    // Habits Questions
    {
      id: 16,
      question: "How often do you consume alcohol?",
      tags: ["Habits"],
      isMandatory: true,
      timesAnswered: 73,
      isApproved: "Jan 22, 2025",
      createdAt: "Jan 15, 2025",
      approved: "Yes"
    },
    {
      id: 17,
      question: "How often do you use tobacco?",
      tags: ["Habits"],
      isMandatory: true,
      timesAnswered: 68,
      isApproved: "Jan 22, 2025",
      createdAt: "Jan 15, 2025",
      approved: "Yes"
    },
    // Children Questions
    {
      id: 18,
      question: "Do you have kids?",
      tags: ["Children"],
      isMandatory: true,
      timesAnswered: 84,
      isApproved: "Jan 21, 2025",
      createdAt: "Jan 14, 2025",
      approved: "Yes"
    },
    {
      id: 19,
      question: "Do you want kids?",
      tags: ["Children"],
      isMandatory: true,
      timesAnswered: 79,
      isApproved: "Jan 21, 2025",
      createdAt: "Jan 14, 2025",
      approved: "Yes"
    },
    // Education Questions
    {
      id: 20,
      question: "What is your high school education status?",
      tags: ["Education"],
      isMandatory: true,
      timesAnswered: 91,
      isApproved: "Jan 20, 2025",
      createdAt: "Jan 13, 2025",
      approved: "Yes"
    },
    {
      id: 21,
      question: "What is your undergraduate education status?",
      tags: ["Education"],
      isMandatory: true,
      timesAnswered: 87,
      isApproved: "Jan 20, 2025",
      createdAt: "Jan 13, 2025",
      approved: "Yes"
    },
    // Diet Questions
    {
      id: 22,
      question: "Do you eat meat (Omnivore)?",
      tags: ["Diet"],
      isMandatory: true,
      timesAnswered: 93,
      isApproved: "Jan 19, 2025",
      createdAt: "Jan 12, 2025",
      approved: "Yes"
    },
    {
      id: 23,
      question: "Do you identify as vegetarian?",
      tags: ["Diet"],
      isMandatory: true,
      timesAnswered: 56,
      isApproved: "Jan 19, 2025",
      createdAt: "Jan 12, 2025",
      approved: "Yes"
    },
    {
      id: 24,
      question: "Do you identify as vegan?",
      tags: ["Diet"],
      isMandatory: true,
      timesAnswered: 42,
      isApproved: "Jan 19, 2025",
      createdAt: "Jan 12, 2025",
      approved: "Yes"
    },
    // Politics Question
    {
      id: 25,
      question: "How politically engaged are you?",
      tags: ["Politics"],
      isMandatory: true,
      timesAnswered: 67,
      isApproved: "Jan 18, 2025",
      createdAt: "Jan 11, 2025",
      approved: "Yes"
    }
  ];

  // Generate more questions to reach 64 total
  for (let i = 11; i <= 64; i++) {
    const questionTemplates = [
      "What's your opinion on {topic}?",
      "How do you feel about {topic}?",
      "What's your experience with {topic}?",
      "How important is {topic} to you?",
      "What's your approach to {topic}?"
    ];
    
    const topics = [
      "travel", "cooking", "exercise", "reading", "movies", "politics", 
      "family", "career", "education", "social media", "technology", "nature"
    ];
    
    const template = questionTemplates[i % questionTemplates.length];
    const topic = topics[i % topics.length];
    const question = template.replace('{topic}', topic);
    
    const allTags = ["Value", "Trait", "Lifestyle", "Interest", "Career", "Family"];
    const numTags = Math.floor(Math.random() * 3) + 1;
    const tags = allTags.sort(() => 0.5 - Math.random()).slice(0, numTags);
    
    questions.push({
      id: i,
      question,
      tags,
      isMandatory: Math.random() > 0.3,
      timesAnswered: Math.floor(Math.random() * 100) + 1,
      isApproved: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit' 
      }),
      createdAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit' 
      }),
      approved: Math.random() > 0.3 ? "Yes" : "No"
    });
  }
  
  return questions;
};

const mockQuestions = generateMockQuestions();

const allTags = ["Value", "Trait", "Lifestyle", "Interest", "Career", "Family"];

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState(mockQuestions);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedApproved, setSelectedApproved] = useState('All');
  const [selectedMandatory, setSelectedMandatory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      question.question.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTag === 'All' || question.tags.includes(selectedTag);
    
    const matchesApproved = selectedApproved === 'All' || 
      (selectedApproved === 'Yes' && question.approved === 'Yes') ||
      (selectedApproved === 'No' && question.approved === 'No');
    
    const matchesMandatory = selectedMandatory === 'All' || 
      (selectedMandatory === 'Yes' && question.isMandatory) ||
      (selectedMandatory === 'No' && !question.isMandatory);
    
    const matchesDateRange = (!startDate || question.createdAt >= startDate) &&
                           (!endDate || question.createdAt <= endDate);
    
    return matchesSearch && matchesTag && matchesApproved && matchesMandatory && matchesDateRange;
  });

  // Sort questions
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (!sortField) return 0;
    
    // Date sort (Created)
    if (sortField === 'createdAt') {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    }

    // Tag sort (alphabetical by first tag)
    if (sortField === 'tag') {
      const aTag = (a.tags && a.tags[0] ? a.tags[0] : '').toLowerCase();
      const bTag = (b.tags && b.tags[0] ? b.tags[0] : '').toLowerCase();
      if (aTag === bTag) return 0;
      return sortDirection === 'asc' ? (aTag > bTag ? 1 : -1) : (aTag < bTag ? 1 : -1);
    }

    // Mandatory sort (booleans)
    if (sortField === 'isMandatory') {
      const aBool = a.isMandatory ? 1 : 0;
      const bBool = b.isMandatory ? 1 : 0;
      return sortDirection === 'asc' ? aBool - bBool : bBool - aBool;
    }

    // Question text sort (case-insensitive)
    if (sortField === 'question') {
      const aQ = (a.question || '').toLowerCase();
      const bQ = (b.question || '').toLowerCase();
      if (aQ === bQ) return 0;
      return sortDirection === 'asc' ? (aQ > bQ ? 1 : -1) : (aQ < bQ ? 1 : -1);
    }

    // Created By sort (using same display logic)
    if (sortField === 'createdBy') {
      const getCreatedBy = (q: typeof a) => (Array.isArray(q.tags) && q.tags.length > 0 ? `user_${q.id}` : 'Admin').toLowerCase();
      const aBy = getCreatedBy(a);
      const bBy = getCreatedBy(b);
      if (aBy === bBy) return 0;
      return sortDirection === 'asc' ? (aBy > bBy ? 1 : -1) : (aBy < bBy ? 1 : -1);
    }

    const aValue = a[sortField as keyof typeof a] as unknown as string | number;
    const bValue = b[sortField as keyof typeof b] as unknown as string | number;
    
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

  const handleRowClick = (questionId: number) => {
    router.push(`/dashboard/questions/edit/${questionId}`);
  };

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

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex flex-col">
                    <span>NO.</span>
                    <span className="mt-1"><SortIcon field="id" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('question')}
                >
                  <div className="flex flex-col">
                    <span>Question</span>
                    <span className="mt-1"><SortIcon field="question" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdBy')}
                >
                  <div className="flex flex-col">
                    <span>Created By</span>
                    <span className="mt-1"><SortIcon field="createdBy" /></span>
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
                  onClick={() => handleSort('isMandatory')}
                >
                  <div className="flex flex-col">
                    <span>Mandatory</span>
                    <span className="mt-1"><SortIcon field="isMandatory" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('timesAnswered')}
                >
                  <div className="flex flex-col">
                    <span>Answered</span>
                    <span className="mt-1"><SortIcon field="timesAnswered" /></span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex flex-col">
                    <span>Created</span>
                    <span className="mt-1"><SortIcon field="createdAt" /></span>
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
                    {question.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{question.question}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Array.isArray(question.tags) && question.tags.length > 0 ? 'user_' + question.id : 'Admin'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {question.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border border-black"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.isMandatory ? 'Yes' : '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {question.timesAnswered}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatToMDYY(question.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {/* Single toggle: check if approved, x if not */}
                      <button 
                        onClick={() => setQuestions(prev => prev.map(q => q.id === question.id ? { ...q, approved: q.approved === 'Yes' ? 'No' : 'Yes' } : q))}
                        className={`transition-colors duration-200 cursor-pointer ${question.approved === 'Yes' ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                        title={question.approved === 'Yes' ? 'Approved' : 'Not approved'}
                      >
                        <i className={`fas ${question.approved === 'Yes' ? 'fa-check' : 'fa-times'}`}></i>
                      </button>
                      <button className="text-red-500 hover:text-red-700 transition-colors duration-200 cursor-pointer">
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
    </div>
  );
} 