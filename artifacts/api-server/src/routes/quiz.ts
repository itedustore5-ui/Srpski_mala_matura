import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, quizAttempts, users } from "@workspace/db";
import { questions, questionById } from "../data/questions";
import { AREAS, LEVELS, isScored, type Area, type Level } from "../data/types";
import { texts } from "../data/texts";
import { revealQuestion, sanitizeQuestion, scoreAnswer } from "../lib/scoring";
import { recordItems, sanitizeClientInfo } from "../lib/attempt-items";
import { canPractice, getSettings, phaseForAttempt } from "../lib/study";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const percent = (score: number, total: number) =>
  Math.round((score / Math.max(total, 1)) * 100);

const isLevel = (value: unknown): value is Level =>
  LEVELS.some((l) => l.key === value);

const isArea = (value: unknown): value is Area =>
  AREAS.some((a) => a.key === value);

const practiceQuestions = (level: Level, area: Area) =>
  questions.filter((q) => q.part === 1 && q.level === level && q.area === area);

/** Задаци другог дела групишу се по тексту, јер се тако и решавају. */
const textQuestions = (textKey: string) =>
  questions.filter((q) => q.part === 2 && q.textKey === textKey);

async function practiceAttempts(userId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), isNull(quizAttempts.examKey)))
    .orderBy(desc(quizAttempts.createdAt));
}

// ── Структура збирке ──────────────────────────────────────────────────────
// Клијент не зна унапред које области имају задатака: збирка се допуњује, па
// би уграђена листа у фронтенду брзо престала да одговара стварности.
router.get("/catalog", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).user;
  const attempts = await practiceAttempts(user.id);
  const settings = await getSettings();

  // Каталог се приказује и кад вежбање није допуштено, али са разлогом —
  // ученик треба да зна зашто, а не да наиђе на празан екран.
  const practice = canPractice(user, settings);

  const best = (level: Level, area: Area) => {
    const matching = attempts.filter((a) => a.level === level && a.area === area);
    if (matching.length === 0) return null;
    return matching.reduce((max, a) => Math.max(max, a.percentage), 0);
  };

  res.json({
    practiceAllowed: practice.ok,
    practiceReason: practice.ok ? null : practice.reason,
    levels: LEVELS.map((level) => ({
      key: level.key,
      label: level.label,
      areas: AREAS.map((area) => {
        const list = practiceQuestions(level.key, area.key);
        return {
          key: area.key,
          label: area.label,
          questionCount: list.length,
          scoredCount: list.filter(isScored).length,
          // Најбољи резултат се чита из покушаја баш те области, а не из
          // „најбољег укупног“ покушаја: области се вежбају одвојено, па
          // најбољи укупни покушај по правилу и не садржи тражену област.
          bestScore: best(level.key, area.key),
          attemptsCount: attempts.filter(
            (a) => a.level === level.key && a.area === area.key,
          ).length,
        };
      }),
    })),
    texts: texts.map((t) => ({
      key: t.key,
      title: t.title,
      author: t.author,
      questionCount: textQuestions(t.key).length,
    })),
  });
});

// ── Задаци за вежбање ─────────────────────────────────────────────────────
router.get("/questions", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).user;
  const settings = await getSettings();

  // Иста провера као при предаји: без ње би контролна грана могла да вежба
  // тако што сама позове ову путању.
  const allowedToPractice = canPractice(user, settings);
  if (!allowedToPractice.ok) {
    res.status(403).json({ message: allowedToPractice.reason });
    return;
  }

  const { level, area, text } = req.query as Record<string, string | undefined>;

  if (text) {
    const list = textQuestions(text);
    if (list.length === 0) {
      res.status(404).json({ message: "Нема задатака уз тражени текст." });
      return;
    }
    res.json(list.map(sanitizeQuestion));
    return;
  }

  if (!isLevel(level) || !isArea(area)) {
    res.status(400).json({ message: "Потребно је изабрати ниво и област." });
    return;
  }

  res.json(practiceQuestions(level, area).map(sanitizeQuestion));
});

/** Текст из другог дела — шаље се одвојено од задатака који га прате. */
router.get("/texts/:key", requireAuth, (req, res) => {
  const found = texts.find((t) => t.key === req.params.key);
  if (!found) {
    res.status(404).json({ message: "Текст није пронађен." });
    return;
  }
  res.json(found);
});

// ── Провера једног одговора ───────────────────────────────────────────────
// Вежбање иде задатак по задатак: ученик одговори, одмах види да ли је тачно и
// зашто, па прелази на следећи. Ова рута зато не уписује покушај — покушај се
// уписује тек кад се област заврши, преко `/attempts`. Да свака провера пише у
// базу, једно вежбање од тридесет задатака било би тридесет покушаја и просек
// на прегледу не би значио ништа.
router.post("/check", requireAuth, (req, res) => {
  const body = req.body as { questionId?: number; answer?: string };
  const question = questionById(Number(body.questionId));

  if (!question) {
    res.status(404).json({ message: "Задатак није пронађен." });
    return;
  }

  const answer = typeof body.answer === "string" ? body.answer : "";

  res.json({
    id: question.id,
    scored: isScored(question),
    // Задаци писаног изражавања немају тачан одговор који се може проверити,
    // па се враћа null — ученик сам процењује уз приказани модел одговора.
    correct: isScored(question) ? scoreAnswer(question, answer) : null,
    reveal: revealQuestion(question),
  });
});

// ── Предаја одговора ──────────────────────────────────────────────────────
router.post("/attempts", requireAuth, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const settings = await getSettings();

    // Скривање дугмета није заштита: контролна грана овде добија 403, ма како
    // до путање дошла.
    const allowedToPractice = canPractice(user, settings);
    if (!allowedToPractice.ok) {
      res.status(403).json({ message: allowedToPractice.reason });
      return;
    }

    const body = req.body as {
      level?: string;
      area?: string;
      textKey?: string;
      answers?: { questionId: number; answer: string; timeSpentMs?: number }[];
      startedAt?: string;
      durationMs?: number;
      clientInfo?: unknown;
    };

    const given = Array.isArray(body.answers) ? body.answers : [];
    if (given.length === 0) {
      res.status(400).json({ message: "Нема предатих одговора." });
      return;
    }

    // Скуп задатака се одређује из захтева само толико што се проверава коме
    // ниво и област стварно припадају — саме вредности се читају из збирке.
    // Да се узимају из тела, ученик би свој резултат уписао у било коју област.
    const first = questionById(given[0]!.questionId);
    if (!first) {
      res.status(400).json({ message: "Непознат задатак." });
      return;
    }

    const relevant =
      first.part === 2 && first.textKey
        ? textQuestions(first.textKey)
        : practiceQuestions(first.level, first.area);

    const allowed = new Set(relevant.map((q) => q.id));
    if (given.some((a) => !allowed.has(a.questionId))) {
      res.status(400).json({ message: "Одговори не припадају истом скупу задатака." });
      return;
    }

    const answerMap = new Map(given.map((a) => [a.questionId, a.answer]));

    const scored = relevant.filter(isScored);
    const score = scored.reduce(
      (acc, q) => acc + (scoreAnswer(q, answerMap.get(q.id) ?? "") ? 1 : 0),
      0,
    );
    const total = scored.length;
    const percentage = percent(score, total);

    const [attempt] = await db
      .insert(quizAttempts)
      .values({
        userId: user.id,
        examKey: null,
        level: first.part === 2 ? null : first.level,
        area: first.part === 2 ? null : first.area,
        score,
        total,
        percentage,
        passed: percentage >= 50,
        answers: given,
        // Фазу уписује сервер из подешавања студије, никад клијент: иначе би
        // ученик свој рад прогласио којом хоће фазом.
        phase: phaseForAttempt(settings, "practice"),
        startedAt: body.startedAt ? new Date(body.startedAt) : null,
        durationMs: typeof body.durationMs === "number" ? Math.round(body.durationMs) : null,
        clientInfo: sanitizeClientInfo(body.clientInfo),
      })
      .returning();

    // Резултат по задатку — оно из чега се после чита шта је заборављено.
    // Уписује се и за незбодоване задатке (`open`), да се зна да су виђени.
    await recordItems(
      attempt!.id,
      user.id,
      relevant.map((q, i) => {
        const answer = answerMap.get(q.id) ?? "";
        return {
          questionId: q.id,
          questionType: q.type,
          level: q.part === 2 ? null : q.level,
          area: q.part === 2 ? null : q.area,
          textKey: q.textKey ?? null,
          answerRaw: answer,
          isCorrect: isScored(q) ? scoreAnswer(q, answer) : false,
          timeSpentMs: given.find((a) => a.questionId === q.id)?.timeSpentMs ?? null,
          position: i + 1,
        };
      }),
    );

    // Тек сада, пошто је одговор уписан, клијент сме да добије тачне одговоре.
    res.json({
      id: attempt!.id,
      score,
      total,
      percentage,
      passed: attempt!.passed,
      createdAt: attempt!.createdAt.toISOString(),
      reveal: relevant.map(revealQuestion),
      results: scored.map((q) => ({
        id: q.id,
        correct: scoreAnswer(q, answerMap.get(q.id) ?? ""),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Greška pri upisu pokušaja");
    res.status(500).json({ message: "Грешка при чувању резултата." });
  }
});

// ── Преглед напретка ──────────────────────────────────────────────────────
router.get("/dashboard", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).user;
  const attempts = await practiceAttempts(user.id);

  const solved = new Set<number>();
  for (const attempt of attempts) {
    for (const a of attempt.answers as { questionId: number }[]) {
      solved.add(a.questionId);
    }
  }

  res.json({
    attemptsCount: attempts.length,
    bestScore: attempts.reduce((max, a) => Math.max(max, a.percentage), 0),
    lastScore: attempts[0]?.percentage ?? null,
    solvedCount: solved.size,
    questionCount: questions.filter((q) => q.part === 1).length,
    levelScores: LEVELS.map((level) => {
      const matching = attempts.filter((a) => a.level === level.key);
      return {
        key: level.key,
        label: level.label,
        attemptsCount: matching.length,
        bestScore:
          matching.length > 0
            ? matching.reduce((max, a) => Math.max(max, a.percentage), 0)
            : null,
      };
    }),
  });
});

router.get("/scoreboard", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).user;
  const { level, area } = req.query as Record<string, string | undefined>;

  const matches = (a: { level: string | null; area: string | null }) =>
    (!level || a.level === level) && (!area || a.area === area);

  const rowFor = (
    u: { username: string; fullName: string },
    list: { percentage: number; level: string | null; area: string | null }[],
  ) => {
    const filtered = list.filter(matches);
    return {
      username: u.username,
      fullName: u.fullName,
      bestScore:
        filtered.length > 0
          ? filtered.reduce((max, a) => Math.max(max, a.percentage), 0)
          : 0,
      attemptsCount: filtered.length,
      lastScore: filtered[0]?.percentage ?? null,
    };
  };

  if (user.role === "student") {
    const attempts = await practiceAttempts(user.id);
    res.json([{ rank: 1, ...rowFor(user, attempts) }]);
    return;
  }

  const allUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.active, true), eq(users.role, "student")));
  const allAttempts = await db
    .select()
    .from(quizAttempts)
    .where(isNull(quizAttempts.examKey))
    .orderBy(desc(quizAttempts.createdAt));

  const rows = allUsers
    .map((u) => rowFor(u, allAttempts.filter((a) => a.userId === u.id)))
    .sort((a, b) => b.bestScore - a.bestScore || a.fullName.localeCompare(b.fullName, "sr"))
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  res.json(rows);
});

export default router;
