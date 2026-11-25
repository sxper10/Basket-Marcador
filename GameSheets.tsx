import { useState, type FormEvent } from "react";
import { Check, History as HistoryIcon, Minus, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  SHOTS,
  periodLabel,
  scoreOf,
  type Game,
  type GameEvent,
  type MatchStatus,
  type Player,
  type PlayerLine,
  type SavedMatch,
  type Stats,
} from "@/lib/game";
import { Sheet } from "./Sheet";
import { EventList } from "./Panels";

/* ---------- ¿quién ha anotado? ---------- */

export function PickPlayerSheet({
  homeName,
  points,
  onPoints,
  stats,
  onPick,
  onClose,
}: {
  homeName: string;
  points: number;
  onPoints: (points: number) => void;
  stats: Stats;
  onPick: (playerId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Sheet eyebrow={`Canasta de ${homeName}`} title="¿Quién ha anotado?" onClose={onClose}>
      <div
        role="group"
        aria-label="Tipo de anotación"
        className="grid grid-cols-3 gap-1 rounded-full bg-navy-950/60 p-1 ring-1 ring-white/[0.06]"
      >
        {SHOTS.map((shot) => {
          const active = shot.points === points;
          return (
            <button
              key={shot.points}
              type="button"
              aria-pressed={active}
              onClick={() => onPoints(shot.points)}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition duration-300 ease-soft",
                active
                  ? "bg-electric text-white shadow-[0_10px_24px_-10px_rgba(47,107,255,0.95)]"
                  : "text-mist hover:bg-white/[0.06] hover:text-ink"
              )}
            >
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-display text-lg leading-none">+{shot.points}</span>
                {shot.label}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.lines.map((line) => (
          <li key={line.player.id}>
            <button
              type="button"
              onClick={() => onPick(line.player.id)}
              className="group flex h-14 w-full items-center justify-between gap-2 rounded-[1.4rem] bg-white/[0.04] px-4 text-left ring-1 ring-white/[0.07] transition duration-200 ease-soft hover:bg-electric/25 hover:ring-aqua/45 active:scale-[0.96]"
            >
              <span className="truncate font-semibold text-ink">{line.player.name}</span>
              {line.pts > 0 && (
                <span className="shrink-0 text-xs text-haze tabular-nums transition duration-200 group-hover:text-aqua">
                  {line.pts} pts
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => onPick(null)} className="btn-pill btn-ghost mt-4 h-12 w-full">
        Sumar sin asignar jugador
      </button>
    </Sheet>
  );
}

/* ---------- ficha de un jugador: sumar y corregir ---------- */

export function PlayerSheet({
  player,
  line,
  onAdd,
  onRemove,
  onClose,
}: {
  player: Player;
  line: PlayerLine;
  onAdd: (points: number) => void;
  onRemove: (points: number) => void;
  onClose: () => void;
}) {
  const counts: Record<number, number> = { 1: line.ft, 2: line.two, 3: line.three };

  return (
    <Sheet
      eyebrow="Jugador"
      title={player.name}
      onClose={onClose}
      footer={
        <button type="button" className="btn-pill btn-electric h-12 w-full" onClick={onClose}>
          Listo
        </button>
      }
    >
      <div className="flex items-center justify-between rounded-[1.75rem] bg-navy-950/55 px-5 py-4 ring-1 ring-white/[0.06]">
        <p className="text-sm text-mist">Puntos en este partido</p>
        <p className="font-display text-5xl leading-none font-semibold text-ink tabular-nums">
          <span key={line.pts} className="inline-block animate-pop">
            {line.pts}
          </span>
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {SHOTS.map((shot) => {
          const count = counts[shot.points];
          const what = shot.label.toLowerCase();
          return (
            <li
              key={shot.points}
              className="flex items-center justify-between gap-3 rounded-[1.6rem] bg-white/[0.035] py-2.5 pr-2.5 pl-5 ring-1 ring-white/[0.06]"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{shot.label}</p>
                <p className="text-xs text-haze">
                  +{shot.points} {shot.points === 1 ? "punto" : "puntos"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="btn-round"
                  disabled={count === 0}
                  onClick={() => onRemove(shot.points)}
                  aria-label={`Quitar un ${what} a ${player.name}`}
                >
                  <Minus className="size-4" />
                </button>
                <span
                  className="w-10 text-center font-display text-3xl leading-none font-semibold text-ink tabular-nums"
                  aria-label={`${count} anotados`}
                >
                  {count}
                </span>
                <button
                  type="button"
                  className="btn-round bg-electric/20 text-aqua ring-aqua/30 hover:bg-electric hover:text-white"
                  onClick={() => onAdd(shot.points)}
                  aria-label={`Sumar un ${what} a ${player.name}`}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/* ---------- corregir canastas del equipo local ---------- */

export function FixSheet({
  game,
  onRemove,
  onClose,
}: {
  game: Game;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const isHomeBasket = (ev: GameEvent) => ev.kind === "score" && ev.team === "home";
  return (
    <Sheet eyebrow={game.homeName} title="Corregir canastas" onClose={onClose}>
      <p className="text-sm text-mist">
        Quita la canasta equivocada: se resta del marcador y de las estadísticas del jugador.
      </p>
      <div className="mt-4 -mx-2">
        <EventList
          game={game}
          filter={isHomeBasket}
          onRemove={onRemove}
          empty="No queda ninguna canasta que corregir."
        />
      </div>
    </Sheet>
  );
}

/* ---------- guardar partido ---------- */

const STATUS_OPTIONS: { value: MatchStatus; title: string; text: string }[] = [
  { value: "live", title: "En curso", text: "Podrás reabrirlo y seguir más tarde." },
  { value: "final", title: "Finalizado", text: "Se detiene el reloj y queda el resultado final." },
];

export function SaveSheet({
  game,
  existing,
  preferFinal,
  onSave,
  onNewGame,
  onHistory,
  onClose,
}: {
  game: Game;
  existing: SavedMatch | undefined;
  preferFinal: boolean;
  onSave: (status: MatchStatus, rival: string) => void;
  onNewGame: () => void;
  onHistory: () => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<MatchStatus>(preferFinal ? "final" : (existing?.status ?? "live"));
  const [rival, setRival] = useState(game.awayName);
  const [done, setDone] = useState(false);
  const home = scoreOf(game.events, "home");
  const away = scoreOf(game.events, "away");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(status, rival);
    setDone(true);
  };

  if (done) {
    return (
      <Sheet eyebrow="Historial" title="Partido guardado" onClose={onClose}>
        <div className="flex flex-col items-center py-2 text-center">
          <span className="flex size-16 animate-pop items-center justify-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/30">
            <Check className="size-7" strokeWidth={2.5} />
          </span>
          <p className="mt-4 font-display text-5xl leading-none font-semibold text-ink tabular-nums">
            {home}
            <span className="mx-2 font-medium text-haze">–</span>
            {away}
          </p>
          <p className="mt-2 text-sm text-mist">
            {game.homeName} vs {game.awayName} · {status === "final" ? "Finalizado" : "En curso"}
          </p>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn-pill btn-ghost h-12" onClick={onHistory}>
            <HistoryIcon className="size-4" />
            Ver historial
          </button>
          {status === "final" ? (
            <button type="button" className="btn-pill btn-electric h-12" onClick={onNewGame}>
              <Plus className="size-4" />
              Partido nuevo
            </button>
          ) : (
            <button type="button" className="btn-pill btn-electric h-12" onClick={onClose}>
              Seguir jugando
            </button>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet eyebrow="Historial" title="Guardar partido" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="flex items-center justify-between gap-4 rounded-[1.75rem] bg-navy-950/55 px-5 py-4 ring-1 ring-white/[0.06]">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{game.homeName}</p>
            <p className="truncate text-sm text-mist">
              vs {rival.trim() || "Visitante"} · {periodLabel(game.period)}
            </p>
          </div>
          <p className="shrink-0 font-display text-5xl leading-none font-semibold text-ink tabular-nums">
            {home}
            <span className="mx-1.5 font-medium text-haze">–</span>
            {away}
          </p>
        </div>

        <label className="mt-5 block">
          <span className="eyebrow px-1 text-haze">Rival</span>
          <input
            value={rival}
            onChange={(e) => setRival(e.target.value)}
            maxLength={26}
            autoComplete="off"
            spellCheck={false}
            placeholder="Nombre del equipo rival"
            className="field mt-2"
          />
        </label>

        <fieldset className="mt-5">
          <legend className="eyebrow px-1 text-haze">Estado del partido</legend>
          <div role="radiogroup" aria-label="Estado del partido" className="mt-2 grid gap-2 sm:grid-cols-2">
            {STATUS_OPTIONS.map((option) => {
              const active = option.value === status;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStatus(option.value)}
                  className={cn(
                    "rounded-[1.5rem] px-4 py-3.5 text-left ring-1 transition duration-200 ease-soft",
                    active
                      ? "bg-electric/20 ring-2 ring-aqua/60"
                      : "bg-white/[0.035] ring-white/[0.07] hover:bg-white/[0.07]"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{option.title}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full ring-1 transition duration-200",
                        active ? "bg-aqua text-navy-950 ring-aqua" : "ring-white/25"
                      )}
                    >
                      {active && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-mist">{option.text}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="mt-4 px-1 text-xs text-haze">
          Se guardan la fecha, el rival, el resultado, los parciales por tiempo, las faltas y las estadísticas de
          cada jugador{existing ? ". Este partido ya está en el historial: se actualizará." : "."}
        </p>

        <div className="mt-5 grid grid-cols-[auto_1fr] gap-2">
          <button type="button" className="btn-pill btn-ghost h-12" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-pill btn-gold h-12">
            Guardar partido
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------- partido nuevo ---------- */

export function NewGameSheet({
  dirty,
  onSaveFirst,
  onConfirm,
  onClose,
}: {
  dirty: boolean;
  onSaveFirst: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet eyebrow="Marcador" title="¿Empezar un partido nuevo?" onClose={onClose}>
      <p className="text-sm leading-relaxed text-mist">
        El marcador, el reloj, las faltas y las estadísticas vuelven a cero. La plantilla y el escudo se mantienen.
      </p>
      {dirty && (
        <p className="mt-3 rounded-[1.25rem] bg-gold/10 px-4 py-3 text-sm text-gold ring-1 ring-gold/25">
          El partido actual tiene cambios sin guardar.
        </p>
      )}
      <div className="mt-6 grid gap-2">
        {dirty ? (
          <>
            <button type="button" className="btn-pill btn-gold h-12" onClick={onSaveFirst}>
              Guardar antes
            </button>
            <button type="button" className="btn-pill btn-danger h-12" onClick={onConfirm}>
              Empezar sin guardar
            </button>
          </>
        ) : (
          <button type="button" className="btn-pill btn-electric h-12" onClick={onConfirm}>
            Empezar partido nuevo
          </button>
        )}
        <button type="button" className="btn-pill btn-ghost h-12" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Sheet>
  );
}
