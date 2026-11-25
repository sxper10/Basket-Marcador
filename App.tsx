import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { History as HistoryIcon, Plus, Save } from "lucide-react";
import escudo from "@/assets/turina-escudo.jpg";
import escudoMini from "@/assets/turina-escudo-mini.png";
import {
  DEFAULT_AWAY_NAME,
  buildStats,
  freezeGame,
  reducer,
  scoreOf,
  uid,
  type Action,
  type ActionInput,
  type MatchStatus,
  type SavedMatch,
} from "@/lib/game";
import { fileToLogo, loadGame, loadLogo, loadMatches, saveGame, saveLogo, saveMatches } from "@/lib/storage";
import { Scoreboard } from "@/components/Scoreboard";
import { FeedPanel, PartialsPanel, RosterPanel } from "@/components/Panels";
import { FixSheet, NewGameSheet, PickPlayerSheet, PlayerSheet, SaveSheet } from "@/components/GameSheets";
import { HistorySheet } from "@/components/History";

type SheetState =
  | { kind: "pick"; points: number }
  | { kind: "player"; playerId: string }
  | { kind: "fix" }
  | { kind: "save"; preferFinal: boolean }
  | { kind: "new" }
  | { kind: "history" }
  | null;

const BASE_TITLE = "Marcador en vivo · IES Joaquín Turina";

export default function App() {
  const [game, dispatch] = useReducer(reducer, undefined, loadGame);
  const [matches, setMatches] = useState<SavedMatch[]>(loadMatches);
  const [customLogo, setCustomLogo] = useState<string | null>(loadLogo);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  const sheetOpen = useRef(false);
  sheetOpen.current = sheet !== null;

  const act = useCallback((action: ActionInput) => dispatch({ ...action, now: Date.now() } as Action), []);
  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  const close = useCallback(() => setSheet(null), []);

  const stats = useMemo(() => buildStats(game), [game]);
  const home = scoreOf(game.events, "home");
  const away = scoreOf(game.events, "away");

  const saved = matches.find((m) => m.id === game.id);
  const hasActivity =
    game.events.length > 0 ||
    game.period !== 0 ||
    Object.keys(game.clocks).length > 0 ||
    game.awayName !== DEFAULT_AWAY_NAME;
  const dirty = hasActivity && (!saved || saved.game.updatedAt !== game.updatedAt);

  /* ---------- persistencia ---------- */

  useEffect(() => {
    saveGame(game);
  }, [game]);

  useEffect(() => {
    if (!saveMatches(matches)) notify("No se pudo guardar el historial en este navegador");
  }, [matches, notify]);

  useEffect(() => {
    document.title = game.events.length ? `${home}–${away} · ${game.homeName} vs ${game.awayName}` : BASE_TITLE;
  }, [home, away, game.events.length, game.homeName, game.awayName]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  /* ---------- teclado: Espacio inicia / pausa el reloj ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || sheetOpen.current) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable='true']")) return;
      e.preventDefault();
      act({ type: "toggleClock" });
    };
    // Tras un clic con ratón el botón suelta el foco, así Espacio sigue siendo siempre el reloj.
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0 || !(e.target instanceof Element)) return;
      const button = e.target.closest("button");
      if (button && !button.closest("[role='dialog']")) button.blur();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [act]);

  /* ---------- acciones ---------- */

  const handleSave = (status: MatchStatus, rival: string) => {
    const now = Date.now();
    const named = reducer(game, { type: "setAwayName", name: rival, now });
    const frozen = freezeGame(named, now);
    if (status === "final") dispatch({ type: "load", game: frozen, now });
    else if (named !== game) dispatch({ type: "setAwayName", name: rival, now });
    setMatches((prev) => [
      { id: game.id, savedAt: now, status, game: frozen },
      ...prev.filter((m) => m.id !== game.id),
    ]);
  };

  const startNewGame = () => {
    act({ type: "new", id: uid() });
    setSheet(null);
    notify("Partido nuevo: marcador a cero");
  };

  const askNewGame = () => {
    if (!hasActivity) {
      notify("El marcador ya está a cero");
      return;
    }
    setSheet({ kind: "new" });
  };

  const openSaved = (match: SavedMatch) => {
    dispatch({ type: "load", game: match.game, now: Date.now() });
    setSheet(null);
    notify(`Partido contra ${match.game.awayName} abierto en el marcador`);
  };

  const pickLogo = async (file: File) => {
    try {
      const dataUrl = await fileToLogo(file);
      setCustomLogo(dataUrl);
      notify(
        saveLogo(dataUrl)
          ? "Escudo actualizado"
          : "Escudo cambiado, pero es demasiado grande para recordarlo al recargar"
      );
    } catch {
      notify("No se pudo leer esa imagen. Prueba con un PNG o JPG.");
    }
  };

  const resetLogo = () => {
    setCustomLogo(null);
    saveLogo(null);
    notify("Escudo oficial restaurado");
  };

  const sheetPlayer = sheet?.kind === "player" ? stats.lines.find((l) => l.player.id === sheet.playerId) : undefined;

  return (
    <div className="relative isolate min-h-dvh overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[24rem] left-1/2 h-[46rem] w-[74rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,107,255,0.26),transparent)]" />
        <div className="absolute top-[38%] -right-[18rem] size-[38rem] rounded-full bg-[radial-gradient(closest-side,rgba(69,217,255,0.08),transparent)]" />
        <div className="absolute -bottom-[22rem] -left-[14rem] size-[42rem] rounded-full bg-[radial-gradient(closest-side,rgba(243,196,82,0.06),transparent)]" />
      </div>

      <div className="mx-auto w-full max-w-[1180px] px-3 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 py-4 sm:py-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_10px_30px_-12px_rgba(69,217,255,0.6)]">
              <img src={customLogo ?? escudoMini} alt="" className="h-full w-full object-contain" draggable={false} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] leading-tight font-semibold text-ink sm:text-base">
                Marcador en vivo
              </h1>
              <p className="hidden truncate text-xs text-mist sm:block">Baloncesto · IES Joaquín Turina</p>
            </div>
          </div>

          <nav aria-label="Partido" className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="btn-pill btn-ghost relative w-11 px-0 sm:w-auto sm:px-4"
              onClick={() => setSheet({ kind: "history" })}
              aria-label={`Historial de partidos guardados (${matches.length})`}
            >
              <HistoryIcon className="size-[1.15rem]" />
              <span className="hidden sm:inline">Historial</span>
              {matches.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-700 px-1 text-[11px] font-semibold text-ink tabular-nums ring-1 ring-white/20 sm:static sm:bg-white/10 sm:ring-0">
                  {matches.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className="btn-pill btn-ghost w-11 px-0 sm:w-auto sm:px-4"
              onClick={askNewGame}
              aria-label="Empezar un partido nuevo"
            >
              <Plus className="size-[1.15rem]" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
            <button
              type="button"
              className="btn-pill btn-gold relative w-11 px-0 sm:w-auto sm:px-5"
              onClick={() => setSheet({ kind: "save", preferFinal: false })}
              aria-label={dirty ? "Guardar partido (hay cambios sin guardar)" : "Guardar partido"}
            >
              <Save className="size-[1.15rem]" />
              <span className="hidden sm:inline">Guardar</span>
              {dirty && (
                <span
                  aria-hidden="true"
                  title="Cambios sin guardar"
                  className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-aqua ring-2 ring-navy-950"
                />
              )}
            </button>
          </nav>
        </header>

        <main>
          <Scoreboard
            game={game}
            act={act}
            logo={customLogo ?? escudo}
            hasCustomLogo={customLogo !== null}
            onPickLogo={pickLogo}
            onResetLogo={resetLogo}
            onHomeScore={(points) => setSheet({ kind: "pick", points })}
            onHomeFix={() => setSheet({ kind: "fix" })}
            onFinish={() => setSheet({ kind: "save", preferFinal: true })}
          />

          <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
            <RosterPanel
              game={game}
              stats={stats}
              act={act}
              onPlayer={(playerId) => setSheet({ kind: "player", playerId })}
            />
            <div className="grid gap-4 sm:gap-5">
              <PartialsPanel game={game} />
              <FeedPanel game={game} act={act} />
            </div>
          </div>
        </main>

        <footer className="mt-10 flex flex-col items-center gap-1.5 pb-9 text-center text-xs sm:flex-row sm:justify-between sm:text-left">
          <p className="text-haze">IES Joaquín Turina · Calle de las Islas Filipinas, Madrid</p>
          <p className="text-mist">Creado por Sebas Parra · IG: 10.seebaas</p>
        </footer>
      </div>

      {sheet?.kind === "pick" && (
        <PickPlayerSheet
          homeName={game.homeName}
          points={sheet.points}
          onPoints={(points) => setSheet({ kind: "pick", points })}
          stats={stats}
          onPick={(playerId) => {
            act({ type: "score", id: uid(), team: "home", points: sheet.points, playerId });
            setSheet(null);
          }}
          onClose={close}
        />
      )}

      {sheet?.kind === "player" && sheetPlayer && (
        <PlayerSheet
          player={sheetPlayer.player}
          line={sheetPlayer}
          onAdd={(points) =>
            act({ type: "score", id: uid(), team: "home", points, playerId: sheetPlayer.player.id })
          }
          onRemove={(points) => act({ type: "removeBasket", playerId: sheetPlayer.player.id, points })}
          onClose={close}
        />
      )}

      {sheet?.kind === "fix" && (
        <FixSheet game={game} onRemove={(id) => act({ type: "removeEvent", id })} onClose={close} />
      )}

      {sheet?.kind === "save" && (
        <SaveSheet
          game={game}
          existing={saved}
          preferFinal={sheet.preferFinal}
          onSave={handleSave}
          onNewGame={startNewGame}
          onHistory={() => setSheet({ kind: "history" })}
          onClose={close}
        />
      )}

      {sheet?.kind === "new" && (
        <NewGameSheet
          dirty={dirty}
          onSaveFirst={() => setSheet({ kind: "save", preferFinal: true })}
          onConfirm={startNewGame}
          onClose={close}
        />
      )}

      {sheet?.kind === "history" && (
        <HistorySheet
          matches={matches}
          currentId={game.id}
          currentDirty={dirty}
          onOpen={openSaved}
          onDelete={(id) => setMatches((prev) => prev.filter((m) => m.id !== id))}
          onClose={close}
        />
      )}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4"
      >
        {toast && (
          <p
            key={toast.id}
            className="animate-rise rounded-full bg-navy-700 px-5 py-3 text-center text-sm font-medium text-ink shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/15"
          >
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}
