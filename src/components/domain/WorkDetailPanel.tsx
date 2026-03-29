import { useState } from "react";
import type {
  Dependencia,
  EtapaTrabalho,
  IssueTrabalho,
  RegistroExecucao,
  Trabalho,
} from "../../types/planner";
import type { PlannerIssueInput, PlannerWorkUpdateInput } from "../../types/domain";
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
  issues: IssueTrabalho[];
  registros: RegistroExecucao[];
  onUpdateWork: (workId: string, input: PlannerWorkUpdateInput) => void;
  onCreateIssue: (input: PlannerIssueInput) => void;
  onUpdateIssue: (
    issueId: string,
    input: {
      etapaId?: string;
      tipo: "tarefa" | "problema";
      titulo: string;
      descricao: string;
    },
  ) => void;
  searchTerm?: string;
}

function IssuePill({
  tone,
  children,
}: {
  tone: "default" | "warning" | "success";
  children: string;
}) {
  const tones = {
    default: "bg-slate-100 text-slate-700",
    warning: "bg-amber-100 text-amber-800",
    success: "bg-emerald-100 text-emerald-800",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function WorkDetailPanel({
  trabalho,
  timeline,
  dependencias,
  issues,
  registros,
  onUpdateWork,
  onCreateIssue,
  onUpdateIssue,
  searchTerm,
}: WorkDetailPanelProps) {
  const [isEditingWork, setIsEditingWork] = useState(false);
  const [workDraft, setWorkDraft] = useState<PlannerWorkUpdateInput>({
    titulo: "",
    descricao: "",
    prazoData: "",
    duracaoEstimadaMin: 25,
    etapas: [],
  });
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [newIssueDraft, setNewIssueDraft] = useState<{
    etapaId: string;
    tipo: "tarefa" | "problema";
    titulo: string;
    descricao: string;
  }>({
    etapaId: "",
    tipo: "tarefa",
    titulo: "",
    descricao: "",
  });
  const [issueDraft, setIssueDraft] = useState<{
    etapaId: string;
    tipo: "tarefa" | "problema";
    titulo: string;
    descricao: string;
  }>({
    etapaId: "",
    tipo: "tarefa",
    titulo: "",
    descricao: "",
  });

  if (!trabalho) {
    return (
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <p className="text-sm text-slate-500">Selecione um trabalho para abrir o detalhe completo.</p>
      </section>
    );
  }

  const etapasToRender = isEditingWork ? workDraft.etapas : trabalho.etapas ?? [];
  const issueSections = etapasToRender
    .map((etapa) => ({
      id: etapa.id,
      title: etapa.titulo,
      issues: issues.filter((issue) => issue.etapaId === etapa.id),
    }))
    .filter((section) => section.issues.length > 0);
  const uncategorizedIssues = issues.filter(
    (issue) => !issue.etapaId || !etapasToRender.some((etapa) => etapa.id === issue.etapaId),
  );
  const timelineByBlockId = new Map(timeline.map((item) => [item.bloco.id, item]));

  const stageTotalMinutes = workDraft.etapas.reduce(
    (total, etapa) => total + Math.max(0, Number(etapa.duracaoEstimadaMin) || 0),
    0,
  );
  const remainingStageMinutes = Math.max(0, workDraft.duracaoEstimadaMin - stageTotalMinutes);
  const projectedBlockCount = Math.max(
    1,
    Math.ceil(workDraft.duracaoEstimadaMin / trabalho.blocoMinimoMin),
  );
  const hasStageOverflow = stageTotalMinutes > workDraft.duracaoEstimadaMin;
  const hasInvalidStageTitle = workDraft.etapas.some(
    (etapa) =>
      (etapa.descricao.trim() || etapa.duracaoEstimadaMin > 0) && !etapa.titulo.trim(),
  );

  const startEditingWork = () => {
    setIsEditingWork(true);
    setWorkDraft({
      titulo: trabalho.titulo,
      descricao: trabalho.descricao,
      prazoData: trabalho.prazoData,
      duracaoEstimadaMin: trabalho.duracaoEstimadaMin,
      etapas: (trabalho.etapas ?? []).map((etapa) => ({ ...etapa })),
    });
  };

  const cancelEditingWork = () => {
    setIsEditingWork(false);
    setWorkDraft({
      titulo: "",
      descricao: "",
      prazoData: "",
      duracaoEstimadaMin: 25,
      etapas: [],
    });
  };

  const updateDraftStage = (
    stageId: string,
    patch: Partial<Pick<EtapaTrabalho, "titulo" | "descricao" | "duracaoEstimadaMin">>,
  ) => {
    setWorkDraft((current) => ({
      ...current,
      etapas: current.etapas.map((etapa) =>
        etapa.id === stageId
          ? {
              ...etapa,
              ...patch,
            }
          : etapa,
      ),
    }));
  };

  const updateDraftStageDuration = (stageId: string, rawValue: number) => {
    setWorkDraft((current) => {
      const etapaAtual = current.etapas.find((etapa) => etapa.id === stageId);
      if (!etapaAtual) {
        return current;
      }

      const currentValue = Math.max(0, Number(etapaAtual.duracaoEstimadaMin) || 0);
      const otherStagesTotal = current.etapas.reduce(
        (total, etapa) =>
          etapa.id === stageId
            ? total
            : total + Math.max(0, Number(etapa.duracaoEstimadaMin) || 0),
        0,
      );
      const nextValue = Math.max(
        0,
        Math.min(Math.max(0, Number(rawValue) || 0), current.duracaoEstimadaMin - otherStagesTotal),
      );

      if (nextValue === currentValue) {
        return current;
      }

      return {
        ...current,
        etapas: current.etapas.map((etapa) =>
          etapa.id === stageId
            ? {
                ...etapa,
                duracaoEstimadaMin: nextValue,
              }
            : etapa,
        ),
      };
    });
  };

  const addDraftStage = () => {
    setWorkDraft((current) => ({
      ...current,
      etapas: [
        ...current.etapas,
        {
          id: `etapa-${Date.now()}-${current.etapas.length + 1}`,
          titulo: "",
          descricao: "",
          duracaoEstimadaMin: 0,
        },
      ],
    }));
  };

  const syncEstimatedToStageSum = () => {
    if (stageTotalMinutes <= 0) {
      return;
    }

    setWorkDraft((current) => ({
      ...current,
      duracaoEstimadaMin: Math.max(trabalho.blocoMinimoMin, stageTotalMinutes),
    }));
  };

  const saveWorkEdition = () => {
    if (!workDraft.titulo.trim() || hasStageOverflow || hasInvalidStageTitle) {
      return;
    }

    onUpdateWork(trabalho.id, {
      titulo: workDraft.titulo.trim(),
      descricao: workDraft.descricao.trim(),
      prazoData: workDraft.prazoData,
      duracaoEstimadaMin: workDraft.duracaoEstimadaMin,
      etapas: workDraft.etapas
        .map((etapa) => ({
          ...etapa,
          titulo: etapa.titulo.trim(),
          descricao: etapa.descricao.trim(),
          duracaoEstimadaMin: Math.max(0, Number(etapa.duracaoEstimadaMin) || 0),
        }))
        .filter((etapa) => etapa.titulo || etapa.descricao || etapa.duracaoEstimadaMin > 0),
    });
    cancelEditingWork();
  };

  const cancelCreatingIssue = () => {
    setIsCreatingIssue(false);
    setNewIssueDraft({
      etapaId: "",
      tipo: "tarefa",
      titulo: "",
      descricao: "",
    });
  };

  const saveNewIssue = () => {
    if (!newIssueDraft.titulo.trim()) {
      return;
    }

    onCreateIssue({
      trabalhoId: trabalho.id,
      etapaId: newIssueDraft.etapaId || undefined,
      tipo: newIssueDraft.tipo,
      titulo: newIssueDraft.titulo.trim(),
      descricao: newIssueDraft.descricao.trim(),
    });
    cancelCreatingIssue();
  };

  const startEditingIssue = (issue: IssueTrabalho) => {
    setEditingIssueId(issue.id);
    setIssueDraft({
      etapaId: issue.etapaId ?? "",
      tipo: issue.tipo,
      titulo: issue.titulo,
      descricao: issue.descricao,
    });
  };

  const cancelEditingIssue = () => {
    setEditingIssueId(null);
    setIssueDraft({
      etapaId: "",
      tipo: "tarefa",
      titulo: "",
      descricao: "",
    });
  };

  const saveIssueEdition = (issueId: string) => {
    if (!issueDraft.titulo.trim()) {
      return;
    }

    onUpdateIssue(issueId, {
      etapaId: issueDraft.etapaId || undefined,
      tipo: issueDraft.tipo,
      titulo: issueDraft.titulo.trim(),
      descricao: issueDraft.descricao.trim(),
    });
    cancelEditingIssue();
  };

  const renderIssueCard = (issue: IssueTrabalho) => {
    const sourceBlock = issue.blocoId ? timelineByBlockId.get(issue.blocoId) : undefined;
    const isEditing = editingIssueId === issue.id;

    if (isEditing) {
      return (
        <div key={issue.id} className="rounded-3xl bg-slate-50 p-4">
          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Tipo</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                onChange={(event) =>
                  setIssueDraft((current) => ({
                    ...current,
                    tipo: event.target.value as "tarefa" | "problema",
                  }))
                }
                value={issueDraft.tipo}
              >
                <option value="tarefa">Tarefa</option>
                <option value="problema">Problema</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Milestone</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                onChange={(event) =>
                  setIssueDraft((current) => ({
                    ...current,
                    etapaId: event.target.value,
                  }))
                }
                value={issueDraft.etapaId}
              >
                <option value="">Sem milestone específico</option>
                {(trabalho.etapas ?? []).map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.titulo}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Título</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  titulo: event.target.value,
                }))
              }
              value={issueDraft.titulo}
            />
          </label>

          <label className="mt-3 block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Contexto</span>
            <textarea
              className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  descricao: event.target.value,
                }))
              }
              value={issueDraft.descricao}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-2xl bg-shell px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!issueDraft.titulo.trim()}
              onClick={() => saveIssueEdition(issue.id)}
              type="button"
            >
              Salvar edição
            </button>
            <button
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
              onClick={cancelEditingIssue}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={issue.id} className="rounded-3xl bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <IssuePill tone={issue.tipo === "problema" ? "warning" : "default"}>
                {issue.tipo}
              </IssuePill>
              <IssuePill tone={issue.status === "aberta" ? "default" : "success"}>
                {issue.status}
              </IssuePill>
            </div>
            <HighlightedText
              className="mt-3 block text-sm font-semibold text-slate-900"
              query={searchTerm}
              text={issue.titulo}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {formatDateShort(issue.createdAt.slice(0, 10))}
            </span>
            <button
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              onClick={() => startEditingIssue(issue)}
              type="button"
            >
              Editar
            </button>
          </div>
        </div>
        {issue.descricao ? (
          <HighlightedText
            className="mt-2 block text-sm leading-6 text-slate-600"
            query={searchTerm}
            text={issue.descricao}
          />
        ) : null}
        {sourceBlock ? (
          <p className="mt-3 text-xs text-slate-500">
            Originada no bloco {sourceBlock.bloco.sequencia}/{sourceBlock.bloco.totalBlocos}
            {sourceBlock.alocacao
              ? ` • ${formatDateShort(sourceBlock.alocacao.dataPlanejada)}`
              : ""}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <section className="space-y-5">
      <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={trabalho.status} />
              <PriorityBadge prioridade={trabalho.prioridade} />
            </div>
            {isEditingWork ? (
              <div className="mt-4 space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Título</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none"
                    onChange={(event) =>
                      setWorkDraft((current) => ({
                        ...current,
                        titulo: event.target.value,
                      }))
                    }
                    value={workDraft.titulo}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Subtítulo</span>
                  <textarea
                    className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none"
                    onChange={(event) =>
                      setWorkDraft((current) => ({
                        ...current,
                        descricao: event.target.value,
                      }))
                    }
                    value={workDraft.descricao}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Prazo</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      onChange={(event) =>
                        setWorkDraft((current) => ({
                          ...current,
                          prazoData: event.target.value,
                        }))
                      }
                      type="date"
                      value={workDraft.prazoData}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Estimado</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      min={trabalho.blocoMinimoMin}
                      onChange={(event) =>
                        setWorkDraft((current) => ({
                          ...current,
                          duracaoEstimadaMin: Math.max(
                            trabalho.blocoMinimoMin,
                            Number(event.target.value) || trabalho.blocoMinimoMin,
                          ),
                        }))
                      }
                      step={5}
                      type="number"
                      value={workDraft.duracaoEstimadaMin}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-2xl bg-shell px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                      !workDraft.titulo.trim() ||
                      !workDraft.prazoData ||
                      hasStageOverflow ||
                      hasInvalidStageTitle
                    }
                    onClick={saveWorkEdition}
                    type="button"
                  >
                    Salvar trabalho
                  </button>
                  <button
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                    onClick={cancelEditingWork}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="space-y-3">
            {!isEditingWork ? (
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                onClick={startEditingWork}
                type="button"
              >
                Editar trabalho
              </button>
            ) : null}
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>Prazo {formatDateShort(isEditingWork ? workDraft.prazoData : trabalho.prazoData)}</p>
              <p className="mt-2">Estimado {formatMinutes(isEditingWork ? workDraft.duracaoEstimadaMin : trabalho.duracaoEstimadaMin)}</p>
              <p className="mt-2">Realizado {formatMinutes(trabalho.duracaoRealizadaMin)}</p>
            </div>
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
          {(etapasToRender.length || isEditingWork) ? (
            <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">Etapas internas</h3>
                <div className="flex items-center gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                    {etapasToRender.length} etapas
                  </p>
                  {isEditingWork ? (
                    <button
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                      onClick={addDraftStage}
                      type="button"
                    >
                      Adicionar etapa
                    </button>
                  ) : null}
                </div>
              </div>

              {isEditingWork ? (
                <div className="mt-4 rounded-3xl bg-slate-50 px-4 py-3 text-sm">
                  <p className="text-slate-600">
                    Etapas somam <span className="font-semibold text-slate-900">{formatMinutes(stageTotalMinutes)}</span>
                  </p>
                  <p className={hasStageOverflow ? "mt-1 text-rose-600" : "mt-1 text-slate-600"}>
                    Restante para o estimado: {formatMinutes(remainingStageMinutes)}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Com o estimado atual, o trabalho fica com <span className="font-semibold text-slate-900">{projectedBlockCount}</span> bloco{projectedBlockCount === 1 ? "" : "s"} de {formatMinutes(trabalho.blocoMinimoMin)}.
                  </p>
                  {stageTotalMinutes > 0 && stageTotalMinutes !== workDraft.duracaoEstimadaMin ? (
                    <button
                      className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                      onClick={syncEstimatedToStageSum}
                      type="button"
                    >
                      Usar soma das etapas no estimado
                    </button>
                  ) : null}
                  {hasInvalidStageTitle ? (
                    <p className="mt-1 text-rose-600">Toda etapa preenchida precisa ter título.</p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                {etapasToRender.length ? (
                  etapasToRender.map((etapa, index) => (
                    <div key={etapa.id} className="rounded-3xl bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Etapa {index + 1}
                          </p>
                          {isEditingWork ? (
                            <input
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none"
                              onChange={(event) =>
                                updateDraftStage(etapa.id, { titulo: event.target.value })
                              }
                              placeholder="Título da etapa"
                              value={etapa.titulo}
                            />
                          ) : (
                            <HighlightedText
                              className="mt-2 block text-sm font-semibold text-slate-900"
                              query={searchTerm}
                              text={etapa.titulo}
                            />
                          )}
                        </div>

                        {isEditingWork ? (
                          <input
                            className="w-[120px] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none"
                            min={0}
                            onChange={(event) =>
                              updateDraftStageDuration(etapa.id, Number(event.target.value))
                            }
                            step={5}
                            type="number"
                            value={etapa.duracaoEstimadaMin}
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-700">
                            {formatMinutes(etapa.duracaoEstimadaMin)}
                          </p>
                        )}
                      </div>
                      {isEditingWork ? (
                        <textarea
                          className="mt-3 min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-600 outline-none"
                          onChange={(event) =>
                            updateDraftStage(etapa.id, { descricao: event.target.value })
                          }
                          placeholder="Subtítulo ou contexto da etapa"
                          value={etapa.descricao}
                        />
                      ) : (
                        <HighlightedText
                          className="mt-2 block text-sm leading-6 text-slate-600"
                          query={searchTerm}
                          text={etapa.descricao}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    Ainda não há etapas internas neste trabalho.
                  </div>
                )}
              </div>
            </article>
          ) : null}

          <article className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Issues do trabalho</h3>
              <div className="flex items-center gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                  {issues.length} issue{issues.length === 1 ? "" : "s"}
                </p>
                {!isCreatingIssue ? (
                  <button
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                    onClick={() => setIsCreatingIssue(true)}
                    type="button"
                  >
                    Nova issue
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {isCreatingIssue ? (
                <div className="rounded-3xl bg-slate-50 p-4">
                  <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Tipo</span>
                      <select
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                        onChange={(event) =>
                          setNewIssueDraft((current) => ({
                            ...current,
                            tipo: event.target.value as "tarefa" | "problema",
                          }))
                        }
                        value={newIssueDraft.tipo}
                      >
                        <option value="tarefa">Tarefa</option>
                        <option value="problema">Problema</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Milestone</span>
                      <select
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                        onChange={(event) =>
                          setNewIssueDraft((current) => ({
                            ...current,
                            etapaId: event.target.value,
                          }))
                        }
                        value={newIssueDraft.etapaId}
                      >
                        <option value="">Sem milestone específico</option>
                        {(trabalho.etapas ?? []).map((etapa) => (
                          <option key={etapa.id} value={etapa.id}>
                            {etapa.titulo}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="mt-3 block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Título</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                      onChange={(event) =>
                        setNewIssueDraft((current) => ({
                          ...current,
                          titulo: event.target.value,
                        }))
                      }
                      value={newIssueDraft.titulo}
                    />
                  </label>

                  <label className="mt-3 block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Contexto</span>
                    <textarea
                      className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                      onChange={(event) =>
                        setNewIssueDraft((current) => ({
                          ...current,
                          descricao: event.target.value,
                        }))
                      }
                      value={newIssueDraft.descricao}
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-2xl bg-shell px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!newIssueDraft.titulo.trim()}
                      onClick={saveNewIssue}
                      type="button"
                    >
                      Registrar issue
                    </button>
                    <button
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                      onClick={cancelCreatingIssue}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}

              {issueSections.map((section) => (
                <div key={section.id} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {section.title}
                  </p>
                  {section.issues.map(renderIssueCard)}
                </div>
              ))}

              {uncategorizedIssues.length ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Sem milestone específico
                  </p>
                  {uncategorizedIssues.map(renderIssueCard)}
                </div>
              ) : null}

              {!issues.length ? (
                <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Ainda não há issues registradas para este trabalho.
                </div>
              ) : null}
            </div>
          </article>

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
