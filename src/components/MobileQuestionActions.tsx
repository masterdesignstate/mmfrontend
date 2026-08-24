'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import NoteControl from '@/components/NoteControl';
import { DEFAULT_EXCLUSION_VALUES, normalizeExcludedValues } from '@/utils/exclusionValues';

export interface MobileQuestionActionEntry {
  label: string;
  showOta?: boolean;
  otaChecked?: boolean;
  showExclude?: boolean;
  excludedValues?: number[];
  allowedExclusionValues?: number[];
  blockedExclusionValues?: number[];
  onExcludedValuesChange?: (values: number[]) => void;
  showNote?: boolean;
  note?: string;
  onNoteChange?: (note: string) => void;
}

interface MobileQuestionActionRegistry {
  register: (id: string, entry: MobileQuestionActionEntry) => void;
  unregister: (id: string) => void;
  activate: (id: string) => void;
}

interface MobileQuestionActionState {
  entries: Array<MobileQuestionActionEntry & { id: string }>;
  activeId: string | null;
  questionNote?: {
    value: string;
    onChange: (note: string) => void;
  };
}

const RegistryContext = createContext<MobileQuestionActionRegistry | null>(null);
const StateContext = createContext<MobileQuestionActionState>({ entries: [], activeId: null });

export function MobileQuestionActionsProvider({
  children,
  questionNote,
}: {
  children: ReactNode;
  questionNote?: MobileQuestionActionState['questionNote'];
}) {
  const [entriesById, setEntriesById] = useState<Record<string, MobileQuestionActionEntry>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const register = useCallback((id: string, entry: MobileQuestionActionEntry) => {
    setEntriesById(previous => ({ ...previous, [id]: entry }));
    setActiveId(previous => previous || id);
  }, []);

  const unregister = useCallback((id: string) => {
    setEntriesById(previous => {
      if (!previous[id]) return previous;
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setActiveId(previous => (previous === id ? null : previous));
  }, []);

  const activate = useCallback((id: string) => setActiveId(id), []);

  const registry = useMemo(
    () => ({ register, unregister, activate }),
    [activate, register, unregister]
  );
  const state = useMemo(
    () => ({
      entries: Object.entries(entriesById).map(([id, entry]) => ({ id, ...entry })),
      activeId,
      questionNote,
    }),
    [activeId, entriesById, questionNote]
  );

  return (
    <RegistryContext.Provider value={registry}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </RegistryContext.Provider>
  );
}

export function useMobileQuestionActionRegistry() {
  return useContext(RegistryContext);
}

const capitalizeDropdownLabel = (label: string) =>
  label
    .trim()
    .toLocaleLowerCase()
    .replace(/(^|[\s/(-])([a-z])/g, (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase()}`
    );

/**
 * All three dock chips share one shape so the rail reads as a single row of equal
 * buttons. Each chip fills its grid column, so the widest label — "Open to All" —
 * sets the width the other two adopt.
 */
const DOCK_CHIP =
  'inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-xs font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-colors';

/**
 * One chip's share of the rail: a third of the row, whatever the row actually holds. A
 * question with no Open to All — most of them — used to leave that column standing empty
 * and push the other two off centre, so the rail lays out only the chips it has and centres
 * them, while each keeps the width it would have had in a full row of three.
 */
const DOCK_SLOT = 'w-[calc((100%-1rem)/3)]';

function MobileExclusionPicker({
  entries,
}: {
  entries: Array<MobileQuestionActionEntry & { id: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<number[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedEntry = entries.find(entry => entry.id === selectedId);
  const selectedLabel = selectedEntry ? capitalizeDropdownLabel(selectedEntry.label) : '';
  const allowedValues = normalizeExcludedValues(
    selectedEntry?.allowedExclusionValues || DEFAULT_EXCLUSION_VALUES
  );
  const blockedValues = normalizeExcludedValues(
    selectedEntry?.blockedExclusionValues || [],
    allowedValues
  );
  const hasAnyExclusions = entries.some(entry => (entry.excludedValues || []).length > 0);

  const close = useCallback(() => {
    setOpen(false);
    setSelectedId(null);
    setDraftValues([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [close, open]);

  const chooseQuestion = (entry: MobileQuestionActionEntry & { id: string }) => {
    setSelectedId(entry.id);
    setDraftValues(
      normalizeExcludedValues(
        entry.excludedValues || [],
        entry.allowedExclusionValues || DEFAULT_EXCLUSION_VALUES,
        entry.blockedExclusionValues || []
      )
    );
  };

  const toggleValue = (value: number) => {
    if (blockedValues.includes(value)) return;
    setDraftValues(current =>
      current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value].sort((a, b) => a - b)
    );
  };

  const save = () => {
    if (!selectedEntry) return;
    selectedEntry.onExcludedValuesChange?.(
      normalizeExcludedValues(draftValues, allowedValues, blockedValues)
    );
    close();
  };

  return (
    <div ref={rootRef} className={`relative flex justify-center ${DOCK_SLOT}`}>
      <button
        type="button"
        aria-label="Choose question and excluded values"
        aria-expanded={open}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
        className={`${DOCK_CHIP} ${
          hasAnyExclusions
            ? 'border-[#672DB7] bg-[#672DB7] text-white'
            : 'border-gray-300 bg-white text-gray-700'
        }`}
      >
        <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 4.5h10M5 8h6M7 11.5h2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        Exclude
      </button>

      {open && (
        <div
          className="absolute bottom-10 left-1/2 z-50 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-xl"
          role="dialog"
          aria-label={selectedEntry ? `Exclude values for ${selectedLabel}` : 'Choose a question to exclude'}
        >
          {!selectedEntry ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Choose a question</h3>
                  <p className="mt-0.5 text-[11px] text-gray-500">Then choose the answers to exclude.</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close exclusion picker"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              <div className="max-h-52 space-y-1 overflow-y-auto">
                {entries.map(entry => {
                  const count = normalizeExcludedValues(
                    entry.excludedValues || [],
                    entry.allowedExclusionValues || DEFAULT_EXCLUSION_VALUES,
                    entry.blockedExclusionValues || []
                  ).length;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => chooseQuestion(entry)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-800 transition-colors hover:bg-purple-50 hover:text-[#672DB7]"
                    >
                      <span className="truncate">{capitalizeDropdownLabel(entry.label)}</span>
                      <span className="flex items-center gap-2">
                        {count > 0 && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-[#672DB7]">
                            {count}
                          </span>
                        )}
                        <span aria-hidden className="text-gray-400">›</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setDraftValues([]);
                  }}
                  className="cursor-pointer rounded-lg px-1.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                >
                  ‹ Back
                </button>
                <h3 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-900">
                  {selectedLabel}
                </h3>
                <button
                  type="button"
                  onClick={save}
                  className="cursor-pointer rounded-lg px-1.5 py-1 text-xs font-semibold text-[#672DB7] hover:bg-purple-50"
                >
                  Done
                </button>
              </div>

              <p className="mb-3 text-xs leading-relaxed text-gray-500">
                Exclude people whose answer to this question is one of these values.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {allowedValues.map(value => {
                  const isBlocked = blockedValues.includes(value);
                  const isSelected = draftValues.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isBlocked}
                      title={isBlocked ? 'This is your answer' : undefined}
                      onClick={() => toggleValue(value)}
                      className={`h-9 w-9 cursor-pointer rounded-full border text-sm font-semibold transition-colors ${
                        isBlocked
                          ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300'
                          : isSelected
                            ? 'border-[#672DB7] bg-[#672DB7] text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-[#672DB7] hover:text-[#672DB7]'
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{draftValues.length ? `${draftValues.length} selected` : 'None selected'}</span>
                <button
                  type="button"
                  onClick={() => setDraftValues([])}
                  disabled={draftValues.length === 0}
                  className="cursor-pointer font-medium disabled:cursor-default disabled:text-gray-300"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The question action rail. It lives between the scrolling question and the Back/Next
 * footer, so the actions remain reachable without covering either the content or browser
 * controls. Open to All is intentionally explanatory rather than an input: the slider
 * thumb is the control.
 */
export function MobileQuestionActionDock() {
  const { entries, activeId, questionNote } = useContext(StateContext);
  const [otaHelpOpen, setOtaHelpOpen] = useState(false);
  const otaHelpRef = useRef<HTMLDivElement>(null);
  const activeEntry = entries.find(entry => entry.id === activeId);
  const otaEntries = entries.filter(entry => entry.showOta);
  const excludeEntries = entries.filter(entry => entry.showExclude);
  const noteEntries = questionNote ? [] : entries.filter(entry => entry.showNote);
  const noteEntry = questionNote
    ? {
        id: 'question-note',
        label: 'Question',
        showNote: true,
        note: questionNote.value,
        onNoteChange: questionNote.onChange,
      }
    : activeEntry?.showNote
      ? activeEntry
      : noteEntries[0];
  const hasActions = otaEntries.length > 0 || excludeEntries.length > 0 || Boolean(noteEntry);
  const hasActiveOta = otaEntries.some(entry => entry.otaChecked);

  useEffect(() => {
    if (!otaHelpOpen) return;
    const closeHelpOutside = (event: PointerEvent) => {
      if (!otaHelpRef.current?.contains(event.target as Node)) setOtaHelpOpen(false);
    };
    document.addEventListener('pointerdown', closeHelpOutside);
    return () => document.removeEventListener('pointerdown', closeHelpOutside);
  }, [otaHelpOpen]);

  if (!hasActions) return null;

  return (
    <aside
      className="relative z-40 shrink-0 px-4 py-2"
      aria-label="Question actions"
    >
      <div className="mx-auto flex max-w-sm items-center justify-center gap-2">
        {otaEntries.length > 0 && (
          <div ref={otaHelpRef} className={`relative ${DOCK_SLOT}`}>
            <button
              type="button"
              aria-expanded={otaHelpOpen}
              aria-label="How to use Open to All"
              onClick={() => setOtaHelpOpen(open => !open)}
              className={`${DOCK_CHIP} ${
                hasActiveOta
                  ? 'border-[#672DB7] bg-purple-50 text-[#672DB7]'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <span>Open to All</span>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] leading-none">
                ?
              </span>
            </button>

            {otaHelpOpen && (
              <div
                role="tooltip"
                className="absolute bottom-10 left-0 z-50 w-64 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-relaxed text-gray-600 shadow-xl"
              >
                Move an eligible slider to 5, then tap the 5 thumb again to turn on Open
                to All. Tap the blank thumb again to turn it off.
              </div>
            )}
          </div>
        )}

        {excludeEntries.length > 0 && <MobileExclusionPicker entries={excludeEntries} />}

        {noteEntry && (
          <NoteControl
            value={noteEntry.note || ''}
            onChange={noteEntry.onNoteChange || (() => {})}
            title={questionNote ? 'Add a note to this question' : undefined}
            ariaLabel={questionNote ? 'Add a note to this question' : undefined}
            helpText={
              questionNote
                ? 'Add context about this question as a whole. Who can see it is controlled by Note Visibility in Settings.'
                : undefined
            }
            className={`${DOCK_SLOT} [&>button]:h-8 [&>button]:w-full [&>button]:gap-1.5 [&>button]:whitespace-nowrap [&>button]:px-2 [&>button]:text-xs [&>button]:shadow-[0_4px_14px_rgba(0,0,0,0.08)]`}
          />
        )}
      </div>
    </aside>
  );
}
