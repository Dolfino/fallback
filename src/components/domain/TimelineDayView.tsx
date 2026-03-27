import type { SuggestionItem, TimelineSlotItem } from "../../data/selectors";
import type { SlotFeedback } from "../../types/domain";
import { SlotCard } from "./SlotCard";

interface TimelineDayViewProps {
  items: TimelineSlotItem[];
  selectedSlotId: string;
  suggestionMap: Record<string, SuggestionItem[]>;
  slotFeedback: SlotFeedback | null;
  onSelectSlot: (slotId: string) => void;
}

export function TimelineDayView({
  items,
  selectedSlotId,
  suggestionMap,
  slotFeedback,
  onSelectSlot,
}: TimelineDayViewProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-[32px] border border-black/5 bg-panel p-5 shadow-panel">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Timeline do dia</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            O que está comprometido em cada agenda
          </h2>
        </div>
        <p className="text-sm text-slate-500">Clique em um slot para abrir detalhe contextual e ações rápidas.</p>
      </div>

      <div className="scrollbar-thin space-y-4 overflow-y-auto pr-1">
        {items.map((item) => (
          <SlotCard
            key={item.slot.id}
            isSelected={item.slot.id === selectedSlotId}
            item={item}
            onClick={() => onSelectSlot(item.slot.id)}
            slotFeedback={slotFeedback?.slotId === item.slot.id ? slotFeedback : null}
            suggestionCount={suggestionMap[item.slot.id]?.length ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
