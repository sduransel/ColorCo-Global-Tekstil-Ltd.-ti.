import { Currency, Operation, Payment, FinancialSummaryByCurrency } from '../types';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  TRY: 'Türk Lirası (TRY)',
  USD: 'Amerikan Doları (USD)',
  EUR: 'Euro (EUR)',
  GBP: 'İngiliz Sterlini (GBP)',
};

/**
 * Formats a monetary amount into a clean localized string
 */
export function formatMoney(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  if (currency === 'TRY') {
    return `${formatted} ${symbol}`;
  }
  return `${symbol}${formatted}`;
}

/**
 * Displays price according to specific user rule:
 * - null/undefined: "Fiyat girilmedi"
 * - 0: "Ücretsiz işlem"
 * - >0: Formatted currency
 */
export function formatOperationPrice(price?: number | null, currency: Currency = 'TRY'): string {
  if (price === null || price === undefined) {
    return 'Fiyat girilmedi';
  }
  if (price === 0) {
    return 'Ücretsiz işlem';
  }
  return formatMoney(price, currency);
}

/**
 * Computes payments sum for a specific operation
 */
export function getOperationCollectedAmount(operationId: string, payments: Payment[]): number {
  return payments
    .filter((p) => p.operationId === operationId)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

export type CollectionStatus = 'not_paid' | 'partial' | 'paid' | 'not_set' | 'free';

export interface OperationFinancialDetails {
  priceText: string;
  priceValue: number | null;
  totalCollected: number;
  remainingAmount: number;
  isOverpaid: boolean;
  statusText: 'Ödendi' | 'Kısmi ödendi' | 'Ödenmedi' | 'Ücretsiz' | 'Fiyat girilmedi';
  badgeClass: string;
}

export function getOperationFinancials(
  operation: Operation,
  payments: Payment[]
): OperationFinancialDetails {
  const price = operation.price;
  const totalCollected = getOperationCollectedAmount(operation.id, payments);

  if (price === null || price === undefined) {
    return {
      priceText: 'Fiyat girilmedi',
      priceValue: null,
      totalCollected,
      remainingAmount: 0,
      isOverpaid: false,
      statusText: 'Fiyat girilmedi',
      badgeClass: 'text-slate-500 bg-slate-100 border border-slate-200',
    };
  }

  if (price === 0) {
    return {
      priceText: 'Ücretsiz işlem',
      priceValue: 0,
      totalCollected: 0,
      remainingAmount: 0,
      isOverpaid: false,
      statusText: 'Ücretsiz',
      badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    };
  }

  const remaining = Math.max(0, price - totalCollected);
  const isOverpaid = totalCollected > price;

  if (totalCollected >= price) {
    return {
      priceText: formatMoney(price, operation.currency),
      priceValue: price,
      totalCollected,
      remainingAmount: 0,
      isOverpaid,
      statusText: 'Ödendi',
      badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200 font-medium',
    };
  }

  if (totalCollected > 0) {
    return {
      priceText: formatMoney(price, operation.currency),
      priceValue: price,
      totalCollected,
      remainingAmount: remaining,
      isOverpaid: false,
      statusText: 'Kısmi ödendi',
      badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200 font-medium',
    };
  }

  return {
    priceText: formatMoney(price, operation.currency),
    priceValue: price,
    totalCollected: 0,
    remainingAmount: price,
    isOverpaid: false,
    statusText: 'Ödenmedi',
    badgeClass: 'text-red-700 bg-red-50 border border-red-200 font-medium',
  };
}

/**
 * Calculates financial summaries grouped by currency.
 * Crucial rule: Cancelled operations are excluded!
 * TRY, USD, EUR, GBP are kept strictly separated.
 */
export function calculateFinancialSummaryByCurrency(
  operations: Operation[],
  payments: Payment[]
): FinancialSummaryByCurrency[] {
  const currencies: Currency[] = ['TRY', 'USD', 'EUR', 'GBP'];
  const results: FinancialSummaryByCurrency[] = [];

  for (const curr of currencies) {
    // Only non-cancelled operations in this currency
    const ops = operations.filter((op) => op.currency === curr && op.status !== 'cancelled');
    if (ops.length === 0) continue;

    let totalPrice = 0;
    let totalCollected = 0;

    for (const op of ops) {
      if (op.price && op.price > 0) {
        totalPrice += op.price;
      }
      const collectedForOp = getOperationCollectedAmount(op.id, payments);
      totalCollected += collectedForOp;
    }

    const remainingAmount = Math.max(0, totalPrice - totalCollected);

    results.push({
      currency: curr,
      totalPrice,
      totalCollected,
      remainingAmount,
      operationCount: ops.length,
    });
  }

  return results;
}
