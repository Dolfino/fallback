import type { Dependencia, RegistroExecucao, Trabalho } from "../../types/planner";
import { formatDateShort, formatMinutes } from "../../utils/format";
import { HighlightedText } from "../ui/HighlightedText";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";
import { WorkProgressBar } from "../ui/WorkProgressBar";

interface WorkDetailPanelProps {
  trabalho?: Trabalho;
  timeline: Array<{
    bloco: {
      id: string;
      sequencia: number;
      totalBlocos: number;
      duracaoPlanejadaMin: number;
      status: string;
      foiAntecipado: boolean;
      foiRemarcado: boolean;
    };
    alocacao?: {
      dataPlanejada: string;
      slotId: string;
      statusAlocacao: string;
    };
  }>;
  dependencias: Dependencia[];
  registros: RegistroExecucao[];
  searchTerm?: string;
}

export function WorkDetailPanel({
  trabalho,
  timeline,
  dependencias,
  registros,
  searchTerm,
}: WorkDetailPanelProps) {
  if (!trabalho) {
    return (
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <p className="text-sm text-slate-500">Selecione um trabalho para abrir o detalhe completo.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={trabalho.status} />
              <PriorityBadge prioridade={trabalho.prioridade} />
            </div>
            <HighlightedText
              className="mt-4 block text-3xl font-semibold tracking-tight text-slate-900"
              query={searchTerm}
              text={trabalho.titulo}
            />
            <HighlightedText
              className="mt-2 block max-w-3xl text-sm leading-6 text-slate-600"
              query={searchTerm}
              text={trabalho.descricao}
            />
          </div>
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            <p>Prazo {formatDateShort(trabalho.prazoData)}</p>
            <p className="mt-2">Estimado {formatMinutes(trabalho.duracaoEstimadaMin)}</p>
            <p className="mt-2">Realizado {formatMinutes(trabalho.duracaoRealizadaMin)}</p>
          </div>
        </div>

        <div className="mt-5">
          <WorkProgressBar value={trabalho.percentualConclusao} />
        </div>
      </article>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
        <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Blocos do trabalho</h3>
          <div className="mt-4 space-y-3">
            {timeline.map((item) => (
              <div key={item.bloco.id} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.alocacao?.statusAlocacao ?? item.bloco.status} />
                      <p className="text-xs text-slate-500">
                        Bloco {item.bloco.sequencia}/{item.bloco.totalBlocos}
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {item.alocacao
                        ? `Planejado para ${formatDateShort(item.alocacao.dataPlanejada)} em ${item.alocacao.slotId}`
                        : "Ainda sem alocação fechada"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatMinutes(item.bloco.duracaoPlanejadaMin)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-5">
          {trabalho.etapas?.length ? (
            <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">Etapas internas</h3>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                  {trabalho.etapas.length} etapas
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {trabalho.etapas.map((etapa, index) => (
                  <div key={etapa.id} className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Etapa {index + 1}
                        </p>
                        <HighlightedText
                          className="mt-2 block text-sm font-semibold text-slate-900"
                          query={searchTerm}
                          text={etapa.titulo}
                        />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatMinutes(etapa.duracaoEstimadaMin)}
                      </p>
                    </div>
                    <HighlightedText
                      className="mt-2 block text-sm leading-6 text-slate-600"
                      query={searchTerm}
                      text={etapa.descricao}
                    />
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Dependências</h3>
            <div className="mt-4 space-y-3">
              {dependencias.length ? (
                dependencias.map((dependencia) => (
                  <div key={dependencia.id} className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={dependencia.status} />
                      <HighlightedText
                        className="block text-sm font-medium text-slate-900"
                        query={searchTerm}
                        text={dependencia.responsavelExterno}
                      />
                    </div>
                    <HighlightedText
                      className="mt-2 block text-sm text-slate-600"
                      query={searchTerm}
                      text={dependencia.descricao}
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Nenhuma dependência ativa.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Histórico</h3>
            <div className="mt-4 space-y-3">
              {registros.length ? (
                registros.map((registro) => (
                  <div key={registro.id} className="rounded-3xl bg-slate-50 p-4">
                    <HighlightedText
                      className="block text-sm font-medium text-slate-900"
                      query={searchTerm}
                      text={registro.resultado}
                    />
                    <p className="mt-1 text-sm text-slate-600">{formatMinutes(registro.minutosRealizados)} realizados</p>
                    {registro.motivo ? (
                      <HighlightedText
                        className="mt-2 block text-xs text-slate-500"
                        query={searchTerm}
                        text={registro.motivo}
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Sem histórico registrado para este trabalho.
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
