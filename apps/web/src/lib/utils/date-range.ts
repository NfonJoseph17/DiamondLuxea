/**
 * Date range helpers for report filters.
 * Uses local dates - backend interprets YYYY-MM-DD as UTC day boundaries.
 * Custom range: pass through user-selected dates as-is (HTML date input = YYYY-MM-DD).
 */

export type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDateRangeForPreset(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): { from: string; to: string } {
  const now = new Date();
  let from: Date;
  let to: Date;

  switch (preset) {
    case 'today':
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
      break;
    case 'week': {
      // Last 7 days (rolling) - includes yesterday and recent activity
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
      from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (customFrom && customTo) {
        // HTML date input returns YYYY-MM-DD - pass through for backend
        return { from: customFrom, to: customTo };
      }
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
      break;
    default:
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
  }

  return {
    from: toDateString(from),
    to: toDateString(to),
  };
}

export function formatDateRangeLabel(
  preset: DateRangePreset,
  from: string,
  to: string
): string {
  switch (preset) {
    case 'today':
      return 'Today';
    case 'week':
      return 'Last 7 days';
    case 'month':
      return 'This month';
    case 'custom':
      return `${from} to ${to}`;
    default:
      return 'Today';
  }
}
