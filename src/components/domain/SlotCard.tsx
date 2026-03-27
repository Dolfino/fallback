import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, LockKeyhole, PlayCircle, Split, Zap } from "lucide-react";
import type { TimelineSlotItem } from "../../data/selectors";
import type { SlotFeedback } from "../../types/domain";
import { cx } from "../../utils/cx";
import { formatDateShort } from "../../utils/format";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";
import { WorkProgressBar } from "../ui/WorkProgressBar";

interface SlotCardProps {
  item: TimelineSlotItem;
  isSelected: boolean;
  suggestionCount: number;
  slotFeedback: SlotFeedback | null;
  onClick: () => void;
}

const slotShellStyles: Record<string, string> = {
  livre: "border-accent/20 bg-white hover:border-accent/40",
  planejado: "border-slate-200 bg-white hover:border-slate-300",
  em_execucao: "border-accent/30 bg-accent-soft/55",
  concluido: "border-emerald-200 bg-emerald-50/80",
  parcial: "border-amber-300 bg-amber-50",
  bloqueado: "border-danger/30 bg-danger-soft",
  remarcado: "border-indigo-300 bg-indigo-50/80",
  antecipado: "border-cyan-300 bg-cyan-50/80",
};

const railStyles: Record<string, string> = {
  livre: "bg-accent/85 text-white",
  planejado: "bg-shell text-white",
  em_execucao: "bg-accent text-white",
  concluido: "bg-emerald-600 text-white",
  parcial: "bg-amber-500 text-white",
  bloqueado: "bg-danger text-white",
  remarcado: "bg-indigo-600 text-white",
  antecipado: "bg-cyan-600 text-white",
};

function SecondarySignal({ item }: { item: TimelineSlotItem }) {
  if (item.riskLevel === "urgent" && item.riskReason) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-semibold text-warn-ink">
        <AlertTriangle className="h-3 w-3" />
        {item.riskReason}
      </span>
    );
  }

  if (item.riskLevel === "watch" && item.riskReason) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
        <Clock3 className="h-3 w-3" />
        {item.riskReason}
      </span>
    );
  }

  if (item.statusVisual === "bloqueado") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger-ink">
        <LockKeyhole className="h-3 w-3" />
        Dependência ativa
      </span>
    );
  }

  if (item.statusVisual === "parcial") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
        <Split className="h-3 w-3" />
        Ficou parcial
      </span>
    );
  }

  if (item.statusVisual === "antecipado") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-800">
        <Zap className="h-3 w-3" />
        Puxado de outra data
      </span>
    );
  }

  if (item.statusVisual === "remarcado") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-800">
        <ArrowUpRight className="h-3 w-3" />
        Remarcado hoje
      </span>
    );
  }

  if (item.trabalho?.emRisco) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-semibold text-warn-ink">
        <AlertTriangle className="h-3 w-3" />
        Prazo em risco
      </span>
    );
  }

  return null;
}

export function SlotCard({
  item,
  isSelected,
  suggestionCount,
  slotFeedback,
  onClick,
}: SlotCardProps) {
  const timeLabel = `${item.slot.horaInicio} - ${item.slot.horaFim}`;
  const feedbackToneStyles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-warn/20 bg-warn-soft text-warn-ink",
    critical: "border-danger/20 bg-danger-soft text-danger-ink",
    opportunity: "border-accent/20 bg-accent-soft text-accent-ink",
  };

  return (
    <button
      className={cx(
        "grid w-full grid-cols-[152px_1fr] gap-4 rounded-[30px] border p-4 text-left shadow-panel transition",
        slotShellStyles[item.statusVisual],
        isSelected && "ring-2 ring-shell/10",
        slotFeedback && "ring-2 ring-current/10",
      )}
      onClick={onClick}
      type="button"
    >
      <div className={cx("rounded-[26px] px-4 py-4", railStyles[item.statusVisual])}>
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/65">{item.slot.nome}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{timeLabel}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{item.slot.perfil}</span>
        </div>
      </div>

      {!item.alocacao || !item.trabalho || !item.bloco ? (
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <StatusBadge status="livre" />
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                  Slot livre pronto para uso
                </h3>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-ink">
                {suggestionCount} sugest{suggestionCount === 1 ? "ão" : "ões"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Há folga real nesta agenda. Se puxar um bloco futuro agora, o sistema reduz ociosidade sem comprometer a sequência do dia.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-accent-soft px-3 py-2 text-xs font-semibold text-accent-ink">
              <PlayCircle className="h-3.5 w-3.5" />
              Usar este slot
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              Puxar bloco sugerido
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.statusVisual} />
                {item.trabalho.prioridade !== "baixa" ? (
                  <PriorityBadge prioridade={item.trabalho.prioridade} />
                ) : null}
                <SecondarySignal item={item} />
              </div>

              <h3 className="mt-3 truncate text-xl font-semibold tracking-tight text-slate-900">
                {item.trabalho.titulo}
              </h3>
            </div>

            {item.statusVisual === "concluido" ? (
              <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600" />
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-[auto_auto_1fr] items-center gap-3 text-sm">
            <span className="rounded-full bg-white/85 px-3 py-1.5 font-semibold text-slate-700">
              Bloco {item.bloco.sequencia}/{item.bloco.totalBlocos}
            </span>
            <span className="rounded-full bg-white/85 px-3 py-1.5 font-semibold text-slate-700">
              Prazo {formatDateShort(item.trabalho.prazoData)}
            </span>
            <span className="text-right text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              {item.trabalho.clienteProjeto}
            </span>
          </div>

          <div className="mt-4">
            <WorkProgressBar value={item.trabalho.percentualConclusao} />
          </div>

          {item.dependencia ? (
            <p className="mt-4 rounded-2xl border border-danger/15 bg-white/70 px-3 py-3 text-sm font-medium text-danger-ink">
              Bloqueado por dependência: {item.dependencia.responsavelExterno}.
            </p>
          ) : item.trabalho.emRisco ? (
            <p className="mt-4 rounded-2xl border border-warn/20 bg-white/70 px-3 py-3 text-sm font-medium text-warn-ink">
              Trabalho sensível a prazo. Priorize este bloco antes de abrir novos itens.
            </p>
          ) : null}

          {slotFeedback ? (
            <div className={`mt-4 rounded-2xl border px-3 py-3 text-sm font-semibold ${feedbackToneStyles[slotFeedback.tone]}`}>
              {slotFeedback.label}
            </div>
          ) : null}
        </div>
      )}
    </button>
  );
}
