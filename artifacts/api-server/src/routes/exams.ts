import { Router, type IRouter } from "express";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, quizAttempts } from "@workspace/db";
import { examByKey, examSummaries } from "../data/exams";
import { isScored } from "../data/types";
import { revealQuestion, sanitizeQuestion } from "../lib/scoring";
import { scoreExam, scoreExamAnswer } from "../lib/exam-scoring";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

/** Листа тестова са претходних завршних испита. */
router.get("/exams", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).user;
  const attempts = await db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, user.id), isNotNull(quizAttempts.examKey)),
    )
    .orderBy(desc(quizAttempts.createdAt));

  res.json(
    examSummaries().map((exam) => {
      const mine = attempts.filter((a) => a.examKey === exam.key);
      return {
        ...exam,
        attemptsCount: mine.length,
        bestPoints:
          mine.length > 0
            ? Math.max(...mine.map((a) => Number(a.pointsEarned ?? 0)))
            : null,
      };
    }),
  );
});

router.get("/exams/:key", requireAuth, (req, res) => {
  const exam = examByKey(String(req.params.key));
  if (!exam) {
    res.status(404).json({ message: "Тест није пронађен." });
    return;
  }
  res.json({
    key: exam.key,
    year: exam.year,
    label: exam.label,
    term: exam.term,
    totalPoints: exam.totalPoints,
    durationMinutes: exam.durationMinutes,
    note: exam.note,
    texts: exam.texts,
    questions: exam.questions.map(sanitizeQuestion),
  });
});

router.post("/exams/:key/attempts", requireAuth, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const exam = examByKey(String(req.params.key));
    if (!exam) {
      res.status(404).json({ message: "Тест није пронађен." });
      return;
    }

    const body = req.body as { answers?: { questionId: number; answer: string }[] };
    const given = Array.isArray(body.answers) ? body.answers : [];

    const allowed = new Set(exam.questions.map((q) => q.id));
    if (given.some((a) => !allowed.has(a.questionId))) {
      res.status(400).json({ message: "Одговор не припада овом тесту." });
      return;
    }

    const answerMap = new Map(given.map((a) => [a.questionId, a.answer]));
    const { earned, total } = scoreExam(exam.questions, answerMap);
    const percentage = Math.round((earned / Math.max(total, 1)) * 100);

    const [attempt] = await db
      .insert(quizAttempts)
      .values({
        userId: user.id,
        examKey: exam.key,
        level: null,
        area: null,
        // score/total остају ради постојећих прегледа; мера испита су поени.
        score: Math.round(earned),
        total: Math.round(total),
        percentage,
        passed: percentage >= 50,
        pointsEarned: earned.toFixed(2),
        pointsTotal: total.toFixed(2),
        answers: given,
      })
      .returning();

    res.json({
      id: attempt!.id,
      pointsEarned: earned,
      pointsTotal: total,
      percentage,
      createdAt: attempt!.createdAt.toISOString(),
      reveal: exam.questions.map(revealQuestion),
      results: exam.questions.filter(isScored).map((q) => ({
        id: q.id,
        points: scoreExamAnswer(q, answerMap.get(q.id) ?? ""),
        maxPoints: q.points,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Greška pri upisu ispitnog pokušaja");
    res.status(500).json({ message: "Грешка при чувању резултата." });
  }
});

export default router;
