import type { ReviewItemView, ReviewOption, RescheduleReviewStatus } from "../../types/domain";
import { formatDateShort, formatMinutes } from "../../utils/format";
import { StatusBadge } from "../ui/StatusBadge";

interface RescheduleReviewPanelProps {
  items: ReviewItemView[];
  onAccept: (allocationId: string, target?: ReviewOption) => void;
  onDefer: (allocationId: string) => void;
  onIgnore: (allocationId: string) => void;
  onOpenWork?: (workId: string) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

function reviewTone(status: RescheduleReviewStatus) {
  const styles = {
    pending: "bg-slate-100 text-slate-700",
    accepted: "bg-emerald-100 text-emerald-800",
    deferred: "bg-amber-100 text-amber-800",
    ignored: "bg-slate-200 text-slate-600",
  };

  return styles[status];
}

function targetChipLabel(target?: ReviewOption) {
  if (!target) {
    return "Sem encaixe sugerido";
  }

  return `${target.slotLabel} • ${formatDateShort(target.date)}`;
}

export function RescheduleReviewPanel({
  items,
  onAccept,
  onDefer,
  onIgnore,
  onOpenWork,
  title = "Revisão assistida de remarcações",
  subtitle = "Compare sugerido e aceito sem sair do fluxo operacional.",
  compact = false,
}: RescheduleReviewPanelProps) {
  return (
    <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Revisão assistida</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <article key={item.allocationId} className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${reviewTone(item.reviewStatus)}`}>
                      {item.reviewStatus === "pending"
                        ? "Pendente"
                        : item.reviewStatus === "accepted"
                          ? "Aceito"
                          : item.reviewStatus === "deferred"
                            ? "Adiado"
                            : "Ignorado"}
                    </span>
                  </div>
                  <h4 className="mt-3 text-base font-semibold tracking-tight text-slate-900">{item.title}</h4>
                  <p className="mt-2 text-sm text-slate-600">
                    {item.currentSlotLabel} • saldo {formatMinutes(item.saldoRestanteMin)}
                  </p>
                </div>

                {onOpenWork ? (
                  <button
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                    onClick={() => onOpenWork(item.workId)}
                    type="button"
                  >
                    Abrir trabalho
                  </button>
                ) : null}
              </div>

              <p className="mt-3 text-sm font-medium text-slate-700">{item.motivo}</p>
              {item.pressureNote ? <p className="mt-2 text-sm text-slate-600">{item.pressureNote}</p> : null}

              <div className={`mt-4 ${compact ? "space-y-3" : "grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3"}`}>
                <div className="rounded-3xl border border-accent/15 bg-white px-4 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Sugerido</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {targetChipLabel(item.suggestedOption)}
                  </p>
                  {item.suggestedOption ? (
                    <>
                      <p className="mt-2 text-sm text-slate-600">{item.suggestedOption.decisionRationale}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
                          {item.suggestedOption.tradeoff.label}
                        </span>
                        <span className="text-xs text-slate-500">{item.suggestedOption.tradeoff.effect}</span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Sem encaixe simples no horizonte visível.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Aceito</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {targetChipLabel(item.acceptedOption)}
                  </p>
                  {item.acceptedOption ? (
                    <>
                      <p className="mt-2 text-sm text-slate-600">{item.acceptedOption.impactSummary}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          {item.acceptedOption.tradeoff.label}
                        </span>
                        <span className="text-xs text-slate-500">{item.acceptedOption.tradeoff.effect}</span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">Nenhum encaixe confirmado ainda.</p>
                  )}
                </div>
              </div>

              {item.comparisonNote ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {item.comparisonNote}
                </div>
              ) : null}

              {item.alternatives.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.alternatives.slice(0, 5).map((target, index) => (
                    <button
                      key={`${item.allocationId}-${target.slotId}-${target.date}`}
                      className={`rounded-2xl border px-3 py-2 text-sm font-medium ${
                        target.isSuggested
                          ? "border-accent/20 bg-accent-soft text-accent-ink"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                      onClick={() => onAccept(item.allocationId, target)}
                      type="button"
                    >
                      {target.isSuggested
                        ? "Aceitar sugerido"
                        : `Trocar para ${target.slotLabel} • ${formatDateShort(target.date)}`}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  onClick={() => onDefer(item.allocationId)}
                  type="button"
                >
                  Adiar decisão
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  onClick={() => onIgnore(item.allocationId)}
                  type="button"
                >
                  Ignorar por agora
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Sem remarcações pedindo revisão neste momento.
          </div>
        )}
      </div>
    </section>
  );
}
