export const HAWAIIAN_ETHNICITY_QUESTION_ID = '2ef95f1a-3b2f-48f5-adb6-1c31d89ed904';
export const DUPLICATE_OTHER_ETHNICITY_QUESTION_ID = '14f4f27b-0e50-4b4a-8172-5d9e6a6eb39d';

type EthnicityQuestionLike = {
  id?: string;
  question_name?: string;
  question_number?: number;
  group_number?: number;
  text?: string;
};

type AnswerWithQuestion<TQuestion extends EthnicityQuestionLike = EthnicityQuestionLike> = {
  question?: string | TQuestion;
};

const OTHER_ETHNICITY_TEXT = 'How strongly do you identify as another ethnicity?';

function isEthnicityQuestion(question: EthnicityQuestionLike, questionNumber?: number): boolean {
  return questionNumber === 3 || question.question_number === 3;
}

function isHawaiianQuestion(question: EthnicityQuestionLike): boolean {
  return question.id === HAWAIIAN_ETHNICITY_QUESTION_ID || question.question_name === 'Hawaiian';
}

function isDuplicateOtherQuestion(question: EthnicityQuestionLike): boolean {
  return question.id === DUPLICATE_OTHER_ETHNICITY_QUESTION_ID || question.question_name === 'Other';
}

export function normalizeEthnicityQuestionName(questionName?: string | null): string {
  if (!questionName) return '';
  return questionName === 'Hawaiian' ? 'Other' : questionName;
}

export function normalizeEthnicityQuestion<T extends EthnicityQuestionLike>(question: T): T {
  if (!isEthnicityQuestion(question) || (!isHawaiianQuestion(question) && !isDuplicateOtherQuestion(question))) {
    return question;
  }

  return {
    ...question,
    id: HAWAIIAN_ETHNICITY_QUESTION_ID,
    question_name: 'Other',
    group_number: 6,
    text: OTHER_ETHNICITY_TEXT,
  } as T;
}

export function normalizeEthnicityQuestions<T extends EthnicityQuestionLike>(
  questions: T[],
  questionNumber?: number
): T[] {
  const hasHawaiianQuestion = questions.some(
    (question) => isEthnicityQuestion(question, questionNumber) && isHawaiianQuestion(question)
  );

  const normalizedQuestions = questions
    .filter((question) => {
      if (!hasHawaiianQuestion || !isEthnicityQuestion(question, questionNumber)) return true;
      if (question.id === HAWAIIAN_ETHNICITY_QUESTION_ID) return true;
      return !isDuplicateOtherQuestion(question);
    })
    .map((question) => normalizeEthnicityQuestion(question));

  if (questionNumber === 3) {
    return [...normalizedQuestions].sort((a, b) => (a.group_number || 0) - (b.group_number || 0));
  }

  return normalizedQuestions;
}

export function normalizeEthnicityAnswer<T extends AnswerWithQuestion>(answer: T): T {
  if (!answer.question || typeof answer.question !== 'object') return answer;

  return {
    ...answer,
    question: normalizeEthnicityQuestion(answer.question),
  };
}

export function normalizeEthnicityAnswers<T extends AnswerWithQuestion>(answers: T[]): T[] {
  return answers.map((answer) => normalizeEthnicityAnswer(answer));
}
