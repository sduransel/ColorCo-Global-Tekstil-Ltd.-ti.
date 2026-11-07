import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Building2, Cpu, FileText } from 'lucide-react';
import { Customer, Device, MachineSale, Currency, PaymentType } from '../types';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (saleData: Partial<MachineSale>) => Promise<void>;
  customers: Customer[];
  devices: Device[];
  saleToEdit?: MachineSale | null;
}

export const SaleModal: React.FC<SaleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  devices,
  saleToEdit,
}) => {
  const [customerId, setCustomerId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [paymentType, setPaymentType] = useState<PaymentType>('official');
  const [condition, setCondition] = useState<'new' | 'second_hand'>('new');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (saleToEdit) {
      setCustomerId(saleToEdit.customerId);
      setDeviceId(saleToEdit.deviceId);
      setSaleDate(saleToEdit.saleDate);
      setPrice(saleToEdit.price);
      setCurrency(saleToEdit.currency);
      setPaymentType(saleToEdit.paymentType || 'official');
      setCondition(saleToEdit.condition || 'new');
      setNotes(saleToEdit.notes || '');
    } else {
      setCustomerId(customers[0]?.id || '');
      setDeviceId('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setPrice('');
      setCurrency('EUR');
      setPaymentType('official');
      setCondition('new');
      setNotes('');
    }
  }, [saleToEdit, isOpen, customers]);

  // Filter devices belonging to selected customer
  const customerDevices = devices.filter((d) => d.customerId === customerId && d.status !== 'archived');

  useEffect(() => {
    if (!saleToEdit && customerDevices.length > 0 && !deviceId) {
      setDeviceId(customerDevices[0].id);
    }
  }, [customerId, customerDevices, deviceId, saleToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert('Lütfen müşteri seçiniz.');
      return;
    }
    if (!deviceId) {
      alert('Lütfen cihaza bağlayınız.');
      return;
    }
    if (!saleDate) {
      alert('Lütfen satış / ilk kuruluş tarihini giriniz.');
      return;
    }

        setSaving(true);
    try {
      await onSave({
        customerId,
        deviceId,
        saleDate,
        price: price === '' ? 0 : Number(price),
        currency,
        paymentType,
        condition,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      alert('Satış kaydı kaydedilirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {saleToEdit ? 'Makine Satış Kaydını Düzenle' : 'Yeni Makine Satış Kaydı Ekle'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Firma satış ve ilk kuruluş tarihi, satış bedeli ve fatura türü
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                Müşteri / Firma <span className="text-red-500">*</span>
              </span>
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setDeviceId('');
              }}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
            >
              <option value="">Müşteri Seçiniz</option>
              {customers
                .filter((c) => !c.isArchived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.city || c.country})
                  </option>
                ))}
            </select>
          </div>

          {/* Device Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-slate-500" />
                Satılan Cihaz <span className="text-red-500">*</span>
              </span>
            </label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
            >
              <option value="">Cihaz Seçiniz</option>
              {customerDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.brand} {d.model} {d.serialNumber ? `(SN: ${d.serialNumber})` : ''} - {d.deviceType}
                </option>
              ))}
            </select>
            {customerId && customerDevices.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600">
                Bu müşteriye kayıtlı cihaz bulunamadı. Lütfen önce Cihazlar bölümünden cihaza müşteri atayınız.
              </p>
            )}
          </div>

          {/* Sale / Initial Installation Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Satış / İlk Kuruluş Tarihi <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              * Bu tarihten itibaren 1 yıl dolduğunda sistem otomatik yıllık kalibrasyon ikazı oluşturur.
            </p>
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                  Satış Fiyatı
                </span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Örn: 25000"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Para Birimi</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="TRY">TRY (₺)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Machine Condition: New vs 2. Hand */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Makine Satış Durumu (Sıfır / 2. El)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCondition('new')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  condition === 'new'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Sıfır Kurumsal Makine
              </button>
              <button
                type="button"
                onClick={() => setCondition('second_hand')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  condition === 'second_hand'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                2. El Revizyonlu Makine
              </button>
            </div>
          </div>

          {/* Payment / Invoice Type (+KDV = official, others = unofficial) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fatura / Ödeme Türü
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('official')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  paymentType === 'official'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Resmi (+KDV Faturalı)
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('unofficial')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  paymentType === 'unofficial'
                    ? 'border-slate-800 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Gayriresmi
              </button>
            </div>
          </div>

          {/* Notes (Takas, Geri Alınan Cihaz, Tahsilat Detayı) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Satış ve Takas Notları
              </span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: 3600A cihazı geri alındı, peşinat tahsil edildi veya kur çevrim notları..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {saving ? 'Kaydediliyor...' : saleToEdit ? 'Değişiklikleri Kaydet' : 'Satışı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
