import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { SystemFeedback } from "../../types/domain";
import type { PlannerAppOperationError, PlannerAppOperationKind } from "../../application/plannerAppContracts";
import type { PlannerGlobalSearchResult } from "../../domain/plannerSearch";

interface TopbarProps {
  currentDateLabel: string;
  feedback: SystemFeedback | null;
  searchQuery: string;
  searchResults: PlannerGlobalSearchResult[];
  operationState?: {
    pending?: {
      kind: PlannerAppOperationKind;
    } | null;
    error?: PlannerAppOperationError | null;
  };
  shortcutHint?: string;
  onShiftDate: (direction: -1 | 1) => void;
  onPrimaryAction: (view: "new-work" | "requests") => void;
  onSearchQueryChange: (value: string) => void;
  onSearchResultOpen: (result: PlannerGlobalSearchResult) => void;
  onRetryOperation?: () => void;
  onDismissOperationError?: () => void;
}

export function Topbar({
  currentDateLabel,
  feedback,
  searchQuery,
  searchResults,
  operationState,
  shortcutHint,
  onShiftDate,
  onPrimaryAction,
  onSearchQueryChange,
  onSearchResultOpen,
  onRetryOperation,
  onDismissOperationError,
}: TopbarProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const feedbackToneStyles = {
    neutral: "border-slate-200 bg-white text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-warn/20 bg-warn-soft text-warn-ink",
    critical: "border-danger/20 bg-danger-soft text-danger-ink",
    opportunity: "border-accent/15 bg-accent-soft text-accent-ink",
  };

  const contextTagStyles = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-warn-soft text-warn-ink",
    critical: "bg-danger-soft text-danger-ink",
    opportunity: "bg-accent-soft text-accent-ink",
  };
  const shouldShowFeedbackTitle =
    feedback && feedback.contextTag
      ? feedback.contextTag.label.toLowerCase() !== feedback.title.toLowerCase()
      : true;
  const shouldShowSearchResults = isSearchActive && searchQuery.trim().length > 0;
  const pendingLabel =
    operationState?.pending?.kind === "create_work"
      ? "Criando trabalho"
      : operationState?.pending?.kind === "create_request"
        ? "Registrando solicitação"
        : operationState?.pending?.kind === "resolve_review"
      ? "Aplicando revisão"
      : operationState?.pending?.kind === "open_dependency"
        ? "Abrindo bloqueio"
        : operationState?.pending?.kind === "resolve_dependency"
          ? "Resolvendo dependência"
          : operationState?.pending?.kind === "apply_dependency_policy"
            ? "Aplicando política"
            : operationState?.pending
              ? "Atualizando operação"
              : null;

  return (
    <header className="border-b border-black/5 bg-panel/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Operação ativa</p>
            <h2 className="text-xl font-semibold tracking-tight">{currentDateLabel}</h2>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <button
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => onShiftDate(-1)}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm font-medium text-slate-700">Navegar dias</span>
            <button
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => onShiftDate(1)}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <label className="flex min-w-[320px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                onBlur={() => {
                  window.setTimeout(() => {
                    setIsSearchActive(false);
                  }, 120);
                }}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                onFocus={() => setIsSearchActive(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0]) {
                    event.preventDefault();
                    onSearchResultOpen(searchResults[0]);
                    setIsSearchActive(false);
                  }
                }}
                placeholder="Buscar trabalho, cliente ou bloqueio"
                type="search"
                value={searchQuery}
              />
            </label>

            {shouldShowSearchResults ? (
              <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-20 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                {searchResults.length ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onSearchResultOpen(result);
                        setIsSearchActive(false);
                      }}
                      type="button"
                    >
                      <p className="text-sm font-semibold text-slate-900">{result.title}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        {result.subtitle}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{result.detail}</p>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    Nenhum resultado para esta busca.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <button
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400"
            onClick={() => onPrimaryAction("requests")}
            type="button"
          >
            Nova demanda
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-shell px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            onClick={() => onPrimaryAction("new-work")}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Novo trabalho
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-white">
            DN
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3">
        {feedback ? (
          <div className={`flex-1 rounded-2xl border px-4 py-3 ${feedbackToneStyles[feedback.tone]}`}>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-current opacity-70" />
              {feedback.contextTag ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${contextTagStyles[feedback.contextTag.tone]}`}>
                  {feedback.contextTag.label}
                </span>
              ) : null}
              {shouldShowFeedbackTitle ? <p className="text-sm font-semibold">{feedback.title}</p> : null}
            </div>
            <p className="mt-1 text-sm opacity-90">{feedback.detail}</p>
          </div>
        ) : null}

        {pendingLabel ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {pendingLabel}
          </div>
        ) : null}

        {operationState?.error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger-ink">
            <div className="flex items-center gap-3">
              <p className="font-semibold">{operationState.error.message}</p>
              {operationState.error.retryable && onRetryOperation ? (
                <button
                  className="rounded-xl border border-danger/20 bg-white px-3 py-1 text-xs font-semibold text-danger-ink"
                  onClick={onRetryOperation}
                  type="button"
                >
                  Tentar de novo
                </button>
              ) : null}
              {onDismissOperationError ? (
                <button
                  className="rounded-xl px-2 py-1 text-xs font-semibold text-danger-ink/80"
                  onClick={onDismissOperationError}
                  type="button"
                >
                  Fechar
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {shortcutHint ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {shortcutHint}
          </div>
        ) : null}
      </div>
    </header>
  );
}
