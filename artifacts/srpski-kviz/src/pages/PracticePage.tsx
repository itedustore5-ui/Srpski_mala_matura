import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { QuestionView } from "@/components/QuestionView";
import {
  api,
  AREA_LABELS,
  LEVEL_LABELS,
  type AnswerMap,
  type Area,
  type AttemptResult,
  type Level,
  type Question,
  type SelectedText,
} from "@/lib/api";

/**
 * Вежбање једне области (или задатака уз један текст).
 *
 * Задаци се приказују као радни лист, онако како стоје у збирци — сви одједном,
 * са предајом на крају. Прелазак „питање по питање“ је одбачен зато што задаци
 * у збирци често деле исти одломак, па би се текст понављао на сваком екрану.
 */
export default function PracticePage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const level = params.get("level") as Level | null;
  const area = params.get("area") as Area | null;
  const textKey = params.get("text");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [text, setText] = useState<SelectedText | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = textKey
      ? `text=${encodeURIComponent(textKey)}`
      : `level=${level}&area=${area}`;

    setLoading(true);
    setError("");
    setResult(null);
    setAnswers({});

    Promise.all([
      api<Question[]>(`/questions?${query}`),
      textKey ? api<SelectedText>(`/texts/${encodeURIComponent(textKey)}`) : Promise.resolve(null),
    ])
      .then(([list, loadedText]) => {
        setQuestions(list);
        setText(loadedText);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [level, area, textKey]);

  const reveal = useMemo(() => {
    if (!result) return null;
    return new Map(result.reveal.map((r) => [r.id, r]));
  }, [result]);

  const correctById = useMemo(() => {
    if (!result) return null;
    return new Map(result.results.map((r) => [r.id, r.correct]));
  }, [result]);

  const answered = questions.filter((q) => (answers[q.id] ?? "").trim() !== "").length;

  async function submit() {
    setSending(true);
    setError("");
    try {
      const payload = questions
        .filter((q) => (answers[q.id] ?? "").trim() !== "")
        .map((q) => ({ questionId: q.id, answer: answers[q.id]! }));

      if (payload.length === 0) {
        setError("Одговори бар на један задатак пре предаје.");
        return;
      }

      const attempt = await api<AttemptResult>("/attempts", {
        method: "POST",
        body: JSON.stringify({ answers: payload }),
      });
      setResult(attempt);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="py-16 text-center text-muted-foreground">Учитавање…</p>;
  }

  const title = text ? text.title : area ? AREA_LABELS[area] : "Вежбање";
  const subtitle = text
    ? [text.author, "Други део збирке"].filter(Boolean).join(" · ")
    : level
      ? LEVEL_LABELS[level]
      : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <header>
        <button
          type="button"
          onClick={() => navigate("/vezbanje")}
          className="mb-3 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Назад на области
        </button>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
      </header>

      {result ? (
        <div
          className={`rounded-xl border p-5 ${
            result.percentage >= 50
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-amber-500/50 bg-amber-500/10"
          }`}
        >
          <p className="text-lg font-semibold">
            Тачно {result.score} од {result.total} бодованих задатака ({result.percentage}%)
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Испод сваког задатка стоји тачан одговор и објашњење. Задаци писаног
            изражавања се не бодују — уз њих је дат модел прихватљивог одговора.
          </p>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setAnswers({});
              window.scrollTo({ top: 0 });
            }}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Вежбај поново
          </button>
        </div>
      ) : null}

      {text ? (
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-1 text-lg font-semibold">{text.title}</h2>
          {text.author ? (
            <p className="mb-4 text-sm text-muted-foreground">{text.author}</p>
          ) : null}
          <div className="space-y-3 text-[15px] leading-relaxed">
            {text.body.map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
          {text.note ? (
            <p className="mt-4 text-sm italic text-muted-foreground">{text.note}</p>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      {questions.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-5 py-10 text-center text-muted-foreground">
          У овој области још нема унетих задатака.
        </p>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionView
              key={q.id}
              index={q.id}
              question={q}
              answer={answers[q.id] ?? ""}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
              reveal={reveal?.get(q.id)}
              correct={correctById?.get(q.id)}
            />
          ))}
        </div>
      )}

      {questions.length > 0 && !result ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Одговорено: {answered} / {questions.length}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {sending ? "Предајем…" : "Предај одговоре"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
