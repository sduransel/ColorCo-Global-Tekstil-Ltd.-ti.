import React, { useState, useEffect } from 'react';
import { X, Cpu, AlertTriangle, Building2, Tag, Calendar, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  Customer,
  Device,
  DeviceOperationalStatus,
  DEVICE_OPERATIONAL_STATUS_LABELS,
  STANDARD_BRANDS,
  STANDARD_MODELS,
  STANDARD_SOFTWARE_MODULES,
} from '../types';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceData: Partial<Device>) => Promise<void>;
  customers: Customer[];
  devices: Device[];
  deviceToEdit?: Device | null;
  defaultCustomerId?: string;
}

const COMMON_DEVICE_TYPES = [
  'Masaüstü Spektrofotometre',
  'Portatif Spektrofotometre',
  'Spektrofotometre',
  'Işık Kabini',
  'Dansitometre',
  'Renk Ölçüm Cihazı',
  'Baskı Kalite Kontrol Sistemi',
];

export const DeviceModal: React.FC<DeviceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  devices,
  deviceToEdit,
  defaultCustomerId,
}) => {
  const [customerId, setCustomerId] = useState('');
  const [deviceType, setDeviceType] = useState('Masaüstü Spektrofotometre');

  // Brand selection with "Diğer" support
  const [selectedBrand, setSelectedBrand] = useState('Konica Minolta');
  const [customBrand, setCustomBrand] = useState('');

  // Model selection with "Diğer" support
  const [selectedModel, setSelectedModel] = useState('CM-36d');
  const [customModel, setCustomModel] = useState('');

  // Operational Status: Çalışıyor, Çalışmıyor, Diğer
  const [operationalStatus, setOperationalStatus] = useState<DeviceOperationalStatus>('working');

  // Software / License Module: ColorSuit Formulation, ColorSuit QC, etc.
  const [selectedSoftware, setSelectedSoftware] = useState('ColorSuit Formulation');
  const [customSoftware, setCustomSoftware] = useState('');

  const [serialNumber, setSerialNumber] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (deviceToEdit) {
      setCustomerId(deviceToEdit.customerId || '');
      setDeviceType(deviceToEdit.deviceType || 'Masaüstü Spektrofotometre');

      // Brand
      if (STANDARD_BRANDS.includes(deviceToEdit.brand)) {
        setSelectedBrand(deviceToEdit.brand);
        setCustomBrand('');
      } else {
        setSelectedBrand('Diğer');
        setCustomBrand(deviceToEdit.brand || '');
      }

      // Model
      if (STANDARD_MODELS.includes(deviceToEdit.model)) {
        setSelectedModel(deviceToEdit.model);
        setCustomModel('');
      } else {
        setSelectedModel('Diğer');
        setCustomModel(deviceToEdit.model || '');
      }

      // Operational Status
      setOperationalStatus(deviceToEdit.operationalStatus || 'working');

      // Software
      const sw = deviceToEdit.softwareModule || 'ColorSuit Formulation';
      if (STANDARD_SOFTWARE_MODULES.includes(sw)) {
        setSelectedSoftware(sw);
        setCustomSoftware('');
      } else {
        setSelectedSoftware('Diğer');
        setCustomSoftware(sw);
      }

      setSerialNumber(deviceToEdit.serialNumber || '');
      setInstallationDate(deviceToEdit.installationDate || '');
      setNotes(deviceToEdit.notes || '');
      setStatus(deviceToEdit.status || 'active');
    } else {
      setCustomerId(defaultCustomerId || (customers[0]?.id || ''));
      setDeviceType('Masaüstü Spektrofotometre');
      setSelectedBrand('Konica Minolta');
      setCustomBrand('');
      setSelectedModel('CM-36d');
      setCustomModel('');
      setOperationalStatus('working');
      setSelectedSoftware('ColorSuit Formulation');
      setCustomSoftware('');
      setSerialNumber('');
      setInstallationDate('');
      setNotes('');
      setStatus('active');
    }
    setError(null);
    setDuplicateWarning(null);
  }, [deviceToEdit, defaultCustomerId, isOpen, customers]);

  if (!isOpen) return null;

  // Real-time duplicate serial number warning
  const handleSerialNumberChange = (val: string) => {
    setSerialNumber(val);
    if (!val.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const clean = val.trim().toLowerCase();
    const match = devices.find(
      (d) =>
        d.id !== deviceToEdit?.id &&
        d.serialNumber &&
        d.serialNumber.trim().toLowerCase() === clean
    );
    if (match) {
      const owner = customers.find((c) => c.id === match.customerId);
      setDuplicateWarning(
        `Uyarı: Bu seri numarası daha önce "${owner?.title || 'Başka bir müşteri'}" firmasına ait ${match.brand} ${match.model} cihazında kaydedilmiştir!`
      );
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Lütfen bir müşteri seçiniz');
      return;
    }

    const finalBrand = selectedBrand === 'Diğer' ? customBrand.trim() : selectedBrand;
    const finalModel = selectedModel === 'Diğer' ? customModel.trim() : selectedModel;
    const finalSoftware = selectedSoftware === 'Diğer' ? customSoftware.trim() : selectedSoftware;

    if (!finalBrand) {
      setError('Lütfen marka bilgisini giriniz');
      return;
    }
    if (!finalModel) {
      setError('Lütfen model bilgisini giriniz');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        customerId,
        deviceType: deviceType.trim(),
        brand: finalBrand,
        model: finalModel,
        operationalStatus,
        softwareModule: finalSoftware || undefined,
        serialNumber: serialNumber.trim() ? serialNumber.trim() : undefined,
        installationDate: installationDate || undefined,
        notes: notes.trim(),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Cihaz kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {deviceToEdit ? 'Cihaz Bilgilerini Düzenle' : 'Yeni Cihaz Kaydı'}
              </h2>
              <p className="text-xs text-slate-500">
                Spektrofotometre, yazılım lisansı ve cihaz çalışma durumu
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {duplicateWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bağlı Olduğu Müşteri / Firma <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="" disabled>Müşteri Seçiniz</option>
              {customers
                .filter((c) => !c.isArchived || c.id === customerId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.city || 'Şehir belirtilmedi'})
                  </option>
                ))}
            </select>
          </div>

          {/* Marka (Konica Minolta, X-rite, Datacolor, Diğer) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marka <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {STANDARD_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {selectedBrand === 'Diğer' && (
                <input
                  type="text"
                  required
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="Marka adını yazınız..."
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              )}
            </div>

            {/* Model (CM-3600d, CM-3600A, CM-36d, CM-36dG, CM-36dGV, Diğer) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {STANDARD_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {selectedModel === 'Diğer' && (
                <input
                  type="text"
                  required
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Model adını yazınız..."
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              )}
            </div>
          </div>

          {/* Cihaz Durumu: Çalışıyor / Çalışmıyor / Diğer */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cihaz Durumu <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['working', 'not_working', 'other'] as DeviceOperationalStatus[]).map((st) => {
                  const isSelected = operationalStatus === st;
                  let colorClass = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
                  if (isSelected) {
                    if (st === 'working') colorClass = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold';
                    else if (st === 'not_working') colorClass = 'border-red-600 bg-red-50 text-red-900 font-bold';
                    else colorClass = 'border-slate-800 bg-slate-900 text-white font-bold';
                  }

                  return (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setOperationalStatus(st)}
                      className={`rounded-lg border px-2 py-2 text-xs text-center transition-all ${colorClass}`}
                    >
                      {DEVICE_OPERATIONAL_STATUS_LABELS[st]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Yazılım / Lisans Modülü (ColorSuit Formulation, ColorSuit QC vb.) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yazılım / Lisans Modülü
              </label>
              <select
                value={selectedSoftware}
                onChange={(e) => setSelectedSoftware(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {STANDARD_SOFTWARE_MODULES.map((sw) => (
                  <option key={sw} value={sw}>
                    {sw}
                  </option>
                ))}
              </select>

              {selectedSoftware === 'Diğer' && (
                <input
                  type="text"
                  value={customSoftware}
                  onChange={(e) => setCustomSoftware(e.target.value)}
                  placeholder="Özel yazılım modülü adı..."
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              )}
            </div>
          </div>

          {/* Device Type & Serial Number */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cihaz Türü
              </label>
              <input
                list="device-types-list"
                type="text"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                placeholder="Örn: Masaüstü Spektrofotometre"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <datalist id="device-types-list">
                {COMMON_DEVICE_TYPES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seri Numarası (Varsa)
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => handleSerialNumberChange(e.target.value)}
                placeholder="Örn: KM-36D-00421"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Baştaki sıfırlar korunur. Bilinmiyorsa boş bırakılabilir.
              </span>
            </div>
          </div>

          {/* Installation Date & Status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kurulum Tarihi (İsteğe bağlı)
              </label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kayıt Durumu
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'archived')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="active">Aktif Kayıt</option>
                <option value="archived">Arşivde (Servis Dışı)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cihaz Notları & Aksesuarlar
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Diyafram seti, beyaz kalibrasyon karosu plaketi, UV filtresi durumu..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Footer Buttons */}
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
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? 'Kaydediliyor...' : deviceToEdit ? 'Değişiklikleri Kaydet' : 'Cihazı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
