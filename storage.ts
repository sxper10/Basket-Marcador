import {
  DEFAULT_AWAY_NAME,
  DEFAULT_PERIOD_MS,
  HOME_NAME,
  MAX_CLOCK_MS,
  MAX_PERIODS,
  MAX_PERIOD_MS,
  MIN_PERIOD_MS,
  clamp,
  createGame,
  defaultRoster,
  uid,
  type Game,
  type GameEvent,
  type Player,
  type SavedMatch,
} from "./game";

const KEYS = {
  game: "turina-marcador/partido/v1",
  matches: "turina-marcador/historial/v1",
  logo: "turina-marcador/escudo/v1",
};

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Valida lo leído del navegador para que un dato corrupto nunca rompa el marcador. */
function sanitizeGame(raw: unknown): Game | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<Game>;
  if (typeof g.id !== "string" || !Array.isArray(g.events) || !Array.isArray(g.roster)) return null;

  const roster = (g.roster as unknown[]).filter(
    (p): p is Player =>
      !!p && typeof (p as Player).id === "string" && typeof (p as Player).name === "string"
  );

  const events = (g.events as unknown[])
    .filter((e): e is GameEvent => {
      const ev = e as GameEvent;
      return (
        !!ev &&
        typeof ev.id === "string" &&
        (ev.kind === "score" || ev.kind === "foul") &&
        (ev.team === "home" || ev.team === "away") &&
        typeof ev.points === "number" &&
        typeof ev.period === "number"
      );
    })
    .map((ev) => ({
      ...ev,
      playerId: typeof ev.playerId === "string" ? ev.playerId : null,
      clock: num(ev.clock, 0),
      at: num(ev.at, 0),
    }));

  const clocks: Record<number, number> = {};
  if (g.clocks && typeof g.clocks === "object") {
    for (const [key, value] of Object.entries(g.clocks)) {
      if (typeof value === "number" && Number.isFinite(value)) clocks[Number(key)] = clamp(value, 0, MAX_CLOCK_MS);
    }
  }

  const now = Date.now();
  const running = g.running === true && typeof g.startedAt === "number";

  return {
    id: g.id,
    createdAt: num(g.createdAt, now),
    updatedAt: num(g.updatedAt, now),
    homeName: HOME_NAME,
    awayName: typeof g.awayName === "string" && g.awayName.trim() ? g.awayName : DEFAULT_AWAY_NAME,
    roster: roster.length ? roster : defaultRoster(),
    events,
    period: clamp(Math.round(num(g.period, 0)), 0, MAX_PERIODS - 1),
    periodMs: clamp(num(g.periodMs, DEFAULT_PERIOD_MS), MIN_PERIOD_MS, MAX_PERIOD_MS),
    clocks,
    running,
    startedAt: running ? (g.startedAt as number) : null,
  };
}

export function loadGame(): Game {
  return sanitizeGame(read(KEYS.game)) ?? createGame(Date.now(), uid());
}

export const saveGame = (game: Game) => write(KEYS.game, game);

export function loadMatches(): SavedMatch[] {
  const raw = read(KEYS.matches);
  if (!Array.isArray(raw)) return [];
  const out: SavedMatch[] = [];
  for (const item of raw as Partial<SavedMatch>[]) {
    const game = sanitizeGame(item?.game);
    if (!game) continue;
    out.push({
      id: game.id,
      savedAt: num(item.savedAt, game.updatedAt),
      status: item.status === "final" ? "final" : "live",
      game: { ...game, running: false, startedAt: null },
    });
  }
  return out;
}

export const saveMatches = (matches: SavedMatch[]) => write(KEYS.matches, matches);

export function loadLogo(): string | null {
  const raw = read(KEYS.logo);
  return typeof raw === "string" && raw.startsWith("data:image/") ? raw : null;
}

export function saveLogo(dataUrl: string | null): boolean {
  if (dataUrl === null) {
    try {
      window.localStorage.removeItem(KEYS.logo);
    } catch {
      /* sin almacenamiento disponible */
    }
    return true;
  }
  return write(KEYS.logo, dataUrl);
}

/** Lee una imagen local y la reduce para que quepa sin problema en el navegador. */
export async function fileToLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-an-image");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("unreadable-image"));
    el.src = dataUrl;
  });

  const { naturalWidth: w, naturalHeight: h } = img;
  const MAX_SIDE = 512;
  if (!w || !h) return dataUrl; // p. ej. SVG sin tamaño propio
  if (Math.max(w, h) <= MAX_SIDE && dataUrl.length < 350_000) return dataUrl;

  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
