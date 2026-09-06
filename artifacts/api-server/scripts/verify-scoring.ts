/**
 * Проверава да збирка задатака и бодовање стоје:
 *   1. да су подаци о задацима непротивречни (индекси у опсегу, без дупликата),
 *   2. да тачан одговор носи поен, а промењен одговор не носи,
 *   3. да у ономе што иде клијенту пре одговора нема тачног одговора.
 *
 * Трећа провера је овде разлог зашто скрипта уопште постоји. Цурење тачног
 * одговора се не види ни на једном екрану — само у мрежном саобраћају — па би
 * иначе прошло непримећено док неко не отвори Network таб.
 */
import { questions } from "../src/data/questions";
import { AREAS, LEVELS, isScored, type Question } from "../src/data/types";
import { sanitizeQuestion, scoreAnswer } from "../src/lib/scoring";

const problems: string[] = [];
const fail = (q: Question, message: string) =>
  problems.push(`Задатак ${q.id}: ${message}`);

const levelKeys = new Set(LEVELS.map((l) => l.key));
const areaKeys = new Set(AREAS.map((a) => a.key));

// ── 1. Структура ───────────────────────────────────────────────────────────
const seen = new Set<number>();
for (const q of questions) {
  if (seen.has(q.id)) fail(q, "број задатка се понавља");
  seen.add(q.id);

  if (!levelKeys.has(q.level)) fail(q, `непознат ниво „${q.level}“`);
  if (!areaKeys.has(q.area)) fail(q, `непозната област „${q.area}“`);
  if (q.part === 2 && !q.textKey) fail(q, "задатак другог дела нема textKey");
  if (q.points <= 0) fail(q, "број поена мора бити већи од нуле");
  if (!q.question.trim()) fail(q, "нема текста захтева");
  if (!q.explanation.trim()) fail(q, "нема објашњења");

  switch (q.type) {
    case "single":
      if (q.options.length < 2) fail(q, "мање од два понуђена одговора");
      if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length)
        fail(q, "тачан одговор показује ван понуђених");
      break;
    case "multi":
      if (q.correctAnswers.length === 0) fail(q, "нема ниједног тачног одговора");
      if (new Set(q.correctAnswers).size !== q.correctAnswers.length)
        fail(q, "тачан одговор се понавља");
      for (const i of q.correctAnswers)
        if (i < 0 || i >= q.options.length) fail(q, `индекс ${i} је ван понуђених`);
      break;
    case "fill":
      if (q.fields.length === 0) fail(q, "нема поља за допуну");
      for (const f of q.fields)
        if (f.accepted.length === 0) fail(q, `поље „${f.label}“ нема ниједан прихватљив облик`);
      break;
    case "match":
      if (q.correctPairs.length !== q.leftItems.length)
        fail(q, "број парова не одговара броју ставки леве колоне");
      for (const i of q.correctPairs)
        if (i < 0 || i >= q.rightItems.length) fail(q, `пар ${i} показује ван десне колоне`);
      if (q.extraRight && q.rightItems.length <= q.leftItems.length)
        fail(q, "означено је да има вишка, а десна колона није дужа");
      break;
    case "order": {
      const expected = [...Array(q.items.length)].map((_, i) => i + 1);
      const sorted = [...q.correctOrder].sort((a, b) => a - b);
      if (q.correctOrder.length !== q.items.length || sorted.some((v, i) => v !== expected[i]))
        fail(q, "редослед мора бити пермутација позиција 1..н");
      break;
    }
    case "tf":
      if (q.correct.length !== q.statements.length)
        fail(q, "број тачних вредности не одговара броју тврдњи");
      break;
    case "pick":
      if (q.correctTokens.length === 0) fail(q, "нема означених делова текста");
      for (const i of q.correctTokens)
        if (i < 0 || i >= q.tokens.length) fail(q, `означен део ${i} не постоји`);
      break;
    case "open":
      if (!q.acceptable.trim()) fail(q, "нема модела прихватљивог одговора");
      break;
  }
}

// ── 1б. Мешање писама ──────────────────────────────────────────────────────
// Текст који види ученик мора бити ћирилички. Латинично слово усред ћириличке
// речи је увек грешка у куцању, а на екрану се готово не примећује: „прште“ и
// „пršte“ изгледају скоро исто, а поређење одговора их разликује.
// Провера тражи слово из *било ког* другог писма, не само латинице: при
// преписивању зна да упадне и знак који није ни ћирилица ни латиница, а на
// екрану се ни он не примети.
const isLetter = (ch: string) => /\p{L}/u.test(ch);
const isCyrillic = (ch: string) => /\p{Script=Cyrillic}/u.test(ch);

function checkScript(q: Question, label: string, value: string) {
  for (const word of value.split(/[\s ]+/)) {
    if (![...word].some(isCyrillic)) continue;
    const stray = [...word].find((ch) => isLetter(ch) && !isCyrillic(ch));
    if (stray) {
      fail(q, `${label}: реч „${word}“ меша ћирилицу и слово „${stray}“ из другог писма`);
    }
  }
}

for (const q of questions) {
  checkScript(q, "захтев", q.question);
  checkScript(q, "објашњење", q.explanation);
  if (q.passage) checkScript(q, "одломак", q.passage);
  if (q.type === "single" || q.type === "multi")
    q.options.forEach((o, i) => checkScript(q, `одговор ${i + 1}`, o));
  if (q.type === "pick") q.tokens.forEach((t, i) => checkScript(q, `део ${i + 1}`, t));
  if (q.type === "tf") q.statements.forEach((s, i) => checkScript(q, `тврдња ${i + 1}`, s));
  if (q.type === "match") {
    q.leftItems.forEach((t, i) => checkScript(q, `лева ставка ${i + 1}`, t));
    q.rightItems.forEach((t, i) => checkScript(q, `десна ставка ${i + 1}`, t));
  }
  if (q.type === "order") q.items.forEach((t, i) => checkScript(q, `ставка ${i + 1}`, t));
  if (q.type === "fill")
    q.fields.forEach((f, i) => {
      checkScript(q, `поље ${i + 1}`, f.label);
      f.accepted.forEach((a) => checkScript(q, `прихватљив одговор ${i + 1}`, a));
    });
  if (q.type === "open") checkScript(q, "модел одговора", q.acceptable);
}

// ── 2. Бодовање ────────────────────────────────────────────────────────────
function correctAnswerFor(q: Question): string | null {
  switch (q.type) {
    case "single":
      return String(q.correctAnswer);
    case "multi":
      return q.correctAnswers.join(",");
    case "fill":
      return q.fields.map((f) => f.accepted[0]).join("|");
    case "match":
      return q.correctPairs.join(",");
    case "order":
      return q.correctOrder.join(",");
    case "tf":
      return q.correct.map((v) => (v ? "T" : "N")).join(",");
    case "pick":
      return q.correctTokens.join(",");
    default:
      return null;
  }
}

for (const q of questions) {
  if (!isScored(q)) {
    if (scoreAnswer(q, "било шта")) fail(q, "задатак који се не бодује добио је поен");
    continue;
  }

  const correct = correctAnswerFor(q);
  if (correct === null) continue;
  if (!scoreAnswer(q, correct)) fail(q, "тачан одговор није признат");
  if (scoreAnswer(q, "")) fail(q, "празан одговор је признат као тачан");

  // Промењен одговор не сме да прође. Свака грана мења одговор на начин који
  // за тај тип задатка сигурно даје нешто друго.
  let wrong: string | null = null;
  if (q.type === "single") {
    wrong = String((q.correctAnswer + 1) % q.options.length);
  } else if (q.type === "multi") {
    const unused = q.options.map((_, i) => i).find((i) => !q.correctAnswers.includes(i));
    wrong = unused === undefined ? null : [...q.correctAnswers, unused].join(",");
  } else if (q.type === "tf") {
    wrong = q.correct.map((v) => (v ? "N" : "T")).join(",");
  } else if (q.type === "pick" && q.correctTokens.length < q.tokens.length) {
    const unused = q.tokens.map((_, i) => i).find((i) => !q.correctTokens.includes(i));
    wrong = [...q.correctTokens, unused!].join(",");
  } else if (q.type === "match" && q.rightItems.length > 1) {
    wrong = q.correctPairs
      .map((v, i) => (i === 0 ? (v + 1) % q.rightItems.length : v))
      .join(",");
  } else if (q.type === "order" && q.items.length > 1) {
    const flipped = [...q.correctOrder];
    [flipped[0], flipped[1]] = [flipped[1]!, flipped[0]!];
    wrong = flipped.join(",");
  } else if (q.type === "fill") {
    wrong = q.fields.map(() => "нетачно").join("|");
  }
  if (wrong !== null && wrong !== correct && scoreAnswer(q, wrong))
    fail(q, "нетачан одговор је признат као тачан");
}

// ── 3. Цурење тачног одговора ──────────────────────────────────────────────
const FORBIDDEN_KEYS = [
  "correctAnswer",
  "correctAnswers",
  "correctPairs",
  "correctOrder",
  "correctTokens",
  "correct",
  "accepted",
  "acceptable",
  "unacceptable",
  "explanation",
  "standard",
];

for (const q of questions) {
  const sanitized = sanitizeQuestion(q) as Record<string, unknown>;
  for (const key of FORBIDDEN_KEYS) {
    if (key in sanitized) fail(q, `поље „${key}“ стиже клијенту пре одговора`);
  }

  const serialized = JSON.stringify(sanitized);
  // Текст тачног одговора не сме да се појави ни као вредност неког другог
  // поља — на пример у објашњењу залуталом у `question`.
  if (q.type === "fill") {
    for (const field of q.fields) {
      for (const variant of field.accepted) {
        if (variant.length > 3 && serialized.includes(`"${variant}"`))
          fail(q, `прихватљив одговор „${variant}“ стиже клијенту`);
      }
    }
  }
  if (q.type === "open" && serialized.includes(q.acceptable.slice(0, 40)))
    fail(q, "модел одговора стиже клијенту пре одговора");
}

// ── Извештај ───────────────────────────────────────────────────────────────
const scoredCount = questions.filter(isScored).length;
console.log(`Задатака у збирци: ${questions.length} (бодује се ${scoredCount}).`);
for (const level of LEVELS) {
  const parts = AREAS.map((area) => {
    const n = questions.filter(
      (q) => q.part === 1 && q.level === level.key && q.area === area.key,
    ).length;
    return `${area.label}: ${n}`;
  });
  console.log(`  ${level.label} — ${parts.join(", ")}`);
}
console.log(`  Други део (уз текстове): ${questions.filter((q) => q.part === 2).length}`);

if (problems.length > 0) {
  console.error(`\nНађено ${problems.length} проблема:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log("\nСве провере су прошле.");
