import { fromIsoDate } from "./date";

export function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes} min`;
  }

  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

export function formatDateLong(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(fromIsoDate(dateValue));
}

export function formatDateShort(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(fromIsoDate(dateValue));
}

export function formatWeekday(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
  }).format(fromIsoDate(dateValue));
}

export function capitalize(text: string) {
  if (!text.length) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}
