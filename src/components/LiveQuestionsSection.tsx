'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface QuestionTag {
  name: string;
}

interface Question {
  id: string;
  question_name: string;
  question_number: number;
  group_name_text?: string;
  question_type: string;
  text: string;
  tags: QuestionTag[];
  is_mandatory: boolean;
}

interface GroupedQuestion {
  questions: Question[];
  displayName: string;
  questionNumber: number;
}

interface Filters {
  mandatory: boolean;
  tags: Record<string, boolean>;
}

const TAG_OPTIONS = ['Value', 'Lifestyle', 'Look', 'Trait', 'Hobby', 'Interest'];

const ITEMS_PER_PAGE = 12;

export default function LiveQuestionsSection() {
  const router = useRouter();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ mandatory: false, tags: {} });
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Ask Question Modal state
  const [showAskQuestionModal, setShowAskQuestionModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [valueLabel1, setValueLabel1] = useState('');
  const [valueLabel5, setValueLabel5] = useState('');
  const [sliderValue, setSliderValue] = useState(3);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Fetch all questions once
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${getApiUrl(API_ENDPOINTS.QUESTIONS)}?page_size=500`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAllQuestions(data.results || []);
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [filters]);

  // Filter questions
  const filtered = allQuestions.filter(q => {
    if (filters.mandatory && !q.is_mandatory) return false;
    const activeTags = Object.entries(filters.tags).filter(([, v]) => v).map(([k]) => k);
    if (activeTags.length > 0) {
      const qTags = q.tags.map(t => t.name.toLowerCase());
      if (!activeTags.some(t => qTags.includes(t))) return false;
    }
    return true;
  });

  // Group questions by question_number
  const grouped: GroupedQuestion[] = (() => {
    const map: Record<number, GroupedQuestion> = {};
    filtered.forEach(q => {
      const num = q.question_number;
      if (!map[num]) {
        map[num] = { questions: [q], displayName: q.group_name_text || q.text, questionNumber: num };
      } else {
        map[num].questions.push(q);
      }
    });
    return Object.values(map).sort((a, b) => a.questionNumber - b.questionNumber);
  })();

  const visibleGroups = grouped.slice(0, visibleCount);
  const hasMore = visibleCount < grouped.length;

  const handleQuestionClick = (questionNumber: number) => {
    router.push(`/questions/${questionNumber}?demo=true`);
  };

  return (
    <section id="questions" className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold">Explore Our Questions</h2>
          <p className="mt-3 text-gray-600">
            See the kinds of questions that power smarter matching. Click any question to try the sliders.
          </p>
          <button
            onClick={() => setShowAskQuestionModal(true)}
            className="mt-4 px-6 py-2.5 bg-black text-white rounded-md text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors"
          >
            Ask a Question
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8 justify-center">
          <button
            onClick={() => setFilters(prev => ({ ...prev, mandatory: !prev.mandatory }))}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
              filters.mandatory
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            Mandatory
          </button>
          {TAG_OPTIONS.map(tag => {
            const tagKey = tag.toLowerCase();
            return (
              <button
                key={tag}
                onClick={() => setFilters(prev => ({
                  ...prev,
                  tags: { ...prev.tags, [tagKey]: !prev.tags[tagKey] },
                }))}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                  filters.tags[tagKey]
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Question Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#672DB7] rounded-full animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No questions match your filters.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleGroups.map(group => (
                <div
                  key={group.questionNumber}
                  onClick={() => handleQuestionClick(group.questionNumber)}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                >
                  <span className="text-xs text-gray-400 mb-1">Q{group.questionNumber}</span>
                  <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-2 flex-1">
                    {group.displayName}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {group.questions[0]?.tags?.map(tag => (
                      <span
                        key={tag.name}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {group.questions[0]?.is_mandatory && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-[#672DB7] font-medium">
                        Mandatory
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Show More */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                  className="px-6 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  Show more questions
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ask a Question Modal */}
      {showAskQuestionModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setShowAskQuestionModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-0 w-full max-w-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Ask a Question</h2>
              <button
                onClick={() => setShowAskQuestionModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="flex items-center justify-center">
                <div style={{ width: '500px' }}>
                  <p className="text-gray-600 text-sm mb-6">
                    Submit a question that reflects what you care about — serious or silly, it&apos;s up to you.
                  </p>

                  {/* Question Text Input */}
                  <div className="mb-6">
                    <div className="relative">
                      <textarea
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value.slice(0, 100))}
                        placeholder="Write your question here..."
                        className="w-full p-4 border border-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                        style={{ borderRadius: '24px' }}
                        rows={2}
                      />
                      <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                        {questionText.length}/100
                      </div>
                    </div>
                  </div>

                  {/* Value Labels */}
                  <div className="mb-3">
                    <div className="flex items-center justify-center">
                      <div className="flex gap-8" style={{ width: '500px' }}>
                        <div className="w-32">
                          <input
                            type="text"
                            value={valueLabel1}
                            onChange={(e) => setValueLabel1(e.target.value)}
                            placeholder="Label 1"
                            className="w-full py-1.5 px-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
                            style={{ borderRadius: '24px' }}
                          />
                        </div>
                        <div className="flex-1"></div>
                        <div className="w-32">
                          <input
                            type="text"
                            value={valueLabel5}
                            onChange={(e) => setValueLabel5(e.target.value)}
                            placeholder="Label 5"
                            className="w-full py-1.5 px-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm text-right"
                            style={{ borderRadius: '24px' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="mb-6">
                    <div className="flex items-center justify-center">
                      <div
                        className="w-full h-6 relative flex items-center select-none"
                        style={{ width: '500px', userSelect: 'none' }}
                        onMouseDown={() => {
                          document.body.style.userSelect = 'none';
                          window.getSelection()?.removeAllRanges();
                        }}
                        onMouseUp={() => { document.body.style.userSelect = ''; }}
                        onMouseLeave={() => { document.body.style.userSelect = ''; }}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        <span className="absolute left-2 text-xs text-gray-500 pointer-events-none z-10">1</span>
                        <div
                          className="w-full h-6 rounded-[20px] relative cursor-pointer transition-all duration-200 border"
                          style={{ backgroundColor: '#F5F5F5', borderColor: '#ADADAD' }}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percentage = clickX / rect.width;
                            setSliderValue(Math.max(1, Math.min(5, Math.round(percentage * 4) + 1)));
                          }}
                          onMouseMove={(e) => {
                            if (e.buttons === 1) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const percentage = clickX / rect.width;
                              setSliderValue(Math.max(1, Math.min(5, Math.round(percentage * 4) + 1)));
                            }
                          }}
                          onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percentage = clickX / rect.width;
                            setSliderValue(Math.max(1, Math.min(5, Math.round(percentage * 4) + 1)));
                          }}
                          onDragStart={(e) => e.preventDefault()}
                        />
                        <span className="absolute right-2 text-xs text-gray-500 pointer-events-none z-10">5</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold mb-3">Select Tag</h3>
                    <div className="flex flex-wrap gap-2">
                      {['Value', 'Lifestyle', 'Look', 'Trait', 'Hobby', 'Interest'].map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTags([]);
                              } else {
                                setSelectedTags([tag]);
                              }
                            }}
                            className={`relative px-4 py-2 border text-sm font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-black text-gray-700 border-2'
                                : 'border-gray-300 text-gray-700 hover:border-gray-400'
                            }`}
                            style={{ borderRadius: '24px' }}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 bg-black opacity-3" style={{ borderRadius: '24px' }}></div>
                            )}
                            <span className="relative z-10">{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-8 border-t border-gray-200">
              <button
                onClick={() => {
                  if (!questionText.trim() || !valueLabel1.trim() || !valueLabel5.trim() || selectedTags.length === 0) {
                    return;
                  }

                  setQuestionText('');
                  setSelectedTags([]);
                  setValueLabel1('');
                  setValueLabel5('');
                  setSliderValue(3);
                  setShowAskQuestionModal(false);
                  setShowSuccessMessage(true);
                  setTimeout(() => setShowSuccessMessage(false), 3000);
                }}
                disabled={!questionText.trim() || !valueLabel1.trim() || !valueLabel5.trim() || selectedTags.length === 0}
                className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 px-6 py-4 flex items-center space-x-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-900 font-medium">Question successfully submitted for approval</span>
          </div>
        </div>
      )}
    </section>
  );
}
