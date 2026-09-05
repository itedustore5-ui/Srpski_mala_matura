import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, quizAttempts, users } from "@workspace/db";
import { questions, questionById } from "../data/questions";
import { AREAS, LEVELS, isScored, type Area, type Level } from "../data/types";
import { texts } from "../data/texts";
import { revealQuestion, sanitizeQuestion, scoreAnswer } from "../lib/scoring";
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

  const best = (level: Level, area: Area) => {
    const matching = attempts.filter((a) => a.level === level && a.area === area);
    if (matching.length === 0) return null;
    return matching.reduce((max, a) => Math.max(max, a.percentage), 0);
  };

  res.json({
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
router.get("/questions", requireAuth, (req, res) => {
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

// ── Предаја одговора ──────────────────────────────────────────────────────
router.post("/attempts", requireAuth, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const body = req.body as {
      level?: string;
      area?: string;
      textKey?: string;
      answers?: { questionId: number; answer: string }[];
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
      })
      .returning();

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
