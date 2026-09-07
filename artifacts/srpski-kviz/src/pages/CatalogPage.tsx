import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, AREA_SHORT, type Catalog } from "@/lib/api";

/** Први део збирке: три нивоа, у сваком четири области. Испод, други део. */
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
    <div className="space-y-10">
      <header>
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

      <section>
        <h2 className="mb-1 text-lg font-semibold">Други део — одабрани текстови</h2>
        <p className="mb-3 text-muted-foreground">
          Уз сваки текст иде низ задатака из различитих области и нивоа.
        </p>
        {catalog.texts.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-5 py-8 text-center text-muted-foreground">
            Текстови другог дела још нису унети.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.texts.map((text) => (
              <button
                key={text.key}
                type="button"
                onClick={() => navigate(`/vezbanje/tekst?text=${encodeURIComponent(text.key)}`)}
                className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60"
              >
                <p className="font-medium">{text.title}</p>
                {text.author ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{text.author}</p>
                ) : null}
                <p className="mt-3 text-sm text-muted-foreground">
                  {text.questionCount} задатака
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
