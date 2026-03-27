import { Fragment } from "react";
import { GripVertical } from "lucide-react";
import type { Alocacao, Bloco, Slot, Trabalho } from "../../types/planner";
import { formatWeekday } from "../../utils/format";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";

interface WeekCell {
  date: string;
  slot: Slot;
  alocacao?: Alocacao;
  bloco?: Bloco;
  trabalho?: Trabalho;
  hidden: boolean;
}

interface WeekGridRow {
  slot: Slot;
  cells: WeekCell[];
}

interface WeekGridProps {
  rows: WeekGridRow[];
  selectedKey: string;
  onSelectCell: (date: string, slotId: string) => void;
}

export function WeekGrid({ rows, selectedKey, onSelectCell }: WeekGridProps) {
  const weekDates = rows[0]?.cells.map((cell) => cell.date) ?? [];

  return (
    <section className="min-h-0 rounded-[32px] border border-black/5 bg-panel p-5 shadow-panel">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Semana operacional</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Grade de capacidade por agenda
          </h2>
        </div>
        <p className="text-sm text-slate-500">Selecione um bloco para abrir o detalhe lateral.</p>
      </div>

      <div className="scrollbar-thin overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[160px_repeat(5,minmax(160px,1fr))] gap-3">
          <div />
          {weekDates.map((date) => (
            <div
              key={date}
              className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              {formatWeekday(date)}
            </div>
          ))}

          {rows.map((row) => (
            <Fragment key={row.slot.id}>
              <div
                key={`${row.slot.id}-label`}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-4"
              >
                <p className="text-sm font-semibold text-slate-900">{row.slot.nome}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.slot.horaInicio} - {row.slot.horaFim}
                </p>
              </div>

              {row.cells.map((cell) => {
                const key = `${cell.date}-${cell.slot.id}`;
                const isSelected = key === selectedKey;

                return (
                  <button
                    key={key}
                    className={`min-h-[140px] rounded-3xl border p-4 text-left transition ${
                      isSelected
                        ? "border-shell bg-shell text-white shadow-panel"
                        : "border-slate-200 bg-white hover:border-accent/30"
                    }`}
                    onClick={() => onSelectCell(cell.date, cell.slot.id)}
                    type="button"
                  >
                    {!cell.alocacao || cell.hidden ? (
                      <div className="flex h-full flex-col justify-between">
                        <p className={isSelected ? "text-white/65" : "text-sm text-slate-400"}>
                          Livre
                        </p>
                        <p className={isSelected ? "text-white/45" : "text-xs text-slate-400"}>
                          Espaço disponível para remarcação
                        </p>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <StatusBadge status={cell.alocacao.statusAlocacao} />
                            <GripVertical className={isSelected ? "h-4 w-4 text-white/50" : "h-4 w-4 text-slate-300"} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>
                              {cell.trabalho?.titulo}
                            </p>
                            <p className={`mt-1 text-xs ${isSelected ? "text-white/65" : "text-slate-500"}`}>
                              Bloco {cell.bloco?.sequencia}/{cell.bloco?.totalBlocos}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <PriorityBadge prioridade={cell.trabalho?.prioridade ?? "media"} />
                          <span className={`text-xs ${isSelected ? "text-white/70" : "text-slate-500"}`}>
                            mover
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
