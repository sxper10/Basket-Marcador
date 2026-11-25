import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Check, Plus, Star, Trash2, UserRoundPlus, X } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  MAX_ROSTER,
  SHOT_LABEL,
  byPeriod,
  formatClock,
  lastPeriodShown,
  periodLabel,
  periodShort,
  reachedPeriod,
  uid,
  type ActionInput,
  type Game,
  type GameEvent,
  type Line,
  type Stats,
} from "@/lib/game";

/* ---------- tabla de estadísticas ---------- */

export const STAT_COLS =
  "grid grid-cols-[minmax(0,1fr)_repeat(3,2.25rem)_3rem] items-center sm:grid-cols-[minmax(0,1fr)_repeat(3,3rem)_3.75rem]";

export function StatsHeader() {
  return (
    <div className={cn(STAT_COLS, "px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-haze uppercase")}>
      <span>Jugador</span>
      <abbr title="Tiros libres" className="text-center no-underline">
        TL
      </abbr>
      <abbr title="Tiros de 2" className="text-center no-underline">
        T2
      </abbr>
      <abbr title="Triples" className="text-center no-underline">
        T3
      </abbr>
      <abbr title="Puntos" className="text-right no-underline">
        Pts
      </abbr>
    </div>
  );
}

export function StatCells({ line, top }: { line: Line; top?: boolean }) {
  const cell = (value: number) => (
    <span className={cn("text-center text-sm tabular-nums", value ? "text-ink" : "text-haze/60")}>{value}</span>
  );
  return (
    <>
      {cell(line.ft)}
      {cell(line.two)}
      {cell(line.three)}
      <span
        className={cn(
          "text-right font-display text-2xl leading-none font-semibold tabular-nums",
          line.pts === 0 ? "text-haze/60" : top ? "text-gold" : "text-ink"
        )}
      >
        {line.pts}
      </span>
    </>
  );
}

export function StatsLegend() {
  return <p className="px-3 text-xs text-haze">TL tiros libres · T2 tiros de 2 · T3 triples</p>;
}

export function StatsTotals({ stats }: { stats: Stats }) {
  return (
    <div className="mt-2 border-t border-white/[0.06] pt-2">
      {stats.unassigned.pts > 0 && (
        <div className={cn(STAT_COLS, "px-3 py-2")}>
          <span className="text-sm text-mist">Sin asignar</span>
          <StatCells line={stats.unassigned} />
        </div>
      )}
      <div className={cn(STAT_COLS, "px-3 py-2")}>
        <span className="eyebrow text-mist">Total equipo</span>
        <StatCells line={stats.total} />
      </div>
    </div>
  );
}

/* ---------- plantilla ---------- */

export function RosterPanel({
  game,
  stats,
  act,
  onPlayer,
}: {
  game: Game;
  stats: Stats;
  act: (action: ActionInput) => void;
  onPlayer: (playerId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const full = game.roster.length >= MAX_ROSTER;

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || full) return;
    act({ type: "addPlayer", id: uid(), name });
    setName("");
  };

  return (
    <section className="panel p-4 sm:p-7" aria-labelledby="plantilla-titulo">
      <header className="flex items-start justify-between gap-4 px-1 sm:px-0">
        <div className="min-w-0">
          <p className="eyebrow text-aqua">{game.homeName}</p>
          <h2 id="plantilla-titulo" className="mt-1 text-2xl font-semibold tracking-tight">
            Plantilla
          </h2>
          <p className="mt-1 text-sm text-mist">
            {editing
              ? "Añade jugadores o quita a quien no juegue hoy."
              : "Toca un jugador para anotarle una canasta o corregirla."}
          </p>
        </div>
        <button
          type="button"
          className={cn("btn-pill h-10 shrink-0 px-4", editing ? "btn-electric" : "btn-ghost")}
          aria-pressed={editing}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <Check className="size-4" /> : <UserRoundPlus className="size-4" />}
          {editing ? "Listo" : "Editar"}
        </button>
      </header>

      <div className="mt-5">
        {editing ? (
          <>
            <ul className="grid gap-1 sm:grid-cols-2 sm:gap-x-4">
              {stats.lines.map((line) => (
                <li
                  key={line.player.id}
                  className="flex items-center justify-between gap-3 rounded-2xl py-1 pr-1 pl-3 transition duration-200 hover:bg-white/[0.04]"
                >
                  <span className="truncate font-medium text-ink">{line.player.name}</span>
                  <button
                    type="button"
                    className="btn-round size-9 hover:bg-coral/15 hover:text-coral"
                    disabled={line.pts > 0}
                    title={line.pts > 0 ? "Tiene canastas en este partido" : undefined}
                    aria-label={
                      line.pts > 0
                        ? `${line.player.name} tiene canastas en este partido y no se puede quitar`
                        : `Quitar a ${line.player.name} de la plantilla`
                    }
                    onClick={() => act({ type: "removePlayer", id: line.player.id })}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={add} className="mt-4 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={18}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
                disabled={full}
                placeholder={full ? "Plantilla completa" : "Nombre del jugador"}
                aria-label="Nombre del nuevo jugador"
                className="field"
              />
              <button type="submit" className="btn-pill btn-electric h-12 shrink-0" disabled={!name.trim() || full}>
                <Plus className="size-4" />
                Añadir
              </button>
            </form>
          </>
        ) : (
          <>
            <StatsHeader />
            <ul>
              {stats.lines.map((line) => {
                const top = line.pts > 0 && line.pts === stats.best;
                return (
                  <li key={line.player.id}>
                    <button
                      type="button"
                      onClick={() => onPlayer(line.player.id)}
                      aria-label={`${line.player.name}: ${line.pts} puntos, ${line.ft} tiros libres, ${line.two} tiros de 2 y ${line.three} triples. Anotar o corregir.`}
                      className={cn(
                        STAT_COLS,
                        "group w-full rounded-2xl px-3 py-2 text-left transition duration-200 ease-soft hover:bg-white/[0.05]"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-electric/[0.16] text-aqua ring-1 ring-aqua/20 transition duration-200 ease-soft group-hover:bg-electric group-hover:text-white group-hover:ring-transparent">
                          <Plus className="size-4" />
                        </span>
                        <span className="truncate font-medium text-ink">{line.player.name}</span>
                        {top && <Star className="size-3.5 shrink-0 fill-gold text-gold" aria-hidden="true" />}
                      </span>
                      <StatCells line={line} top={top} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <StatsTotals stats={stats} />
            <div className="mt-3">
              <StatsLegend />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------- parciales ---------- */

export function PartialsTable({ game, highlightCurrent }: { game: Game; highlightCurrent?: boolean }) {
  const periods = Array.from({ length: lastPeriodShown(game) + 1 }, (_, i) => i);
  const reached = reachedPeriod(game);
  const total = (list: number[]) => list.reduce((a, b) => a + b, 0);

  const groups = [
    {
      title: "Puntos",
      big: true,
      home: byPeriod(game.events, "home", "score"),
      away: byPeriod(game.events, "away", "score"),
    },
    {
      title: "Faltas",
      big: false,
      home: byPeriod(game.events, "home", "foul"),
      away: byPeriod(game.events, "away", "foul"),
    },
  ];

  const row = (label: ReactNode, values: number[], big: boolean, home: boolean) => (
    <tr>
      <th scope="row" className="max-w-0 py-1.5 pr-2 text-left font-medium">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", home ? "bg-aqua" : "bg-white/40")}
          />
          <span className="truncate text-ink">{label}</span>
        </span>
      </th>
      {periods.map((i) => (
        <td
          key={i}
          className={cn("w-9 py-1.5 text-center tabular-nums sm:w-11", i <= reached ? "text-ink" : "text-haze/60")}
        >
          {i <= reached ? values[i] : "–"}
        </td>
      ))}
      <td
        className={cn(
          "w-12 py-1.5 text-right tabular-nums sm:w-14",
          big ? "font-display text-2xl leading-none font-semibold text-ink" : "font-semibold text-ink"
        )}
      >
        {total(values)}
      </td>
    </tr>
  );

  return (
    <div className="scroll-soft overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-[11px] font-semibold tracking-[0.14em] uppercase">
            <th scope="col" className="pb-1 text-left font-semibold text-haze">
              <span className="sr-only">Equipo</span>
            </th>
            {periods.map((i) => (
              <th
                key={i}
                scope="col"
                title={periodLabel(i)}
                className={cn(
                  "pb-1 text-center font-semibold",
                  highlightCurrent && i === game.period ? "text-gold" : "text-haze"
                )}
              >
                {periodShort(i)}
              </th>
            ))}
            <th scope="col" className="pb-1 text-right font-semibold text-haze">
              Total
            </th>
          </tr>
        </thead>
        {groups.map((group, index) => (
          <tbody key={group.title}>
            <tr>
              <th
                scope="rowgroup"
                colSpan={periods.length + 2}
                className={cn("eyebrow pb-1 text-left text-haze", index === 0 ? "pt-2" : "pt-4")}
              >
                {group.title}
              </th>
            </tr>
            {row(
              <>
                <span className="sm:hidden">Turina</span>
                <span className="hidden sm:inline">{game.homeName}</span>
              </>,
              group.home,
              group.big,
              true
            )}
            {row(game.awayName, group.away, group.big, false)}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export function PartialsPanel({ game }: { game: Game }) {
  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="parciales-titulo">
      <p className="eyebrow text-aqua">Tiempo a tiempo</p>
      <h2 id="parciales-titulo" className="mt-1 text-2xl font-semibold tracking-tight">
        Parciales
      </h2>
      <div className="mt-4">
        <PartialsTable game={game} highlightCurrent />
      </div>
    </section>
  );
}

/* ---------- jugadas ---------- */

export function eventTitle(game: Game, ev: GameEvent): string {
  if (ev.kind === "foul") return `Falta · ${ev.team === "home" ? game.homeName : game.awayName}`;
  if (ev.team === "away") return `${game.awayName} · ${ev.points === 1 ? "1 punto" : `${ev.points} puntos`}`;
  const player = game.roster.find((p) => p.id === ev.playerId)?.name ?? "Sin asignar";
  return `${player} · ${SHOT_LABEL[ev.points] ?? `+${ev.points}`}`;
}

export function EventList({
  game,
  filter,
  onRemove,
  empty,
  className,
}: {
  game: Game;
  filter?: (ev: GameEvent) => boolean;
  onRemove: (id: string) => void;
  empty: string;
  className?: string;
}) {
  const rows = useMemo(() => {
    let home = 0;
    let away = 0;
    const out = game.events.map((ev) => {
      if (ev.kind === "score") {
        if (ev.team === "home") home += ev.points;
        else away += ev.points;
      }
      return { ev, home, away };
    });
    return out.reverse();
  }, [game.events]);

  const visible = filter ? rows.filter((r) => filter(r.ev)) : rows;

  if (visible.length === 0) {
    return <p className="rounded-[1.5rem] bg-white/[0.03] px-5 py-6 text-center text-sm text-mist">{empty}</p>;
  }

  return (
    <ul className={cn("scroll-soft space-y-0.5 overflow-y-auto", className)}>
      {visible.map(({ ev, home, away }) => {
        const title = eventTitle(game, ev);
        return (
          <li
            key={ev.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl py-1.5 pr-1 pl-2 transition duration-200 hover:bg-white/[0.04]",
              Date.now() - ev.at < 1500 && "animate-rise"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg leading-none font-semibold ring-1",
                ev.kind === "foul"
                  ? "bg-gold/10 text-gold ring-gold/25"
                  : ev.team === "home"
                    ? "bg-electric/[0.16] text-aqua ring-aqua/20"
                    : "bg-white/[0.07] text-ink ring-white/10"
              )}
            >
              {ev.kind === "foul" ? "F" : `+${ev.points}`}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{title}</span>
              <span className="block text-xs text-haze tabular-nums">
                {periodShort(ev.period)} · {formatClock(ev.clock)}
                {ev.kind === "score" && ` · ${home}–${away}`}
              </span>
            </span>
            <button
              type="button"
              className="btn-round size-9 bg-transparent ring-0 hover:bg-coral/15 hover:text-coral"
              onClick={() => onRemove(ev.id)}
              aria-label={`Quitar jugada: ${title}`}
              title="Quitar jugada"
            >
              <X className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function FeedPanel({ game, act }: { game: Game; act: (action: ActionInput) => void }) {
  const count = game.events.length;
  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="jugadas-titulo">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-aqua">Registro del partido</p>
          <h2 id="jugadas-titulo" className="mt-1 text-2xl font-semibold tracking-tight">
            Jugadas
          </h2>
        </div>
        {count > 0 && (
          <p className="pb-1 text-xs text-haze tabular-nums">
            {count} {count === 1 ? "jugada" : "jugadas"}
          </p>
        )}
      </div>
      <div className="mt-4 -mx-2">
        <EventList
          game={game}
          onRemove={(id) => act({ type: "removeEvent", id })}
          empty="Aquí aparecerá cada canasta y cada falta, por si hay que quitar alguna."
          className="max-h-[23rem]"
        />
      </div>
    </section>
  );
}
