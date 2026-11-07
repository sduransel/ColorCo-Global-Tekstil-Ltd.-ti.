import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  Plus,
  Cpu,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Paperclip,
  ExternalLink,
  CreditCard,
  Filter,
  FileText,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import {
  Customer,
  Device,
  Operation,
  Payment,
  OperationType,
  PaymentType,
  OPERATION_TYPE_LABELS,
} from '../types';
import { formatDateTR, getDateStatus } from '../utils/date';
import {
  calculateFinancialSummaryByCurrency,
  formatMoney,
  formatOperationPrice,
  getOperationCollectedAmount,
  getOperationFinancials,
} from '../utils/currency';

interface CustomerDetailProps {
  customerId: string;
  customers: Customer[];
  devices: Device[];
  operations: Operation[];
  payments: Payment[];
  onBack: () => void;
  onEditCustomer: (customer: Customer) => void;
  onAddDeviceForCustomer: (customerId: string) => void;
  onAddOperationForCustomer: (customerId: string) => void;
  onOpenOperationDetail: (op: Operation) => void;
  onOpenDeviceDetail: (dev: Device) => void;
  onAddPaymentForOperation: (op: Operation) => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customerId,
  customers,
  devices,
  operations,
  payments,
  onBack,
  onEditCustomer,
  onAddDeviceForCustomer,
  onAddOperationForCustomer,
  onOpenOperationDetail,
  onOpenDeviceDetail,
  onAddPaymentForOperation,
}) => {
  const customer = customers.find((c) => c.id === customerId);

  // Filters for the operations history table
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all');
  const [filterCollectionStatus, setFilterCollectionStatus] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  if (!customer) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-semibold text-slate-800">Müşteri bulunamadı</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Müşteri Listesine Dön
        </button>
      </div>
    );
  }

  // Customer's devices and operations
  const customerDevices = devices.filter((d) => d.customerId === customerId);
  const customerOps = operations.filter((o) => o.customerId === customerId);

  // Financial summary grouped by currency for this customer
  const financialSummaries = calculateFinancialSummaryByCurrency(customerOps, payments);

  // Filtered & sorted operations (newest first)
  const filteredOperations = useMemo(() => {
    return customerOps
      .filter((op) => {
        if (filterDevice !== 'all' && op.deviceId !== filterDevice) return false;
        if (filterType !== 'all' && !op.operationTypes.includes(filterType as OperationType)) return false;
        if (filterPaymentType !== 'all' && op.paymentType !== filterPaymentType) return false;
        if (filterStatus !== 'all' && op.status !== filterStatus) return false;

        if (filterCollectionStatus !== 'all') {
          const fin = getOperationFinancials(op, payments);
          if (filterCollectionStatus === 'paid' && fin.statusText !== 'Ödendi') return false;
          if (filterCollectionStatus === 'partial' && fin.statusText !== 'Kısmi ödendi') return false;
          if (filterCollectionStatus === 'not_paid' && fin.statusText !== 'Ödenmedi') return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.actualDate || a.plannedDate;
        const dateB = b.actualDate || b.plannedDate;
        return dateB.localeCompare(dateA);
      });
  }, [customerOps, filterDevice, filterType, filterPaymentType, filterStatus, filterCollectionStatus, payments]);

  // Urgent pending operations for this customer
  const urgentCustomerOps = customerOps.filter(
    (o) => o.status === 'planned' && o.plannedDate
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Müşterilere Geri Dön
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onEditCustomer(customer)}
            className="rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            Müşteri Bilgilerini Düzenle
          </button>
          <button
            onClick={() => onAddDeviceForCustomer(customerId)}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4 text-blue-600" />
            Cihaz Ekle
          </button>
          <button
            onClick={() => onAddOperationForCustomer(customerId)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-extrabold transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4 text-white" />
            İşlem Ekle
          </button>
        </div>
      </div>

      {/* Customer Header Information Card */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">{customer.title}</h1>
              {customer.isArchived && (
                <span className="rounded-md bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  Arşivlenmiş
                </span>
              )}
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>
                  {[customer.city, customer.district].filter(Boolean).join(' / ') || customer.country}
                </span>
              </div>

              {customer.phone && (
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.email && (
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <span>{customer.email}</span>
                </div>
              )}
            </div>

            {/* Contact Person Details */}
            {(customer.contactName || customer.contactRole) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-800 bg-slate-100 rounded-xl px-3.5 py-2 inline-flex border border-slate-200">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-extrabold text-slate-950">{customer.contactName || 'Yetkili'}</span>
                {customer.contactRole && (
                  <span className="text-slate-600 font-semibold">({customer.contactRole})</span>
                )}
              </div>
            )}

            {customer.notes && (
              <div className="mt-3.5 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border-2 border-slate-200 font-medium">
                <span className="font-extrabold text-slate-950">Müşteri Notu: </span>
                {customer.notes}
              </div>
            )}
          </div>

          {/* Currency-wise Financial Summary Cards */}
          <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 min-w-[300px] shadow-2xs">
            <div className="flex items-center justify-between border-b-2 border-slate-200/80 pb-2.5 mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Finansal Bakiye Özeti
              </span>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>

            {financialSummaries.length === 0 ? (
              <p className="text-xs text-slate-500 py-1 font-medium">Henüz fiyatlandırılmış işlem bulunmuyor.</p>
            ) : (
              <div className="space-y-3">
                {financialSummaries.map((fin) => (
                  <div key={fin.currency} className="text-xs border-b border-slate-200 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between font-extrabold text-slate-950">
                      <span>{fin.currency} Toplamı ({fin.operationCount} işlem)</span>
                      <span className="font-mono text-sm">{formatMoney(fin.totalPrice, fin.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-800 font-bold mt-1">
                      <span>Tahsil Edilen:</span>
                      <span className="font-mono">{formatMoney(fin.totalCollected, fin.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold mt-1">
                      <span className={fin.remainingAmount > 0 ? 'text-rose-900' : 'text-slate-600'}>
                        Kalan Bakiye:
                      </span>
                      <span className={`font-mono font-extrabold ${fin.remainingAmount > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                        {formatMoney(fin.remainingAmount, fin.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Owned Devices Section */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3.5 mb-5">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-extrabold text-slate-950">
              Kayıtlı Cihazlar ({customerDevices.length})
            </h2>
          </div>
          <button
            onClick={() => onAddDeviceForCustomer(customerId)}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4 text-blue-600" />
            Cihaz Ekle
          </button>
        </div>

        {customerDevices.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 font-medium">Bu müşteriye ait kayıtlı cihaz bulunmuyor.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customerDevices.map((dev) => {
              const opStatus = dev.operationalStatus || 'working';
              return (
                <div
                  key={dev.id}
                  onClick={() => onOpenDeviceDetail(dev)}
                  className="group cursor-pointer rounded-xl border-2 border-slate-200 bg-slate-50/70 p-4.5 hover:border-blue-500 hover:bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 truncate">
                      {dev.deviceType}
                    </span>
                    {/* Operational Status Badge: Çalışıyor / Çalışmıyor */}
                    {opStatus === 'working' ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-950 border border-emerald-300">
                        Çalışıyor
                      </span>
                    ) : opStatus === 'not_working' ? (
                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-950 border border-red-300">
                        Çalışmıyor
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-800 border border-slate-300">
                        Diğer
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 font-extrabold text-slate-950 group-hover:text-blue-600 transition-colors text-sm">
                    {dev.brand} {dev.model}
                  </h3>

                  {/* Software Module */}
                  {dev.softwareModule && (
                    <div className="mt-2">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold border ${
                          dev.softwareModule.includes('QC')
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : dev.softwareModule.includes('Mission')
                            ? 'bg-purple-100 text-purple-950 border-purple-300'
                            : 'bg-blue-100 text-blue-950 border-blue-300'
                        }`}
                      >
                        {dev.softwareModule}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 text-xs font-mono font-semibold text-slate-700">
                    <span className="text-slate-400 font-normal">SN:</span> {dev.serialNumber || 'Bilinmiyor'}
                  </div>
                  {dev.installationDate && (
                    <div className="mt-1 text-[11px] font-medium text-slate-500">
                      Kurulum: {formatDateTR(dev.installationDate)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Operations History Table with all 12 Columns */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Header & Filters */}
        <div className="border-b-2 border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-950">
                Servis ve Kalibrasyon Geçmişi ({filteredOperations.length})
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Varsayılan olarak en yeni işlem üstte listelenir.
              </p>
            </div>
            <button
              onClick={() => onAddOperationForCustomer(customerId)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-extrabold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4 text-white" />
              Yeni İşlem Kaydı
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filtreler:
            </span>

            {/* Device Filter */}
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
            >
              <option value="all">Tüm Cihazlar</option>
              {customerDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.brand} {d.model} ({d.serialNumber || 'No SN'})
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
            >
              <option value="all">Tüm İşlem Türleri</option>
              <option value="service_repair">Servis / Arıza Müdahalesi</option>
              <option value="periodic_maintenance">Periyodik Bakım</option>
              <option value="lamp_replacement">Lamba Değişimi</option>
              <option value="calibration">Kalibrasyon</option>
            </select>

            {/* Payment Type Filter */}
            <select
              value={filterPaymentType}
              onChange={(e) => setFilterPaymentType(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
            >
              <option value="all">Resmi & Gayriresmi</option>
              <option value="official">Resmi</option>
              <option value="unofficial">Gayriresmi</option>
            </select>

            {/* Collection Status Filter */}
            <select
              value={filterCollectionStatus}
              onChange={(e) => setFilterCollectionStatus(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
            >
              <option value="all">Tüm Tahsilat Durumları</option>
              <option value="paid">Ödendi</option>
              <option value="partial">Kısmi Ödendi</option>
              <option value="not_paid">Ödenmedi</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="planned">Planlandı</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
            </select>

            {(filterDevice !== 'all' ||
              filterType !== 'all' ||
              filterPaymentType !== 'all' ||
              filterCollectionStatus !== 'all' ||
              filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setFilterDevice('all');
                  setFilterType('all');
                  setFilterPaymentType('all');
                  setFilterCollectionStatus('all');
                  setFilterStatus('all');
                }}
                className="text-[11px] text-blue-700 hover:underline ml-1"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>

        {/* 12-Column Table */}
        {filteredOperations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Filtreleme kriterlerinize uygun işlem kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-950 font-extrabold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-3.5">İşlem Tarihi</th>
                  <th className="py-3.5 px-3.5">Cihaz Marka / Model</th>
                  <th className="py-3.5 px-3.5">Seri No</th>
                  <th className="py-3.5 px-3.5">İşlem Türü</th>
                  <th className="py-3.5 px-3.5">Kısa Açıklama</th>
                  <th className="py-3.5 px-3.5">İşlem Durumu</th>
                  <th className="py-3.5 px-3.5">Fiyat & Para Birimi</th>
                  <th className="py-3.5 px-3.5">Ödeme Türü</th>
                  <th className="py-3.5 px-3.5">Tahsilat Durumu</th>
                  <th className="py-3.5 px-3.5 text-right">Tahsil Edilen</th>
                  <th className="py-3.5 px-3.5 text-right">Kalan Tutar</th>
                  <th className="py-3.5 px-3.5">Sonraki Takip</th>
                  <th className="py-3.5 px-3.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOperations.map((op) => {
                  const device = devices.find((d) => d.id === op.deviceId);
                  const fin = getOperationFinancials(op, payments);

                  // Next follow up summary text
                  const followUpEntries = op.nextFollowUps
                    ? Object.entries(op.nextFollowUps).filter(
                        ([, cfg]) => cfg && cfg.interval !== 'none'
                      )
                    : [];

                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => onOpenOperationDetail(op)}
                    >
                      {/* 1. Date */}
                      <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {op.actualDate ? (
                          <div>
                            <span className="text-slate-950">{formatDateTR(op.actualDate)}</span>
                            <span className="block text-[10px] font-semibold text-emerald-800">Gerçekleşen</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-amber-800">{formatDateTR(op.plannedDate)}</span>
                            <span className="block text-[10px] font-semibold text-amber-700">Planlanan</span>
                          </div>
                        )}
                      </td>

                      {/* 2. Device Brand & Model */}
                      <td className="py-3.5 px-3.5 font-extrabold text-slate-950 whitespace-nowrap">
                        {device ? `${device.brand} ${device.model}` : 'Cihaz'}
                      </td>

                      {/* 3. Serial Number */}
                      <td className="py-3.5 px-3.5 font-mono font-semibold text-slate-600 whitespace-nowrap">
                        {device?.serialNumber || '-'}
                      </td>

                      {/* 4. Operation Type(s) */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {op.operationTypes.map((typeKey) => (
                            <span
                              key={typeKey}
                              className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold text-blue-950 border border-blue-300"
                            >
                              {OPERATION_TYPE_LABELS[typeKey] || typeKey}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 5. Short Description */}
                      <td className="py-3.5 px-3.5 text-slate-700 font-medium max-w-xs truncate">
                        {op.actionDescription || op.faultDescription || '-'}
                        {op.attachments && op.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5 text-slate-600">
                            <Paperclip className="h-3 w-3" />
                            {op.attachments.length}
                          </span>
                        )}
                      </td>

                      {/* 6. Operation Status */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {op.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-950 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                            Tamamlandı
                          </span>
                        )}
                        {op.status === 'planned' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-950 border border-amber-300">
                            <Clock className="h-3 w-3 text-amber-700" />
                            Planlandı
                          </span>
                        )}
                        {op.status === 'cancelled' && (
                          <span className="rounded-md bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-300">
                            İptal Edildi
                          </span>
                        )}
                      </td>

                      {/* 7. Price and Currency */}
                      <td className="py-3.5 px-3.5 font-mono font-extrabold text-slate-950 text-sm whitespace-nowrap">
                        {formatOperationPrice(op.price, op.currency)}
                      </td>

                      {/* 8. Payment Type: Resmi / Gayriresmi */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`rounded-md px-2.5 py-0.5 text-[11px] font-extrabold border ${
                            op.paymentType === 'official'
                              ? 'bg-blue-100 text-blue-950 border-blue-300'
                              : 'bg-slate-200 text-slate-800 border-slate-300'
                          }`}
                        >
                          {op.paymentType === 'official' ? 'Resmi (+KDV)' : 'Gayriresmi'}
                        </span>
                      </td>

                      {/* 9. Collection Status */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-extrabold border ${fin.badgeClass}`}>
                          {fin.statusText}
                        </span>
                      </td>

                      {/* 10. Collected Amount */}
                      <td className="py-3.5 px-3.5 text-right font-mono text-emerald-800 font-extrabold whitespace-nowrap">
                        {fin.totalCollected > 0 ? formatMoney(fin.totalCollected, op.currency) : '-'}
                      </td>

                      {/* 11. Remaining Amount */}
                      <td className="py-3.5 px-3.5 text-right font-mono font-extrabold whitespace-nowrap">
                        {fin.remainingAmount > 0 ? (
                          <span className="text-rose-700">
                            {formatMoney(fin.remainingAmount, op.currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* 12. Next Follow-up Date */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-mono font-semibold text-slate-700">
                        {followUpEntries.length > 0 ? (
                          followUpEntries.map(([tKey, cfg]) => (
                            <div key={tKey} className="text-[11px]">
                              {formatDateTR(cfg.targetDate)}
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {op.price && op.price > 0 && fin.remainingAmount > 0 && (
                            <button
                              onClick={() => onAddPaymentForOperation(op)}
                              title="Tahsilat Ekle"
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-extrabold transition-colors shadow-2xs cursor-pointer"
                            >
                              + Tahsilat
                            </button>
                          )}
                          <button
                            onClick={() => onOpenOperationDetail(op)}
                            title="İşlem Detayını Aç"
                            className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
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
      </div>
    </div>
  );
};
