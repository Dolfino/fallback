import { cx } from "../../utils/cx";

const styles: Record<string, string> = {
  livre: "border-accent/15 bg-accent-soft text-accent-ink",
  planejado: "border-slate-300 bg-white text-slate-700",
  em_execucao: "border-accent/20 bg-accent text-white",
  concluido: "border-emerald-200 bg-emerald-600 text-white",
  parcial: "border-amber-300 bg-amber-500 text-white",
  bloqueado: "border-danger/20 bg-danger text-white",
  remarcado: "border-indigo-300 bg-indigo-600 text-white",
  antecipado: "border-cyan-300 bg-cyan-600 text-white",
  na_fila: "border-slate-200 bg-slate-100 text-slate-600",
  nova: "border-slate-200 bg-slate-100 text-slate-600",
  em_triagem: "border-amber-200 bg-amber-50 text-amber-700",
  qualificada: "border-accent/20 bg-accent-soft text-accent-ink",
  descartada: "border-slate-200 bg-slate-100 text-slate-500",
  pendente: "border-amber-200 bg-amber-50 text-amber-700",
  liberada: "border-emerald-200 bg-emerald-50 text-emerald-700",
  bloqueando: "border-danger/20 bg-danger-soft text-danger-ink",
};

const labels: Record<string, string> = {
  livre: "Livre",
  planejado: "Planejado",
  em_execucao: "Em execução",
  concluido: "Concluído",
  parcial: "Parcial",
  bloqueado: "Bloqueado",
  remarcado: "Remarcado",
  antecipado: "Antecipado",
  na_fila: "Na fila",
  nova: "Nova",
  em_triagem: "Em triagem",
  qualificada: "Qualificada",
  descartada: "Descartada",
  pendente: "Pendente",
  liberada: "Liberada",
  bloqueando: "Bloqueando",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        styles[status] ?? "border-slate-200 bg-slate-100 text-slate-700",
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
