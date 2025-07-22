'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Question {
  id: number;
  question: string;
  tags: string[];
  isMandatory: boolean;
  timesAnswered: number;
  isApproved: string;
  createdAt: string;
}

const allTags = ["Value", "Trait", "Lifestyle", "Interest", "Career", "Family"];

export default function QuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = Number(params.id);

  const [question, setQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock data - in real app this would come from API
  useEffect(() => {
    const mockQuestion: Question = {
      id: questionId,
      question: "What type of relationship are you seeking?",
      tags: ["Value", "Trait"],
      isMandatory: true,
      timesAnswered: 66,
      isApproved: "Jan 27, 2025",
      createdAt: "Jan 20, 2025"
    };
    setQuestion(mockQuestion);
  }, [questionId]);

  const handleInputChange = (field: keyof Question, value: any) => {
    if (!question) return;
    
    setQuestion(prev => ({
      ...prev!,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTagChange = (tagValue: string, isChecked: boolean) => {
    if (!question) return;
    
    setQuestion(prev => ({
      ...prev!,
      tags: isChecked 
        ? [...prev!.tags, tagValue]
        : prev!.tags.filter(tag => tag !== tagValue)
    }));
  };

  const validateForm = (): boolean => {
    if (!question) return false;
    
    const newErrors: Record<string, string> = {};

    if (!question.question.trim()) {
      newErrors.question = 'Question text is required';
    }

    if (question.question.length > 1000) {
      newErrors.question = 'Question text must be less than 1000 characters';
    }

    if (question.tags.length === 0) {
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
    setIsEditing(false);
    
    // Show success message (you can add a toast notification here)
    console.log('Question saved successfully');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    // Reset to original data
    if (question) {
      const originalQuestion: Question = {
        id: questionId,
        question: "What type of relationship are you seeking?",
        tags: ["Value", "Trait"],
        isMandatory: true,
        timesAnswered: 66,
        isApproved: "Jan 27, 2025",
        createdAt: "Jan 20, 2025"
      };
      setQuestion(originalQuestion);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSaving(false);
    
    // Redirect to questions list
    router.push('/dashboard/questions');
  };

  if (!question) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
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
            <span className="text-gray-900">Question Details</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Question Details</h1>
        </div>
        <div className="flex items-center space-x-3">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#672DB7] text-white px-6 py-3 rounded-lg hover:bg-[#5a2a9e] transition-colors duration-200 font-medium cursor-pointer"
              >
                <i className="fas fa-edit mr-2"></i>
                Edit Question
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium cursor-pointer"
              >
                <i className="fas fa-trash mr-2"></i>
                Delete
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Save Changes
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Question Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              {isEditing ? (
                <textarea
                  value={question.question}
                  onChange={(e) => handleInputChange('question', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#672DB7] focus:border-[#672DB7] bg-white cursor-text ${
                    errors.question ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={4}
                  placeholder="Enter the question text..."
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                  {question.question}
                </div>
              )}
              {errors.question && (
                <p className="text-red-500 text-sm mt-1">{errors.question}</p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags *
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  {allTags.map(tag => (
                    <div key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        id={tag}
                        checked={question.tags.includes(tag)}
                        onChange={(e) => handleTagChange(tag, e.target.checked)}
                        className="h-4 w-4 text-[#672DB7] focus:ring-[#672DB7] border-gray-300 rounded cursor-pointer"
                      />
                      <label htmlFor={tag} className="ml-2 text-sm text-gray-700 cursor-pointer">
                        {tag}
                      </label>
                    </div>
                  ))}
                  {errors.tags && (
                    <p className="text-red-500 text-sm mt-1">{errors.tags}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {question.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#672DB7] text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Is Mandatory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Is Mandatory
              </label>
              {isEditing ? (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={question.isMandatory}
                    onChange={(e) => handleInputChange('isMandatory', e.target.checked)}
                    className="h-4 w-4 text-[#672DB7] focus:ring-[#672DB7] border-gray-300 rounded cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    This question is mandatory
                  </span>
                </div>
              ) : (
                <div className="flex items-center">
                  <i className={`fas ${question.isMandatory ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i>
                  <span className="ml-2 text-sm text-gray-700">
                    {question.isMandatory ? 'Mandatory' : 'Not mandatory'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question ID
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm font-mono">
                  {question.id}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Times Answered
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                  {question.timesAnswered}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Status
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                  {question.isApproved}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created At
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                  {question.createdAt}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Question Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#672DB7]">{question.timesAnswered}</div>
            <div className="text-sm text-gray-600">Total Answers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {question.isMandatory ? 'Yes' : 'No'}
            </div>
            <div className="text-sm text-gray-600">Mandatory</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{question.tags.length}</div>
            <div className="text-sm text-gray-600">Tags</div>
          </div>
        </div>
      </div>
    </div>
  );
} 