import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, AREA_SHORT, type Catalog } from "@/lib/api";

/**
 * Први део збирке: три нивоа, у сваком четири области.
 *
 * Други део је свој екран (`TextsPage`). Док су стајали заједно, текстови су
 * били испод дванаест поља — на дну странице до кога се ретко стизало.
 */
export default function CatalogPage() {
  const [, navigate] = useLocation();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Catalog>("/catalog")
      .then(setCatalog)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3">{error}</p>
    );
  }
  if (!catalog) {
    return <p className="py-16 text-center text-muted-foreground">Учитавање…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Почетна
        </button>
        <h1 className="text-2xl font-semibold">Први део — задаци по нивоима</h1>
        <p className="mt-1 text-muted-foreground">
          Задаци су, као и у збирци, распоређени на основни, средњи и напредни
          ниво, а у сваком нивоу на четири области.
        </p>
      </header>

      {/*
        Вежбање је интервенција у студији; контролна грана га не добија. Уместо
        да екран остане празан или да дугмад ништа не раде, ученик добија разлог
        — саму заштиту носи сервер, не ово што се овде приказује.
      */}
      {!catalog.practiceAllowed ? (
        <p className="rounded-xl border border-border bg-card px-5 py-4 text-[15px] leading-relaxed">
          {catalog.practiceReason}
        </p>
      ) : null}

      {catalog.levels.map((level) => (
        <section key={level.key}>
          <h2 className="mb-3 text-lg font-semibold">{level.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {level.areas.map((area) => {
              const empty = area.questionCount === 0 || !catalog.practiceAllowed;
              return (
                <button
                  key={area.key}
                  type="button"
                  disabled={empty}
                  onClick={() => navigate(`/vezbanje/oblast?level=${level.key}&area=${area.key}`)}
                  className={`rounded-xl border p-4 text-left transition ${
                    empty
                      ? "cursor-not-allowed border-border/50 opacity-50"
                      : "border-border bg-card hover:border-primary/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{AREA_SHORT[area.key]}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{area.label}</p>
                    </div>
                    {area.bestScore !== null ? (
                      <span className="shrink-0 rounded-md bg-primary/15 px-2 py-1 text-sm font-semibold text-primary">
                        {area.bestScore}%
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {empty
                      ? "још нема задатака"
                      : `${area.questionCount} задатака · ${area.attemptsCount} покушаја`}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={() => navigate("/vezbanje/tekstovi")}
        className="w-full rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60"
      >
        <p className="font-medium">Други део — одабрани текстови →</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {catalog.texts.length} текстова, уз сваки низ задатака
        </p>
      </button>
    </div>
  );
}
