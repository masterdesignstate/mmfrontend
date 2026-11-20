'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import AnswerSliderRow, { ANSWER_SLIDER_ROW_WIDTH } from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { IMPORTANCE_LABELS } from '@/constants/answerLabels';
import { ETHNICITY } from '@/constants/mandatoryQuestions';
import { getAnswerValueFromPercentage, getAnswerValuePosition } from '@/utils/answerValues';

type Variant = 'chips' | 'steps' | 'rows';
type Span = { min: number; max: number };

const OPTIONS = [
  { id: 'white', label: 'White', phrase: 'white' },
  { id: 'black', label: 'Black or African descent', phrase: 'Black or African descent' },
  { id: 'native', label: 'Native American', phrase: 'Native American' },
  { id: 'hispanic', label: 'Hispanic/Latino', phrase: 'Hispanic/Latino' },
  { id: 'asian', label: 'Asian', phrase: 'Asian' },
  { id: 'other', label: 'Other', phrase: 'Other' },
] as const;

type OptionId = (typeof OPTIONS)[number]['id'];

const FULL_SPAN: Span = { min: 1, max: 5 };

function promptFor(phrase: string, side: 'me' | 'them') {
  return side === 'me'
    ? `To what extent does ${phrase} describe you?`
    : `To what extent does ${phrase} describe your ideal match?`;
}

const SCALE = [1, 2, 3, 4, 5].map((value) => ({ value }));
const THUMB_PX = 28;

function thumbLeft(percent: number) {
  if (percent <= 0) return '0px';
  if (percent >= 100) return `calc(100% - ${THUMB_PX}px)`;
  return `calc(${percent}% - ${THUMB_PX / 2}px)`;
}

// The fill stops just inside each thumb's center. Ending it at the outer edge
// leaves a square of gradient beside the round thumb.
const FILL_TUCK = 4;

function fillEdges(minPercent: number, maxPercent: number) {
  const left = minPercent <= 0
    ? `${THUMB_PX / 2 + FILL_TUCK}px`
    : `calc(${minPercent}% + ${FILL_TUCK}px)`;
  const right = maxPercent >= 100
    ? `${THUMB_PX / 2 + FILL_TUCK}px`
    : `calc(${100 - maxPercent}% + ${FILL_TUCK}px)`;
  return { left, right };
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
  const trackRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef(value);
  const dragRef = useRef<'min' | 'max' | null>(null);
  const pointerRef = useRef<number | null>(null);
  spanRef.current = value;

  const moveTo = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return;
    const next = getAnswerValueFromPercentage((clientX - rect.left) / rect.width, SCALE);
    const span = spanRef.current;
    let thumb = dragRef.current;
    if (!thumb || span.min === span.max) {
      if (next < span.min) thumb = 'min';
      else if (next > span.max) thumb = 'max';
      else if (span.min !== span.max) thumb = next - span.min <= span.max - next ? 'min' : 'max';
      else thumb = thumb ?? 'max';
      dragRef.current = thumb;
    }
    const nextSpan = thumb === 'min'
      ? { min: Math.min(next, span.max), max: span.max }
      : { min: span.min, max: Math.max(next, span.min) };
    spanRef.current = nextSpan;
    onChange(nextSpan);
  };

  const nudge = (thumb: 'min' | 'max', delta: number) => {
    if (thumb === 'min') {
      onChange({ min: Math.max(1, Math.min(value.max, value.min + delta)), max: value.max });
    } else {
      onChange({ min: value.min, max: Math.min(5, Math.max(value.min, value.max + delta)) });
    }
  };

  const onThumbKey = (thumb: 'min' | 'max') => (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -1
        : event.key === 'Home'
          ? thumb === 'min' ? 1 - value.min : value.min - value.max
          : event.key === 'End'
            ? thumb === 'min' ? value.max - value.min : 5 - value.max
            : 0;
    if (delta === 0) return;
    event.preventDefault();
    nudge(thumb, delta);
  };

  const minPercent = getAnswerValuePosition(value.min, SCALE);
  const maxPercent = getAnswerValuePosition(value.max, SCALE);

  return (
    <div
      className={`relative flex select-none items-center pb-0 pt-2 ${ANSWER_SLIDER_ROW_WIDTH}`}
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => {
        pointerRef.current = event.pointerId;
        dragRef.current = null;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* capture is an optimisation, not a requirement */
        }
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => {
        if (pointerRef.current !== event.pointerId) return;
        moveTo(event.clientX);
      }}
      onPointerUp={(event) => {
        pointerRef.current = null;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        pointerRef.current = null;
        dragRef.current = null;
      }}
    >
      <div ref={trackRef} className="relative h-5 w-full">
        <div
          className="absolute inset-0 overflow-hidden rounded-[20px] border"
          style={{ backgroundColor: '#F5F5F5', borderColor: '#ADADAD' }}
        >
          {value.min !== value.max && (
            <div
              className="absolute inset-y-0 bg-gradient-to-br from-purple-600 to-purple-900"
              style={fillEdges(minPercent, maxPercent)}
            />
          )}
        </div>

        {SCALE.map((stop) => {
          const onFill = stop.value >= value.min && stop.value <= value.max;
          const numberClass = `pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-xs ${
            onFill ? 'text-white' : 'text-gray-500'
          }`;
          if (stop.value === 1) {
            return <span key={stop.value} className={`${numberClass} left-2`}>{stop.value}</span>;
          }
          if (stop.value === 5) {
            return <span key={stop.value} className={`${numberClass} right-2`}>{stop.value}</span>;
          }
          return (
            <span
              key={stop.value}
              className={`${numberClass} -translate-x-1/2`}
              style={{ left: `${getAnswerValuePosition(stop.value, SCALE)}%` }}
            >
              {stop.value}
            </span>
          );
        })}

        {(['min', 'max'] as const).map((thumb) => {
          const thumbValue = value[thumb];
          return (
            <div
              key={thumb}
              role="slider"
              tabIndex={0}
              aria-label={`${label} ${thumb === 'min' ? 'minimum' : 'maximum'}`}
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={thumbValue}
              className="absolute top-1/2 z-30 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold outline-none"
              style={{
                backgroundColor: 'white',
                color: '#672DB7',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
                left: thumbLeft(thumb === 'min' ? minPercent : maxPercent),
                zIndex: dragRef.current === thumb || (thumb === 'max' && value.min === value.max) ? 31 : 30,
              }}
              onKeyDown={onThumbKey(thumb)}
            >
              {thumbValue}
            </div>
          );
        })}
      </div>
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
      className={`mt-2 block resize-none rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-400 ${ANSWER_SLIDER_ROW_WIDTH}`}
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
      <h3 className="-mb-1 text-center text-lg font-bold">Importance</h3>
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

  const spanKey = (id: OptionId) => `${side}-${id}`;
  const spanFor = (id: OptionId) => spans[spanKey(id)] ?? FULL_SPAN;
  const setSpan = (id: OptionId, value: Span) => setSpans((prev) => ({ ...prev, [spanKey(id)]: value }));
  const isEdited = (id: OptionId) => {
    const span = spans[spanKey(id)];
    return Boolean(span && (span.min !== FULL_SPAN.min || span.max !== FULL_SPAN.max));
  };
  const hasEdits = OPTIONS.some((option) => isEdited(option.id));
  const clearSide = () => {
    setSpans((prev) => {
      const next = { ...prev };
      for (const option of OPTIONS) delete next[spanKey(option.id)];
      return next;
    });
  };

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
        <OnboardingTitle step={`${ETHNICITY}. Ethnicity`} question={question} questionKey={`${step}-${chosen?.id ?? 'none'}`} />

        {showChips && (
          <div className={`flex min-w-0 flex-wrap justify-center gap-2 transition-transform duration-300 ${ANSWER_SLIDER_ROW_WIDTH} ${chosen ? '-translate-y-1' : ''}`}>
            {OPTIONS.map((option) => {
              const active = selected[side] === option.id;
              const edited = isEdited(option.id);
              const selectChip = () => setSelected((prev) => ({
                ...prev,
                [side]: prev[side] === option.id ? null : option.id,
              }));
              if (edited && !active) {
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={selectChip}
                    className="max-w-full cursor-pointer rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-purple-900 shadow-sm"
                    style={{
                      border: '1px solid transparent',
                      background:
                        'linear-gradient(#fff, #fff) padding-box, linear-gradient(to bottom right, #9333ea, #581c87) border-box',
                    }}
                  >
                    {option.label}
                  </button>
                );
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={selectChip}
                  className={`max-w-full cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition-colors ${
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

        {showChips && hasEdits && (
          <div className={`${ANSWER_SLIDER_ROW_WIDTH} mt-2 flex justify-end`}>
            <button
              type="button"
              onClick={clearSide}
              className="cursor-pointer text-sm font-semibold text-purple-700"
            >
              Clear
            </button>
          </div>
        )}

        {showRangeUnderChip && chosen && (
          <div key={`${side}-${chosen.id}`} className="eth-slide mt-3">
            <ExtentSlider
              label={chosen.label}
              value={spanFor(chosen.id)}
              onChange={(value) => setSpan(chosen.id, value)}
            />
            {showImportanceUnderChip && (
              <div className="mt-1">
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
                  value={spanFor(option.id)}
                  onChange={(value) => setSpan(option.id, value)}
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
      `}</style>
    </OnboardingShell>
  );
}
