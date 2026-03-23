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

    </section>
  );
}
