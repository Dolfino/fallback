import { useDeferredValue, useMemo, useState } from "react";
import { ListControlsCard } from "../components/ui/ListControls";
import { getWorkTimeline } from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { WorkDetailPanel } from "../components/domain/WorkDetailPanel";
import { WorkItemCard } from "../components/domain/WorkItemCard";

export function WorksPage({ controller }: { controller: PlannerController }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const filteredWorks = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return controller.plannerData.trabalhos;
    }

    return controller.plannerData.trabalhos.filter((item) =>
      [item.titulo, item.descricao, item.clienteProjeto, item.categoria]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [controller.plannerData.trabalhos, deferredSearch]);
  const trabalho =
    filteredWorks.find((item) => item.id === controller.selectedWorkId) ?? filteredWorks[0];
  const timeline = trabalho ? getWorkTimeline(controller.plannerData, trabalho.id) : [];
  const dependencias = controller.plannerData.dependencias.filter((item) => item.trabalhoId === trabalho?.id);
  const registros = controller.plannerData.registros.filter((registro) => {
    const allocation = controller.plannerData.alocacoes.find((item) => item.id === registro.alocacaoId);
    const block = controller.plannerData.blocos.find((item) => item.id === allocation?.blocoId);
    return block?.trabalhoId === trabalho?.id;
  });

  return (
    <div className="grid h-full grid-cols-[380px_minmax(0,1fr)] gap-5">
      <div className="scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <ListControlsCard
          hint={`${filteredWorks.length} ${filteredWorks.length === 1 ? "trabalho visível" : "trabalhos visíveis"}`}
          search={{
            label: "Busca de trabalhos",
            onChange: setSearch,
            placeholder: "Buscar trabalho, projeto ou categoria",
            value: search,
          }}
        />

        {filteredWorks.length ? (
          filteredWorks.map((item) => (
            <WorkItemCard
              key={item.id}
              onOpen={(workId) => {
                controller.selectWork(workId);
                controller.navigate("work-detail");
              }}
              searchTerm={search}
              trabalho={item}
            />
          ))
        ) : (
          <section className="rounded-[32px] border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500 shadow-panel">
            Nenhum trabalho encontrado para esta busca.
          </section>
        )}
      </div>
      <div className="scrollbar-thin overflow-y-auto pr-1">
        <WorkDetailPanel
          dependencias={dependencias}
          registros={registros}
          searchTerm={search}
          timeline={timeline}
          trabalho={trabalho}
        />
      </div>
    </div>
  );
}
