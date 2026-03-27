import {
  CalendarDays,
  Clock3,
  CheckSquare,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  PanelLeftClose,
  Settings,
  Sparkles,
  SquareKanban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppView } from "../../types/ui";
import { cx } from "../../utils/cx";

interface SidebarProps {
  activeView: AppView;
  isOpen: boolean;
  onNavigate: (view: AppView) => void;
  onClose: () => void;
}

const items: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
  { id: "today", label: "Hoje", icon: LayoutDashboard },
  { id: "week", label: "Semana", icon: CalendarDays },
  { id: "agendas", label: "Agendas", icon: Clock3 },
  { id: "works", label: "Trabalhos", icon: SquareKanban },
  { id: "requests", label: "Solicitações", icon: Sparkles },
  { id: "blockings", label: "Bloqueios", icon: LockKeyhole },
  { id: "capacity", label: "Capacidade", icon: Gauge },
  { id: "closing", label: "Fechamento do Dia", icon: CheckSquare },
  { id: "settings", label: "Configurações", icon: Settings },
];

export function Sidebar({ activeView, isOpen, onNavigate, onClose }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-shell px-5 py-6 text-white shadow-2xl transition-transform duration-200 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="mb-8 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/60">
            Planejamento operacional
          </span>
          <button
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de controle</h1>
          <p className="mt-2 text-sm text-white/60">
            Capacidade, execução, remarcação e visão única do dia de trabalho.
          </p>
        </div>
      </div>

      <nav className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeView;

          return (
            <button
              key={item.id}
              className={cx(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition",
                isActive
                  ? "bg-white text-shell shadow-lg"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              type="button"
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">Modo do dia</p>
        <p className="mt-2 text-sm font-medium">Execução assistida</p>
        <p className="mt-1 text-sm text-white/60">
          O sistema destaca capacidade livre e sugere antecipações seguras.
        </p>
      </div>
    </aside>
  );
}
