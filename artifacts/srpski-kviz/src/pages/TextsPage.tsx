import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, type Catalog } from "@/lib/api";

/**
 * Други део збирке: одабрани текстови, а уз сваки низ задатака.
 *
 * Раније је стајао на дну странице са нивоима, испод дванаест поља — ко дође
 * дотле већ је прошао цео први део. Сад је свој екран, до кога се долази са
 * почетне.
 */
export default function TextsPage() {
  const [, navigate] = useLocation();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Catalog>("/catalog")
      .then(setCatalog)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <p className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3">{error}</p>;
  }
  if (!catalog) {
    return <p className="py-16 text-center text-muted-foreground">Учитавање…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Почетна
        </button>
        <h1 className="text-2xl font-semibold">Други део — одабрани текстови</h1>
        <p className="mt-1 text-muted-foreground">
          Уз сваки текст иде низ задатака из различитих области и нивоа.
        </p>
      </header>

      {!catalog.practiceAllowed ? (
        <p className="rounded-xl border border-border bg-card px-5 py-4 text-[15px] leading-relaxed">
          {catalog.practiceReason}
        </p>
      ) : null}

      {catalog.texts.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-5 py-8 text-center text-muted-foreground">
          Текстови другог дела још нису унети.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {catalog.texts.map((text) => {
            const disabled = !catalog.practiceAllowed;
            return (
              <button
                key={text.key}
                type="button"
                disabled={disabled}
                onClick={() => navigate(`/vezbanje/tekst?text=${encodeURIComponent(text.key)}`)}
                className={`rounded-xl border p-4 text-left transition ${
                  disabled
                    ? "cursor-not-allowed border-border/50 opacity-50"
                    : "border-border bg-card hover:border-primary/60"
                }`}
              >
                <p className="font-medium">{text.title}</p>
                {text.author ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{text.author}</p>
                ) : null}
                <p className="mt-3 text-sm text-muted-foreground">{text.questionCount} задатака</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
