import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronRight,
  ImageUp,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import {
  DEFAULT_AWAY_NAME,
  MAX_PERIODS,
  MAX_PERIOD_MS,
  MIN_PERIOD_MS,
  REGULAR_PERIODS,
  SHOTS,
  baseClock,
  byPeriod,
  clockParts,
  describeEvent,
  formatClock,
  lastPeriodShown,
  liveClock,
  periodLabel,
  periodShort,
  scoreOf,
  uid,
  type ActionInput,
  type Game,
  type Team,
} from "@/lib/game";

interface ScoreboardProps {
  game: Game;
  act: (action: ActionInput) => void;
  logo: string;
  hasCustomLogo: boolean;
  onPickLogo: (file: File) => void;
  onResetLogo: () => void;
  onHomeScore: (points: number) => void;
  onHomeFix: () => void;
  onFinish: () => void;
}

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

export function Scoreboard({
  game,
  act,
  logo,
  hasCustomLogo,
  onPickLogo,
  onResetLogo,
  onHomeScore,
  onHomeFix,
  onFinish,
}: ScoreboardProps) {
  const home = scoreOf(game.events, "home");
  const away = scoreOf(game.events, "away");
  const homeFouls = byPeriod(game.events, "home", "foul");
  const awayFouls = byPeriod(game.events, "away", "foul");
  const last = game.events[game.events.length - 1];
  const tag = periodShort(game.period);

  return (
    <section
      aria-label="Marcador"
      className="relative isolate overflow-hidden rounded-[2.5rem] bg-linear-to-b from-navy-850 to-navy-900 shadow-[0_60px_140px_-70px_rgba(47,107,255,0.7)] ring-1 ring-white/[0.07] sm:rounded-[3rem]"
    >
      <CourtLines />
      <div
        aria-hidden="true"
        className="absolute inset-x-16 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent"
      />
      <p className="sr-only" aria-live="polite">
        {game.homeName} {home}, {game.awayName} {away}
      </p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-9 px-3 pt-6 pb-7 sm:gap-x-6 sm:px-8 sm:pt-9 sm:pb-9 lg:grid-cols-[1fr_minmax(21rem,24rem)_1fr] lg:px-10 lg:pt-11 lg:pb-10">
        <ClockColumn
          className="order-1 col-span-2 lg:order-2 lg:col-span-1"
          game={game}
          act={act}
          tied={home === away}
          onFinish={onFinish}
        />

        <TeamColumn
          className="order-2 lg:order-1"
          side="home"
          name={game.homeName}
          score={home}
          fouls={homeFouls[game.period]}
          foulsTotal={sum(homeFouls)}
          periodTag={tag}
          badge={<HomeBadge src={logo} custom={hasCustomLogo} onPick={onPickLogo} onReset={onResetLogo} />}
          nameSlot={
            <h2 className="text-[15px] leading-tight font-semibold text-balance text-ink sm:text-lg">
              {game.homeName}
            </h2>
          }
          onScore={onHomeScore}
          minus={{
            label: "Corregir",
            aria: `Corregir o quitar una canasta de ${game.homeName}`,
            disabled: home === 0,
            onClick: onHomeFix,
          }}
          onFoul={(delta) =>
            act(delta > 0 ? { type: "foul", id: uid(), team: "home" } : { type: "removeFoul", team: "home" })
          }
        />

        <TeamColumn
          className="order-3"
          side="away"
          name={game.awayName}
          score={away}
          fouls={awayFouls[game.period]}
          foulsTotal={sum(awayFouls)}
          periodTag={tag}
          badge={<AwayBadge name={game.awayName} />}
          nameSlot={<AwayName value={game.awayName} onCommit={(name) => act({ type: "setAwayName", name })} />}
          onScore={(points) => act({ type: "score", id: uid(), team: "away", points, playerId: null })}
          minus={{
            label: "Restar 1",
            aria: `Restar un punto a ${game.awayName}`,
            disabled: away === 0,
            onClick: () => act({ type: "awayMinus" }),
          }}
          onFoul={(delta) =>
            act(delta > 0 ? { type: "foul", id: uid(), team: "away" } : { type: "removeFoul", team: "away" })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-navy-950/40 py-3 pr-3 pl-5 sm:pr-5 sm:pl-8">
        <div className="min-w-0">
          <p className="eyebrow text-haze">Última jugada</p>
          <p
            key={last?.id ?? "none"}
            className={cn("mt-0.5 truncate text-sm text-ink", last && Date.now() - last.at < 1500 && "animate-rise")}
          >
            {last ? (
              <>
                {describeEvent(game, last)}
                <span className="text-haze tabular-nums">
                  {" "}
                  · {periodShort(last.period)} {formatClock(last.clock)}
                </span>
              </>
            ) : (
              <span className="text-mist">Todavía no hay jugadas</span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="btn-pill btn-ghost h-10 shrink-0 px-4"
          disabled={!last}
          onClick={() => act({ type: "undo" })}
        >
          <Undo2 className="size-4" />
          Deshacer
        </button>
      </div>
    </section>
  );
}

/* ---------- decoración: líneas de pista muy tenues ---------- */

function CourtLines() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full text-white/[0.045] lg:block"
      viewBox="0 0 1200 560"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="600" y1="-20" x2="600" y2="580" />
      <circle cx="600" cy="262" r="168" />
      <path d="M-20 44 H130 A 250 250 0 0 1 130 480 H-20" />
      <path d="M1220 44 H1070 A 250 250 0 0 0 1070 480 H1220" />
      <rect x="-20" y="172" width="190" height="180" />
      <rect x="1030" y="172" width="190" height="180" />
    </svg>
  );
}

/* ---------- equipos ---------- */

interface TeamColumnProps {
  side: Team;
  className?: string;
  name: string;
  score: number;
  fouls: number;
  foulsTotal: number;
  periodTag: string;
  badge: ReactNode;
  nameSlot: ReactNode;
  onScore: (points: number) => void;
  minus: { label: string; aria: string; disabled: boolean; onClick: () => void };
  onFoul: (delta: 1 | -1) => void;
}

function TeamColumn({
  side,
  className,
  name,
  score,
  fouls,
  foulsTotal,
  periodTag,
  badge,
  nameSlot,
  onScore,
  minus,
  onFoul,
}: TeamColumnProps) {
  const isHome = side === "home";

  return (
    <div className={cn("flex min-w-0 flex-col items-center text-center", className)}>
      {badge}
      <p className={cn("eyebrow mt-4", isHome ? "text-aqua" : "text-mist")}>{isHome ? "Local" : "Rival"}</p>
      <div className="mt-0.5 flex h-[3.25rem] w-full items-center justify-center sm:h-11">{nameSlot}</div>

      <p
        className="mt-1 font-display text-[5.75rem] leading-[0.92] font-bold tracking-tight text-ink tabular-nums sm:text-[8rem] lg:text-[9.5rem]"
        aria-label={`${name}: ${score} puntos`}
      >
        <span key={score} className="inline-block animate-pop">
          {score}
        </span>
      </p>

      <div className="mt-4 grid w-full max-w-[17rem] grid-cols-3 gap-1.5 sm:gap-2.5">
        {SHOTS.map((shot) => (
          <button
            key={shot.points}
            type="button"
            onClick={() => onScore(shot.points)}
            aria-label={`Sumar ${shot.points} a ${name} (${shot.label.toLowerCase()})`}
            className={cn(
              "flex h-[3.75rem] flex-col items-center justify-center rounded-[1.35rem] ring-1 transition duration-200 ease-soft active:scale-[0.94] sm:h-[4.25rem] sm:rounded-[1.6rem]",
              isHome
                ? "bg-electric/[0.16] text-aqua ring-aqua/20 hover:bg-electric/30 hover:ring-aqua/45"
                : "bg-white/[0.06] text-ink ring-white/10 hover:bg-white/[0.12] hover:ring-white/25"
            )}
          >
            <span className="font-display text-[1.7rem] leading-none font-semibold">+{shot.points}</span>
            <span className="mt-1 text-[9.5px] font-semibold tracking-[0.12em] uppercase opacity-75">
              {shot.short}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={minus.onClick}
        disabled={minus.disabled}
        aria-label={minus.aria}
        className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-mist ring-1 ring-white/[0.08] transition duration-200 ease-soft hover:bg-white/[0.06] hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="size-3.5" />
        {minus.label}
      </button>

      <div className="mt-6 flex flex-col items-center">
        <p className="eyebrow text-haze">Faltas · {periodTag}</p>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-navy-950/60 p-1 ring-1 ring-white/[0.06]">
          <button
            type="button"
            className="btn-round size-9"
            disabled={fouls === 0}
            onClick={() => onFoul(-1)}
            aria-label={`Quitar una falta a ${name}`}
          >
            <Minus className="size-4" />
          </button>
          <span
            className="w-11 text-center font-display text-[1.75rem] leading-none font-semibold text-ink tabular-nums"
            aria-label={`${fouls} faltas de ${name} en este tiempo`}
          >
            <span key={fouls} className="inline-block animate-pop">
              {fouls}
            </span>
          </span>
          <button
            type="button"
            className="btn-round size-9"
            onClick={() => onFoul(1)}
            aria-label={`Sumar una falta a ${name}`}
          >
            <Plus className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-haze tabular-nums">{foulsTotal} en todo el partido</p>
      </div>
    </div>
  );
}

function HomeBadge({
  src,
  custom,
  onPick,
  onReset,
}: {
  src: string;
  custom: boolean;
  onPick: (file: File) => void;
  onReset: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const corner =
    "absolute -bottom-2.5 flex size-7 items-center justify-center rounded-full bg-navy-800 text-mist ring-1 ring-white/15 transition duration-200 ease-soft after:absolute after:-inset-2 hover:bg-navy-700 hover:text-ink active:scale-90 sm:-bottom-2 sm:size-8";

  return (
    <div className="relative">
      <div className="size-[4.75rem] overflow-hidden rounded-full bg-white p-[8%] shadow-[0_0_0_6px_rgba(255,255,255,0.05),0_22px_44px_-16px_rgba(69,217,255,0.5)] sm:size-28">
        <img
          src={src}
          alt="Escudo del IES Joaquín Turina"
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(corner, "-right-2.5 sm:-right-2")}
        aria-label="Subir o reemplazar el escudo"
        title="Subir o reemplazar el escudo"
      >
        <ImageUp className="size-3.5 sm:size-4" />
      </button>
      {custom && (
        <button
          type="button"
          onClick={onReset}
          className={cn(corner, "-left-2.5 sm:-left-2")}
          aria-label="Volver al escudo oficial"
          title="Volver al escudo oficial"
        >
          <RotateCcw className="size-4" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "–";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

function AwayBadge({ name }: { name: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-[4.75rem] items-center justify-center rounded-full bg-navy-800/70 font-display text-[1.7rem] font-semibold tracking-wide text-mist ring-1 ring-white/10 sm:size-28 sm:text-[2.5rem]"
    >
      {initialsOf(name)}
    </div>
  );
}

function AwayName({ value, onCommit }: { value: string; onCommit: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          cancelled.current = false;
          setEditing(true);
        }}
        aria-label={`Cambiar el nombre del equipo visitante. Ahora: ${value}`}
        title="Cambiar el nombre del rival"
        className="group inline-flex max-w-full items-center gap-1.5 rounded-2xl py-1.5 pr-2.5 pl-3 ring-1 ring-white/[0.08] transition duration-200 ease-soft hover:bg-white/[0.06] hover:ring-white/20 active:scale-[0.98]"
      >
        <span className="line-clamp-2 min-w-0 text-[15px] leading-tight font-semibold text-balance text-ink sm:text-lg">
          {value}
        </span>
        <Pencil
          className="size-3.5 shrink-0 text-haze transition duration-200 group-hover:text-ink"
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      aria-label="Nombre del equipo visitante"
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        if (!cancelled.current) onCommit(draft);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      maxLength={26}
      spellCheck={false}
      autoComplete="off"
      enterKeyHint="done"
      placeholder={DEFAULT_AWAY_NAME}
      className="h-10 w-full max-w-[16rem] rounded-full bg-navy-950/70 px-4 text-center text-base font-semibold text-ink ring-2 ring-aqua/70 outline-none placeholder:text-haze sm:text-lg"
    />
  );
}

/* ---------- cronómetro ---------- */

const CLOCK_STEPS = [
  { label: "−1 min", ms: -60_000 },
  { label: "−10 s", ms: -10_000 },
  { label: "−1 s", ms: -1_000 },
  { label: "+1 s", ms: 1_000 },
  { label: "+10 s", ms: 10_000 },
  { label: "+1 min", ms: 60_000 },
];

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function ClockColumn({
  game,
  act,
  tied,
  onFinish,
  className,
}: {
  game: Game;
  act: (action: ActionInput) => void;
  tied: boolean;
  onFinish: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const now = useNow(game.running);
  const remaining = liveClock(game, now);
  const { mm, ss, tenths } = clockParts(remaining);
  const expired = remaining <= 0;
  const lastMinute = !expired && remaining < 60_000;
  const fresh = !game.running && baseClock(game) === game.periodMs;

  // Al llegar a cero el reloj se detiene solo. Sin bocinas ni sonidos.
  useEffect(() => {
    if (game.running && expired) act({ type: "expire" });
  }, [game.running, expired, act]);

  const chipCount = Math.min(
    MAX_PERIODS,
    Math.max(REGULAR_PERIODS + 1, lastPeriodShown(game) + 1 + (game.period >= REGULAR_PERIODS ? 1 : 0))
  );
  const next = game.period + 1;
  const regulationOver = game.period >= REGULAR_PERIODS - 1;
  const status = game.running
    ? "En juego"
    : expired
      ? "Tiempo cumplido"
      : fresh
        ? "Listo para empezar"
        : "En pausa";

  const primaryBase = "btn-pill h-14 min-w-[11.5rem] px-7 text-base";
  let primary: ReactNode;
  if (expired && regulationOver && !tied) {
    primary = (
      <button type="button" onClick={onFinish} className={cn(primaryBase, "btn-gold")}>
        <Save className="size-5" />
        Guardar partido
      </button>
    );
  } else if (expired && next < MAX_PERIODS) {
    primary = (
      <button
        type="button"
        onClick={() => act({ type: "setPeriod", period: next })}
        className={cn(primaryBase, "btn-gold pr-5")}
      >
        {regulationOver ? "Jugar " : "Pasar al "}
        {periodLabel(next).toLowerCase()}
        <ChevronRight className="size-5" />
      </button>
    );
  } else {
    primary = (
      <button
        type="button"
        onClick={() => act({ type: "toggleClock" })}
        disabled={expired}
        className={cn(primaryBase, game.running ? "btn-ghost" : "btn-electric")}
      >
        {game.running ? (
          <>
            <Pause className="size-5 fill-current" />
            Pausar
          </>
        ) : (
          <>
            <Play className="size-5 fill-current" />
            {fresh ? "Iniciar" : "Reanudar"}
          </>
        )}
      </button>
    );
  }

  const minutes = Math.round(game.periodMs / 60_000);

  return (
    <div className={cn("relative flex min-w-0 flex-col items-center", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[9.5rem] left-1/2 -z-10 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,107,255,0.22),transparent)]"
      />

      <div
        role="group"
        aria-label="Tiempo de juego"
        className="scroll-soft flex max-w-full gap-1 overflow-x-auto rounded-full bg-navy-950/60 p-1 ring-1 ring-white/[0.06]"
      >
        {Array.from({ length: chipCount }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i === game.period}
            aria-label={periodLabel(i)}
            title={periodLabel(i)}
            onClick={() => act({ type: "setPeriod", period: i })}
            className={cn(
              "h-9 min-w-11 shrink-0 rounded-full px-3 text-sm font-semibold transition duration-300 ease-soft",
              i === game.period
                ? "bg-gold text-navy-950 shadow-[0_8px_20px_-8px_rgba(243,196,82,0.9)]"
                : "text-mist hover:bg-white/[0.06] hover:text-ink"
            )}
          >
            {periodShort(i)}
          </button>
        ))}
      </div>

      <p className="eyebrow mt-6 text-gold">{periodLabel(game.period)}</p>

      <div
        role="timer"
        aria-label={`Quedan ${Number(mm)} minutos y ${Number(ss)} segundos`}
        className="relative mt-1"
      >
        <span
          className={cn(
            "block font-display text-[6.75rem] leading-[0.9] font-semibold tracking-tight tabular-nums transition-colors duration-500 sm:text-[8.5rem]",
            lastMinute || expired ? "text-gold" : "text-ink"
          )}
        >
          {mm}
          <span className="relative -top-[0.07em] mx-[0.02em]">:</span>
          {ss}
        </span>
        {lastMinute && (
          <span className="absolute bottom-[0.45rem] left-full ml-1 font-display text-3xl font-medium text-gold/80 tabular-nums sm:bottom-3 sm:text-4xl">
            .{tenths}
          </span>
        )}
      </div>

      <p className="mt-2.5 flex items-center gap-2 text-sm text-mist">
        <span
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full transition-colors duration-300",
            game.running ? "animate-live bg-gold" : expired ? "bg-gold" : "bg-haze"
          )}
        />
        {status}
      </p>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          className="btn-round size-12"
          onClick={() => act({ type: "resetClock" })}
          disabled={game.running || fresh}
          aria-label={
            game.running
              ? "Pausa el reloj para poder reiniciarlo"
              : `Reiniciar el reloj a ${formatClock(game.periodMs)}`
          }
          title={game.running ? "Pausa el reloj para reiniciarlo" : `Reiniciar a ${formatClock(game.periodMs)}`}
        >
          <RotateCcw className="size-[1.15rem]" />
        </button>
        {primary}
        <button
          type="button"
          className={cn("btn-round size-12", open && "bg-white/[0.12] text-ink ring-white/20")}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="ajustes-reloj"
          aria-label="Ajustar el reloj"
          title="Ajustar el reloj"
        >
          <SlidersHorizontal className="size-[1.15rem]" />
        </button>
      </div>

      <div
        id="ajustes-reloj"
        className={cn(
          "grid w-full max-w-[24rem] transition-[grid-template-rows,opacity,margin-top] duration-300 ease-soft",
          open ? "mt-5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="rounded-[1.75rem] bg-navy-950/55 p-3 ring-1 ring-white/[0.06]">
            <p className="eyebrow px-2 pt-1 text-haze">Ajustar el reloj</p>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {CLOCK_STEPS.map((step) => (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => act({ type: "adjustClock", delta: step.ms })}
                  className="h-10 rounded-full bg-white/[0.05] text-xs font-semibold text-ink tabular-nums ring-1 ring-white/[0.07] transition duration-200 ease-soft hover:bg-white/[0.12] active:scale-95"
                >
                  {step.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 px-2 pb-1">
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-ink">Duración por tiempo</p>
                <p className="text-xs text-haze">Para los tiempos sin empezar</p>
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/[0.05] p-1 ring-1 ring-white/[0.07]">
                <button
                  type="button"
                  className="btn-round size-8 ring-0"
                  disabled={game.periodMs <= MIN_PERIOD_MS}
                  onClick={() => act({ type: "setPeriodMs", ms: game.periodMs - 60_000 })}
                  aria-label="Un minuto menos por tiempo"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-14 text-center text-sm font-semibold text-ink tabular-nums">{minutes} min</span>
                <button
                  type="button"
                  className="btn-round size-8 ring-0"
                  disabled={game.periodMs >= MAX_PERIOD_MS}
                  onClick={() => act({ type: "setPeriodMs", ms: game.periodMs + 60_000 })}
                  aria-label="Un minuto más por tiempo"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 hidden text-xs text-haze lg:block">
        <kbd className="mr-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-mist ring-1 ring-white/10">
          Espacio
        </kbd>{" "}
        inicia o pausa el reloj
      </p>
    </div>
  );
}
