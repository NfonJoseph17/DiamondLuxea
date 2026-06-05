export interface DateRange {
  from: Date;
  to: Date;
}

/** Same rules as reports: YYYY-MM-DD + optional tz offset in minutes (e.g. -new Date().getTimezoneOffset()). */
export function parseDateRange(from?: string, to?: string, tzOffsetMinutes?: number): DateRange {
  const now = new Date();
  let fromDate: Date;
  let toDate: Date;

  if (from && to) {
    fromDate = new Date(`${from}T00:00:00.000Z`);
    toDate = new Date(`${to}T23:59:59.999Z`);
    if (tzOffsetMinutes != null && !isNaN(tzOffsetMinutes)) {
      const offsetMs = tzOffsetMinutes * 60 * 1000;
      fromDate = new Date(fromDate.getTime() - offsetMs);
      toDate = new Date(toDate.getTime() - offsetMs);
    }
  } else {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;
    fromDate = new Date(`${today}T00:00:00.000Z`);
    toDate = new Date(`${today}T23:59:59.999Z`);
  }

  return { from: fromDate, to: toDate };
}
