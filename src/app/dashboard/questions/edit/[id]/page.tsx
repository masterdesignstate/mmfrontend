'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Answer {
  id: string;
  value: string;
  answer: string;
}

const allTags = ["Value", "Trait", "Lifestyle", "Interest", "Career", "Family"];

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = Number(params.id);

  const [question, setQuestion] = useState('What type of relationship are you seeking?');
  const [answers, setAnswers] = useState<Answer[]>([
    { id: '1', value: '1', answer: 'Casual' },
    { id: '2', value: '2', answer: 'Friendship' },
    { id: '3', value: '3', answer: 'Dating' },
    { id: '4', value: '4', answer: 'Serious Relationship' },
    { id: '5', value: '5', answer: 'Partner' }
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Value']);
  const [isMandatory, setIsMandatory] = useState(true);
  const [skipMe, setSkipMe] = useState(true);
  const [skipLookingFor, setSkipLookingFor] = useState(false);
  const [shareAnswer, setShareAnswer] = useState(true);
  const [openToAll, setOpenToAll] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setIsTagsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    if (errors.question) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.question;
        return newErrors;
      });
    }
  };

  const handleAnswerChange = (id: string, field: 'value' | 'answer', value: string) => {
    setAnswers(prev => 
      prev.map(answer => 
        answer.id === id ? { ...answer, [field]: value } : answer
      )
    );
  };

  const addAnswer = () => {
    const newId = (answers.length + 1).toString();
    setAnswers(prev => [...prev, { id: newId, value: '', answer: '' }]);
  };

  const removeAnswer = (id: string) => {
    if (answers.length > 1) {
      setAnswers(prev => prev.filter(answer => answer.id !== id));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!question.trim()) {
      newErrors.question = 'Question text is required';
    }

    if (question.length > 1000) {
      newErrors.question = 'Question text must be less than 1000 characters';
    }

    const validAnswers = answers.filter(answer => answer.value.trim() && answer.answer.trim());
    if (validAnswers.length < 2) {
      newErrors.answers = 'At least 2 answers are required';
    }

    if (selectedTags.length === 0) {
      newErrors.tags = 'At least one tag is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSaving(false);
    
    // Redirect to questions list
    router.push('/dashboard/questions');
  };

  const handleCancel = () => {
    router.push('/dashboard/questions');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <span>Questions</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">Edit</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Edit Question</h1>
        </div>
      </div>

      {/* Edit Question Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form className="space-y-8">
          {/* Question Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question *
            </label>
            <textarea
              value={question}
              onChange={(e) => handleQuestionChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-text resize-none ${
                errors.question ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={4}
              placeholder="Enter your question here..."
            />
            {errors.question && (
              <p className="text-red-500 text-sm mt-1">{errors.question}</p>
            )}
          </div>

          {/* Switches Section */}
          <div className="flex flex-wrap gap-8">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setIsMandatory(!isMandatory)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:ring-offset-2 cursor-pointer ${
                  isMandatory ? 'bg-[#672DB7]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    isMandatory ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => setIsMandatory(!isMandatory)}>
                Is Mandatory
              </label>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setSkipMe(!skipMe)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:ring-offset-2 cursor-pointer ${
                  skipMe ? 'bg-[#672DB7]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    skipMe ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => setSkipMe(!skipMe)}>
                Skip Me
              </label>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setSkipLookingFor(!skipLookingFor)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:ring-offset-2 cursor-pointer ${
                  skipLookingFor ? 'bg-[#672DB7]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    skipLookingFor ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => setSkipLookingFor(!skipLookingFor)}>
                Skip Looking For
              </label>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShareAnswer(!shareAnswer)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:ring-offset-2 cursor-pointer ${
                  shareAnswer ? 'bg-[#672DB7]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    shareAnswer ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => setShareAnswer(!shareAnswer)}>
                Share Answer
              </label>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setOpenToAll(!openToAll)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:ring-offset-2 cursor-pointer ${
                  openToAll ? 'bg-[#672DB7]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    openToAll ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => setOpenToAll(!openToAll)}>
                Open to All
              </label>
            </div>
          </div>

          {/* Answers Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Answers</h3>
            <div className="space-y-4">
              {answers.map((answer) => (
                <div key={answer.id} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <input
                      type="text"
                      value={answer.value}
                      onChange={(e) => handleAnswerChange(answer.id, 'value', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] cursor-text"
                      placeholder="Enter Value"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <input
                      type="text"
                      value={answer.answer}
                      onChange={(e) => handleAnswerChange(answer.id, 'answer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] cursor-text"
                      placeholder="Enter Answer"
                    />
                  </div>
                  {answers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAnswer(answer.id)}
                      className="mt-6 text-red-500 hover:text-red-700 transition-colors duration-200 cursor-pointer"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              ))}
              {errors.answers && (
                <p className="text-red-500 text-sm mt-1">{errors.answers}</p>
              )}
              <button
                type="button"
                onClick={addAnswer}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
              >
                Add to answers
              </button>
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="relative" ref={tagsDropdownRef}>
              <div
                onClick={() => setIsTagsOpen(!isTagsOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900 flex items-center justify-between"
              >
                <div className="flex flex-wrap gap-1">
                  {selectedTags.length > 0 ? (
                    selectedTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#672DB7] text-white"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTags(prev => prev.filter(t => t !== tag));
                          }}
                          className="ml-1 hover:text-red-200"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">Select tags...</span>
                  )}
                </div>
                <i className={`fas fa-chevron-down transition-transform duration-200 ${isTagsOpen ? 'rotate-180' : ''}`}></i>
              </div>
              
              {isTagsOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {allTags.map(tag => (
                    <div
                      key={tag}
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(prev => prev.filter(t => t !== tag));
                        } else {
                          setSelectedTags(prev => [...prev, tag]);
                        }
                        if (errors.tags) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.tags;
                            return newErrors;
                          });
                        }
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors duration-200 ${
                        selectedTags.includes(tag) ? 'bg-[#672DB7] text-white' : 'text-gray-900'
                      }`}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.tags && (
              <p className="text-red-500 text-sm mt-1">{errors.tags}</p>
            )}
          </div>

          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Is Approved</label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setIsApproved(!isApproved)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:ring-offset-2 cursor-pointer ${
                    isApproved ? 'bg-[#672DB7]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      isApproved ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Created Date</label>
              <div className="text-gray-500">6 months ago</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Created By Profile</label>
              <div className="text-gray-500">N/A or Created By Admin</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Modified Date</label>
              <div className="text-gray-500">4 months ago</div>
            </div>
          </div>
        </form>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#672DB7] text-white px-6 py-3 rounded-lg hover:bg-[#5a2a9e] transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </button>
        <button
          onClick={handleCancel}
          className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
} 