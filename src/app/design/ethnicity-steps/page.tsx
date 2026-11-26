'use client';

import { useRouter } from 'next/navigation';
import AnswerSliderRow from '@/components/AnswerSliderRow';
import OnboardingShell, { OnboardingTitle } from '@/components/OnboardingShell';
import { DEFAULT_SCALE_LABELS } from '@/constants/answerLabels';
import { ETHNICITY } from '@/constants/mandatoryQuestions';
import { ExtentSlider, ImportanceBlock, NoteField } from '../EthnicitySample';
import { ETHNICITY_STEPS, FULL_SPAN, MANDATORY_CARDS, themAnswer, useQuestionPreview } from '../useQuestionPreview';

const OPTIONS = [
  ['white', 'White'], ['black', 'Black'], ['native', 'Native American'],
  ['latino', 'Latino'], ['east-asian', 'East Asian'], ['south-asian', 'South Asian'],
  ['southeast-asian', 'Southeast Asian'], ['middle-eastern', 'Middle Eastern'],
  ['north-african', 'North African'], ['pacific-islander', 'Pacific Islander'],
  ['multiracial', 'Multiracial'], ['other', 'Other'],
] as const;

export default function EthnicityStepsPage() {
  const router = useRouter();
  const preview = useQuestionPreview(ETHNICITY_STEPS);
  const { progress, save } = preview;
  const { draft } = progress;
  const { step, focused } = draft;
  const side = step === 0 ? 'me' : 'them';
  const selected = focused[side];
  const label = OPTIONS.find(([id]) => id === selected)?.[1];
  const update = (changes: Partial<typeof draft>) => save({ ...progress, draft: { ...draft, ...changes } });
  const range = selected ? draft.them[selected] : undefined;
  const preference = range && themAnswer(range);

  const select = (id: string) => {
    const focus = { ...focused, [side]: id };
    if (side === 'me') update({ focused: focus, me: { ...draft.me, [id]: draft.me[id] ?? 3 } });
    else update({ focused: focus, them: { ...draft.them, [id]: draft.them[id] ?? FULL_SPAN } });
  };

  const goBack = () => {
    if (step === 2) update({ step: 1 });
    else if (step === 1) update({ step: 0 });
    else router.push(MANDATORY_CARDS);
  };

  const goNext = () => {
    if (step === 0) {
      update({ step: 1 });
    } else if (step === 1) {
      update({ step: 2 });
    } else {
      const them = Object.fromEntries(Object.entries(draft.them).map(([id, span]) => [id, themAnswer(span)]));
      if (save({
        ...progress,
        draft: { ...draft, step: 0 },
        ethnicity: { me: draft.me, them, importance: draft.importance, note: draft.note },
      })) router.push(MANDATORY_CARDS);
    }
  };

  const question = step === 2
    ? 'How important is this to you?'
    : side === 'me'
      ? 'Which ethnicities describe you?'
      : 'Which ethnicities describe your ideal match?';

  return (
    <OnboardingShell
      headerAction={preview.headerAction}
      progressPercent={Math.round(((step + 1) / 3) * 100)}
      onBack={goBack}
      onNext={goNext}
      disabled={!preview.ready || (step < 2 && !Object.keys(draft[side]).length)}
    >
      <div className="mx-auto w-full max-w-xl">
        <OnboardingTitle step={`${ETHNICITY}. Ethnicity · ${step === 2 ? 'Importance' : side === 'me' ? 'Me' : 'Them'}`} question={question} />
        {step < 2 ? (
          <>
            <p className="mb-4 text-center text-sm text-gray-600">Choose each that applies and adjust its slider.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {OPTIONS.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={id in draft[side]}
                  onClick={() => select(id)}
                  className={`flex min-h-10 items-center justify-center rounded-full px-2 py-1.5 text-center text-sm font-semibold leading-tight ring-1 transition-colors ${
                    id === selected ? 'bg-[#672DB7] text-white ring-[#672DB7]'
                      : id in draft[side] ? 'bg-purple-50 text-[#672DB7] ring-[#672DB7]'
                        : 'bg-white text-purple-900 ring-purple-200 hover:bg-purple-50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            {selected && label && (
              <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50/60 px-4 py-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-gray-950">{label}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      const focus = { ...focused, [side]: Object.keys(draft[side]).find(id => id !== selected) };
                      if (side === 'me') {
                        const me = { ...draft.me };
                        delete me[selected];
                        update({ me, focused: focus });
                      } else {
                        const them = { ...draft.them };
                        delete them[selected];
                        update({ them, focused: focus });
                      }
                    }}
                    className="text-sm font-semibold text-[#672DB7] hover:underline"
                  >
                    Remove
                  </button>
                </div>
                {side === 'me' ? (
                  <AnswerSliderRow
                    key={selected}
                    label={`How much ${label} describes you`}
                    labels={DEFAULT_SCALE_LABELS}
                    value={draft.me[selected]}
                    onChange={value => update({ me: { ...draft.me, [selected]: value } })}
                    hideRowLabel
                  />
                ) : range && preference && (
                  <>
                    <ExtentSlider
                      key={selected}
                      label={label}
                      value={range}
                      onChange={span => update({ them: { ...draft.them, [selected]: span } })}
                    />
                    <p className="mt-4 text-center text-sm text-gray-700" aria-live="polite">
                      {preference.openToAll ? 'Open to All' : `Answer ${preference.value} · ${preference.excluded.length ? `Exclude ${preference.excluded.join(', ')}` : 'No exclusions'}`}
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mt-5">
            <ImportanceBlock value={draft.importance} onChange={importance => update({ importance })} />
            <NoteField value={draft.note} onChange={note => update({ note })} />
          </div>
        )}
        {preview.message}
      </div>
    </OnboardingShell>
  );
}
