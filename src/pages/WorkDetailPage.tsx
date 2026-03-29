import { getWorkTimeline } from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { WorkDetailPanel } from "../components/domain/WorkDetailPanel";

export function WorkDetailPage({ controller }: { controller: PlannerController }) {
  const trabalho = controller.plannerData.trabalhos.find((item) => item.id === controller.selectedWorkId);
  const timeline = trabalho ? getWorkTimeline(controller.plannerData, trabalho.id) : [];
  const issues = controller.plannerData.issues.filter((issue) => issue.trabalhoId === trabalho?.id);
  const dependencias = controller.plannerData.dependencias.filter((item) => item.trabalhoId === trabalho?.id);
  const registros = controller.plannerData.registros.filter((registro) => {
    const allocation = controller.plannerData.alocacoes.find((item) => item.id === registro.alocacaoId);
    const block = controller.plannerData.blocos.find((item) => item.id === allocation?.blocoId);
    return block?.trabalhoId === trabalho?.id;
  });

  return (
    <WorkDetailPanel
      dependencias={dependencias}
      issues={issues}
      onCreateIssue={controller.addIssue}
      onUpdateIssue={controller.updateIssue}
      onUpdateWork={controller.updateWork}
      registros={registros}
      timeline={timeline}
      trabalho={trabalho}
    />
  );
}
