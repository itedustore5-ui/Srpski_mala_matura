// Модел задатака прати структуру Збирке задатака из српског језика и књижевности
// (ЗВКОВ, завршни испит 2025/2026): први део су задаци разврстани по нивоима и
// областима, други део су задаци везани за одабране текстове.
//
// Зашто ниво и област стоје на самом задатку, а не се изводе из опсега ID-jeva:
// у збирци се исти број задатка појављује у више области, а редослед ID-jeva не
// прати ниво. Извођење из опсега (како је рађено у ранијој верзији апликације)
// пуца чим се дода један задатак у средину.

export type Level = "osnovni" | "srednji" | "napredni";

export type Area = "citanje" | "pisanje" | "gramatika" | "knjizevnost";

export const LEVELS: { key: Level; label: string }[] = [
  { key: "osnovni", label: "Основни ниво" },
  { key: "srednji", label: "Средњи ниво" },
  { key: "napredni", label: "Напредни ниво" },
];

export const AREAS: { key: Area; label: string }[] = [
  { key: "citanje", label: "Вештина читања и разумевање прочитаног" },
  { key: "pisanje", label: "Писано изражавање" },
  { key: "gramatika", label: "Граматика, лексика, народни и књижевни језик" },
  { key: "knjizevnost", label: "Књижевност" },
];

type Base = {
  /** Број задатка у збирци — исти онај који ученик види у књизи. */
  id: number;
  /** 1 = први део (по нивоима), 2 = задаци уз одабране текстове. */
  part: 1 | 2;
  level: Level;
  area: Area;
  /** Кључ текста из `texts.ts` за задатке другог дела. */
  textKey?: string;
  /** Ознака образовног стандарда, нпр. „СЈ.1.1.1“. */
  standard?: string;
  points: number;
  question: string;
  /** Увод/одломак који стоји изнад захтева (песма, реченица, табела). */
  passage?: string;
  /** Извор одломка, нпр. „Десанка Максимовић, Сребрне плесачице“. */
  source?: string;
  /**
   * Назив слике у `public/images/` за задатке уз плакат, табелу или образац.
   * Чува се само назив, а не путања: путању гради клијент, па премештање
   * фолдера не тражи измену података о задацима.
   */
  image?: string;
  explanation: string;
};

/** Обој кружић испред тачног одговора. */
export type SingleQ = Base & {
  type: "single";
  options: string[];
  correctAnswer: number;
};

/** Обој кружиће испред свих тачних одговора. */
export type MultiQ = Base & {
  type: "multi";
  options: string[];
  correctAnswers: number[];
};

/**
 * Напиши / допуни одговор.
 * `correctAnswers` је листа прихватљивих облика за једно поље; за задатке са
 * више поља користи се `fields`, где свако поље има своју листу облика.
 */
export type FillQ = Base & {
  type: "fill";
  fields: { label: string; accepted: string[] }[];
  hint?: string;
};

/** Повежи ставке леве и десне колоне. */
export type MatchQ = Base & {
  type: "match";
  leftItems: string[];
  rightItems: string[];
  /** correctPairs[индекс леве ставке] = индекс десне ставке. */
  correctPairs: number[];
  /** Тачно је када десна колона има ставки више него лева („једна је вишак“). */
  extraRight?: boolean;
};

/** Поређај ставке по траженом редоследу. */
export type OrderQ = Base & {
  type: "order";
  items: string[];
  /** correctOrder[индекс ставке] = позиција (1-базно). */
  correctOrder: number[];
};

/** Тачно / нетачно по тврдњи. */
export type TrueFalseQ = Base & {
  type: "tf";
  statements: string[];
  /** correct[i] = тачна вредност тврдње i. */
  correct: boolean[];
  /** Натписи колона; подразумевано „Тачно“/„Нетачно“. */
  trueLabel?: string;
  falseLabel?: string;
};

/**
 * Подвуци / обој кружиће испод тражених речи у датом тексту.
 * Текст је унапред исечен на жетоне; ученик бира подскуп.
 */
export type PickQ = Base & {
  type: "pick";
  tokens: string[];
  correctTokens: number[];
};

/**
 * Задаци писаног изражавања и тумачења — одговор пише ученик слободно.
 * Сервер их НЕ бодује: не постоји начин да се аутоматски процени да ли је
 * образложење прихватљиво, а погрешно бодовање би искривило статистику.
 * Уместо оцене, после предаје се приказује модел одговора из збирке.
 */
export type OpenQ = Base & {
  type: "open";
  /** Оквирни број редова поља за одговор. */
  lines?: number;
  acceptable: string;
  unacceptable?: string;
};

export type Question =
  | SingleQ
  | MultiQ
  | FillQ
  | MatchQ
  | OrderQ
  | TrueFalseQ
  | PickQ
  | OpenQ;

/** Типови које сервер уме да бодује; `open` намерно није међу њима. */
export const SCORED_TYPES = [
  "single",
  "multi",
  "fill",
  "match",
  "order",
  "tf",
  "pick",
] as const;

export const isScored = (q: Question) =>
  (SCORED_TYPES as readonly string[]).includes(q.type);

/** Одабрани текст из другог дела збирке. */
export type SelectedText = {
  key: string;
  title: string;
  author?: string;
  /** Пасуси/стихови; празан низ раздваја строфе. */
  body: string[];
  note?: string;
};
