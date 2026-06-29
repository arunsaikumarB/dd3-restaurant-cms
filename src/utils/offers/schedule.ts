export type OfferScheduleStatus = "current" | "upcoming" | "expired";

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function todayAtMidnight(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getOfferScheduleStatus(
  startDate: string | null,
  endDate: string | null,
  now = new Date(),
): OfferScheduleStatus {
  if (!startDate || !endDate) {
    return "current";
  }

  const today = todayAtMidnight(now);
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (today < start) return "upcoming";
  if (today > end) return "expired";
  return "current";
}

export function formatOfferDate(value: string | null): string {
  if (!value) return "";
  return value.split("T")[0];
}
