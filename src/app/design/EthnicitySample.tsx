'use client';

import { useState } from 'react';
import ReactSlider from 'react-slider';
import AnswerSliderRow from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { ETHNICITY } from '@/constants/mandatoryQuestions';

type Variant = 'chips' | 'steps' | 'rows';
type Span = { min: number; max: number };

const OPTIONS = [
  { id: 'white', label: 'White', phrase: 'white' },
  { id: 'black', label: 'Black or African descent', phrase: 'Black or African descent' },
  { id: 'native', label: 'Native American', phrase: 'Native American' },
  { id: 'hispanic', label: 'Hispanic/Latino', phrase: 'Hispanic/Latino' },
  { id: 'asian', label: 'Asian', phrase: 'Asian' },
  { id: 'other', label: 'another ethnicity', phrase: 'another ethnicity' },
] as const;

type OptionId = (typeof OPTIONS)[number]['id'];

const FULL_SPAN: Span = { min: 1, max: 5 };

function promptFor(phrase: string, side: 'me' | 'them') {
  return side === 'me'
    ? `To what extent does ${phrase} describe you?`
    : `To what extent does ${phrase} describe your ideal match?`;
}

function ExtentSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Span;
  onChange: (value: Span) => void;
}) {
  return (
    <div className="px-1 pb-7 pt-2">
      <ReactSlider
        className="eth-range"
        thumbClassName="eth-range__thumb"
        trackClassName="eth-range__track"
        value={[value.min, value.max]}
        pearling
        minDistance={0}
        min={1}
        max={5}
        step={1}
        ariaLabel={[`${label} minimum`, `${label} maximum`]}
        renderThumb={(props, state) => {
          const { key, ...rest } = props;
          return (
            <div key={key} {...rest}>
              <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 text-sm text-gray-600">
                {state.valueNow}
              </span>
            </div>
          );
        }}
        onChange={(vals) => onChange({ min: vals[0], max: vals[1] })}
      />
    </div>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={160}
      rows={3}
      placeholder="Add a note"
      className="mt-2 w-full resize-none rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-400"
    />
  );
}

function ImportanceBlock({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <h3 className="text-center text-lg font-bold">Importance</h3>
      <AnswerSliderRow
        label="IMPORTANCE"
        labels={IMPORTANCE_LABELS}
        value={value}
        onChange={onChange}
        isImportance
        hideRowLabel
      />
    </div>
  );
}

export default function EthnicitySample({ variant }: { variant: Variant }) {
  const stepCount = variant === 'chips' ? 2 : 3;
  const [step, setStep] = useState(0);
  const side: 'me' | 'them' = step === 1 ? 'them' : 'me';
  const [selected, setSelected] = useState<Record<'me' | 'them', OptionId | null>>({ me: null, them: null });
  const [spans, setSpans] = useState<Record<string, Span>>({});
  const [importance, setImportance] = useState<Record<'me' | 'them' | 'close', number>>({ me: 3, them: 3, close: 3 });
  const [note, setNote] = useState<Record<'me' | 'them' | 'close', string>>({ me: '', them: '', close: '' });

  const spanFor = (id: string) => spans[id] ?? FULL_SPAN;
  const setSpan = (id: string, value: Span) => setSpans((prev) => ({ ...prev, [id]: value }));

  const groupQuestion = side === 'me'
    ? 'What ethnicity best describes you?'
    : 'What ethnicity best describes your ideal match?';
  const chosen = OPTIONS.find((option) => option.id === selected[side]);
  const question = step === 2
    ? 'How important is this to you?'
    : chosen
      ? promptFor(chosen.phrase, side)
      : groupQuestion;

  const showChips = variant !== 'rows' && step < 2;
  const showRangeUnderChip = showChips && chosen && (variant === 'chips' || variant === 'steps');
  const showImportanceUnderChip = variant === 'chips' && Boolean(chosen);
  const showClosingStep = variant !== 'chips' && step === 2;

  return (
    <OnboardingShell
      progressPercent={Math.round(((step + 1) / stepCount) * 100)}
      onBack={step > 0 ? () => setStep((current) => current - 1) : undefined}
      onNext={() => setStep((current) => (current + 1) % stepCount)}
    >
      <div className="mx-auto w-full min-w-0 max-w-[100%] sm:max-w-[640px] md:max-w-[630px] lg:max-w-[792px]">
        <OnboardingTitle step={`${ETHNICITY}. Ethnicity`} question={question} questionKey={`${step}-${chosen?.id ?? 'none'}`}>
          <p className="text-sm font-medium text-purple-800/70">This sample is not saved.</p>
        </OnboardingTitle>

        {showChips && (
          <div className={`flex flex-wrap justify-center gap-2 transition-transform duration-300 ${chosen ? '-translate-y-1' : ''}`}>
            {OPTIONS.map((option) => {
              const active = selected[side] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected((prev) => ({ ...prev, [side]: option.id }))}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition-colors cursor-pointer ${
                    active
                      ? 'bg-gradient-to-br from-purple-600 to-purple-900 text-white ring-purple-700 shadow-sm'
                      : 'bg-white text-purple-900/70 ring-purple-200 hover:ring-purple-400'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        {showRangeUnderChip && chosen && (
          <div key={`${side}-${chosen.id}`} className="eth-slide mt-6">
            <ExtentSlider
              label={chosen.label}
              value={spanFor(`${side}-${chosen.id}`)}
              onChange={(value) => setSpan(`${side}-${chosen.id}`, value)}
            />
            {showImportanceUnderChip && (
              <div className="mt-4">
                <ImportanceBlock
                  value={importance[side]}
                  onChange={(value) => setImportance((prev) => ({ ...prev, [side]: value }))}
                />
                <NoteField
                  value={note[side]}
                  onChange={(value) => setNote((prev) => ({ ...prev, [side]: value }))}
                />
              </div>
            )}
          </div>
        )}

        {variant === 'rows' && step < 2 && (
          <div>
            {OPTIONS.map((option) => (
              <div key={option.id} className="mb-2">
                <h3 className="text-center text-lg font-bold">{option.label}</h3>
                <ExtentSlider
                  label={option.label}
                  value={spanFor(`${side}-${option.id}`)}
                  onChange={(value) => setSpan(`${side}-${option.id}`, value)}
                />
              </div>
            ))}
          </div>
        )}

        {showClosingStep && (
          <div>
            <ImportanceBlock
              value={importance.close}
              onChange={(value) => setImportance((prev) => ({ ...prev, close: value }))}
            />
            <NoteField
              value={note.close}
              onChange={(value) => setNote((prev) => ({ ...prev, close: value }))}
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        .eth-slide {
          animation: eth-slide-up 280ms ease-out;
        }
        @keyframes eth-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .eth-range {
          width: calc(100% - 24px);
          height: 28px;
          position: relative;
          margin: 0 12px;
        }
        .eth-range .eth-range__track {
          top: 50%;
          margin-top: -4px;
          height: 8px;
          border-radius: 9999px;
          background: #e5e7eb;
        }
        .eth-range .eth-range__track.eth-range__track-1 {
          background: #7c3aed;
        }
        .eth-range .eth-range__thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #fff;
          border: none;
          box-shadow: 0 3px 10px rgba(45, 35, 66, 0.25);
          cursor: grab;
          top: 50%;
          transform: translateY(-50%);
          outline: none;
          z-index: 1;
        }
      `}</style>
    </OnboardingShell>
  );
}
