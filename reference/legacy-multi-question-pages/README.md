# Legacy multi-question onboarding pages

Reference copies of the three onboarding steps that rendered several sliders under a single
`Them` / `Me` heading, each row carrying its own label (`FEMALE` / `MALE`, `ALCOHOL` /
`CIGARETTES` / `VAPE`, `WANT KIDS` / `HAVE KIDS`).

They were retired when questions 2, 7 and 10 were split into standalone questions so every
mandatory step renders one unlabelled slider, matching the rest of the flow. The mandatory
set went from 10 numbers to 14; see `src/constants/mandatoryQuestions.ts` for the new map and
`mmbackend/api/management/commands/split_mandatory_questions.py` for the data migration.

Kept only so the old layout (row labels, shared importance slider, per-row OTA toggles) can be
consulted. Nothing imports these files and they are excluded from `tsconfig.json`, so they are
not typechecked or bundled.

| Legacy page | Old question_number | Replaced by |
| --- | --- | --- |
| `gender.page.tsx` | 2 (`double`) | questions 2 (Female) and 3 (Male) |
| `habits.page.tsx` | 7 (`triple`) | questions 8 (Alcohol), 9 (Cigarettes), 10 (Vape) |
| `kids.page.tsx` | 10 (`double`) | questions 13 (Want Kids) and 14 (Have Kids) |
