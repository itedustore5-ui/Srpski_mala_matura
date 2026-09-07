// Типови прате оно што сервер стварно шаље. Тачни одговори нису део задатка
// него стижу тек у одговору на предају (`AttemptResult.reveal`) — зато их овде
// и нема на `Question`.

export type Level = "osnovni" | "srednji" | "napredni";
export type Area = "citanje" | "pisanje" | "gramatika" | "knjizevnost";

export type QuestionType =
  | "single"
  | "multi"
  | "fill"
  | "match"
  | "order"
  | "tf"
  | "pick"
  | "open";

export type Question = {
  id: number;
  part: 1 | 2;
  level: Level;
  area: Area;
  textKey?: string;
  points: number;
  type: QuestionType;
  question: string;
  passage?: string;
  source?: string;
  image?: string;
  scored: boolean;
  options?: string[];
  fields?: { label: string }[];
  hint?: string;
  leftItems?: string[];
  rightItems?: string[];
  extraRight?: boolean;
  items?: string[];
  statements?: string[];
  trueLabel?: string;
  falseLabel?: string;
  tokens?: string[];
  lines?: number;
};

export type Revealed = {
  id: number;
  explanation: string;
  standard?: string;
  correctAnswer?: number;
  correctAnswers?: number[];
  correctFields?: string[][];
  correctPairs?: number[];
  correctOrder?: number[];
  correct?: boolean[];
  correctTokens?: number[];
  acceptable?: string;
  unacceptable?: string;
};

/** Одговор на проверу једног задатка; `correct` је null за задатке писања. */
export type CheckResult = {
  id: number;
  scored: boolean;
  correct: boolean | null;
  reveal: Revealed;
};

export type AttemptResult = {
  id: number;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  createdAt: string;
  reveal: Revealed[];
  results: { id: number; correct: boolean }[];
};

export type ExamAttemptResult = {
  id: number;
  pointsEarned: number;
  pointsTotal: number;
  percentage: number;
  createdAt: string;
  reveal: Revealed[];
  results: { id: number; points: number; maxPoints: number }[];
};

export type Catalog = {
  /** Контролна грана не вежба; каталог се и тада приказује, али са разлогом. */
  practiceAllowed: boolean;
  practiceReason: string | null;
  levels: {
    key: Level;
    label: string;
    areas: {
      key: Area;
      label: string;
      questionCount: number;
      scoredCount: number;
      bestScore: number | null;
      attemptsCount: number;
    }[];
  }[];
  texts: { key: string; title: string; author?: string; questionCount: number }[];
};

export type SelectedText = {
  key: string;
  title: string;
  author?: string;
  body: string[];
  note?: string;
};

export type DashboardStats = {
  attemptsCount: number;
  bestScore: number;
  lastScore: number | null;
  solvedCount: number;
  questionCount: number;
  levelScores: {
    key: Level;
    label: string;
    attemptsCount: number;
    bestScore: number | null;
  }[];
};

export type ExamSummary = {
  key: string;
  year: number;
  label: string;
  term?: string;
  totalPoints: number;
  durationMinutes?: number;
  note?: string;
  questionCount: number;
  attemptsCount: number;
  bestPoints: number | null;
};

export type ExamDetail = {
  key: string;
  year: number;
  label: string;
  term?: string;
  totalPoints: number;
  durationMinutes?: number;
  note?: string;
  texts: SelectedText[];
  questions: Question[];
};

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "student";
  active: boolean;
  neverExpires: boolean;
  quizOnce: boolean;
};

export type ScoreboardEntry = {
  rank: number;
  username: string;
  fullName: string;
  bestScore: number;
  attemptsCount: number;
  lastScore: number | null;
};

export type AdminUser = AuthUser & { password: string; createdAt: string };

export type AdminResult = {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  examKey: string | null;
  level: Level | null;
  area: Area | null;
  score: number;
  total: number;
  percentage: number;
  pointsEarned: number | null;
  pointsTotal: number | null;
  passed: boolean;
  createdAt: string;
};

export const TOKEN_KEY = "srpski-matura-token";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data as { message?: string })?.message ?? "Дошло је до грешке.");
  }
  return data as T;
}

export const AREA_LABELS: Record<Area, string> = {
  citanje: "Вештина читања и разумевање прочитаног",
  pisanje: "Писано изражавање",
  gramatika: "Граматика, лексика, народни и књижевни језик",
  knjizevnost: "Књижевност",
};

export const AREA_SHORT: Record<Area, string> = {
  citanje: "Читање",
  pisanje: "Писање",
  gramatika: "Граматика",
  knjizevnost: "Књижевност",
};

export const LEVEL_LABELS: Record<Level, string> = {
  osnovni: "Основни ниво",
  srednji: "Средњи ниво",
  napredni: "Напредни ниво",
};

/**
 * Одговор се шаље као стринг, у формату који сервер очекује по типу задатка.
 * Клијент нигде не пореди одговор са тачним — тачан одговор ни не добија док
 * не преда своје решење.
 */
export type AnswerMap = Record<number, string>;

// ── Истраживање ────────────────────────────────────────────────────────────
// Апликација уз улогу алата за учење служи и као инструмент мерења. Ови типови
// прате оно што о студији враћа сервер; клијент ни овде ништа не одлучује.

export type Phase = "T0" | "vezbanje" | "T30" | "T90";
export type MeasurementPhase = "T0" | "T30" | "T90";
export type StudyArm = "eksperimentalna" | "kontrolna";

export type StudySettings = {
  currentPhase: Phase | null;
  examOpen: boolean;
  practiceOpen: boolean;
  forms: { A: string | null; B: string | null; C: string | null };
  updatedAt: string;
  options?: {
    phases: Phase[];
    measurementPhases: MeasurementPhase[];
    forms: ("A" | "B" | "C")[];
    arms: StudyArm[];
    rotationGroups: number[];
    exams: { key: string; label: string }[];
  };
};

export type CompletionRow = {
  id: number;
  fullName: string;
  researchId: string | null;
  classGroup: string | null;
  studyArm: StudyArm | null;
  rotationGroup: number | null;
  consentResearch: boolean;
  practiceCount: number;
  practiceMs: number;
  measurements: Record<
    MeasurementPhase,
    { done: true; percentage: number; at: string } | { done: false; expectedForm: string | null }
  >;
};

export type Completion = {
  currentPhase: Phase | null;
  examOpen: boolean;
  rows: CompletionRow[];
};

export type ResearchAttempt = {
  id: number;
  userId: number;
  fullName: string;
  researchId: string | null;
  examKey: string | null;
  level: Level | null;
  area: Area | null;
  phase: Phase | null;
  form: string | null;
  percentage: number;
  durationMs: number | null;
  invalidatedAt: string | null;
  invalidatedReason: string | null;
  createdAt: string;
};

/**
 * Подаци о уређају колико треба за тумачење (нпр. да ли је рађено на телефону).
 * IP адресу клијент не шаље, а сервер је ни не бележи.
 */
export function clientInfo() {
  return {
    userAgent: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    mobile: window.matchMedia("(max-width: 767px)").matches,
  };
}
