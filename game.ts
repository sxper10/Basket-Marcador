/* Modelo del partido: todo (marcador, parciales, faltas y estadísticas)
   se deriva de una única lista de jugadas, así nunca se descuadra nada. */

export type Team = "home" | "away";
export type MatchStatus = "live" | "final";

export interface Player {
  id: string;
  name: string;
}

export interface GameEvent {
  id: string;
  kind: "score" | "foul";
  team: Team;
  /** 1, 2 o 3 en canastas; 0 en faltas */
  points: number;
  /** Solo en canastas del equipo local. null = sin asignar */
  playerId: string | null;
  /** Índice del tiempo: 0-3 tiempos normales, 4+ prórrogas */
  period: number;
  /** Milisegundos que quedaban en el reloj */
  clock: number;
  at: number;
}

export interface Game {
  id: string;
  createdAt: number;
  updatedAt: number;
  homeName: string;
  awayName: string;
  roster: Player[];
  events: GameEvent[];
  period: number;
  /** Duración de cada tiempo en ms */
  periodMs: number;
  /** Tiempo restante de cada tiempo ya tocado */
  clocks: Record<number, number>;
  running: boolean;
  startedAt: number | null;
}

export interface SavedMatch {
  id: string;
  savedAt: number;
  status: MatchStatus;
  game: Game;
}

export interface Line {
  ft: number;
  two: number;
  three: number;
  pts: number;
}
export interface PlayerLine extends Line {
  player: Player;
}
export interface Stats {
  lines: PlayerLine[];
  unassigned: Line;
  total: Line;
  best: number;
}

export const HOME_NAME = "IES Joaquín Turina";
export const DEFAULT_AWAY_NAME = "Visitante";
export const DEFAULT_ROSTER: readonly string[] = [
  "Sebas",
  "Greiner",
  "Tayler",
  "Xavier",
  "Vincent",
  "Aaron",
  "Jacobo",
  "David",
  "Javier",
  "Dario",
  "Anthony",
  "Michel",
];
export const DEFAULT_PERIOD_MS = 5 * 60_000;
export const MIN_PERIOD_MS = 60_000;
export const MAX_PERIOD_MS = 20 * 60_000;
export const REGULAR_PERIODS = 4;
export const MAX_PERIODS = 9;
export const MAX_CLOCK_MS = 99 * 60_000 + 59_000;
export const MAX_ROSTER = 20;

export const SHOTS = [
  { points: 1, label: "Tiro libre", short: "Libre" },
  { points: 2, label: "Tiro de 2", short: "De 2" },
  { points: 3, label: "Triple", short: "Triple" },
] as const;

export const SHOT_LABEL: Record<number, string> = { 1: "Tiro libre", 2: "Tiro de 2", 3: "Triple" };

/* ---------- utilidades ---------- */

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function findLast<T>(list: T[], test: (item: T) => boolean): T | undefined {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return list[i];
  return undefined;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-");

export const cleanName = (s: string, max: number) => s.trim().replace(/\s+/g, " ").slice(0, max);

export function defaultRoster(): Player[] {
  return DEFAULT_ROSTER.map((name) => ({ id: `p-${slug(name)}`, name }));
}

export function createGame(now: number, id: string, roster?: Player[]): Game {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    homeName: HOME_NAME,
    awayName: DEFAULT_AWAY_NAME,
    roster: roster ?? defaultRoster(),
    events: [],
    period: 0,
    periodMs: DEFAULT_PERIOD_MS,
    clocks: {},
    running: false,
    startedAt: null,
  };
}

/* ---------- reloj ---------- */

export function baseClock(game: Game, period = game.period): number {
  const stored = game.clocks[period];
  return typeof stored === "number" ? stored : game.periodMs;
}

/** Tiempo restante real del tiempo actual, calculado con marcas de hora (no se desfasa). */
export function liveClock(game: Game, now: number): number {
  const base = baseClock(game);
  if (!game.running || game.startedAt == null) return base;
  return Math.max(0, base - Math.max(0, now - game.startedAt));
}

/** Copia del partido con el reloj detenido en su valor actual. */
export function freezeGame(game: Game, now: number): Game {
  if (!game.running) return game;
  return {
    ...game,
    running: false,
    startedAt: null,
    clocks: { ...game.clocks, [game.period]: liveClock(game, now) },
  };
}

export function clockParts(ms: number) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  return {
    mm: String(Math.floor(totalSeconds / 60)).padStart(2, "0"),
    ss: String(totalSeconds % 60).padStart(2, "0"),
    tenths: Math.floor((safe % 1000) / 100),
  };
}

export function formatClock(ms: number): string {
  const { mm, ss } = clockParts(ms);
  return `${mm}:${ss}`;
}

/* ---------- textos ---------- */

export function periodLabel(index: number): string {
  if (index < REGULAR_PERIODS) return `${index + 1}º tiempo`;
  const n = index - REGULAR_PERIODS + 1;
  return n === 1 ? "Prórroga" : `Prórroga ${n}`;
}

export function periodShort(index: number): string {
  if (index < REGULAR_PERIODS) return `${index + 1}º`;
  const n = index - REGULAR_PERIODS + 1;
  return n === 1 ? "PR" : `PR${n}`;
}

export function describeEvent(game: Game, ev: GameEvent): string {
  const team = ev.team === "home" ? game.homeName : game.awayName;
  if (ev.kind === "foul") return `Falta de ${team}`;
  if (ev.team === "away") return `+${ev.points} de ${team}`;
  const shot = SHOT_LABEL[ev.points] ?? `+${ev.points}`;
  const player = game.roster.find((p) => p.id === ev.playerId)?.name;
  return player ? `${shot} de ${player}` : `${shot} sin asignar`;
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const TIME_FORMAT = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });

export const formatDate = (t: number) => `${DATE_FORMAT.format(t)} · ${TIME_FORMAT.format(t)}`;

/* ---------- datos derivados ---------- */

export function scoreOf(events: GameEvent[], team: Team): number {
  let total = 0;
  for (const ev of events) if (ev.kind === "score" && ev.team === team) total += ev.points;
  return total;
}

/** Puntos o faltas de un equipo por cada tiempo. */
export function byPeriod(events: GameEvent[], team: Team, kind: GameEvent["kind"]): number[] {
  const out = Array.from({ length: MAX_PERIODS }, () => 0);
  for (const ev of events) {
    if (ev.team !== team || ev.kind !== kind || ev.period < 0 || ev.period >= MAX_PERIODS) continue;
    out[ev.period] += kind === "score" ? ev.points : 1;
  }
  return out;
}

/** Último tiempo al que se ha llegado (por el selector o por jugadas). */
export function reachedPeriod(game: Game): number {
  return game.events.reduce((max, ev) => Math.max(max, ev.period), game.period);
}

/** Último tiempo que se muestra en tablas: como mínimo los cuatro tiempos. */
export function lastPeriodShown(game: Game): number {
  return Math.max(REGULAR_PERIODS - 1, reachedPeriod(game));
}

const emptyLine = (): Line => ({ ft: 0, two: 0, three: 0, pts: 0 });

function addShot(line: Line, points: number) {
  if (points === 1) line.ft += 1;
  else if (points === 2) line.two += 1;
  else if (points === 3) line.three += 1;
  line.pts += points;
}

export function buildStats(game: Game): Stats {
  const map = new Map<string, PlayerLine>();
  for (const player of game.roster) map.set(player.id, { player, ...emptyLine() });
  const unassigned = emptyLine();
  const total = emptyLine();
  for (const ev of game.events) {
    if (ev.kind !== "score" || ev.team !== "home") continue;
    const line = (ev.playerId ? map.get(ev.playerId) : undefined) ?? unassigned;
    addShot(line, ev.points);
    addShot(total, ev.points);
  }
  const lines = [...map.values()];
  const best = lines.reduce((max, l) => Math.max(max, l.pts), 0);
  return { lines, unassigned, total, best };
}

/* ---------- acciones ---------- */

type Stamp = { now: number };

export type Action =
  | ({ type: "score"; id: string; team: Team; points: number; playerId: string | null } & Stamp)
  | ({ type: "foul"; id: string; team: Team } & Stamp)
  | ({ type: "removeEvent"; id: string } & Stamp)
  | ({ type: "undo" } & Stamp)
  | ({ type: "awayMinus" } & Stamp)
  | ({ type: "removeFoul"; team: Team } & Stamp)
  | ({ type: "removeBasket"; playerId: string | null; points: number } & Stamp)
  | ({ type: "toggleClock" } & Stamp)
  | ({ type: "expire" } & Stamp)
  | ({ type: "resetClock" } & Stamp)
  | ({ type: "adjustClock"; delta: number } & Stamp)
  | ({ type: "setPeriod"; period: number } & Stamp)
  | ({ type: "setPeriodMs"; ms: number } & Stamp)
  | ({ type: "setAwayName"; name: string } & Stamp)
  | ({ type: "addPlayer"; id: string; name: string } & Stamp)
  | ({ type: "removePlayer"; id: string } & Stamp)
  | ({ type: "load"; game: Game } & Stamp)
  | ({ type: "new"; id: string } & Stamp);

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ActionInput = DistributiveOmit<Action, "now">;

export function reducer(game: Game, a: Action): Game {
  const touch = (next: Game): Game => (next === game ? game : { ...next, updatedAt: a.now });
  const without = (id: string): Game => ({ ...game, events: game.events.filter((e) => e.id !== id) });
  const isAwayBasket = (e: GameEvent) => e.kind === "score" && e.team === "away";

  switch (a.type) {
    case "score": {
      if (a.points !== 1 && a.points !== 2 && a.points !== 3) return game;
      const ev: GameEvent = {
        id: a.id,
        kind: "score",
        team: a.team,
        points: a.points,
        playerId: a.team === "home" ? a.playerId : null,
        period: game.period,
        clock: liveClock(game, a.now),
        at: a.now,
      };
      return touch({ ...game, events: [...game.events, ev] });
    }
    case "foul": {
      const ev: GameEvent = {
        id: a.id,
        kind: "foul",
        team: a.team,
        points: 0,
        playerId: null,
        period: game.period,
        clock: liveClock(game, a.now),
        at: a.now,
      };
      return touch({ ...game, events: [...game.events, ev] });
    }
    case "removeEvent":
      return game.events.some((e) => e.id === a.id) ? touch(without(a.id)) : game;
    case "undo": {
      const last = game.events[game.events.length - 1];
      return last ? touch(without(last.id)) : game;
    }
    case "awayMinus": {
      // Resta un punto a la última canasta visitante (primero del tiempo actual).
      const pick =
        findLast(game.events, (e) => isAwayBasket(e) && e.period === game.period) ??
        findLast(game.events, isAwayBasket);
      if (!pick) return game;
      if (pick.points <= 1) return touch(without(pick.id));
      return touch({
        ...game,
        events: game.events.map((e) => (e.id === pick.id ? { ...e, points: e.points - 1 } : e)),
      });
    }
    case "removeFoul": {
      const pick = findLast(
        game.events,
        (e) => e.kind === "foul" && e.team === a.team && e.period === game.period
      );
      return pick ? touch(without(pick.id)) : game;
    }
    case "removeBasket": {
      const pick = findLast(
        game.events,
        (e) => e.kind === "score" && e.team === "home" && e.playerId === a.playerId && e.points === a.points
      );
      return pick ? touch(without(pick.id)) : game;
    }
    case "toggleClock": {
      if (game.running) return touch(freezeGame(game, a.now));
      const base = baseClock(game);
      if (base <= 0) return game;
      return touch({
        ...game,
        running: true,
        startedAt: a.now,
        clocks: { ...game.clocks, [game.period]: base },
      });
    }
    case "expire": {
      if (!game.running || liveClock(game, a.now) > 0) return game;
      return touch({
        ...game,
        running: false,
        startedAt: null,
        clocks: { ...game.clocks, [game.period]: 0 },
      });
    }
    case "resetClock": {
      const clocks = { ...game.clocks };
      delete clocks[game.period];
      return touch({ ...game, running: false, startedAt: null, clocks });
    }
    case "adjustClock": {
      const next = clamp(liveClock(game, a.now) + a.delta, 0, MAX_CLOCK_MS);
      const running = game.running && next > 0;
      return touch({
        ...game,
        running,
        startedAt: running ? a.now : null,
        clocks: { ...game.clocks, [game.period]: next },
      });
    }
    case "setPeriod": {
      const period = clamp(Math.round(a.period), 0, MAX_PERIODS - 1);
      if (period === game.period) return game;
      // Cada tiempo recuerda su reloj: si se cambia por error, no se pierde nada.
      return touch({ ...freezeGame(game, a.now), period });
    }
    case "setPeriodMs": {
      const ms = clamp(a.ms, MIN_PERIOD_MS, MAX_PERIOD_MS);
      if (ms === game.periodMs) return game;
      const clocks: Record<number, number> = {};
      for (const [key, value] of Object.entries(game.clocks)) {
        const period = Number(key);
        const isLive = game.running && period === game.period;
        if (value === game.periodMs && !isLive) continue; // sin empezar: adopta la nueva duración
        clocks[period] = value;
      }
      return touch({ ...game, periodMs: ms, clocks });
    }
    case "setAwayName": {
      const name = cleanName(a.name, 26) || DEFAULT_AWAY_NAME;
      return name === game.awayName ? game : touch({ ...game, awayName: name });
    }
    case "addPlayer": {
      const name = cleanName(a.name, 18);
      if (!name || game.roster.length >= MAX_ROSTER) return game;
      return touch({ ...game, roster: [...game.roster, { id: a.id, name }] });
    }
    case "removePlayer": {
      if (game.events.some((e) => e.playerId === a.id)) return game;
      return touch({ ...game, roster: game.roster.filter((p) => p.id !== a.id) });
    }
    case "load":
      return { ...a.game, running: false, startedAt: null };
    case "new":
      return { ...createGame(a.now, a.id, game.roster), periodMs: game.periodMs };
    default:
      return game;
  }
}
