const ISO_DATE_LENGTH = 10;

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

export function fromIsoDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function addDays(value: string, amount: number) {
  const date = fromIsoDate(value);
  date.setDate(date.getDate() + amount);
  return toIsoDate(date);
}

export function getOperationalDate(referenceDate: Date) {
  const date = new Date(referenceDate);
  const day = date.getDay();

  if (day === 6) {
    date.setDate(date.getDate() + 2);
  }

  if (day === 0) {
    date.setDate(date.getDate() + 1);
  }

  return toIsoDate(date);
}

export function getBusinessDays(referenceIsoDate: string, count = 5) {
  const date = fromIsoDate(referenceIsoDate);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(monday.getDate() + mondayOffset);

  const businessDays: string[] = [];
  const cursor = new Date(monday);

  while (businessDays.length < count) {
    const weekday = cursor.getDay();

    if (weekday !== 0 && weekday !== 6) {
      businessDays.push(toIsoDate(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return businessDays;
}

export function getBusinessWeek(referenceIsoDate: string) {
  return getBusinessDays(referenceIsoDate, 5);
}

export function isAfterDate(dateA: string, dateB: string) {
  return fromIsoDate(dateA).getTime() > fromIsoDate(dateB).getTime();
}

export function getDateDiffInDays(from: string, to: string) {
  const start = fromIsoDate(from).getTime();
  const end = fromIsoDate(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}
