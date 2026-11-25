import { useMemo, useState } from "react";
import { ArchiveX, ArrowUpRight, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  baseClock,
  buildStats,
  formatClock,
  formatDate,
  periodLabel,
  scoreOf,
  type SavedMatch,
} from "@/lib/game";
import { Sheet } from "./Sheet";
import { PartialsTable, STAT_COLS, StatCells, StatsHeader, StatsLegend, StatsTotals } from "./Panels";

function ResultChip({ match }: { match: SavedMatch }) {
  if (match.status === "live") {
    return (
      <span className="chip bg-electric/15 text-aqua ring-aqua/25">
        <span className="size-1.5 rounded-full bg-aqua" aria-hidden="true" />
        En curso
      </span>
    );
  }
  const home = scoreOf(match.game.events, "home");
  const away = scoreOf(match.game.events, "away");
  if (home > away) return <span className="chip bg-gold/15 text-gold ring-gold/30">Victoria</span>;
  if (home < away) return <span className="chip bg-white/[0.06] text-mist ring-white/10">Derrota</span>;
  return <span className="chip bg-white/[0.06] text-mist ring-white/10">Empate</span>;
}

interface HistoryProps {
  matches: SavedMatch[];
  currentId: string;
  currentDirty: boolean;
  onOpen: (match: SavedMatch) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function HistorySheet({ matches, currentId, currentDirty, onOpen, onDelete, onClose }: HistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; kind: "delete" | "open" } | null>(null);

  const sorted = useMemo(() => [...matches].sort((a, b) => b.game.createdAt - a.game.createdAt), [matches]);
  const selected = sorted.find((m) => m.id === selectedId) ?? null;

  const back = () => {
    setSelectedId(null);
    setConfirm(null);
  };

  if (selected) {
    return (
      <Sheet
        wide
        eyebrow={formatDate(selected.game.createdAt)}
        title={`vs ${selected.game.awayName}`}
        onBack={back}
        onClose={onClose}
      >
        <MatchDetail
          match={selected}
          isCurrent={selected.id === currentId}
          confirm={confirm?.id === selected.id ? confirm.kind : null}
          onAskDelete={() => setConfirm({ id: selected.id, kind: "delete" })}
          onAskOpen={() => (currentDirty ? setConfirm({ id: selected.id, kind: "open" }) : onOpen(selected))}
          onCancel={() => setConfirm(null)}
          onOpen={() => onOpen(selected)}
          onDelete={() => {
            onDelete(selected.id);
            back();
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      wide
      eyebrow="Historial"
      title={sorted.length ? `Partidos guardados · ${sorted.length}` : "Partidos guardados"}
      onClose={onClose}
    >
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center rounded-[1.75rem] bg-white/[0.03] px-6 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.05] text-mist ring-1 ring-white/10">
            <ArchiveX className="size-6" />
          </span>
          <p className="mt-4 font-semibold text-ink">Aún no hay partidos guardados</p>
          <p className="mt-1 max-w-xs text-sm text-mist">
            Pulsa «Guardar» durante un partido o al terminarlo y aparecerá aquí con su resultado, parciales y
            estadísticas.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((match) => {
            const home = scoreOf(match.game.events, "home");
            const away = scoreOf(match.game.events, "away");
            const rival = match.game.awayName;
            return (
              <li
                key={match.id}
                className="overflow-hidden rounded-[1.75rem] bg-white/[0.035] ring-1 ring-white/[0.07]"
              >
                {confirm?.id === match.id && confirm.kind === "delete" ? (
                  <div className="flex animate-fade flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-ink">
                      ¿Borrar el partido contra <strong className="font-semibold">{rival}</strong>? No se puede
                      recuperar.
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" className="btn-pill btn-ghost h-10" onClick={() => setConfirm(null)}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn-pill btn-danger h-10"
                        onClick={() => {
                          onDelete(match.id);
                          setConfirm(null);
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => setSelectedId(match.id)}
                      aria-label={`Ver el partido contra ${rival}: ${home} a ${away}`}
                      className="min-w-0 flex-1 py-4 pr-2 pl-5 text-left transition duration-200 ease-soft hover:bg-white/[0.04]"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <ResultChip match={match} />
                        {match.id === currentId && (
                          <span className="chip bg-white/[0.06] text-mist ring-white/10">En el marcador</span>
                        )}
                      </span>
                      <span className="mt-3 flex items-end justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-base font-semibold text-ink">vs {rival}</span>
                          <span className="mt-0.5 block truncate text-xs text-mist">
                            {formatDate(match.game.createdAt)}
                          </span>
                        </span>
                        <span className="shrink-0 font-display text-4xl leading-none font-semibold text-ink tabular-nums">
                          {home}
                          <span className="mx-1.5 font-medium text-haze">–</span>
                          {away}
                        </span>
                      </span>
                    </button>
                    <div className="flex items-center pr-3 pl-1">
                      <button
                        type="button"
                        className="btn-round size-10 bg-transparent ring-0 hover:bg-coral/15 hover:text-coral"
                        onClick={() => setConfirm({ id: match.id, kind: "delete" })}
                        aria-label={`Borrar el partido contra ${rival}`}
                        title="Borrar partido"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

function MatchDetail({
  match,
  isCurrent,
  confirm,
  onAskDelete,
  onAskOpen,
  onCancel,
  onOpen,
  onDelete,
}: {
  match: SavedMatch;
  isCurrent: boolean;
  confirm: "delete" | "open" | null;
  onAskDelete: () => void;
  onAskOpen: () => void;
  onCancel: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { game } = match;
  const home = scoreOf(game.events, "home");
  const away = scoreOf(game.events, "away");
  const stats = useMemo(() => buildStats(game), [game]);
  const ranked = useMemo(() => [...stats.lines].sort((a, b) => b.pts - a.pts), [stats]);

  return (
    <div>
      <div className="rounded-[1.9rem] bg-navy-950/55 px-5 py-6 text-center ring-1 ring-white/[0.06]">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ResultChip match={match} />
          {isCurrent && <span className="chip bg-white/[0.06] text-mist ring-white/10">En el marcador</span>}
        </div>
        <p className="mt-4 font-display text-7xl leading-none font-bold text-ink tabular-nums">
          {home}
          <span className="mx-3 font-medium text-haze">–</span>
          {away}
        </p>
        <p className="mt-3 text-base font-semibold text-ink">
          {game.homeName} <span className="font-normal text-haze">vs</span> {game.awayName}
        </p>
        <p className="mt-1 text-xs text-mist">
          {match.status === "final"
            ? "Resultado final"
            : `Guardado en el ${periodLabel(game.period)} · ${formatClock(baseClock(game))}`}
          {" · "}guardado el {formatDate(match.savedAt)}
        </p>
      </div>

      <h3 className="eyebrow mt-7 px-1 text-aqua">Parciales por tiempo</h3>
      <div className="mt-2 px-1">
        <PartialsTable game={game} />
      </div>

      <h3 className="eyebrow mt-7 px-1 text-aqua">Estadísticas · {game.homeName}</h3>
      <div className="mt-3 -mx-2 sm:mx-0">
        <StatsHeader />
        <ul>
          {ranked.map((line) => {
            const top = line.pts > 0 && line.pts === stats.best;
            return (
              <li key={line.player.id} className={cn(STAT_COLS, "rounded-2xl px-3 py-2")}>
                <span className={cn("truncate font-medium", line.pts ? "text-ink" : "text-mist")}>
                  {line.player.name}
                </span>
                <StatCells line={line} top={top} />
              </li>
            );
          })}
        </ul>
        <StatsTotals stats={stats} />
        <div className="mt-2">
          <StatsLegend />
        </div>
      </div>

      <div className="mt-7">
        {confirm ? (
          <div className="animate-fade rounded-[1.5rem] bg-white/[0.04] p-4 ring-1 ring-white/[0.08]">
            <p className="text-sm text-ink">
              {confirm === "delete"
                ? "¿Borrar este partido del historial? No se puede recuperar."
                : "En el marcador hay un partido con cambios sin guardar. Si abres este, se perderán."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-pill btn-ghost h-11" onClick={onCancel}>
                Cancelar
              </button>
              {confirm === "delete" ? (
                <button type="button" className="btn-pill btn-danger h-11" onClick={onDelete}>
                  Sí, borrar
                </button>
              ) : (
                <button type="button" className="btn-pill btn-electric h-11" onClick={onOpen}>
                  Abrir de todos modos
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button type="button" className="btn-pill btn-electric h-12" onClick={onAskOpen}>
              <ArrowUpRight className="size-4" />
              {match.status === "live" ? "Seguir en el marcador" : "Abrir en el marcador"}
            </button>
            <button type="button" className="btn-pill btn-danger h-12" onClick={onAskDelete}>
              <Trash2 className="size-4" />
              Borrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
