import { useMemo } from "react";
import type { Question, Revealed } from "@/lib/api";

/**
 * Приказ једног задатка.
 *
 * Иста компонента ради и док се решава и у прегледу решења; разлика је у томе
 * што у прегледу стиже `reveal`. Клијент нигде не одлучује шта је тачно —
 * `correct` долази са сервера, а `reveal` служи само да се покаже шта је
 * требало одговорити.
 */

type Props = {
  index: number;
  question: Question;
  answer: string;
  onChange: (value: string) => void;
  reveal?: Revealed;
  correct?: boolean;
  earnedPoints?: number;
};

const parse = (answer: string) =>
  answer
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p !== "")
    .map(Number);

const Circle = ({ filled }: { filled: boolean }) => (
  <span
    className={`mt-[3px] inline-block h-4 w-4 shrink-0 rounded-full border-2 ${
      filled ? "border-primary bg-primary" : "border-muted-foreground/60"
    }`}
  />
);

const Box = ({ filled }: { filled: boolean }) => (
  <span
    className={`mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-2 ${
      filled ? "border-primary bg-primary" : "border-muted-foreground/60"
    }`}
  >
    {filled ? <span className="text-[10px] leading-none text-primary-foreground">✓</span> : null}
  </span>
);

export function QuestionView({
  index,
  question,
  answer,
  onChange,
  reveal,
  correct,
  earnedPoints,
}: Props) {
  const locked = reveal !== undefined;
  const selected = useMemo(() => parse(answer), [answer]);

  const statusClass =
    !locked || !question.scored
      ? "border-border"
      : correct
        ? "border-emerald-500/60"
        : "border-rose-500/60";

  return (
    <article className={`rounded-xl border ${statusClass} bg-card p-5 sm:p-6`}>
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{question.question}</p>
          {question.hint ? (
            <p className="mt-1 text-sm text-muted-foreground">{question.hint}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {question.scored
            ? locked && earnedPoints !== undefined
              ? `${earnedPoints}/${question.points}`
              : `${question.points} поен${question.points === 1 ? "" : "а"}`
            : "не бодује се"}
        </span>
      </header>

      {question.image ? (
        <img
          src={`/images/${question.image}`}
          alt="Прилог уз задатак"
          className="mb-4 w-full rounded-lg border border-border bg-white"
        />
      ) : null}

      {question.passage ? (
        <blockquote className="mb-4 whitespace-pre-line rounded-lg border-l-2 border-primary/50 bg-muted/40 px-4 py-3 text-[15px] leading-relaxed">
          {question.passage}
        </blockquote>
      ) : null}

      {question.source ? (
        <p className="mb-4 text-right text-sm italic text-muted-foreground">
          ({question.source})
        </p>
      ) : null}

      <Body
        question={question}
        answer={answer}
        selected={selected}
        onChange={onChange}
        locked={locked}
        reveal={reveal}
      />

      {reveal ? <Reveal question={question} reveal={reveal} /> : null}
    </article>
  );
}

function Body({
  question,
  answer,
  selected,
  onChange,
  locked,
  reveal,
}: {
  question: Question;
  answer: string;
  selected: number[];
  onChange: (v: string) => void;
  locked: boolean;
  reveal?: Revealed;
}) {
  switch (question.type) {
    case "single":
      return (
        <ul className="space-y-2">
          {(question.options ?? []).map((option, i) => {
            const chosen = selected[0] === i;
            const isCorrect = reveal?.correctAnswer === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onChange(String(i))}
                  className={`flex w-full gap-3 rounded-lg border px-3 py-2 text-left text-[15px] leading-relaxed transition ${
                    locked
                      ? isCorrect
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : chosen
                          ? "border-rose-500/60 bg-rose-500/10"
                          : "border-border"
                      : chosen
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                  }`}
                >
                  <Circle filled={chosen} />
                  <span>{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      );

    case "multi":
      return (
        <ul className="space-y-2">
          {(question.options ?? []).map((option, i) => {
            const chosen = selected.includes(i);
            const isCorrect = reveal?.correctAnswers?.includes(i) ?? false;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    const next = chosen
                      ? selected.filter((v) => v !== i)
                      : [...selected, i].sort((a, b) => a - b);
                    onChange(next.join(","));
                  }}
                  className={`flex w-full gap-3 rounded-lg border px-3 py-2 text-left text-[15px] leading-relaxed transition ${
                    locked
                      ? isCorrect
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : chosen
                          ? "border-rose-500/60 bg-rose-500/10"
                          : "border-border"
                      : chosen
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                  }`}
                >
                  <Box filled={chosen} />
                  <span>{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      );

    case "fill": {
      const parts = answer.split("|");
      return (
        <div className="space-y-3">
          {(question.fields ?? []).map((field, i) => (
            <label key={i} className="block">
              <span className="mb-1 block text-sm text-muted-foreground">{field.label}</span>
              <input
                type="text"
                disabled={locked}
                value={parts[i] ?? ""}
                onChange={(e) => {
                  const next = [...parts];
                  while (next.length < (question.fields?.length ?? 0)) next.push("");
                  next[i] = e.target.value;
                  onChange(next.join("|"));
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] outline-none focus:border-primary disabled:opacity-70"
              />
            </label>
          ))}
        </div>
      );
    }

    case "match": {
      const right = question.rightItems ?? [];
      return (
        <div className="space-y-2">
          {(question.leftItems ?? []).map((left, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center"
            >
              <span className="flex-1 whitespace-pre-line text-[15px] leading-relaxed">{left}</span>
              <select
                disabled={locked}
                value={selected[i] === undefined || Number.isNaN(selected[i]) ? "" : String(selected[i])}
                onChange={(e) => {
                  const next = [...selected];
                  while (next.length < (question.leftItems?.length ?? 0)) next.push(-1);
                  next[i] = Number(e.target.value);
                  onChange(next.join(","));
                }}
                className={`rounded-lg border bg-background px-2 py-1.5 text-sm outline-none sm:w-64 ${
                  locked && reveal?.correctPairs
                    ? reveal.correctPairs[i] === selected[i]
                      ? "border-emerald-500/60"
                      : "border-rose-500/60"
                    : "border-border focus:border-primary"
                }`}
              >
                <option value="">— изабери —</option>
                {right.map((option, j) => (
                  <option key={j} value={j}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {question.extraRight ? (
            <p className="text-sm text-muted-foreground">Једна ставка из десне колоне је вишак.</p>
          ) : null}
        </div>
      );
    }

    case "order": {
      const items = question.items ?? [];
      return (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <select
                disabled={locked}
                value={selected[i] === undefined || Number.isNaN(selected[i]) ? "" : String(selected[i])}
                onChange={(e) => {
                  const next = [...selected];
                  while (next.length < items.length) next.push(-1);
                  next[i] = Number(e.target.value);
                  onChange(next.join(","));
                }}
                className={`w-16 rounded-lg border bg-background px-2 py-1.5 text-sm outline-none ${
                  locked && reveal?.correctOrder
                    ? reveal.correctOrder[i] === selected[i]
                      ? "border-emerald-500/60"
                      : "border-rose-500/60"
                    : "border-border focus:border-primary"
                }`}
              >
                <option value="">—</option>
                {items.map((_, j) => (
                  <option key={j} value={j + 1}>
                    {j + 1}
                  </option>
                ))}
              </select>
              <span className="flex-1 whitespace-pre-line text-[15px] leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      );
    }

    case "tf": {
      const values = answer.split(",").map((v) => v.trim().toUpperCase());
      const trueLabel = question.trueLabel ?? "Тачно";
      const falseLabel = question.falseLabel ?? "Нетачно";
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[15px]">
            <thead>
              <tr className="text-sm text-muted-foreground">
                <th className="border border-border px-3 py-2 text-left font-medium">Тврдња</th>
                <th className="w-24 border border-border px-2 py-2 font-medium">{trueLabel}</th>
                <th className="w-24 border border-border px-2 py-2 font-medium">{falseLabel}</th>
              </tr>
            </thead>
            <tbody>
              {(question.statements ?? []).map((statement, i) => {
                const expected = reveal?.correct?.[i];
                return (
                  <tr key={i}>
                    <td className="border border-border px-3 py-2 leading-relaxed">{statement}</td>
                    {(["T", "N"] as const).map((flag) => {
                      const chosen = values[i] === flag;
                      const isCorrect =
                        expected !== undefined && (flag === "T") === expected;
                      return (
                        <td key={flag} className="border border-border px-2 py-2 text-center">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => {
                              const next = [...values];
                              while (next.length < (question.statements?.length ?? 0)) next.push("");
                              next[i] = flag;
                              onChange(next.join(","));
                            }}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                              locked
                                ? isCorrect
                                  ? "border-emerald-500 bg-emerald-500"
                                  : chosen
                                    ? "border-rose-500 bg-rose-500"
                                    : "border-muted-foreground/50"
                                : chosen
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/50 hover:border-primary"
                            }`}
                            aria-label={flag === "T" ? trueLabel : falseLabel}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    case "pick":
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Кликни на део текста да га означиш.
          </p>
          <div className="flex flex-wrap gap-2">
            {(question.tokens ?? []).map((token, i) => {
              const chosen = selected.includes(i);
              const isCorrect = reveal?.correctTokens?.includes(i) ?? false;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    const next = chosen
                      ? selected.filter((v) => v !== i)
                      : [...selected, i].sort((a, b) => a - b);
                    onChange(next.join(","));
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-[15px] leading-relaxed transition ${
                    locked
                      ? isCorrect
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : chosen
                          ? "border-rose-500/60 bg-rose-500/10"
                          : "border-border"
                      : chosen
                        ? "border-primary bg-primary/10 underline decoration-primary decoration-2 underline-offset-4"
                        : "border-border hover:border-primary/50"
                  }`}
                >
                  {token}
                </button>
              );
            })}
          </div>
        </div>
      );

    case "open":
      return (
        <textarea
          disabled={locked}
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          rows={question.lines ?? 5}
          placeholder="Овде напиши свој одговор."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] leading-relaxed outline-none focus:border-primary disabled:opacity-70"
        />
      );

    default:
      return null;
  }
}

function Reveal({ question, reveal }: { question: Question; reveal: Revealed }) {
  return (
    <div className="mt-4 space-y-3 rounded-lg bg-muted/40 px-4 py-3 text-[15px] leading-relaxed">
      {question.type === "fill" && reveal.correctFields ? (
        <div>
          <p className="mb-1 text-sm font-medium text-muted-foreground">Тачан одговор</p>
          <ul className="list-inside list-disc">
            {reveal.correctFields.map((variants, i) => (
              <li key={i}>
                {question.fields?.[i]?.label
                  ? `${question.fields[i]!.label} `
                  : ""}
                {variants.join(" / ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {question.type === "open" ? (
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-sm font-medium text-emerald-400">Прихватљив одговор</p>
            <p className="whitespace-pre-line">{reveal.acceptable}</p>
          </div>
          {reveal.unacceptable ? (
            <div>
              <p className="mb-1 text-sm font-medium text-rose-400">Неприхватљив одговор</p>
              <p className="whitespace-pre-line">{reveal.unacceptable}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="mb-1 text-sm font-medium text-muted-foreground">Објашњење</p>
        <p className="whitespace-pre-line">{reveal.explanation}</p>
      </div>

      {reveal.standard ? (
        <p className="text-sm text-muted-foreground">Образовни стандард: {reveal.standard}</p>
      ) : null}
    </div>
  );
}
