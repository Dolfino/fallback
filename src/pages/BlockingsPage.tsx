import { useDeferredValue, useMemo, useState } from "react";
import { getBlockingItems } from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { BlockingList } from "../components/domain/BlockingList";
import { ListControlsCard } from "../components/ui/ListControls";
import { SummaryCard } from "../components/ui/SummaryCard";

export function BlockingsPage({ controller }: { controller: PlannerController }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const items = getBlockingItems(controller.plannerData);
  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [
        item.trabalho?.titulo,
        item.dependencia.descricao,
        item.dependencia.responsavelExterno,
        item.politicaSugerida,
        item.efeitoCurto,
        item.politicaResumo?.effect,
        item.politicaResumo?.horizonNote,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [deferredSearch, items]);

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)] gap-5">
      <div className="space-y-5">
        <SummaryCard label="Bloqueios ativos" meta="dependências não liberadas" value={items.length} />
        <SummaryCard label="Blocos afetados" meta="efeito dominó futuro" value={items.reduce((total, item) => total + item.impactoFuturo, 0)} />
        <ListControlsCard
          hint={`${filteredItems.length} ${filteredItems.length === 1 ? "bloqueio visível" : "bloqueios visíveis"}`}
          search={{
            label: "Busca de bloqueios",
            onChange: setSearch,
            placeholder: "Buscar trabalho, responsável ou política",
            value: search,
          }}
        />
      </div>

      <div className="scrollbar-thin overflow-y-auto pr-1">
        {filteredItems.length ? (
          <BlockingList
            items={filteredItems}
            onApplyPolicy={controller.applyDependencyPolicy}
            onResolve={controller.resolveDependency}
            searchTerm={search}
          />
        ) : (
          <section className="rounded-[32px] border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500 shadow-panel">
            Nenhum bloqueio encontrado para esta busca.
          </section>
        )}
      </div>
    </div>
  );
}
