import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { EtapaTrabalho, Prioridade } from "../../types/planner";
import { formatMinutes } from "../../utils/format";

interface NewWorkSubtaskInput extends EtapaTrabalho {}

interface NewWorkFormProps {
  defaultStartDate: string;
  defaultDeadline: string;
  simulateForecast: (minutes: number) => string;
  onSubmit: (input: {
    titulo: string;
    descricao: string;
    etapas: EtapaTrabalho[];
    duracaoEstimadaMin: number;
    prazoData: string;
    prioridade: Prioridade;
    dataInicioMinima: string;
    fragmentavel: boolean;
    blocoMinimoMin: number;
    exigeSequencia: boolean;
    permiteAntecipacao: boolean;
    solicitante: string;
    area: string;
    clienteProjeto: string;
    observacoes: string;
  }) => void;
}

export function NewWorkForm({
  defaultStartDate,
  defaultDeadline,
  simulateForecast,
  onSubmit,
}: NewWorkFormProps) {
  const [subtasks, setSubtasks] = useState<NewWorkSubtaskInput[]>([]);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    duracaoEstimadaMin: 90,
    prazoData: defaultDeadline,
    prioridade: "media" as Prioridade,
    dataInicioMinima: defaultStartDate,
    fragmentavel: true,
    blocoMinimoMin: 25,
    exigeSequencia: true,
    permiteAntecipacao: true,
    solicitante: "Operações",
    area: "Operações",
    clienteProjeto: "",
    observacoes: "",
  });

  const subtasksTotalMinutes = useMemo(
    () => subtasks.reduce((total, item) => total + Math.max(0, item.duracaoEstimadaMin || 0), 0),
    [subtasks],
  );

  const totalBlocks = useMemo(
    () => Math.max(1, Math.ceil(form.duracaoEstimadaMin / form.blocoMinimoMin)),
    [form.blocoMinimoMin, form.duracaoEstimadaMin],
  );

  const addSubtask = () => {
    setSubtasks((current) => [
      ...current,
      {
        id: `etapa-${Date.now()}-${current.length + 1}`,
        titulo: "",
        descricao: "",
        duracaoEstimadaMin: 25,
      },
    ]);
  };

  const updateSubtask = (
    subtaskId: string,
    field: keyof Omit<NewWorkSubtaskInput, "id">,
    value: string | number,
  ) => {
    setSubtasks((current) =>
      current.map((item) =>
        item.id === subtaskId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const removeSubtask = (subtaskId: string) => {
    setSubtasks((current) => current.filter((item) => item.id !== subtaskId));
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...form,
          etapas: subtasks
            .map((item) => ({
              ...item,
              titulo: item.titulo.trim(),
              descricao: item.descricao.trim(),
            }))
            .filter((item) => item.titulo),
        });
      }}
    >
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Essencial</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Novo trabalho</h2>
          <p className="mt-2 text-sm text-slate-500">
            Cadastro enxuto com regras suficientes para o sistema distribuir blocos sem atrito.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="col-span-2 space-y-2">
            <span className="text-sm font-medium text-slate-700">Título</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-0 transition focus:border-accent"
              onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
              placeholder="Ex.: Revisar pacote executivo do cliente Atlas"
              value={form.titulo}
            />
          </label>

          <label className="col-span-2 space-y-2">
            <span className="text-sm font-medium text-slate-700">Descrição curta</span>
            <textarea
              className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
              placeholder="Explique o resultado esperado em linguagem operacional."
              value={form.descricao}
            />
          </label>

          <div className="col-span-2 rounded-[28px] border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Subtarefas</p>
                <p className="mt-1 text-xs text-slate-500">
                  Quebre o trabalho em etapas internas com duração estimada para cada uma.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-accent hover:text-accent-ink"
                onClick={addSubtask}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Adicionar subtarefa
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {subtasks.length ? (
                subtasks.map((item, index) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Subtarefa {index + 1}
                      </p>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                        onClick={() => removeSubtask(item.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_140px] gap-3">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Título da subtarefa</span>
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
                          onChange={(event) => updateSubtask(item.id, "titulo", event.target.value)}
                          placeholder="Ex.: Planejamento de cronograma"
                          value={item.titulo}
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Duração estimada</span>
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
                          min={5}
                          onChange={(event) =>
                            updateSubtask(item.id, "duracaoEstimadaMin", Number(event.target.value))
                          }
                          step={5}
                          type="number"
                          value={item.duracaoEstimadaMin}
                        />
                      </label>

                      <label className="col-span-2 space-y-2">
                        <span className="text-sm font-medium text-slate-700">Descrição da subtarefa</span>
                        <textarea
                          className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
                          onChange={(event) => updateSubtask(item.id, "descricao", event.target.value)}
                          placeholder="Descreva o que precisa ser concluído nesta etapa."
                          value={item.descricao}
                        />
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                  Ainda sem subtarefas. Adicione etapas internas se quiser decompor o trabalho antes de distribuir os blocos.
                </div>
              )}
            </div>

            {subtasks.length ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3">
                <p className="text-sm text-slate-600">
                  Soma das subtarefas:{" "}
                  <span className="font-semibold text-slate-900">{formatMinutes(subtasksTotalMinutes)}</span>
                </p>
                <button
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-accent hover:text-accent-ink"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      duracaoEstimadaMin: Math.max(current.blocoMinimoMin, subtasksTotalMinutes),
                    }))
                  }
                  type="button"
                >
                  Usar soma no total estimado
                </button>
              </div>
            ) : null}
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Duração estimada</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              min={25}
              onChange={(event) =>
                setForm((current) => ({ ...current, duracaoEstimadaMin: Number(event.target.value) }))
              }
              step={5}
              type="number"
              value={form.duracaoEstimadaMin}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Prazo</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) => setForm((current) => ({ ...current, prazoData: event.target.value }))}
              type="date"
              value={form.prazoData}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Prioridade</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) =>
                setForm((current) => ({ ...current, prioridade: event.target.value as Prioridade }))
              }
              value={form.prioridade}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Regras do trabalho</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Data mínima de início</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) =>
                setForm((current) => ({ ...current, dataInicioMinima: event.target.value }))
              }
              type="date"
              value={form.dataInicioMinima}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Bloco mínimo</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              min={25}
              onChange={(event) =>
                setForm((current) => ({ ...current, blocoMinimoMin: Number(event.target.value) }))
              }
              step={5}
              type="number"
              value={form.blocoMinimoMin}
            />
          </label>

          {[
            { key: "fragmentavel", label: "Fragmentável" },
            { key: "exigeSequencia", label: "Exige sequência" },
            { key: "permiteAntecipacao", label: "Permite antecipação" },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
              <input
                checked={form[item.key as keyof typeof form] as boolean}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [item.key]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Contexto</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Solicitante</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) => setForm((current) => ({ ...current, solicitante: event.target.value }))}
              value={form.solicitante}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Área</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
              value={form.area}
            />
          </label>
          <label className="col-span-2 space-y-2">
            <span className="text-sm font-medium text-slate-700">Cliente / Projeto</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) =>
                setForm((current) => ({ ...current, clienteProjeto: event.target.value }))
              }
              value={form.clienteProjeto}
            />
          </label>
          <label className="col-span-2 space-y-2">
            <span className="text-sm font-medium text-slate-700">Observações</span>
            <textarea
              className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-accent"
              onChange={(event) =>
                setForm((current) => ({ ...current, observacoes: event.target.value }))
              }
              value={form.observacoes}
            />
          </label>
        </div>
      </section>

      <section className="rounded-[32px] border border-accent/15 bg-accent-soft p-6 text-accent-ink shadow-panel">
        <p className="text-sm font-semibold">Feedback inteligente</p>
        <div className="mt-3 space-y-2 text-sm">
          <p>
            {formatMinutes(form.duracaoEstimadaMin)} equivale a {totalBlocks} blocos de{" "}
            {form.blocoMinimoMin} min.
          </p>
          <p>Com a capacidade atual, previsão de conclusão: {simulateForecast(form.duracaoEstimadaMin)}.</p>
        </div>
        <button
          className="mt-5 rounded-2xl bg-shell px-4 py-3 text-sm font-medium text-white"
          type="submit"
        >
          Criar trabalho
        </button>
      </section>
    </form>
  );
}
