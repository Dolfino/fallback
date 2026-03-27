import { ArrowUpRight, Clock3, Focus, LockKeyhole } from "lucide-react";
import type { SuggestionItem, TimelineSlotItem } from "../../data/selectors";
import { cx } from "../../utils/cx";
import { formatDateShort, formatWeekday } from "../../utils/format";
import { HighlightedText } from "../ui/HighlightedText";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";

interface AgendaItemCardProps {
  date: string;
  item: TimelineSlotItem;
  isSelected: boolean;
  suggestions: SuggestionItem[];
  onOpen: () => void;
  searchTerm?: string;
  showDate?: boolean;
}

export function AgendaItemCard({
  date,
  item,
  isSelected,
  suggestions,
  onOpen,
  searchTerm,
  showDate = false,
}: AgendaItemCardProps) {
  const ocupado = Boolean(item.alocacao && item.trabalho && item.bloco);

  return (
    <button
      className={cx(
        "w-full rounded-[30px] border p-5 text-left shadow-panel transition",
        ocupado ? "border-black/5 bg-white hover:border-slate-300" : "border-accent/15 bg-accent-soft/60 hover:border-accent/30",
        isSelected && "ring-2 ring-shell/10",
      )}
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ocupado ? item.statusVisual : "livre"} />
            {item.trabalho ? <PriorityBadge prioridade={item.trabalho.prioridade} /> : null}
          </div>
          <HighlightedText
            className="mt-3 block text-lg font-semibold tracking-tight text-slate-900"
            query={searchTerm}
            text={item.slot.nome}
          />
          <p className="mt-1 text-sm text-slate-500">
            {item.slot.horaInicio} - {item.slot.horaFim}
          </p>
          {showDate ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              {formatWeekday(date)} • {formatDateShort(date)}
            </p>
          ) : null}
        </div>

        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
          Abrir
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      {ocupado && item.trabalho && item.bloco ? (
        <>
          <div className="mt-4">
            <HighlightedText
              className="block text-base font-semibold tracking-tight text-slate-900"
              query={searchTerm}
              text={item.trabalho.titulo}
            />
            <HighlightedText
              className="mt-1 block text-sm text-slate-500"
              query={searchTerm}
              text={item.trabalho.clienteProjeto}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bloco</p>
              <p className="mt-1 font-semibold text-slate-900">
                {item.bloco.sequencia}/{item.bloco.totalBlocos}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Prazo</p>
              <p className="mt-1 font-semibold text-slate-900">{formatDateShort(item.trabalho.prazoData)}</p>
            </div>
          </div>

          {item.dependencia ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink">
              <LockKeyhole className="h-4 w-4" />
              Dependência ativa
            </p>
          ) : item.riskReason ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-warn-soft px-3 py-2 text-sm font-medium text-warn-ink">
              <Focus className="h-4 w-4" />
              {item.riskReason}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="mt-4">
            <p className="text-base font-semibold tracking-tight text-slate-900">Slot livre</p>
            <p className="mt-1 text-sm text-slate-600">
              {suggestions[0]
                ? (
                  <>
                    Pode puxar{" "}
                    <HighlightedText
                      className="font-medium text-slate-700"
                      query={searchTerm}
                      text={suggestions[0].trabalho.titulo}
                    />{" "}
                    sem perder cadência do dia.
                  </>
                )
                : "Sem trabalho alocado nesta agenda agora."}
            </p>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-accent-ink">
            <Clock3 className="h-4 w-4" />
            {suggestions.length
              ? `${suggestions.length} sugest${suggestions.length === 1 ? "ão" : "ões"} para ocupar`
              : "Agenda disponível"}
          </div>
        </>
      )}
    </button>
  );
}
