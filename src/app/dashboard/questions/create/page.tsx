'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';

interface Answer {
  id: string;
  value: string;
  answer: string;
}

const allTags = ["Value", "Trait", "Lifestyle", "Interest", "Career", "Family"];

export default function CreateQuestionPage() {
  const router = useRouter();
  const [questionNumber, setQuestionNumber] = useState(65); // Start with next available number
  const [questionName, setQuestionName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([
    { id: '1', value: '', answer: '' },
    { id: '2', value: '', answer: '' },
    { id: '3', value: '', answer: '' },
    { id: '4', value: '', answer: '' },
    { id: '5', value: '', answer: '' }
  ]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [skipMe, setSkipMe] = useState(false);
  const [skipLookingFor, setSkipLookingFor] = useState(false);
  const [openToAllMe, setOpenToAllMe] = useState(false);
  const [openToAllLooking, setOpenToAllLooking] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!questionName.trim()) {
      newErrors.questionName = 'Question name is required';
    }

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

    if (!selectedTag) {
      newErrors.tags = 'A tag is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setGeneralError('');
    
    try {
      // Prepare the question data
      const questionData = {
        text: question.trim(),
        question_name: questionName.trim(),
        question_number: questionNumber,
        group_name: groupName.trim(),
        tags: [selectedTag],
        question_type: isMandatory ? 'mandatory' : 'unanswered',
        is_required_for_match: isMandatory,
        is_approved: isApproved,
        skip_me: skipMe,
        skip_looking_for: skipLookingFor,
        open_to_all_me: openToAllMe,
        open_to_all_looking_for: openToAllLooking,
        answers: answers
          .filter(answer => answer.value.trim() && answer.answer.trim())
          .map(answer => ({
            value: answer.value.trim(),
            answer: answer.answer.trim()
          }))
      };

      console.log('Creating question with data:', questionData);
      
      const response = await apiService.createQuestion(questionData);
      
      if (response && response.id) {
        console.log('Question created successfully:', response.id);
        // Redirect to questions list
        router.push('/dashboard/questions');
      } else {
        setGeneralError('Failed to create question');
      }
    } catch (error) {
      console.error('Error creating question:', error);
      setGeneralError('Failed to create question. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAndAnother = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setGeneralError('');
    
    try {
      // Prepare the question data
      const questionData = {
        text: question.trim(),
        question_name: questionName.trim(),
        question_number: questionNumber,
        group_name: groupName.trim(),
        tags: [selectedTag],
        question_type: isMandatory ? 'mandatory' : 'unanswered',
        is_required_for_match: isMandatory,
        is_approved: isApproved,
        skip_me: skipMe,
        skip_looking_for: skipLookingFor,
        open_to_all_me: openToAllMe,
        open_to_all_looking_for: openToAllLooking,
        answers: answers
          .filter(answer => answer.value.trim() && answer.answer.trim())
          .map(answer => ({
            value: answer.value.trim(),
            answer: answer.answer.trim()
          }))
      };

      console.log('Creating question with data:', questionData);
      
      const response = await apiService.createQuestion(questionData);
      
      if (response && response.id) {
        console.log('Question created successfully:', response.id);
        
        // Reset form for another question
        setQuestionNumber(prev => prev + 1);
        setQuestionName('');
        setGroupName('');
        setQuestion('');
        setAnswers([
          { id: '1', value: '', answer: '' },
          { id: '2', value: '', answer: '' },
          { id: '3', value: '', answer: '' },
          { id: '4', value: '', answer: '' },
          { id: '5', value: '', answer: '' }
        ]);
        setSelectedTag('');
        setIsMandatory(false);
        setSkipMe(false);
        setSkipLookingFor(false);
        setOpenToAllMe(false);
        setOpenToAllLooking(false);
        setIsApproved(false);
        setErrors({});
      } else {
        setGeneralError('Failed to create question');
      }
    } catch (error) {
      console.error('Error creating question:', error);
      setGeneralError('Failed to create question. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
            <span className="text-gray-900">Create</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Create Question</h1>
        </div>
      </div>

      {/* Create Question Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form className="space-y-8">
          {/* General Error Display */}
          {generalError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {generalError}
            </div>
          )}

          {/* Question Number Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Number
            </label>
            <input
              type="text"
              value={questionNumber}
              onChange={(e) => setQuestionNumber(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-text"
              placeholder="Enter question number"
            />
          </div>

          {/* Question Name Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Name
            </label>
            <input
              type="text"
              value={questionName}
              onChange={(e) => setQuestionName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-text"
              placeholder="Enter question name"
            />
            {errors.questionName && (
              <p className="text-red-500 text-sm mt-1">{errors.questionName}</p>
            )}
          </div>

          {/* Group Name Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-text"
              placeholder="Enter group name"
            />
          </div>

          {/* Question Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question
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
              <label className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => setIsApproved(!isApproved)}>
                Approved
              </label>
            </div>
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
                Mandatory
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
                Skip Looking
              </label>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setOpenToAllMe(!openToAllMe)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:ring-offset-2 cursor-pointer ${
                  openToAllMe ? 'bg-[#672DB7]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    openToAllMe ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => setOpenToAllMe(!openToAllMe)}>
                OTA Me
              </label>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setOpenToAllLooking(!openToAllLooking)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:ring-offset-2 cursor-pointer ${
                  openToAllLooking ? 'bg-[#672DB7]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    openToAllLooking ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => setOpenToAllLooking(!openToAllLooking)}>
                OTA Looking
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
                </div>
              ))}
              {errors.answers && (
                <p className="text-red-500 text-sm mt-1">{errors.answers}</p>
              )}
            </div>
          </div>

          {/* Tag Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
            <div className="relative" ref={tagsDropdownRef}>
              <div
                onClick={() => setIsTagsOpen(!isTagsOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-pointer text-gray-900 flex items-center justify-between"
              >
                <div className="flex flex-wrap gap-1">
                  {selectedTag ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black border border-gray-300">
                      {selectedTag}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTag('');
                        }}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <span className="text-gray-500">Select tag...</span>
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
                        setSelectedTag(tag);
                        if (errors.tags) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.tags;
                            return newErrors;
                          });
                        }
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors duration-200 ${
                        selectedTag === tag ? 'bg-[#672DB7] text-white' : 'text-gray-900'
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

          {/* Removed Created/Last Modified metadata per request */}
        </form>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleCreate}
          disabled={isSaving}
          className="bg-[#672DB7] text-white px-6 py-3 rounded-lg hover:bg-[#5a2a9e] transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Creating...
            </>
          ) : (
            'Create'
          )}
        </button>
        <button
          onClick={handleCreateAndAnother}
          disabled={isSaving}
          className="bg-white text-[#672DB7] border border-[#672DB7] px-6 py-3 rounded-lg hover:bg-[#672DB7] hover:text-white transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create & create another
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