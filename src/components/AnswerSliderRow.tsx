'use client';

import AnswerSlider from '@/components/AnswerSlider';
import ExclusionControl from '@/components/ExclusionControl';
import NoteControl from '@/components/NoteControl';
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
 */
export const SCALE_GRID =
  'sm:grid-cols-[80px_minmax(0,1fr)_144px] sm:gap-x-3 lg:grid-cols-[108px_500px_144px] lg:gap-x-5';

const CONTROLS_GRID = 'grid grid-cols-[44px_auto] items-end gap-2 min-w-0 sm:items-center';

/** Absolute position for a label: ends hug the edges, middles centre on the thumb. */
const labelStyle = (index: number, count: number, percent: number): React.CSSProperties => {
  if (index === 0) return { left: 0 };
  if (index === count - 1) return { right: 0 };
  return { left: `${percent}%`, transform: 'translateX(-50%)' };
};

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
      className={`relative h-3 w-full text-gray-500 transition-opacity sm:h-3.5 sm:text-xs ${mobileTextSize} ${
        dimmed ? 'opacity-40' : ''
      } ${className}`}
    >
      {visible.map(entry => (
        <span
          key={entry.value}
          className="absolute whitespace-nowrap"
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
  className = '',
}: {
  labels: AnswerValueLabel[];
  showOta?: boolean;
  className?: string;
}) {
  return (
    <div className={`hidden items-end sm:grid ${SCALE_GRID} ${className}`}>
      <div aria-hidden />
      <ScaleLabelStrip labels={labels} />
      <div className="text-xs text-gray-500">
        <span className={`block w-11 text-center ${showOta ? '' : 'invisible'}`}>OTA</span>
      </div>
    </div>
  );
}

export interface AnswerSliderRowProps extends RowControlsProps {
  /** Row caption, e.g. FEMALE, ALCOHOL, IMPORTANCE. */
  label: string;
  labels: AnswerValueLabel[];
  value: number;
  onChange: (value: number) => void;
  isImportance?: boolean;
  disabled?: boolean;
  /** Render the active label under the slider on `sm`+ (used by the IMPORTANCE row). */
  showActiveLabelBelow?: boolean;
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
  showActiveLabelBelow = false,
  showScaleAbove = false,
  className = '',
  ...controls
}: AnswerSliderRowProps) {
  const displayValue = getNearestAnswerValue(value, labels);
  const activeLabel =
    labels.find(entry => Number(entry.value) === displayValue)?.answer_text?.trim() || '';
  const activePercent = getAnswerValuePosition(displayValue, labels);
  const activeIndex = getAnswerValues(labels).indexOf(displayValue);
  const isOpenToAll = Boolean(controls.otaChecked && controls.showOta);

  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 sm:gap-y-0 ${
        showScaleAbove ? 'sm:items-end' : ''
      } ${SCALE_GRID} ${className}`}
    >
      <div className="col-start-1 row-start-1 flex min-w-0 items-baseline gap-2">
        <span className="truncate text-xs font-semibold text-gray-400">{label}</span>
      </div>

      <div className="col-start-2 row-start-1 justify-self-end sm:col-start-3 sm:justify-self-start">
        <RowControls {...controls} />
      </div>

      <div className="col-span-2 col-start-1 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        {/* On `sm`+ the section header already carries this strip, unless the row owns its
            own scale (Kids), so it would otherwise be repeated on every row. */}
        <ScaleLabelStrip
          labels={labels}
          dimmed={isOpenToAll}
          className={showScaleAbove ? 'sm:mb-1' : 'sm:mb-1 sm:hidden'}
        />
        <AnswerSlider
          value={value}
          onChange={onChange}
          labels={labels}
          isOpenToAll={isOpenToAll}
          isImportance={isImportance}
          disabled={disabled}
          ariaLabel={label}
        />
      </div>

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
