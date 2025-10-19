'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Mock questions data - these would come from your API in a real app
const mockQuestions = [
  { id: 1, question: "What type of relationship are you seeking?", tags: ["Value", "Trait"] },
  { id: 2, question: "What are your thoughts on kids?", tags: ["Lifestyle"] },
  { id: 3, question: "How often do you drink alcohol?", tags: ["Lifestyle", "Interest"] },
  { id: 4, question: "What's your ideal weekend activity?", tags: ["Interest", "Lifestyle"] },
  { id: 5, question: "How important is religion in your life?", tags: ["Value"] },
  { id: 6, question: "What's your communication style?", tags: ["Trait", "Value"] },
  { id: 7, question: "How do you handle stress?", tags: ["Trait", "Lifestyle"] },
  { id: 8, question: "What's your favorite type of music?", tags: ["Interest"] },
  { id: 9, question: "How do you prefer to spend your free time?", tags: ["Lifestyle", "Interest"] },
  { id: 10, question: "What are your long-term goals?", tags: ["Value", "Trait"] },
  { id: 11, question: "How strongly do you identify as male?", tags: ["Gender"] },
  { id: 12, question: "How strongly do you identify as female?", tags: ["Gender"] },
  { id: 13, question: "How much are you interested in friendship?", tags: ["Relationship"] },
  { id: 14, question: "How much are you interested in hookups?", tags: ["Relationship"] },
  { id: 15, question: "How much are you interested in dating?", tags: ["Relationship"] },
  { id: 16, question: "How much are you interested in a partner?", tags: ["Relationship"] },
  { id: 17, question: "How often do you follow religious practices?", tags: ["Religion"] },
  { id: 18, question: "How strongly do you identify as Christian?", tags: ["Faith"] },
  { id: 19, question: "How strongly do you identify as Muslim?", tags: ["Faith"] },
  { id: 20, question: "How often do you exercise?", tags: ["Exercise"] },
];

export default function EditQuestionSearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  // Filter questions based on search term
  const filteredQuestions = mockQuestions.filter(question =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleQuestionSelect = (questionId: number) => {
    setSelectedQuestion(questionId);
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
            <span className="text-gray-900">Edit Question</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Edit Question</h1>
          <p className="text-gray-600 mt-2">Search and select a question to edit</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Search questions by text or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] cursor-text text-lg"
          />
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {searchTerm ? `Search Results (${filteredQuestions.length})` : `All Questions (${filteredQuestions.length})`}
          </h2>
          
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-search text-gray-400 text-3xl mb-4"></i>
              <p className="text-gray-500">No questions found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((question) => (
                <div
                  key={question.id}
                  onClick={() => handleQuestionSelect(question.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-[#672DB7] hover:bg-gray-50 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-gray-900 font-medium group-hover:text-[#672DB7] transition-colors duration-200">
                            {question.question}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {question.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 group-hover:bg-[#672DB7] group-hover:text-white transition-colors duration-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center text-gray-400 group-hover:text-[#672DB7] transition-colors duration-200">
                          <span className="text-sm mr-2">ID: {question.id}</span>
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push('/dashboard/questions/create')}
            className="bg-[#672DB7] text-white px-6 py-3 rounded-lg hover:bg-[#5a2a9e] transition-colors duration-200 font-medium cursor-pointer"
          >
            <i className="fas fa-plus mr-2"></i>
            Create New Question
          </button>
          <button
            onClick={() => router.push('/dashboard/questions')}
            className="bg-white text-[#672DB7] border border-[#672DB7] px-6 py-3 rounded-lg hover:bg-[#672DB7] hover:text-white transition-colors duration-200 font-medium cursor-pointer"
          >
            <i className="fas fa-list mr-2"></i>
            View All Questions
          </button>
        </div>
      </div>
    </div>
  );
} 