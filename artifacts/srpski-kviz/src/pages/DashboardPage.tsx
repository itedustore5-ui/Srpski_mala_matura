import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, type AuthUser, type DashboardStats } from "@/lib/api";

/**
 * Почетна страна.
 *
 * Збирка има два дела и екран их тако и приказује: два квадрата, ништа између.
 * Раније је овде стајао и преглед по нивоима са бројевима, па се пре него што
 * се уђе у задатке читало пола екрана — а ученик долази да ради, не да гледа
 * статистику. Резултати остају, али у једном реду.
 */
export default function DashboardPage({ user }: { user: AuthUser }) {
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardStats>("/dashboard")
      .then(setStats)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Здраво, {user.fullName}.</h1>
        <p className="mt-1 text-muted-foreground">
          Припрема за завршни испит из српског језика и књижевности.
        </p>
        {stats ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Урађено {stats.solvedCount} од {stats.questionCount} задатака
            {stats.bestScore > 0 ? ` · најбољи резултат ${stats.bestScore}%` : ""}
          </p>
        ) : null}
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <PartTile
          number="I"
          title="Први део"
          note="Три нивоа, у сваком четири области"
          onClick={() => navigate("/vezbanje")}
        />
        <PartTile
          number="II"
          title="Други део"
          note="Одабрани текстови и задаци уз њих"
          onClick={() => navigate("/vezbanje/tekstovi")}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => navigate("/testovi")}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:border-primary/60"
        >
          Цео тест — испити из претходних година
        </button>
      </div>
    </div>
  );
}

/** Квадрат: велика мета за прст, исто на телефону и на рачунару. */
function PartTile({
  number,
  title,
  note,
  onClick,
}: {
  number: string;
  title: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-square flex-col items-start justify-between rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary/60"
    >
      <span className="text-4xl font-semibold text-primary">{number}</span>
      <span>
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{note}</span>
      </span>
    </button>
  );
}
