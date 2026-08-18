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

/**
 * Column template shared by the scale header and every slider row, so the label / slider /
 * controls columns line up down a section. Below `sm` rows switch to a two-line layout
 * (label + controls on top, full-width slider underneath) — see AnswerSliderRow.
 *
 * The label column is 120px because that clears the longest row captions this flow
 * produces: UNDERGRADUATE (110px) and HISPANIC/LATINO (104px) are single unbreakable
 * tokens, and PRE HIGH SCHOOL / PACIFIC ISLANDER / NATIVE AMERICAN measure ~113px at
 * 12px semibold. The slider column is 1fr rather than a fixed width so it absorbs the
 * difference between the `sm` and `lg` container widths on its own.
 */
export const SCALE_GRID =
  'sm:grid-cols-[120px_minmax(0,1fr)_144px] sm:gap-x-3 lg:gap-x-5';

/** Same as SCALE_GRID minus the controls column, for rows that only display an answer. */
export const READONLY_SCALE_GRID =
  'sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-x-3 lg:gap-x-5';

const CONTROLS_GRID = 'grid grid-cols-[44px_auto] items-end gap-2 min-w-0 sm:items-center';

/** Absolute position for a label: ends hug the edges, middles centre on the thumb. */
const labelStyle = (index: number, count: number, percent: number): React.CSSProperties => {
  if (index === 0) return { left: 0 };
  if (index === count - 1) return { right: 0 };
  return { left: `${percent}%`, transform: 'translateX(-50%)' };
};

/**
 * How wide one caption may get on a phone: 5% short of half the track, so two captions on
 * adjacent stops always keep a 10% gutter between them instead of running together. A
 * caption that needs more room wraps — to two lines, then it clips.
 *
 * Phones only. From `sm` up the captions revert to the single unwrapped line they have
 * always been, so the desktop layout is untouched.
 */
const LABEL_MAX_WIDTH_PCT = 45;
export const LABEL_MAX_WIDTH = 'max-w-[var(--label-cap)] sm:max-w-none';
const LABEL_CLAMP = `line-clamp-2 sm:line-clamp-none sm:whitespace-nowrap ${LABEL_MAX_WIDTH}`;

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

  if (visible.length === 0) return <div className={`h-3 sm:h-3.5 ${className}`} aria-hidden />;

  return (
    <div
      className={`relative w-full text-[9px] font-semibold leading-tight text-gray-500 transition-opacity sm:h-3.5 sm:text-xs sm:font-normal sm:leading-[normal] ${
        dimmed ? 'opacity-40' : ''
      } ${className}`}
      style={mobileLabelCapStyle(visible.map(entry => entry.percent))}
    >
      {/* Captions are absolutely positioned, so they add no height of their own. On phones
          this copy of the longest one sits in the flow — same width cap, same clamp — so the
          strip is exactly one line tall until a caption genuinely needs a second. Desktop
          keeps its original fixed height instead, hence `sm:hidden`. */}
      <span className={`invisible block sm:hidden ${LABEL_CLAMP}`} aria-hidden>
        {longestText(visible.map(entry => entry.text)).toUpperCase()}
      </span>

      {visible.map(entry => (
        <span
          key={entry.value}
          className={`absolute bottom-0 sm:bottom-auto sm:top-0 ${LABEL_CLAMP} ${labelAlign(
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
        {/* The OTA column header is hidden below `sm`, so caption the toggle inline there. */}
        <span className="mb-0.5 block text-center text-[9px] font-semibold leading-none text-gray-500 sm:hidden">
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
 * The column headers that sit above a section's rows: the scale labels over the slider
 * column, and OTA over the controls column. Only OTA gets a header — the Exclude and Note
 * buttons carry their own text labels, so a heading over them just repeats the word.
 *
 * Hidden below `sm`, where each row carries its own scale strip instead (see
 * AnswerSliderRow) and the OTA toggle is captioned inline.
 */
export function AnswerScaleHeader({
  labels,
  showOta = false,
  /** Drop the controls column so the strip lines up with a section of read-only rows. */
  readOnly = false,
  className = '',
}: {
  labels: AnswerValueLabel[];
  showOta?: boolean;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`hidden items-end sm:grid ${readOnly ? READONLY_SCALE_GRID : SCALE_GRID} ${className}`}
    >
      <div aria-hidden />
      <ScaleLabelStrip labels={labels} />
      {!readOnly && (
        <div className="text-xs text-gray-500">
          <span className={`block w-11 text-center ${showOta ? '' : 'invisible'}`}>OTA</span>
        </div>
      )}
    </div>
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
  /** Render the active label under the slider on `sm`+ (used by the IMPORTANCE row). */
  showActiveLabelBelow?: boolean;
  /**
   * Drop the row caption on phones. For a row whose caption only repeats what the
   * surrounding section or page heading already says: an IMPORTANCE row under an
   * "Importance" heading, or a non-mandatory question, which is one row named after the
   * question itself. Desktop keeps its label column either way.
   */
  hideRowLabel?: boolean;
  /**
   * Render this row's own scale strip above its slider on `sm`+. For sections where every
   * row shares one scale, use AnswerScaleHeader once instead; this is for pages like Kids
   * where each row has a different scale.
   */
  showScaleAbove?: boolean;
  className?: string;
}

/**
 * One question row: caption, slider and row controls.
 *
 * The rule at every width is the same one desktop already used — the words that say what
 * each number means sit directly above that slider, spanning its exact width. Below `sm`
 * the row reflows to two lines (caption + controls, then strip + full-width slider) so the
 * strip gets the whole screen instead of the ~120px the old three fixed columns left it.
 * From `sm` up the section's shared AnswerScaleHeader carries the strip instead, so it is
 * not repeated once per row.
 */
export default function AnswerSliderRow({
  label,
  labels,
  value,
  onChange,
  isImportance = false,
  disabled = false,
  readOnly = false,
  showActiveLabelBelow = false,
  hideRowLabel = false,
  showScaleAbove = false,
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
      className={`grid grid-cols-1 items-center gap-y-1 sm:gap-y-0 ${
        showScaleAbove ? 'sm:items-end' : ''
      } ${readOnly ? READONLY_SCALE_GRID : SCALE_GRID} ${className}`}
    >
      <div className="hidden min-w-0 items-baseline gap-2 sm:col-start-1 sm:row-start-1 sm:flex">
        {/* truncate is a backstop for arbitrarily long question names; every caption the
            mandatory questions produce fits the 120px column. title exposes the full text
            if one ever does clip. */}
        <span className="truncate text-xs font-semibold text-gray-400" title={label}>
          {label}
        </span>
      </div>

      {readOnly ? (
        <div className="hidden sm:col-start-3 sm:row-start-1 sm:block" aria-hidden />
      ) : (
        <div
          className={`${mobileActionRegistry ? 'hidden' : 'col-start-1 row-start-2 justify-self-center'} sm:col-start-3 sm:row-start-1 sm:block sm:justify-self-start`}
        >
          <RowControls {...controls} />
        </div>
      )}

      <div className="relative col-start-1 row-start-1 min-w-0 sm:col-start-2 sm:row-start-1">
        {showScaleAbove && (
          <ScaleLabelStrip labels={labels} dimmed={isOpenToAll} className="mb-1 hidden sm:block" />
        )}
        {/* On phones the row caption sits above the slider: the space below it now belongs
            to the always-on scale captions, and a centred row name would land on top of the
            middle one. Desktop keeps it in the left-hand column. */}
        {!hideRowLabel && (
          <div className="mb-0.5 mt-1 text-center sm:hidden">
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
        {/* Scale captions live under the slider on phones, where there is no room for a
            shared header strip. Every caption is on at all times for a question row, so the
            gray matches the desktop strip. An IMPORTANCE row shows only the chosen rung —
            five importance words at once would say nothing about what is selected. */}
        <div className="-mt-1 mb-1 sm:hidden">
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

      {/* Desktop only, and unchanged: one line, no width cap. */}
      {showActiveLabelBelow && (
        <div className="hidden sm:col-start-2 sm:row-start-2 sm:block">
          <div className="relative h-4 text-xs text-gray-500">
            {activeLabel && (
              <span
                className="absolute whitespace-nowrap"
                style={labelStyle(activeIndex, getAnswerValues(labels).length, activePercent)}
              >
                {activeLabel.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
