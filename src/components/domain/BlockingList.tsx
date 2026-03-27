import { HighlightedText } from "../ui/HighlightedText";
import { formatDateShort } from "../../utils/format";
import { StatusBadge } from "../ui/StatusBadge";

interface BlockingItem {
  dependencia: {
    id: string;
    descricao: string;
    responsavelExterno: string;
    dataPrevistaLiberacao: string;
    status: string;
  };
  trabalho?: {
    titulo: string;
  };
  bloco?: {
    sequencia: number;
    totalBlocos: number;
  };
  impactoFuturo: number;
  politicaSugerida: string;
  efeitoCurto: string;
  politicaAplicada?: "manter_reserva" | "liberar_slots_futuros";
  politicaResumo?: {
    label: string;
    effect: string;
    horizonNote: string;
  };
}

interface BlockingListProps {
  items: BlockingItem[];
  searchTerm?: string;
  onResolve: (dependencyId: string) => void;
  onApplyPolicy: (
    dependencyId: string,
    action: "manter_reserva" | "liberar_slots_futuros",
  ) => void;
}

export function BlockingList({ items, searchTerm, onResolve, onApplyPolicy }: BlockingListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.dependencia.id} className="rounded-[32px] border border-black/5 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={item.dependencia.status} />
                <span className="text-xs text-slate-500">
                  {item.bloco ? `Bloco ${item.bloco.sequencia}/${item.bloco.totalBlocos}` : "Trabalho inteiro"}
                </span>
              </div>
              <HighlightedText
                className="mt-3 block text-lg font-semibold tracking-tight text-slate-900"
                query={searchTerm}
                text={item.trabalho?.titulo ?? "Sem trabalho associado"}
              />
              <HighlightedText
                className="mt-2 block text-sm text-slate-600"
                query={searchTerm}
                text={item.dependencia.descricao}
              />
            </div>

            <button
              className="rounded-2xl bg-shell px-4 py-2 text-sm font-medium text-white"
              onClick={() => onResolve(item.dependencia.id)}
              type="button"
            >
              Marcar resolvido
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Aguardando</p>
              <HighlightedText
                className="mt-1 block text-sm font-semibold text-slate-900"
                query={searchTerm}
                text={item.dependencia.responsavelExterno}
              />
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Liberação</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDateShort(item.dependencia.dataPrevistaLiberacao)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Impacto</p>
              <HighlightedText
                className="mt-1 block text-sm font-semibold text-slate-900"
                query={searchTerm}
                text={item.efeitoCurto}
              />
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Política sugerida</p>
              <HighlightedText
                className="mt-1 block text-sm font-semibold text-slate-900"
                query={searchTerm}
                text={item.politicaSugerida}
              />
              {item.politicaResumo ? (
                <p className="mt-2 text-xs text-slate-500">
                  Aplicada: {item.politicaResumo.label} • {item.politicaResumo.effect}
                </p>
              ) : null}
            </div>
          </div>

          {item.politicaResumo ? (
            <div className="mt-4 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Efeito da política</p>
              <HighlightedText
                className="mt-2 block text-sm font-semibold text-slate-900"
                query={searchTerm}
                text={item.politicaResumo.effect}
              />
              <HighlightedText
                className="mt-1 block text-sm text-slate-600"
                query={searchTerm}
                text={item.politicaResumo.horizonNote}
              />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`rounded-2xl border px-4 py-2 text-sm font-medium ${
                item.politicaAplicada === "manter_reserva"
                  ? "border-warn/20 bg-warn-soft text-warn-ink"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => onApplyPolicy(item.dependencia.id, "manter_reserva")}
              type="button"
            >
              Manter reserva
            </button>
            <button
              className={`rounded-2xl border px-4 py-2 text-sm font-medium ${
                item.politicaAplicada === "liberar_slots_futuros"
                  ? "border-accent/20 bg-accent-soft text-accent-ink"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => onApplyPolicy(item.dependencia.id, "liberar_slots_futuros")}
              type="button"
            >
              Liberar slots futuros
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
