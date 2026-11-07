import React, { useState } from 'react';
import { X, CreditCard, AlertTriangle, DollarSign } from 'lucide-react';
import { Operation, Customer, Device, Payment } from '../types';
import { formatMoney, getOperationFinancials } from '../utils/currency';
import { getTodayTR } from '../utils/date';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: Operation | null;
  customer?: Customer;
  device?: Device;
  payments: Payment[];
  onAddPayment: (operationId: string, payment: { date: string; amount: number; note?: string }) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  operation,
  customer,
  device,
  payments,
  onAddPayment,
}) => {
  const today = getTodayTR();
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !operation) return null;

  const financials = getOperationFinancials(operation, payments);
  const remaining = financials.remainingAmount;
  const numAmount = parseFloat(amount) || 0;
  const isOverpaying = operation.price && (financials.totalCollected + numAmount > operation.price);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Lütfen geçerli ve pozitif bir tahsilat tutarı giriniz.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddPayment(operation.id, {
        date,
        amount: numAmount,
        note: note.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Tahsilat eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <CreditCard className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Tahsilat Ekle</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Operation Summary Box */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 text-xs space-y-1">
          <div className="font-bold text-slate-900">{customer?.title || 'Müşteri'}</div>
          <div className="text-slate-600">
            {device ? `${device.brand} ${device.model}` : 'Cihaz'} (SN: {device?.serialNumber || 'Bilinmiyor'})
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 font-mono">
            <span className="text-slate-500">İşlem Tutarı:</span>
            <span className="font-semibold text-slate-900">
              {formatMoney(operation.price || 0, operation.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-500">Önceki Tahsilatlar:</span>
            <span className="text-emerald-700 font-medium">
              {formatMoney(financials.totalCollected, operation.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between font-mono font-bold pt-1 border-t border-slate-200/60">
            <span className="text-slate-700">Kalan Bakiye:</span>
            <span className={remaining > 0 ? 'text-red-700' : 'text-slate-600'}>
              {formatMoney(remaining, operation.currency)}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {isOverpaying && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Girilen tutar kalan bakiyeyi ({formatMoney(remaining, operation.currency)}) aşmaktadır.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahsilat Tarihi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahsil Edilen Tutar ({operation.currency}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={remaining > 0 ? String(remaining) : '0.00'}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(remaining))}
                  className="absolute right-2 top-2 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Tamamını Doldur
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Açıklama / Ödeme Şekli
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: Garanti Bankası havale, elden nakit, kredi kartı..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? 'Kaydediliyor...' : 'Tahsilatı Onayla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
