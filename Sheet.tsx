import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface SheetProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Hoja modal: sube desde abajo en móvil y aparece centrada en pantallas grandes. */
export function Sheet({ title, eyebrow, onClose, onBack, children, footer, wide }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active) || active === panel) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade bg-navy-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-sheet flex-col overflow-hidden rounded-t-[2.25rem] bg-navy-850 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10 outline-none sm:max-h-[88dvh] sm:rounded-[2.25rem]",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" aria-hidden="true" />
        <header className="flex shrink-0 items-start gap-3 px-5 pt-4 pb-4 sm:px-8 sm:pt-7">
          {onBack && (
            <button type="button" onClick={onBack} className="btn-round -ml-1" aria-label="Volver al historial">
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="eyebrow truncate text-aqua">{eyebrow}</p>}
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-round -mr-1" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </header>
        <div className="scroll-soft min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-8 sm:pb-8">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-white/[0.06] bg-navy-900/60 px-5 py-4 sm:px-8">{footer}</footer>
        )}
      </div>
    </div>
  );
}
