import type { PlannerController } from "../hooks/usePlannerState";

const startupViewLabels = {
  today: "Hoje",
  week: "Semana",
  agendas: "Agendas",
  works: "Trabalhos",
  requests: "Solicitações",
  blockings: "Bloqueios",
  capacity: "Capacidade",
  closing: "Fechamento do Dia",
  settings: "Configurações",
};

export function SettingsPage({ controller }: { controller: PlannerController }) {
  const preferences = controller.preferences;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5 rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Configurações</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Parâmetros operacionais</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Preferências reais de abertura, persistência local e restauração do ambiente.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Tela inicial</span>
            <select
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              onChange={(event) =>
                controller.updatePreferences({
                  startupView: event.target.value as keyof typeof startupViewLabels,
                })
              }
              value={preferences.startupView}
            >
              {Object.entries(startupViewLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm text-slate-500">
              Usada no próximo carregamento ou quando você restaurar o ambiente local.
            </p>
          </label>

          <label className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Data base local</span>
            <input
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              onChange={(event) =>
                controller.updatePreferences({
                  localReferenceDate: event.target.value,
                })
              }
              type="date"
              value={preferences.localReferenceDate}
            />
            <p className="mt-3 text-sm text-slate-500">
              Define a seed do modo local para reinício reprodutível da semana operacional.
            </p>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <input
              checked={preferences.persistLocalState}
              className="mt-1 h-4 w-4 rounded border-slate-300"
              onChange={(event) =>
                controller.updatePreferences({
                  persistLocalState: event.target.checked,
                })
              }
              type="checkbox"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Persistir estado local</p>
              <p className="mt-1 text-sm text-slate-500">
                Mantém alocações, revisões e navegação local entre reinícios do navegador.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <input
              checked={preferences.defaultDetailPanelOpen}
              className="mt-1 h-4 w-4 rounded border-slate-300"
              onChange={(event) => {
                controller.updatePreferences({
                  defaultDetailPanelOpen: event.target.checked,
                });
                controller.setDetailPanelOpen(event.target.checked);
              }}
              type="checkbox"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">Painel lateral aberto por padrão</p>
              <p className="mt-1 text-sm text-slate-500">
                Define a abertura inicial do painel de detalhe ao restaurar o ambiente.
              </p>
            </div>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-shell px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={controller.isRemoteMode}
            onClick={() => controller.resetLocalWorkspace()}
            type="button"
          >
            Restaurar ambiente local agora
          </button>
          <button
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700"
            onClick={() => controller.resetPreferences()}
            type="button"
          >
            Resetar preferências
          </button>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Ambiente atual</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
            {controller.isRemoteMode ? "Backend remoto" : "Execução local"}
          </h3>
          <p className="mt-3 text-sm text-slate-600">
            {controller.isRemoteMode
              ? "A persistência principal acontece no backend remoto. As preferências abaixo continuam salvas no navegador."
              : preferences.persistLocalState
                ? "O modo local está persistindo o estado operacional no navegador."
                : "O modo local está efêmero. Ao recarregar, o sistema volta para a seed configurada."}
          </p>
        </section>

        <section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Busca global</p>
          <p className="mt-3 text-sm text-slate-600">
            A barra superior agora encontra trabalhos, clientes/projetos e bloqueios ativos, abrindo o contexto certo a partir do topo da aplicação.
          </p>
        </section>
      </aside>
    </div>
  );
}
