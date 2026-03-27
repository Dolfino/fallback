import { ArrowUpRight } from "lucide-react";
import type { SuggestionItem } from "../../data/selectors";
import { PriorityBadge } from "./PriorityBadge";

interface SuggestionPanelProps {
  suggestions: SuggestionItem[];
  onPullSuggestion?: (allocationId: string) => void;
}

export function SuggestionPanel({ suggestions, onPullSuggestion }: SuggestionPanelProps) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Sugestões rápidas</h3>
          <p className="text-sm text-slate-500">Blocos futuros elegíveis para ocupar folgas do dia.</p>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.alocacao.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{suggestion.trabalho.titulo}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Bloco {suggestion.bloco.sequencia}/{suggestion.bloco.totalBlocos}
                </p>
              </div>
              <PriorityBadge prioridade={suggestion.trabalho.prioridade} />
            </div>
            <p className="mt-3 text-sm text-slate-600">{suggestion.impacto}</p>
            {onPullSuggestion ? (
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-shell px-3 py-2 text-xs font-medium text-white"
                onClick={() => onPullSuggestion(suggestion.alocacao.id)}
                type="button"
              >
                Puxar para este slot
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
