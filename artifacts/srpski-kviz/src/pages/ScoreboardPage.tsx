import { useEffect, useState } from "react";
import {
  api,
  AREA_SHORT,
  LEVEL_LABELS,
  type Area,
  type Level,
  type ScoreboardEntry,
} from "@/lib/api";

const LEVELS: Level[] = ["osnovni", "srednji", "napredni"];
const AREAS: Area[] = ["citanje", "pisanje", "gramatika", "knjizevnost"];

export default function ScoreboardPage() {
  const [level, setLevel] = useState<Level | "">("");
  const [area, setArea] = useState<Area | "">("");
  const [rows, setRows] = useState<ScoreboardEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (area) params.set("area", area);
    const query = params.toString();

    api<ScoreboardEntry[]>(`/scoreboard${query ? `?${query}` : ""}`)
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, [level, area]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Ранг-листа</h1>
        <p className="mt-1 text-muted-foreground">
          Приказује се само вежбање. Тестови са завршних испита имају другачије
          бодовање, па се не мешају у исти просек.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as Level | "")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Сви нивои</option>
          {LEVELS.map((key) => (
            <option key={key} value={key}>
              {LEVEL_LABELS[key]}
            </option>
          ))}
        </select>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as Area | "")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Све области</option>
          {AREAS.map((key) => (
            <option key={key} value={key}>
              {AREA_SHORT[key]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Ученик</th>
              <th className="px-4 py-3 text-right font-medium">Најбоље</th>
              <th className="px-4 py-3 text-right font-medium">Покушаја</th>
              <th className="px-4 py-3 text-right font-medium">Последње</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.username} className="border-t border-border">
                <td className="px-4 py-3">{row.rank}</td>
                <td className="px-4 py-3">{row.fullName}</td>
                <td className="px-4 py-3 text-right font-semibold">{row.bestScore}%</td>
                <td className="px-4 py-3 text-right">{row.attemptsCount}</td>
                <td className="px-4 py-3 text-right">
                  {row.lastScore === null ? "—" : `${row.lastScore}%`}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Нема резултата за изабрани филтер.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
