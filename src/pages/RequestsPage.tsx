import { useDeferredValue, useMemo, useState } from "react";
import { getCapacitySummary } from "../data/selectors";
import type { PlannerController } from "../hooks/usePlannerState";
import { formatDateShort, formatMinutes } from "../utils/format";
import { HighlightedText } from "../components/ui/HighlightedText";
import { ListControlsCard } from "../components/ui/ListControls";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PriorityBadge } from "../components/ui/PriorityBadge";

export function RequestsPage({ controller }: { controller: PlannerController }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [form, setForm] = useState({
    tituloInicial: "",
    descricaoInicial: "",
    solicitante: "Operações",
    area: "Operações",
    prazoSugerido: controller.selectedDate,
    urgenciaInformada: "media" as const,
    esforcoEstimadoInicialMin: 60,
  });
  const capacity = getCapacitySummary(controller.plannerData);
  const filteredRequests = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return controller.plannerData.solicitacoes;
    }

    return controller.plannerData.solicitacoes.filter((solicitacao) =>
      [
        solicitacao.tituloInicial,
        solicitacao.descricaoInicial,
        solicitacao.solicitante,
        solicitacao.area,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [controller.plannerData.solicitacoes, deferredSearch]);

  return (
    <div className="grid h-full grid-cols-[340px_minmax(0,1fr)_320px] gap-5">
      <form
        className="space-y-4 rounded-[32px] border border-black/5 bg-white p-5 shadow-panel"
        onSubmit={(event) => {
          event.preventDefault();
          controller.addRequest(form);
        }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Nova solicitação</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Triagem rápida</h2>
        </div>
        <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" placeholder="Título inicial" value={form.tituloInicial} onChange={(event) => setForm((current) => ({ ...current, tituloInicial: event.target.value }))} />
        <textarea className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" placeholder="Contexto da demanda" value={form.descricaoInicial} onChange={(event) => setForm((current) => ({ ...current, descricaoInicial: event.target.value }))} />
        <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" value={form.solicitante} onChange={(event) => setForm((current) => ({ ...current, solicitante: event.target.value }))} />
        <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} />
        <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" type="date" value={form.prazoSugerido} onChange={(event) => setForm((current) => ({ ...current, prazoSugerido: event.target.value }))} />
        <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" min={25} step={5} type="number" value={form.esforcoEstimadoInicialMin} onChange={(event) => setForm((current) => ({ ...current, esforcoEstimadoInicialMin: Number(event.target.value) }))} />
        <button className="w-full rounded-2xl bg-shell px-4 py-3 text-sm font-medium text-white" type="submit">
          Registrar solicitação
        </button>
      </form>

      <section className="scrollbar-thin overflow-y-auto rounded-[32px] border border-black/5 bg-panel p-5 shadow-panel">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Fila de entrada</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Solicitações</h2>
        </div>
        <div className="mb-4">
          <ListControlsCard
            hint={`${filteredRequests.length} ${filteredRequests.length === 1 ? "solicitação visível" : "solicitações visíveis"} na fila`}
            search={{
              label: "Busca de solicitações",
              onChange: setSearch,
              placeholder: "Buscar solicitação, solicitante ou área",
              value: search,
            }}
          />
        </div>
        <div className="space-y-4">
          {filteredRequests.length ? (
            filteredRequests.map((solicitacao) => (
              <article key={solicitacao.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <StatusBadge status={solicitacao.statusTriagem} />
                  <PriorityBadge prioridade={solicitacao.urgenciaInformada} />
                </div>
                <HighlightedText
                  className="mt-3 block text-lg font-semibold tracking-tight text-slate-900"
                  query={search}
                  text={solicitacao.tituloInicial}
                />
                <HighlightedText
                  className="mt-2 block text-sm text-slate-600"
                  query={search}
                  text={solicitacao.descricaoInicial}
                />
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                  <HighlightedText query={search} text={solicitacao.solicitante} />
                  <span>{formatDateShort(solicitacao.prazoSugerido)}</span>
                  <span>{formatMinutes(solicitacao.esforcoEstimadoInicialMin)}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
              Nenhuma solicitação encontrada para esta busca.
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Impacto estimado</h3>
          <p className="mt-3 text-sm text-slate-600">
            Capacidade livre da semana atual: {capacity.livreLabel}. Solicitações em triagem ainda não consomem agenda fixa.
          </p>
        </section>
        <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Leitura operacional</h3>
          <p className="mt-3 text-sm text-slate-600">
            Há uma solicitação em triagem com urgência alta. Se virar trabalho esta semana, tende a competir com blocos do relatório mensal.
          </p>
        </section>
      </aside>
    </div>
  );
}
