/**
 * Date utilities for ColorCo Servis Takip Programı
 * Standard date format: GG.AA.YYYY (DD.MM.YYYY)
 * Timezone: Europe/Istanbul
 */

/**
 * Returns today's date in YYYY-MM-DD format (Europe/Istanbul timezone)
 */
export function getTodayTR(): string {
  // Use Intl.DateTimeFormat to reliably get Europe/Istanbul date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Formats a YYYY-MM-DD or ISO date string into GG.AA.YYYY
 */
export function formatDateTR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
  }
  return dateStr;
}

/**
 * Formats date and time into GG.AA.YYYY SS:DD
 */
export function formatDateTimeTR(isoStr?: string | null): string {
  if (!isoStr) return '-';
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return formatDateTR(isoStr);
    
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return formatDateTR(isoStr);
  }
}

/**
 * Parses GG.AA.YYYY or YYYY-MM-DD into YYYY-MM-DD
 */
export function normalizeDateInput(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // If DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('.');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Calculates calendar month additions.
 * Handles variable days in months (e.g. 31 Aug + 6 months = 28 Feb).
 * Example: 10.11.2026 + 6 months = 10.05.2027.
 */
export function addCalendarMonths(dateStr: string, months: number): string {
  const normalized = normalizeDateInput(dateStr);
  const parts = normalized.split('-');
  if (parts.length !== 3) return normalized;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  const day = parseInt(parts[2], 10);

  // Calculate target month and year
  const totalMonths = (month - 1) + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  let targetMonth = (totalMonths % 12) + 1;
  if (targetMonth <= 0) {
    targetMonth += 12;
  }

  // Days in target month (passing 0 as day returns last day of targetMonth)
  const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
}

/**
 * Calculates day difference between target date and base date (default today TR).
 * Positive = future, 0 = today, Negative = past (overdue).
 */
export function diffDays(targetDateStr: string, baseDateStr: string = getTodayTR()): number {
  const normTarget = normalizeDateInput(targetDateStr);
  const normBase = normalizeDateInput(baseDateStr);

  const d1 = new Date(`${normBase}T00:00:00`);
  const d2 = new Date(`${normTarget}T00:00:00`);

  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export const daysDifference = diffDays;

export interface DateStatusInfo {
  status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
  daysDiff: number;
  label: string;
  badgeClass: string;
}

/**
 * Computes human-readable Turkish status for follow-up and service dates
 */
export function getDateStatus(targetDateStr: string, isCompletedOrCancelled = false): DateStatusInfo {
  if (isCompletedOrCancelled) {
    return {
      status: 'upcoming',
      daysDiff: 0,
      label: 'İşlem bitti',
      badgeClass: 'text-slate-600',
    };
  }

  const days = diffDays(targetDateStr);

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return {
      status: 'overdue',
      daysDiff: days,
      label: `Gecikti (${overdueDays} gün geçti)`,
      badgeClass: 'text-red-700 bg-red-50 border border-red-200',
    };
  } else if (days === 0) {
    return {
      status: 'due_today',
      daysDiff: 0,
      label: 'Bugün yapılması gerekiyor',
      badgeClass: 'text-amber-800 bg-amber-50 border border-amber-200 font-semibold',
    };
  } else if (days <= 7) {
    return {
      status: 'due_soon',
      daysDiff: days,
      label: `${days} gün kaldı`,
      badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
    };
  } else if (days <= 30) {
    return {
      status: 'upcoming',
      daysDiff: days,
      label: `${days} gün kaldı`,
      badgeClass: 'text-slate-700 bg-slate-100 border border-slate-200',
    };
  } else {
    return {
      status: 'upcoming',
      daysDiff: days,
      label: `${formatDateTR(targetDateStr)} (${days} gün)`,
      badgeClass: 'text-slate-600 bg-slate-50 border border-slate-200',
    };
  }
}

/**
 * Formats monetary amounts with Turkish locale and currency symbol/code
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'TRY'): string {
  if (amount === null || amount === undefined) return '-';
  const symbols: Record<string, string> = {
    TRY: '₺',
    EUR: '€',
    USD: '$',
    GBP: '£',
  };
  const symbol = symbols[currency] || currency;
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${symbol}`;
}

