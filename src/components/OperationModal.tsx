import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Calendar,
  Clock,
  DollarSign,
  Paperclip,
  Trash2,
  Upload,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  CalendarPlus,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  Customer,
  Device,
  Operation,
  Payment,
  OperationType,
  PaymentType,
  Currency,
  OperationStatus,
  FollowUpInterval,
  NextFollowUpConfig,
  Attachment,
  OPERATION_TYPE_LABELS,
} from '../types';
import { addCalendarMonths, formatDateTR, getTodayTR } from '../utils/date';
import { formatMoney, getOperationFinancials } from '../utils/currency';
import { api } from '../services/api';

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (opData: Partial<Operation>) => Promise<void>;
  customers: Customer[];
  devices: Device[];
  payments: Payment[];
  operationToEdit?: Operation | null;
  defaultCustomerId?: string;
  defaultDeviceId?: string;
  defaultPlannedDate?: string;
  defaultOperationType?: OperationType;
  onAddPayment: (operationId: string, payment: { date: string; amount: number; note?: string }) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
}

export const OperationModal: React.FC<OperationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  devices,
  payments,
  operationToEdit,
  defaultCustomerId,
  defaultDeviceId,
  defaultPlannedDate,
  defaultOperationType,
  onAddPayment,
  onDeletePayment,
}) => {
  const today = getTodayTR();

  // Basic Form State
  const [customerId, setCustomerId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<OperationType[]>(['calibration']);
  const [plannedDate, setPlannedDate] = useState(today);
  const [actualDate, setActualDate] = useState('');
  const [status, setStatus] = useState<OperationStatus>('planned');
  const [faultDescription, setFaultDescription] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [replacedParts, setReplacedParts] = useState('');

  // Price & Currency
  const [priceType, setPriceType] = useState<'specified' | 'not_set' | 'free'>('specified');
  const [priceAmount, setPriceAmount] = useState<string>('0');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [paymentType, setPaymentType] = useState<PaymentType>('official');
  const [notes, setNotes] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // Follow-Up Configuration per Operation Type
  const [followUps, setFollowUps] = useState<Record<OperationType, NextFollowUpConfig>>({
    service_repair: { interval: 'none' },
    periodic_maintenance: { interval: '6_months' },
    lamp_replacement: { interval: '1_year' },
    calibration: { interval: '1_year' },
  });

  // Reschedule Form State
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Payment Form Inline State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate state on open / edit
  useEffect(() => {
    if (operationToEdit) {
      setCustomerId(operationToEdit.customerId);
      setDeviceId(operationToEdit.deviceId);
      setSelectedTypes(operationToEdit.operationTypes || ['calibration']);
      setPlannedDate(operationToEdit.plannedDate || today);
      setActualDate(operationToEdit.actualDate || '');
      setStatus(operationToEdit.status || 'planned');
      setFaultDescription(operationToEdit.faultDescription || '');
      setActionDescription(operationToEdit.actionDescription || '');
      setReplacedParts(operationToEdit.replacedParts || '');
      setCurrency(operationToEdit.currency || 'TRY');
      setPaymentType(operationToEdit.paymentType || 'official');
      setNotes(operationToEdit.notes || '');
      setAttachments(operationToEdit.attachments || []);

      if (operationToEdit.price === null || operationToEdit.price === undefined) {
        setPriceType('not_set');
        setPriceAmount('');
      } else if (operationToEdit.price === 0) {
        setPriceType('free');
        setPriceAmount('0');
      } else {
        setPriceType('specified');
        setPriceAmount(String(operationToEdit.price));
      }

      if (operationToEdit.nextFollowUps) {
        setFollowUps(Object.assign(
          {
            service_repair: { interval: 'none' as const },
            periodic_maintenance: { interval: 'none' as const },
            lamp_replacement: { interval: 'none' as const },
            calibration: { interval: 'none' as const },
          },
          operationToEdit.nextFollowUps
        ));
      }
    } else {
      const initialCustId = defaultCustomerId || (customers[0]?.id || '');
      setCustomerId(initialCustId);

      const matchingDevices = devices.filter((d) => d.customerId === initialCustId);
      setDeviceId(defaultDeviceId || (matchingDevices[0]?.id || ''));

      setSelectedTypes(defaultOperationType ? [defaultOperationType] : ['calibration']);
      setPlannedDate(defaultPlannedDate || today);
      setActualDate('');
      setStatus('planned');
      setFaultDescription('');
      setActionDescription('');
      setReplacedParts('');
      setPriceType('not_set');
      setPriceAmount('');
      setCurrency('TRY');
      setPaymentType('official');
      setNotes('');
      setAttachments([]);
      setFollowUps({
        service_repair: { interval: 'none' },
        periodic_maintenance: { interval: '6_months' },
        lamp_replacement: { interval: '1_year' },
        calibration: { interval: '1_year' },
      });
    }

    setShowReschedule(false);
    setShowPaymentForm(false);
    setError(null);
  }, [operationToEdit, defaultCustomerId, defaultDeviceId, defaultPlannedDate, defaultOperationType, isOpen, customers, devices, today]);

  // When customer changes, update device selection if current device doesn't belong to customer
  const availableDevices = devices.filter((d) => d.customerId === customerId && d.status === 'active');

  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    const devs = devices.filter((d) => d.customerId === newCustId && d.status === 'active');
    if (devs.length > 0) {
      setDeviceId(devs[0].id);
    } else {
      setDeviceId('');
    }
  };

  const toggleOperationType = (typeKey: OperationType) => {
    if (selectedTypes.includes(typeKey)) {
      if (selectedTypes.length === 1) return; // Keep at least one
      setSelectedTypes(selectedTypes.filter((t) => t !== typeKey));
    } else {
      setSelectedTypes([...selectedTypes, typeKey]);
    }
  };

  // Follow-up date calculations based on actualDate or plannedDate
  const baseCalcDate = actualDate || plannedDate || today;

  const updateFollowUpInterval = (typeKey: OperationType, interval: FollowUpInterval) => {
    let target = '';
    if (interval === '3_months') target = addCalendarMonths(baseCalcDate, 3);
    else if (interval === '6_months') target = addCalendarMonths(baseCalcDate, 6);
    else if (interval === '1_year') target = addCalendarMonths(baseCalcDate, 12);

    setFollowUps((prev) => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        interval,
        targetDate: target,
      },
    }));
  };

  const updateCustomMonths = (typeKey: OperationType, months: number) => {
    const target = addCalendarMonths(baseCalcDate, months);
    setFollowUps((prev) => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        customMonths: months,
        targetDate: target,
      },
    }));
  };

  const updateManualDate = (typeKey: OperationType, manualDate: string) => {
    setFollowUps((prev) => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        manualDate,
        targetDate: manualDate,
      },
    }));
  };

  // Upload attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const att = await api.uploadFile(file);
      setAttachments((prev) => [...prev, att]);
    } catch (err: any) {
      setError(err.message || 'Dosya yüklenemedi');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Handle Add Payment
  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationToEdit) return;

    const num = Number(paymentAmount);
    if (isNaN(num) || num <= 0) {
      alert('Lütfen geçerli ve pozitif bir tahsilat tutarı giriniz.');
      return;
    }

    try {
      await onAddPayment(operationToEdit.id, {
        date: paymentDate,
        amount: num,
        note: paymentNote.trim(),
      });
      setPaymentAmount('');
      setPaymentNote('');
      setShowPaymentForm(false);
    } catch (err: any) {
      alert(err.message || 'Tahsilat eklenirken hata oluştu');
    }
  };

  // Handle Reschedule
  const handleRescheduleSubmit = async () => {
    if (!operationToEdit || !rescheduleDate) return;
    setLoading(true);
    try {
      await api.rescheduleOperation(operationToEdit.id, rescheduleDate, rescheduleReason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erteleme başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  // Handle Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !deviceId) {
      setError('Lütfen müşteri ve cihaz seçiniz');
      return;
    }

    if (status === 'completed' && !actualDate) {
      setError('Tamamlanan işlemlerde gerçekleşen işlem tarihi zorunludur');
      return;
    }

    let calculatedPrice: number | null = null;
    if (priceType === 'specified') {
      const p = parseFloat(priceAmount);
      calculatedPrice = isNaN(p) ? null : p;
    } else if (priceType === 'free') {
      calculatedPrice = 0;
    }

    // Build follow-up configs with computed targetDates
    const computedFollowUps: Record<OperationType, NextFollowUpConfig> = { ...followUps };
    for (const typeKey of selectedTypes) {
      const cfg = computedFollowUps[typeKey];
      if (cfg && cfg.interval !== 'none') {
        if (cfg.interval === '3_months') cfg.targetDate = addCalendarMonths(baseCalcDate, 3);
        else if (cfg.interval === '6_months') cfg.targetDate = addCalendarMonths(baseCalcDate, 6);
        else if (cfg.interval === '1_year') cfg.targetDate = addCalendarMonths(baseCalcDate, 12);
        else if (cfg.interval === 'custom_months' && cfg.customMonths)
          cfg.targetDate = addCalendarMonths(baseCalcDate, cfg.customMonths);
        else if (cfg.interval === 'manual_date' && cfg.manualDate)
          cfg.targetDate = cfg.manualDate;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        customerId,
        deviceId,
        operationTypes: selectedTypes,
        plannedDate,
        actualDate: actualDate || undefined,
        status,
        faultDescription: faultDescription.trim(),
        actionDescription: actionDescription.trim(),
        replacedParts: replacedParts.trim(),
        price: calculatedPrice,
        currency,
        paymentType,
        notes: notes.trim(),
        attachments,
        nextFollowUps: status === 'completed' ? computedFollowUps : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'İşlem kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Payments for this operation if editing
  const currentPayments = operationToEdit
    ? payments.filter((p) => p.operationId === operationToEdit.id)
    : [];

  const financials = operationToEdit
    ? getOperationFinancials(operationToEdit, payments)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {operationToEdit ? 'İşlem Detay ve Düzenleme' : 'Yeni İşlem / Servis Kaydı'}
              </h2>
              <p className="text-xs text-slate-500">
                Servis müdahalesi, periyodik bakım veya kalibrasyon takibi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reschedule Banner if already postponed */}
          {operationToEdit?.rescheduledFrom && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Erteleme Geçmişi:</strong> Bu işlem daha önce{' '}
              <span className="font-mono font-bold">{formatDateTR(operationToEdit.rescheduledFrom)}</span>{' '}
              tarihinden ertelenmiştir. Gerekçe: {operationToEdit.rescheduledReason || 'Belirtilmedi'}
            </div>
          )}

          {/* Customer & Device Selectors */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Müşteri <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="" disabled>Müşteri Seçiniz</option>
                {customers
                  .filter((c) => !c.isArchived || c.id === customerId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.city || 'Şehir yok'})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cihaz <span className="text-red-500">*</span>
              </label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
                disabled={availableDevices.length === 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
              >
                {availableDevices.length === 0 ? (
                  <option value="">Bu müşteriye ait kayıtlı cihaz yok</option>
                ) : (
                  availableDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.model} (SN: {d.serialNumber || 'Bilinmiyor'}) - {d.deviceType}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Operation Types Multi-select Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              İşlem Türleri (Aynı ziyarette yapılan tüm işlemleri seçebilirsiniz) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(OPERATION_TYPE_LABELS) as OperationType[]).map((typeKey) => {
                const isSelected = selectedTypes.includes(typeKey);
                return (
                  <button
                    type="button"
                    key={typeKey}
                    onClick={() => toggleOperationType(typeKey)}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-colors text-left ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{OPERATION_TYPE_LABELS[typeKey]}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Birden fazla işlem seçildiğinde fiyat seçilen işlem sayısına göre çoğaltılmaz.
            </p>
          </div>

          {/* Status, Planned Date, Actual Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                İşlem Durumu <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value as OperationStatus;
                  setStatus(newStatus);
                  if (newStatus === 'completed' && !actualDate) {
                    setActualDate(today);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="planned">Planlandı (Bekliyor)</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planlanan Tarih <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gerçekleşen Tarih {status === 'completed' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                required={status === 'completed'}
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                placeholder="Tamamlandığında girilir"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Quick Reschedule (Erteleme) Button if editing planned operation */}
          {operationToEdit && operationToEdit.status === 'planned' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Takip Tarihini Ertele
                </span>
                <button
                  type="button"
                  onClick={() => setShowReschedule(!showReschedule)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  {showReschedule ? 'Ertelemeyi Gizle' : 'Tarihi Ertele'}
                </button>
              </div>

              {showReschedule && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Yeni Tarih</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Erteleme Gerekçesi</label>
                    <input
                      type="text"
                      placeholder="Müşteri randevu erteleme talebi vb."
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!rescheduleDate}
                      onClick={handleRescheduleSubmit}
                      className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Ertelemeyi Onayla & Bildirimleri Güncelle
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Descriptions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Arıza veya Müşteri Talep Açıklaması
              </label>
              <textarea
                rows={2}
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
                placeholder="Cihaz arızası, müşteri talebi veya periyodik bakım nedeni..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yapılan İşlem Açıklaması
              </label>
              <textarea
                rows={2}
                value={actionDescription}
                onChange={(e) => setActionDescription(e.target.value)}
                placeholder="Uygulanan teknik müdahale, kalibrasyon adımları, test sonuçları..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Değiştirilen Parça (Varsa)
              </label>
              <input
                type="text"
                value={replacedParts}
                onChange={(e) => setReplacedParts(e.target.value)}
                placeholder="Örn: D65 floresan tüp seti, optik filtre, diyafram yayı..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Price, Currency & Official / Unofficial Payment Type */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Fiyatlandırma ve Ödeme Türü
              </span>
              <span className="text-[11px] text-slate-500">
                Tahsilat durumundan bağımsız takip edilir
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Price Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fiyat Durumu
                </label>
                <select
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                >
                  <option value="specified">Fiyat Belirlendi</option>
                  <option value="not_set">Fiyat Girilmedi</option>
                  <option value="free">Ücretsiz İşlem (0)</option>
                </select>
              </div>

              {/* Price Amount */}
              {priceType === 'specified' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Toplam Fiyat
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900"
                  />
                </div>
              )}

              {/* Currency */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Para Birimi
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono"
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              {/* Payment Type: Resmi / Gayriresmi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ödeme Türü
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                >
                  <option value="official">Resmi (Faturalı)</option>
                  <option value="unofficial">Gayriresmi</option>
                </select>
              </div>
            </div>

            {/* Financial Overview & Payments list if editing */}
            {operationToEdit && financials && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-700">Tahsilat Durumu:</span>
                    <span className={`rounded px-2 py-0.5 ${financials.badgeClass}`}>
                      {financials.statusText}
                    </span>
                    <span className="text-slate-500 font-mono">
                      Tahsil Edilen: {formatMoney(financials.totalCollected, operationToEdit.currency)} / Kalan: {formatMoney(financials.remainingAmount, operationToEdit.currency)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Tahsilat Ekle
                  </button>
                </div>

                {/* Overpayment Warning */}
                {financials.isOverpaid && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                    <strong>Uyarı:</strong> Toplam tahsil edilen tutar işlem tutarını aşmaktadır!
                  </div>
                )}

                {/* Inline Payment Form */}
                {showPaymentForm && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-900">Yeni Tahsilat Girişi</h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Tarih</label>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Tutar ({operationToEdit.currency})</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Kısa Not</label>
                        <input
                          type="text"
                          placeholder="Havale / Kredi Kartı / Peşin vb."
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPaymentForm(false)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPaymentSubmit}
                        className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        Tahsilatı Kaydet
                      </button>
                    </div>
                  </div>
                )}

                {/* Recorded Payments Table */}
                {currentPayments.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                          <th className="py-1.5 px-3">Tarih</th>
                          <th className="py-1.5 px-3">Tutar</th>
                          <th className="py-1.5 px-3">Not</th>
                          <th className="py-1.5 px-3 text-right">Sil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {currentPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-1.5 px-3 text-slate-700">{formatDateTR(p.date)}</td>
                            <td className="py-1.5 px-3 font-semibold text-emerald-700">
                              {formatMoney(p.amount, p.currency)}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 font-sans">{p.note || '-'}</td>
                            <td className="py-1.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => onDeletePayment(p.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Tahsilatı Sil"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Periodic Follow-Up Configuration (When marking as Completed) */}
          {status === 'completed' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <CalendarPlus className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Periyodik Takip ve Gelecek İşlem Planlama (Takvim Ayı Hesabı)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500">
                Tamamlanan her işlem türü için bir sonraki takip tarihini bağımsız seçebilirsiniz.
                Örn: 10.11.2026 + 6 ay = 10.05.2027 olarak otomatik hesaplanır.
              </p>

              <div className="space-y-3">
                {selectedTypes.map((typeKey) => {
                  const cfg = followUps[typeKey] || { interval: 'none' };
                  return (
                    <div key={typeKey} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">
                          {OPERATION_TYPE_LABELS[typeKey] || typeKey}
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            value={cfg.interval}
                            onChange={(e) => updateFollowUpInterval(typeKey, e.target.value as FollowUpInterval)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 font-medium"
                          >
                            <option value="none">Tekrar Yok</option>
                            <option value="3_months">3 ay sonra</option>
                            <option value="6_months">6 ay sonra</option>
                            <option value="1_year">1 yıl sonra</option>
                            <option value="custom_months">Özel süre (ay)</option>
                            <option value="manual_date">Elle tarih seç</option>
                          </select>
                        </div>
                      </div>

                      {/* Custom Months input */}
                      {cfg.interval === 'custom_months' && (
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-[11px] text-slate-600">Ay Sayısı:</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            placeholder="Örn: 9"
                            value={cfg.customMonths || ''}
                            onChange={(e) => updateCustomMonths(typeKey, parseInt(e.target.value, 10) || 1)}
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono"
                          />
                        </div>
                      )}

                      {/* Manual Date input */}
                      {cfg.interval === 'manual_date' && (
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-[11px] text-slate-600">Tarih:</label>
                          <input
                            type="date"
                            value={cfg.manualDate || ''}
                            onChange={(e) => updateManualDate(typeKey, e.target.value)}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                          />
                        </div>
                      )}

                      {/* Calculated target preview */}
                      {cfg.interval !== 'none' && cfg.targetDate && (
                        <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 rounded px-2 py-1 inline-block border border-emerald-200">
                          ✓ Otomatik Sonraki Takip: {formatDateTR(cfg.targetDate)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Ekli Belgeler ve Fotoğraflar ({attachments.length})
                </span>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors">
                <Upload className="h-3 w-3" />
                {uploading ? 'Yükleniyor...' : 'Belge / Fotoğraf Ekle'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-500 py-1">
                Servis raporu, kalibrasyon belgesi veya arıza fotoğraflarını buraya ekleyebilirsiniz.
              </p>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="h-4 w-4 text-slate-500 shrink-0" />
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-blue-700 hover:underline truncate"
                      >
                        {att.name}
                      </a>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({Math.round(att.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Eki Kaldır"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ek Notlar
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ziyaret ile ilgili diğer özel detaylar..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 sticky bottom-0 bg-white">
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
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? 'Kaydediliyor...' : operationToEdit ? 'Değişiklikleri Kaydet' : 'İşlemi Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
