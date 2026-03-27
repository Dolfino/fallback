import { ArrowUpRight } from "lucide-react";
import type { Trabalho } from "../../types/planner";
import { formatDateShort, formatMinutes } from "../../utils/format";
import { HighlightedText } from "../ui/HighlightedText";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";
import { WorkProgressBar } from "../ui/WorkProgressBar";

interface WorkItemCardProps {
  trabalho: Trabalho;
  onOpen?: (workId: string) => void;
  searchTerm?: string;
}

export function WorkItemCard({ trabalho, onOpen, searchTerm }: WorkItemCardProps) {
  return (
    <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={trabalho.status} />
            <PriorityBadge prioridade={trabalho.prioridade} />
          </div>
          <div>
            <HighlightedText
              className="block text-lg font-semibold tracking-tight text-slate-900"
              query={searchTerm}
              text={trabalho.titulo}
            />
            <HighlightedText
              className="mt-1 block text-sm text-slate-500"
              query={searchTerm}
              text={trabalho.clienteProjeto}
            />
          </div>
        </div>

        {onOpen ? (
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
            onClick={() => onOpen(trabalho.id)}
            type="button"
          >
            Abrir
            <ArrowUpRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <HighlightedText
        className="mt-4 block text-sm text-slate-600"
        query={searchTerm}
        text={trabalho.descricao}
      />

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Prazo</p>
          <p className="mt-1 font-semibold text-slate-900">{formatDateShort(trabalho.prazoData)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estimado</p>
          <p className="mt-1 font-semibold text-slate-900">{formatMinutes(trabalho.duracaoEstimadaMin)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Realizado</p>
          <p className="mt-1 font-semibold text-slate-900">{formatMinutes(trabalho.duracaoRealizadaMin)}</p>
        </div>
      </div>

      <div className="mt-4">
        <WorkProgressBar value={trabalho.percentualConclusao} />
      </div>
    </article>
  );
}
