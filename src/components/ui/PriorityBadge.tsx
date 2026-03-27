import { cx } from "../../utils/cx";

const priorityStyles = {
  baixa: "bg-slate-100 text-slate-600",
  media: "bg-blue-50 text-blue-700",
  alta: "bg-warn-soft text-warn-ink",
  critica: "bg-danger-soft text-danger-ink",
};

const labels = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export function PriorityBadge({
  prioridade,
}: {
  prioridade: keyof typeof priorityStyles;
}) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        priorityStyles[prioridade],
      )}
    >
      {labels[prioridade]}
    </span>
  );
}
