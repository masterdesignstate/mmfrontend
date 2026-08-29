'use client';

import { useEffect, useId } from 'react';

import AnswerSlider from '@/components/AnswerSlider';
import ExclusionControl from '@/components/ExclusionControl';
import NoteControl from '@/components/NoteControl';
import { useMobileQuestionActionRegistry } from '@/components/MobileQuestionActions';
import {
  getAnswerValuePosition,
  getAnswerValues,
  getNearestAnswerValue,
  type AnswerValueLabel,
} from '@/utils/answerValues';

const CONTROLS_GRID = 'grid grid-cols-[44px_auto] items-end gap-2 min-w-0';

/** Absolute position for a label: ends hug the edges, middles centre on the thumb. */
const labelStyle = (index: number, count: number, percent: number): React.CSSProperties => {
  if (index === 0) return { left: 0 };
  if (index === count - 1) return { right: 0 };
  return { left: `${percent}%`, transform: 'translateX(-50%)' };
};

/**
 * How wide one caption may get: 60% less than half the track, so 20%. A caption that needs
 * more room wraps — to two lines, then it clips.
 */
const LABEL_MAX_WIDTH_PCT = 20;
const LABEL_MAX_WIDTH = 'max-w-[var(--label-cap)]';
const LABEL_CLAMP = `line-clamp-2 ${LABEL_MAX_WIDTH}`;

/**
 * The width cap, published as a CSS variable so the clamp above can stay one static class.
 *
 * Two captions centred on their own stops touch once each is as wide as the gap between
 * them, so the cap is the smallest gap between captions that are actually showing — not the
 * gap between stops. UNINVOLVED … RADICAL fills all five stops and gets 25%; a question
 * whose scale only captions its two ends gets the full 45% however many stops sit between.
 */
const mobileLabelCapStyle = (captionPercents: number[]): React.CSSProperties => {
  const sorted = [...captionPercents].sort((a, b) => a - b);
  const smallestGap = sorted
    .slice(1)
    .reduce((gap, percent, index) => Math.min(gap, percent - sorted[index]), 100);

  return {
    '--label-cap': `${Math.min(LABEL_MAX_WIDTH_PCT, sorted.length > 1 ? smallestGap : 100)}%`,
  } as React.CSSProperties;
};

/** Text alignment that keeps a wrapped caption stacked under its own stop. */
const labelAlign = (index: number, count: number) => {
  if (index === 0) return 'text-left';
  if (index === count - 1) return 'text-right';
  return 'text-center';
};

/** The caption that will be tallest once wrapped — used to reserve the strip's height. */
const longestText = (texts: Array<string | undefined>) =>
  texts.reduce<string>((longest, text) => ((text || '').length > longest.length ? text || '' : longest), '');

export function ScaleLabelStrip({
  labels,
  /** Fade the captions when the row accepts every answer, so they read as not in effect. */
  dimmed = false,
  className = '',
}: {
  labels: AnswerValueLabel[];
  dimmed?: boolean;
  className?: string;
}) {
  const values = getAnswerValues(labels);
  const visible = values
    .map((value, index) => ({
      value,
      index,
      text: labels.find(label => Number(label.value) === value)?.answer_text?.trim() || '',
      percent: getAnswerValuePosition(value, labels),
    }))
    .filter(entry => entry.text);

  if (visible.length === 0) return <div className={`h-3 ${className}`} aria-hidden />;

  return (
    <div
      className={`relative w-full text-[9px] font-semibold leading-tight text-gray-500 transition-opacity ${
        dimmed ? 'opacity-40' : ''
      } ${className}`}
      style={mobileLabelCapStyle(visible.map(entry => entry.percent))}
    >
      {/* Captions are absolutely positioned, so they add no height of their own. This copy
          of the longest one sits in the flow — same width cap, same clamp — so the strip is
          exactly one line tall until a caption genuinely needs a second. */}
      <span className={`invisible block ${LABEL_CLAMP}`} aria-hidden>
        {longestText(visible.map(entry => entry.text)).toUpperCase()}
      </span>

      {visible.map(entry => (
        <span
          key={entry.value}
          className={`absolute bottom-0 ${LABEL_CLAMP} ${labelAlign(
            entry.index,
            values.length
          )}`}
          style={labelStyle(entry.index, values.length, entry.percent)}
        >
          {entry.text.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

export function OtaToggle({
  checked,
  onChange,
  ariaLabel = 'Open to all answers',
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-label={ariaLabel}
          className="sr-only"
        />
        <div className={`block h-6 w-11 rounded-full ${checked ? 'bg-[#672DB7]' : 'bg-[#ADADAD]'}`} />
        <div
          className={`dot absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? 'translate-x-5 transform' : ''
          }`}
        />
      </div>
    </label>
  );
}

export interface RowControlsProps {
  showOta?: boolean;
  otaChecked?: boolean;
  onOtaToggle?: () => void;
  /** Exclusion picker — the "Them" side of a question. */
  showExclude?: boolean;
  excludedValues?: number[];
  allowedExclusionValues?: number[];
  blockedExclusionValues?: number[];
  onExcludedValuesChange?: (values: number[]) => void;
  /** Free-text note — the "Me" side of a question. */
  showNote?: boolean;
  note?: string;
  onNoteChange?: (note: string) => void;
}

/** OTA toggle plus whichever of Exclude / Note this row owns. */
export function RowControls({
  showOta = false,
  otaChecked = false,
  onOtaToggle,
  showExclude = false,
  excludedValues = [],
  allowedExclusionValues,
  blockedExclusionValues,
  onExcludedValuesChange,
  showNote = false,
  note = '',
  onNoteChange,
}: RowControlsProps) {
  return (
    <div className={CONTROLS_GRID}>
      <div className={showOta ? '' : 'invisible'} aria-hidden={!showOta}>
        {/* There is no OTA column header any more, so the toggle carries its own caption. */}
        <span className="mb-0.5 block text-center text-[9px] font-semibold leading-none text-gray-500">
          OTA
        </span>
        <OtaToggle checked={otaChecked} onChange={onOtaToggle || (() => {})} />
      </div>
      {showExclude ? (
        <ExclusionControl
          values={excludedValues}
          allowedValues={allowedExclusionValues}
          blockedValues={blockedExclusionValues}
          onChange={onExcludedValuesChange || (() => {})}
        />
      ) : showNote ? (
        <NoteControl value={note} onChange={onNoteChange || (() => {})} />
      ) : (
        <div className="h-7 w-[88px]" aria-hidden />
      )}
    </div>
  );
}

/**
 * A heading for a row that titles itself rather than sitting under a shared section
 * heading — Relationship, whose four sub-questions have no Me/Them split to caption. It is
 * the same heading the Importance section uses, so the two read as peers, and the row
 * itself is rendered with `hideRowLabel` so the name is not also repeated in small type.
 */
export function RowHeading({ label, className = '' }: { label: string; className?: string }) {
  return (
    <h3 className={`-mb-2 text-center text-lg font-bold ${className}`}>
      {label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()}
    </h3>
  );
}

export interface AnswerSliderRowProps extends RowControlsProps {
  /** Row caption, e.g. FEMALE, ALCOHOL, IMPORTANCE. */
  label: string;
  labels: AnswerValueLabel[];
  value: number;
  /** Optional only when `readOnly` — an editable row must be able to report changes. */
  onChange?: (value: number) => void;
  isImportance?: boolean;
  disabled?: boolean;
  /**
   * Display an already-given answer: the slider is inert, the row registers no mobile
   * actions and the controls column is dropped. Used when viewing someone else's answers.
   */
  readOnly?: boolean;
  /**
   * Drop the row caption. For a row whose caption only repeats what the surrounding section
   * or page heading already says: an IMPORTANCE row under an "Importance" heading, or a
   * non-mandatory question, which is one row named after the question itself.
   */
  hideRowLabel?: boolean;
  /** Tighten only the caption spacing around the row on phones; the slider hit area stays 44px. */
  compactMobile?: boolean;
  className?: string;
}

/**
 * The width one row may occupy, centred in whatever container holds it. A phone gives the
 * row the whole screen; wider viewports step up gradually rather than stretching to fill
 * the container, which left the track far longer than the five stops on it need.
 *
 * The steps sit between the two extremes this layout has worn: the full container (640 /
 * 792) read as too wide, and the old three-column grid's track (352 / 488) as too narrow.
 * They also rise monotonically — the old grid dipped to 342px at `md`, since that
 * container was 10px narrower than the one at `sm`.
 */
const ROW_WIDTH = 'mx-auto w-full sm:max-w-[440px] md:max-w-[520px] lg:max-w-[620px]';

/**
 * One question row: caption, slider and its own scale strip, stacked in a single column at
 * every width. The words that say what each number means sit directly under that slider,
 * spanning its exact width.
 */
export default function AnswerSliderRow({
  label,
  labels,
  value,
  onChange,
  isImportance = false,
  disabled = false,
  readOnly = false,
  hideRowLabel = false,
  compactMobile = false,
  className = '',
  ...controls
}: AnswerSliderRowProps) {
  const actionId = useId();
  const registry = useMobileQuestionActionRegistry();
  // A read-only row has nothing to dock: no OTA toggle, no exclusions, no note editor.
  const mobileActionRegistry = readOnly ? null : registry;
  const displayValue = getNearestAnswerValue(value, labels);
  const activeLabel =
    labels.find(entry => Number(entry.value) === displayValue)?.answer_text?.trim() || '';
  const activePercent = getAnswerValuePosition(displayValue, labels);
  const activeIndex = getAnswerValues(labels).indexOf(displayValue);
  const isOpenToAll = Boolean(controls.otaChecked && controls.showOta);
  const hasMobileAction = Boolean(
    !readOnly && (controls.showOta || controls.showExclude || controls.showNote)
  );
  const excludedValuesKey = (controls.excludedValues || []).join(',');
  const allowedValuesKey = (controls.allowedExclusionValues || []).join(',');
  const blockedValuesKey = (controls.blockedExclusionValues || []).join(',');

  useEffect(() => {
    if (!mobileActionRegistry) return;
    if (!hasMobileAction) {
      mobileActionRegistry.unregister(actionId);
      return;
    }
    mobileActionRegistry.register(actionId, {
      label,
      showOta: controls.showOta,
      otaChecked: controls.otaChecked,
      showExclude: controls.showExclude,
      excludedValues: controls.excludedValues,
      allowedExclusionValues: controls.allowedExclusionValues,
      blockedExclusionValues: controls.blockedExclusionValues,
      onExcludedValuesChange: controls.onExcludedValuesChange,
      showNote: controls.showNote,
      note: controls.note,
      onNoteChange: controls.onNoteChange,
    });
  }, [
    actionId,
    controls.allowedExclusionValues,
    controls.blockedExclusionValues,
    controls.excludedValues,
    allowedValuesKey,
    blockedValuesKey,
    controls.note,
    controls.onExcludedValuesChange,
    controls.onNoteChange,
    controls.otaChecked,
    controls.showExclude,
    controls.showNote,
    controls.showOta,
    excludedValuesKey,
    hasMobileAction,
    label,
    mobileActionRegistry,
  ]);

  useEffect(() => {
    if (!mobileActionRegistry) return;
    return () => mobileActionRegistry.unregister(actionId);
  }, [actionId, mobileActionRegistry]);

  return (
    <div
      onPointerDownCapture={() => mobileActionRegistry?.activate(actionId)}
      onFocusCapture={() => mobileActionRegistry?.activate(actionId)}
      className={`grid grid-cols-1 items-center gap-y-1 ${ROW_WIDTH} ${className}`}
    >
      {/* Only rendered when no dock is mounted to host these controls. */}
      {!readOnly && (
        <div className={mobileActionRegistry ? 'hidden' : 'col-start-1 row-start-2 justify-self-center'}>
          <RowControls {...controls} />
        </div>
      )}

      <div className="relative col-start-1 row-start-1 min-w-0">
        {/* The row caption sits above the slider: the space below it belongs to the
            always-on scale captions, and a centred row name would land on the middle one. */}
        {!hideRowLabel && (
          <div className={`${compactMobile ? 'mb-0 mt-1 sm:mb-0.5' : 'mb-0.5 mt-1'} text-center`}>
            <span
              className="mx-auto block max-w-full truncate text-[9px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-400"
              title={label}
            >
              {label}
            </span>
          </div>
        )}
        <AnswerSlider
          value={value}
          onChange={onChange || (() => {})}
          labels={labels}
          isOpenToAll={isOpenToAll}
          isImportance={isImportance}
          disabled={disabled || readOnly}
          ariaLabel={label}
          otaEnabled={!readOnly && Boolean(controls.showOta)}
          onOtaToggle={controls.onOtaToggle}
        />
        {/* Scale captions live under the slider. Every caption is on at all times for a
            question row; an IMPORTANCE row shows only the chosen rung, since five importance
            words at once would say nothing about what is selected. */}
        <div className={compactMobile ? '-mt-2 mb-0 sm:-mt-1 sm:mb-1' : '-mt-1 mb-1'}>
          {isImportance ? (
            <div
              className="relative text-[9px] font-semibold leading-tight text-gray-500"
              // Only ever one caption on screen, so it gets the full allowance.
              style={mobileLabelCapStyle([0])}
            >
              {/* Height reserver: the caption is absolute and adds no height of its own. */}
              <span className={`invisible block uppercase ${LABEL_CLAMP}`} aria-hidden>
                {activeLabel && !isOpenToAll ? activeLabel.toUpperCase() : '\u00A0'}
              </span>
              {activeLabel && !isOpenToAll && (
                <span
                  key={`${displayValue}-${activeLabel}`}
                  className={`mobile-value-label-in absolute top-0 uppercase ${LABEL_CLAMP} ${labelAlign(
                    activeIndex,
                    getAnswerValues(labels).length
                  )}`}
                  style={labelStyle(activeIndex, getAnswerValues(labels).length, activePercent)}
                  title={activeLabel}
                >
                  {activeLabel.toUpperCase()}
                </span>
              )}
            </div>
          ) : (
            <ScaleLabelStrip labels={labels} dimmed={isOpenToAll} />
          )}
        </div>
      </div>
    </div>
  );
}
