import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api, type AuthUser, type DashboardStats } from "@/lib/api";

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
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Здраво, {user.fullName}.</h1>
        <p className="mt-1 text-muted-foreground">
          Припрема за завршни испит из српског језика и књижевности.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3">{error}</p>
      ) : null}

      {stats ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat title="Урађених задатака" value={`${stats.solvedCount} / ${stats.questionCount}`} />
            <Stat title="Најбољи резултат" value={`${stats.bestScore}%`} />
            <Stat
              title="Последњи резултат"
              value={stats.lastScore === null ? "—" : `${stats.lastScore}%`}
            />
          </div>

          <section>
            <h2 className="mb-3 text-lg font-semibold">По нивоима</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.levelScores.map((level) => (
                <div key={level.key} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-medium">{level.label}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {level.bestScore === null ? "—" : `${level.bestScore}%`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {level.attemptsCount} покушаја
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate("/vezbanje")}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Вежбај по областима
        </button>
        <button
          type="button"
          onClick={() => navigate("/testovi")}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:border-primary/60"
        >
          Тестови из претходних година
        </button>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
