import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Cpu,
  Building2,
  Calendar,
  Trash2,
  Edit,
  ArrowRight,
  Filter,
  AlertCircle,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  FileCode,
  LayoutGrid,
  List,
  Sparkles,
  ExternalLink,
  Wrench,
  Copy,
  Check,
} from 'lucide-react';
import {
  Customer,
  Device,
  Operation,
  OPERATION_TYPE_LABELS,
  DeviceOperationalStatus,
  DEVICE_OPERATIONAL_STATUS_LABELS,
} from '../types';
import { formatDateTR, getDateStatus, getTodayTR } from '../utils/date';

interface DevicesProps {
  devices: Device[];
  customers: Customer[];
  operations: Operation[];
  onOpenCustomerDetail: (customerId: string) => void;
  onNewDevice: () => void;
  onEditDevice: (device: Device) => void;
  onDeleteDevice: (deviceId: string, force?: boolean) => Promise<void>;
  onAddOperationForDevice: (customerId: string, deviceId: string) => void;
  onOpenOperationDetail: (op: Operation) => void;
}

export const Devices: React.FC<DevicesProps> = ({
  devices,
  customers,
  operations,
  onOpenCustomerDetail,
  onNewDevice,
  onEditDevice,
  onDeleteDevice,
  onAddOperationForDevice,
  onOpenOperationDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('all');
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    device: Device;
    opsCount: number;
  } | null>(null);

  // Quick stats
  const workingCount = devices.filter((d) => (d.operationalStatus || 'working') === 'working').length;
  const notWorkingCount = devices.filter((d) => d.operationalStatus === 'not_working').length;

  // Model groupings
  const modelStats = useMemo(() => {
    const map: Record<string, number> = {};
    devices.forEach((d) => {
      map[d.model] = (map[d.model] || 0) + 1;
    });
    return map;
  }, [devices]);

  const [sortBy, setSortBy] = useState<'customer_asc' | 'model' | 'installation_desc'>('customer_asc');

  // Filtered & Sorted devices
  const filteredDevices = useMemo(() => {
    const list = devices.filter((d) => {
      if (selectedModelFilter !== 'all' && d.model !== selectedModelFilter) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();

      const customer = customers.find((c) => c.id === d.customerId);
      const custTitle = customer?.title?.toLowerCase() || '';
      const custCity = customer?.city?.toLowerCase() || '';
      const custDistrict = customer?.district?.toLowerCase() || '';

      return (
        d.brand.toLowerCase().includes(term) ||
        d.model.toLowerCase().includes(term) ||
        (d.softwareModule && d.softwareModule.toLowerCase().includes(term)) ||
        (d.serialNumber && d.serialNumber.toLowerCase().includes(term)) ||
        custTitle.includes(term) ||
        custCity.includes(term) ||
        custDistrict.includes(term)
      );
    });

    return list.sort((a, b) => {
      const custA = customers.find((c) => c.id === a.customerId)?.title || '';
      const custB = customers.find((c) => c.id === b.customerId)?.title || '';

      if (sortBy === 'customer_asc') {
        return custA.localeCompare(custB, 'tr');
      } else if (sortBy === 'model') {
        return a.model.localeCompare(b.model);
      } else if (sortBy === 'installation_desc') {
        const dateA = a.installationDate || '1970-01-01';
        const dateB = b.installationDate || '1970-01-01';
        return dateB.localeCompare(dateA);
      }
      return 0;
    });
  }, [devices, customers, searchTerm, selectedModelFilter, sortBy]);

  const handleCopySerial = (sn?: string) => {
    if (!sn) return;
    navigator.clipboard?.writeText(sn);
    setCopiedSerial(sn);
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const handleDeleteClick = (dev: Device) => {
    const devOps = operations.filter((o) => o.deviceId === dev.id);
    setDeleteConfirmation({
      device: dev,
      opsCount: devOps.length,
    });
  };

  const confirmDelete = async (force: boolean) => {
    if (!deleteConfirmation) return;
    try {
      await onDeleteDevice(deleteConfirmation.device.id, force);
      setDeleteConfirmation(null);
    } catch (err: any) {
      alert(err.message || 'Silme işlemi başarısız');
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* Executive Quick Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
            Toplam Sahada Cihaz
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-950">
              {devices.length}
            </span>
            <span className="text-xs font-bold text-slate-600">cihaz aktif</span>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50/80 via-white to-white p-4 shadow-sm">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950">
            Çalışıyor (Sorunsuz)
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-700">
              {workingCount}
            </span>
            <span className="text-xs text-emerald-800 font-bold">cihaz devrede</span>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-rose-200 bg-linear-to-br from-rose-50/80 via-white to-white p-4 shadow-sm">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-950">
            Arıza / Servis Bekleyen
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-rose-700">
              {notWorkingCount}
            </span>
            <span className="text-xs text-rose-800 font-bold">müdahale gerekli</span>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50/80 via-white to-white p-4 shadow-sm">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-950">
            ColorSuit Lisanslı
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-blue-700">
              {devices.filter((d) => d.softwareModule?.includes('ColorSuit')).length}
            </span>
            <span className="text-xs text-blue-800 font-bold">Formulation & QC</span>
          </div>
        </div>
      </div>

      {/* Modern Model Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-800 font-extrabold mr-1">Model Filtresi:</span>
          <button
            onClick={() => setSelectedModelFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg font-extrabold transition-all ${
              selectedModelFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            Tüm Cihazlar ({devices.length})
          </button>
          {Object.entries(modelStats).map(([model, count]) => (
            <button
              key={model}
              onClick={() => setSelectedModelFilter(selectedModelFilter === model ? 'all' : model)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                selectedModelFilter === model
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <span>{model}</span>
              <span
                className={`text-[11px] font-mono rounded-md px-1.5 py-0.2 font-bold ${
                  selectedModelFilter === model ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-900'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* View Switcher: Grid vs Compact Table */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner">
          <button
            onClick={() => setViewMode('grid')}
            title="Kart Görünümü"
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-950 font-bold'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kartlar</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="Kompakt Liste"
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              viewMode === 'table'
                ? 'bg-white text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-950 font-bold'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Liste</span>
          </button>
        </div>
      </div>

      {/* Search, Sort and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Search & Sort dropdown */}
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Firma ünvanı, şehir, seri numarası veya model ara..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold hidden sm:inline">Sıralama:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-slate-900 focus:outline-none"
            >
              <option value="customer_asc">Müşteri Ünvanı (A-Z)</option>
              <option value="model">Cihaz Modeli</option>
              <option value="installation_desc">Son Kurulum Tarihi (Yeniden Eskiye)</option>
            </select>
          </div>
        </div>

        <button
          onClick={onNewDevice}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          Yeni Cihaz
        </button>
      </div>

      {/* Empty State */}
      {filteredDevices.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <Cpu className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">
            {searchTerm || selectedModelFilter !== 'all'
              ? 'Aramanıza veya seçili modele uygun cihaz bulunamadı'
              : 'Henüz cihaz kaydı bulunmuyor'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Konica Minolta ve diğer cihazlarınızı sisteme ekleyebilirsiniz.
          </p>
          <button
            onClick={onNewDevice}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni Cihaz Ekle
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GÖRÜNÜM 1: GELİŞMİŞ KURUMSAL KARTLAR (GRID) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDevices.map((dev) => {
            const customer = customers.find((c) => c.id === dev.customerId);
            const devOps = operations.filter((o) => o.deviceId === dev.id);
            const opStatus = dev.operationalStatus || 'working';

            return (
              <div
                key={dev.id}
                className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <button
                      onClick={() => onOpenCustomerDetail(dev.customerId)}
                      className="font-extrabold text-base text-slate-950 group-hover:text-blue-700 transition-colors text-left line-clamp-1"
                      title={customer?.title}
                    >
                      {customer?.title || 'Müşteri Atanmamış'}
                    </button>
                    <span className="shrink-0 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-900">
                      {[customer?.city, customer?.district].filter(Boolean).join(' / ') || customer?.country || 'Türkiye'}
                    </span>
                  </div>

                  {customer?.contactName && (
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      Yetkili: <strong className="text-slate-900">{customer.contactName}</strong>
                      {customer.phone && ` · ${customer.phone}`}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-extrabold tracking-tight shadow-xs ${
                          dev.model.includes('36dG')
                            ? 'bg-purple-600 text-white'
                            : dev.model.includes('3600')
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {dev.brand} {dev.model}
                      </span>
                    </div>

                    {opStatus === 'working' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Çalışıyor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-xs font-extrabold text-rose-800">
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        Arızalı
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200">
                    <div className="flex items-center gap-1 font-mono text-slate-800">
                      <span className="text-slate-500 font-bold text-[10px]">SN:</span>
                      {dev.serialNumber ? (
                        <button
                          onClick={() => handleCopySerial(dev.serialNumber)}
                          className="font-extrabold hover:text-blue-600 flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-300 shadow-2xs"
                          title="Seri Numarasını Kopyala"
                        >
                          {dev.serialNumber}
                          {copiedSerial === dev.serialNumber ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Bilinmiyor</span>
                      )}
                    </div>

                    {dev.softwareModule && (
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border shadow-2xs ${
                          dev.softwareModule.includes('QC')
                            ? 'bg-cyan-50 text-cyan-900 border-cyan-200'
                            : dev.softwareModule.includes('Mission')
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                        }`}
                      >
                        {dev.softwareModule}
                      </span>
                    )}
                  </div>

                  {dev.notes && (
                    <p className="text-[11px] text-slate-600 font-medium italic line-clamp-1 border-t border-slate-200 pt-1.5">
                      {dev.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs font-medium">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-500">Kurulum Tarihi:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {dev.installationDate ? formatDateTR(dev.installationDate) : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-500">Servis Geçmişi:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {devOps.length > 0 ? `${devOps.length} işlem yapıldı` : 'Kayıtlı işlem yok'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onAddOperationForDevice(dev.customerId, dev.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30 active:scale-98"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    + İşlem Aç
                  </button>

                  <button
                    onClick={() => onEditDevice(dev)}
                    className="p-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors shadow-2xs"
                    title="Düzenle"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteClick(dev)}
                    className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-2xs"
                    title="Cihazı Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GÖRÜNÜM 2: KOMPAKT LİSTE */
        <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden w-full">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-900 font-extrabold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 w-[34%]">Müşteri & Konum</th>
                <th className="py-3.5 px-4 w-[28%]">Model, Seri No & Yazılım</th>
                <th className="py-3.5 px-4 w-[18%]">Cihaz Durumu</th>
                <th className="py-3.5 px-4 w-[20%] text-right">Eylemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDevices.map((dev) => {
                const customer = customers.find((c) => c.id === dev.customerId);
                const opStatus = dev.operationalStatus || 'working';

                return (
                  <tr key={dev.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onOpenCustomerDetail(dev.customerId)}
                        className="font-extrabold text-sm text-slate-950 hover:text-blue-700 hover:underline text-left block truncate"
                        title={customer?.title}
                      >
                        {customer?.title || 'Müşteri Atanmamış'}
                      </button>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                        <span className="font-semibold text-slate-800">{[customer?.city, customer?.district].filter(Boolean).join(' / ') || 'Türkiye'}</span>
                        {customer?.contactName && (
                          <span className="truncate text-slate-500">· {customer.contactName}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-extrabold text-white shadow-2xs ${
                            dev.model.includes('36dG') ? 'bg-purple-600' : 'bg-blue-600'
                          }`}
                        >
                          {dev.model}
                        </span>
                        {dev.serialNumber ? (
                          <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300 text-[11px] font-bold">
                            SN: {dev.serialNumber}
                          </span>
                        ) : null}
                      </div>
                      {dev.softwareModule && (
                        <span className="text-[11px] text-blue-900 font-extrabold block mt-1">
                          {dev.softwareModule}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {opStatus === 'working' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Çalışıyor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-2.5 py-1 text-xs font-extrabold text-rose-800 border border-rose-300">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          Arızalı
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onAddOperationForDevice(dev.customerId, dev.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition-colors"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          İşlem Aç
                        </button>
                        <button
                          onClick={() => onEditDevice(dev)}
                          className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors shadow-2xs"
                          title="Düzenle"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(dev)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-2xs"
                          title="Cihazı Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Cihaz Kaydını Sil</h3>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              <strong>{deleteConfirmation.device.brand} {deleteConfirmation.device.model}</strong>{' '}
              {deleteConfirmation.device.serialNumber && `(SN: ${deleteConfirmation.device.serialNumber})`}{' '}
              cihazını silmek üzeresiniz.
            </p>

            {deleteConfirmation.opsCount > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                ⚠️ Bu cihaza ait <strong>{deleteConfirmation.opsCount} servis/kalibrasyon işlemi</strong> bulunmaktadır.
                Cihazı silerseniz bağlı işlemler de etkilenecektir.
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                onClick={() => confirmDelete(true)}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-xs"
              >
                Evet, Kalıcı Olarak Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
