import { CheckCircle2, CircleDashed, Clock3, LockKeyhole, TimerReset } from "lucide-react";
import {
  getAppliedDependencyPolicies,
  getDailyClosingGroups,
  getDailyClosingSummary,
  getSummaryForDate,
  getTomorrowPreview,
} from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { DailyClosingPanel } from "../components/domain/DailyClosingPanel";
import { SummaryCard } from "../components/ui/SummaryCard";

export function DailyClosingPage({ controller }: { controller: PlannerController }) {
  const groups = getDailyClosingGroups(controller.plannerData, controller.selectedDate);
  const summary = getSummaryForDate(controller.plannerData, controller.selectedDate);
  const closing = getDailyClosingSummary(controller.plannerData, controller.selectedDate);
  const tomorrow = getTomorrowPreview(controller.plannerData, controller.selectedDate);
  const appliedPolicies = getAppliedDependencyPolicies(controller.plannerData);

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)] gap-5">
      <div className="space-y-5">
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Concluídos" meta="execuções encerradas no dia" value={groups.concluidos.length} />
        <SummaryCard icon={<CircleDashed className="h-5 w-5" />} label="Parciais" meta="saldo ainda precisa voltar para a agenda" value={groups.parciais.length} />
        <SummaryCard icon={<TimerReset className="h-5 w-5" />} label="Replanejar" meta="itens que exigem novo encaixe" value={closing.replanejaveis} />
        <SummaryCard icon={<LockKeyhole className="h-5 w-5" />} label="Bloqueados" meta="dependências externas ativas" value={groups.bloqueados.length} />
        <SummaryCard icon={<Clock3 className="h-5 w-5" />} label="Leitura final" meta={closing.mensagem} value={summary.riscos} />
      </div>

      <div className="scrollbar-thin overflow-y-auto pr-1">
        <DailyClosingPanel
          groups={groups}
          appliedPolicies={appliedPolicies}
          onAcceptReview={controller.applyRescheduleReview}
          onAutoReplan={controller.autoReplanDay}
          onDeferReview={controller.deferRescheduleReview}
          onIgnoreReview={controller.ignoreRescheduleReview}
          onOpenWork={(workId) => {
            controller.selectWork(workId);
            controller.navigate("work-detail");
          }}
          reviewItems={controller.rescheduleReviewItems}
          tomorrow={tomorrow}
        />
      </div>
    </div>
  );
}
