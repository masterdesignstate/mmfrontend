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
 * How wide one caption may get: 15% short of half the track, so two captions sitting on
 * adjacent stops always keep a 30% gutter between them instead of running together.
 * A caption that needs more room wraps — to two lines, then it clips.
 */
export const LABEL_MAX_WIDTH = 'max-w-[35%]';
const LABEL_CLAMP = `line-clamp-2 ${LABEL_MAX_WIDTH}`;

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

  // A phone gives the strip ~350px. Two- and three-caption scales (LESS/MORE, NONE/SOME/
  // COMPLETED) have room to spare at 9px, but a five-caption scale such as UNINVOLVED …
  // RADICAL leaves only a couple of pixels between the first two, which reads as one run-on
  // phrase. Dropping those to 8px restores a clear gap without changing the layout. Desktop
  // has 500px and always uses the normal size.
  const totalChars = visible.reduce((sum, entry) => sum + entry.text.length, 0);
  const mobileTextSize = totalChars > 24 ? 'text-[8px]' : 'text-[9px]';

  return (
    <div
      className={`relative w-full leading-tight text-gray-500 transition-opacity sm:text-xs ${mobileTextSize} ${
        dimmed ? 'opacity-40' : ''
      } ${className}`}
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
          className={`absolute bottom-0 ${LABEL_CLAMP} ${labelAlign(entry.index, values.length)}`}
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
   * Drop the row caption at every width — the desktop label column as well as the one under
   * the mobile slider. For a row whose caption only repeats what the surrounding section or
   * page heading already says: an IMPORTANCE row under an "Importance" heading, or a
   * non-mandatory question, which is one row named after the question itself.
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
  const moveQuestionLabelLeft = Boolean(
    !hideRowLabel && !isOpenToAll && displayValue === 3 && activeLabel
  );
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
      {/* The column is kept even when the caption is hidden, so every row in a section
          lines its slider up at the same place. */}
      <div className="hidden min-w-0 items-baseline gap-2 sm:col-start-1 sm:row-start-1 sm:flex">
        {/* truncate is a backstop for arbitrarily long question names; every caption the
            mandatory questions produce fits the 120px column. title exposes the full text
            if one ever does clip. */}
        {!hideRowLabel && (
          <span className="truncate text-xs font-semibold text-gray-400" title={label}>
            {label}
          </span>
        )}
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
        {/* Height reserver — see ScaleLabelStrip. Both captions below are absolute, so
            without these the box would collapse. They are stacked in one grid cell rather
            than measured as a single string, because the two carry different letter-spacing
            and so wrap at different lengths; the cell takes whichever needs two lines. A
            space keeps the usual one-line gap when a caption is not showing. */}
        <div className="relative -mt-1 mb-1 grid text-[9px] leading-tight sm:hidden">
          <span
            className={`invisible col-start-1 row-start-1 font-semibold uppercase tracking-[0.12em] ${LABEL_CLAMP}`}
            aria-hidden
          >
            {hideRowLabel ? '\u00A0' : label}
          </span>
          <span
            className={`invisible col-start-1 row-start-1 font-semibold uppercase ${LABEL_CLAMP}`}
            aria-hidden
          >
            {isOpenToAll || !activeLabel ? '\u00A0' : activeLabel.toUpperCase()}
          </span>

          {!hideRowLabel && (
            <span
              className={`absolute top-0 font-semibold uppercase tracking-[0.12em] text-gray-400 transition-all duration-300 ease-out ${LABEL_CLAMP} ${
                moveQuestionLabelLeft ? 'text-left' : 'text-center'
              }`}
              style={
                moveQuestionLabelLeft
                  ? { left: 0, transform: 'translateX(0)' }
                  : { left: '50%', transform: 'translateX(-50%)' }
              }
              title={label}
            >
              {label}
            </span>
          )}
          {activeLabel && !isOpenToAll && (
            <span
              key={`${displayValue}-${activeLabel}`}
              className={`mobile-value-label-in absolute top-0 font-semibold uppercase text-[#672DB7] ${LABEL_CLAMP} ${labelAlign(
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
      </div>

      {showActiveLabelBelow && (
        <div className="hidden sm:col-start-2 sm:row-start-2 sm:block">
          <div className="relative text-xs leading-tight text-gray-500">
            <span className={`invisible block ${LABEL_CLAMP}`} aria-hidden>
              {activeLabel ? activeLabel.toUpperCase() : '\u00A0'}
            </span>
            {activeLabel && (
              <span
                className={`absolute top-0 ${LABEL_CLAMP} ${labelAlign(
                  activeIndex,
                  getAnswerValues(labels).length
                )}`}
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
