import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  Cpu,
  FileText,
  DollarSign,
  ChevronRight,
  Filter,
  Wrench,
  Trash2,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Customer, Device, MachineSale, Currency, PaymentType } from '../types';
import { formatDateTR, formatCurrency, getTodayTR, diffDays } from '../utils/date';

interface MachineSalesProps {
  sales: MachineSale[];
  customers: Customer[];
  devices: Device[];
  onOpenCustomerDetail: (customerId: string) => void;
  onNewSale: () => void;
  onEditSale: (sale: MachineSale) => void;
  onDeleteSale: (saleId: string) => Promise<void>;
  onScheduleCalibration: (customerId: string, deviceId: string) => void;
}

export const MachineSales: React.FC<MachineSalesProps> = ({
  sales,
  customers,
  devices,
  onOpenCustomerDetail,
  onNewSale,
  onEditSale,
  onDeleteSale,
  onScheduleCalibration,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('all');
  const [selectedCalibStatus, setSelectedCalibStatus] = useState<string>('all');

  const today = getTodayTR();

  // Map customers and devices for fast lookup
  const customerMap = useMemo(() => {
    return new Map(customers.map((c) => [c.id, c]));
  }, [customers]);

  const deviceMap = useMemo(() => {
    return new Map(devices.map((d) => [d.id, d]));
  }, [devices]);

  // Financial and Operational Statistics
  const stats = useMemo(() => {
    const totalCount = sales.length;
    let eurTotal = 0;
    let usdTotal = 0;
    let tryTotal = 0;
    let gbpTotal = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;
    let upcomingCount = 0;
    let officialCount = 0;

    for (const s of sales) {
      if (s.currency === 'EUR') eurTotal += s.price;
      else if (s.currency === 'USD') usdTotal += s.price;
      else if (s.currency === 'TRY') tryTotal += s.price;
      else if (s.currency === 'GBP') gbpTotal += s.price;

      if (s.calibrationStatus === 'overdue') overdueCount++;
      else if (s.calibrationStatus === 'due_soon') dueSoonCount++;
      else upcomingCount++;

      if (s.paymentType === 'official') officialCount++;
    }

    return {
      totalCount,
      eurTotal,
      usdTotal,
      tryTotal,
      gbpTotal,
      overdueCount,
      dueSoonCount,
      upcomingCount,
      officialCount,
      unofficialCount: totalCount - officialCount,
    };
  }, [sales]);

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const cust = customerMap.get(s.customerId);
      const dev = deviceMap.get(s.deviceId);

      // Search matching
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const custTitle = cust?.title.toLowerCase() || '';
        const custCity = cust?.city?.toLowerCase() || '';
        const devBrand = dev?.brand?.toLowerCase() || '';
        const devModel = dev?.model?.toLowerCase() || '';
        const devSn = dev?.serialNumber?.toLowerCase() || '';
        const saleNotes = (s.notes || '').toLowerCase();
        const dateStr = s.saleDate.toLowerCase();

        const match =
          custTitle.includes(q) ||
          custCity.includes(q) ||
          devBrand.includes(q) ||
          devModel.includes(q) ||
          devSn.includes(q) ||
          saleNotes.includes(q) ||
          dateStr.includes(q);

        if (!match) return false;
      }

      // Year filter
      if (selectedYear !== 'all') {
        if (!s.saleDate.startsWith(selectedYear)) return false;
      }

      // Currency filter
      if (selectedCurrency !== 'all') {
        if (s.currency !== selectedCurrency) return false;
      }

      // Payment type filter
      if (selectedPaymentType !== 'all') {
        if (s.paymentType !== selectedPaymentType) return false;
      }

      // Calibration status filter
      if (selectedCalibStatus !== 'all') {
        if (s.calibrationStatus !== selectedCalibStatus) return false;
      }

      return true;
    });
  }, [sales, searchTerm, selectedYear, selectedCurrency, selectedPaymentType, selectedCalibStatus, customerMap, deviceMap]);

  // Excel Export
  const handleExportExcel = () => {
    const exportData = filteredSales.map((s, idx) => {
      const cust = customerMap.get(s.customerId);
      const dev = deviceMap.get(s.deviceId);
      const days = diffDays(s.firstCalibrationDueDate, today);

      return {
        'Sıra No': idx + 1,
        'Satış / Kuruluş Tarihi': formatDateTR(s.saleDate),
        'Müşteri / Firma Ünvanı': cust?.title || '-',
        'Şehir / Bölge': [cust?.city, cust?.district, cust?.country].filter(Boolean).join(' / '),
        'Telefon': cust?.phone || '-',
        'Yetkili': cust?.contactName || '-',
        'Cihaz Marka & Model': `${dev?.brand || 'Konica Minolta'} ${dev?.model || 'CM-36d'}`,
        'Seri Numarası': dev?.serialNumber || '-',
        'Satış Fiyatı': s.price,
        'Para Birimi': s.currency,
        'Fatura / Ödeme Türü': s.paymentType === 'official' ? 'Resmi (+KDV)' : 'Gayriresmi',
        '1. Yıl Kalibrasyon Vadesi': formatDateTR(s.firstCalibrationDueDate),
        'Kalibrasyon Durumu':
          s.calibrationStatus === 'overdue'
            ? `Vadesi Geçti (${Math.abs(days)} gün gecikmeli)`
            : s.calibrationStatus === 'due_soon'
            ? `Yaklaşıyor (${days} gün kaldı)`
            : 'Vakti Var',
        'Notlar ve Takas': s.notes || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Satılan Makineler');
    XLSX.writeFile(wb, `ColorCo_Satilan_Makineler_${today}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Machines Sold */}
        <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50/80 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">
              Toplam Makine Satışı
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-blue-950">{stats.totalCount}</span>
            <span className="text-xs font-bold text-blue-700">Cihaz Kuruldu</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-blue-900 pt-2 border-t border-blue-100 font-semibold">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              {stats.officialCount} Resmi (+KDV)
            </span>
            <span>•</span>
            <span className="text-slate-700 font-medium">{stats.unofficialCount} Gayriresmi</span>
          </div>
        </div>

        {/* Total Sales Volume (Multi-currency breakdown) */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50/80 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wider">
              Toplam Satış Hacmi
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-700">EUR:</span>
              <span className="text-sm font-extrabold font-mono text-blue-900">
                {formatCurrency(stats.eurTotal, 'EUR')}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-700">USD:</span>
              <span className="text-sm font-extrabold font-mono text-emerald-900">
                {formatCurrency(stats.usdTotal, 'USD')}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-700">TRY:</span>
              <span className="text-sm font-extrabold font-mono text-amber-900">
                {formatCurrency(stats.tryTotal, 'TRY')}
              </span>
            </div>
          </div>
        </div>

        {/* Overdue 1st Year Calibration Alert */}
        <div
          onClick={() => setSelectedCalibStatus(selectedCalibStatus === 'overdue' ? 'all' : 'overdue')}
          className={`cursor-pointer rounded-2xl border-2 p-5 shadow-sm transition-all active:scale-99 ${
            selectedCalibStatus === 'overdue'
              ? 'border-rose-500 bg-rose-100/60 ring-2 ring-rose-500/30'
              : 'border-rose-200 bg-linear-to-br from-rose-50/80 via-white to-white hover:border-rose-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-rose-950 uppercase tracking-wider">
              1 Yılı Aşan Kalibrasyonlar
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-rose-700">{stats.overdueCount}</span>
            <span className="text-xs font-bold text-rose-800">Cihaz Kalibrasyon Bekliyor</span>
          </div>
          <p className="mt-2.5 text-xs font-bold text-rose-700 pt-2 border-t border-rose-100">
            {selectedCalibStatus === 'overdue' ? 'Filtre aktif (Tümünü görmek için tıklayın)' : 'Yıllık vadesi geçen makineleri filtrele →'}
          </p>
        </div>

        {/* Due Soon or Upcoming */}
        <div
          onClick={() => setSelectedCalibStatus(selectedCalibStatus === 'due_soon' ? 'all' : 'due_soon')}
          className={`cursor-pointer rounded-2xl border-2 p-5 shadow-sm transition-all active:scale-99 ${
            selectedCalibStatus === 'due_soon'
              ? 'border-amber-500 bg-amber-100/60 ring-2 ring-amber-500/30'
              : 'border-amber-200 bg-linear-to-br from-amber-50/80 via-white to-white hover:border-amber-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-950 uppercase tracking-wider">
              Yaklaşan 1. Yıl Takibi
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-600/30">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-amber-700">{stats.dueSoonCount}</span>
            <span className="text-xs font-bold text-amber-800">Cihaz (30-45 Gün)</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-amber-800 pt-2 border-t border-amber-100 font-bold">
            <span>{stats.upcomingCount} Cihaz</span>
            <span>2027 vadeli normal</span>
          </div>
        </div>
      </div>

      {/* Main Table & Filters Card */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">
                Satılan Makineler ve İlk Kuruluş Listesi ({filteredSales.length} Kayıt)
              </h2>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                İlk kuruluş tarihine göre 1 yılı aşan cihazlar otomatik kalibrasyon alarmına bağlanmıştır.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs"
              >
                <Download className="h-4 w-4 text-slate-600" />
                Excel İndir
              </button>

              <button
                onClick={onNewSale}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30 whitespace-nowrap active:scale-98"
              >
                <Plus className="h-4 w-4" />
                Yeni Satış Kaydı Ekle
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search Input */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Firma, seri no, not ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            {/* Year Filter */}
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Kuruluş Yılı: Tümü</option>
                <option value="2023">2023 Yılı Satışları</option>
                <option value="2024">2024 Yılı Satışları</option>
                <option value="2025">2025 Yılı Satışları</option>
                <option value="2026">2026 Yılı Satışları</option>
              </select>
            </div>

            {/* Calibration Status Filter */}
            <div>
              <select
                value={selectedCalibStatus}
                onChange={(e) => setSelectedCalibStatus(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Kalibrasyon: Tümü</option>
                <option value="overdue">⚠️ 1 Yılı Aşanlar (Gecikmiş)</option>
                <option value="due_soon">🔔 Yaklaşanlar (30-45 Gün)</option>
                <option value="upcoming">✓ Gelecek Vade</option>
              </select>
            </div>

            {/* Payment Type Filter */}
            <div>
              <select
                value={selectedPaymentType}
                onChange={(e) => setSelectedPaymentType(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Fatura Türü: Tümü</option>
                <option value="official">Resmi (+KDV Faturalı)</option>
                <option value="unofficial">Gayriresmi</option>
              </select>
            </div>

            {/* Currency Filter */}
            <div>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">Para Birimi: Tümü</option>
                <option value="EUR">Yalnızca EUR (€)</option>
                <option value="USD">Yalnızca USD ($)</option>
                <option value="TRY">Yalnızca TRY (₺)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 border-b-2 border-slate-300 font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-3.5 w-12 text-center">#</th>
                <th className="py-3.5 px-3.5">Satış / Kuruluş</th>
                <th className="py-3.5 px-3.5">Müşteri / Firma</th>
                <th className="py-3.5 px-3.5">Cihaz Modeli & Seri No</th>
                <th className="py-3.5 px-3.5 text-right">Satış Fiyatı</th>
                <th className="py-3.5 px-3.5 text-center">Fatura / Ödeme</th>
                <th className="py-3.5 px-3.5">1. Yıl Kalibrasyon Vadesi</th>
                <th className="py-3.5 px-3.5">Notlar & Takas</th>
                <th className="py-3.5 px-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Seçilen filtre kriterlerine uygun makine satışı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, idx) => {
                  const cust = customerMap.get(sale.customerId);
                  const dev = deviceMap.get(sale.deviceId);
                  const days = diffDays(sale.firstCalibrationDueDate, today);
                  const isOverdue = sale.calibrationStatus === 'overdue';
                  const isDueSoon = sale.calibrationStatus === 'due_soon';

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOverdue ? 'bg-red-50/15' : ''
                      }`}
                    >
                      {/* # Index */}
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Sale Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-900">
                          {formatDateTR(sale.saleDate)}
                        </div>
                        <div className="text-[10px] text-slate-400">İlk Kuruluş</div>
                      </td>

                      {/* Customer Title & Location */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => cust && onOpenCustomerDetail(cust.id)}
                          className="font-extrabold text-slate-950 hover:text-blue-600 hover:underline text-left block text-xs line-clamp-1"
                          title={cust?.title}
                        >
                          {cust?.title || 'Müşteri Kaydı'}
                        </button>
                        <div className="text-[11px] font-medium text-slate-600 mt-0.5 flex items-center gap-1.5">
                          <span>
                            {[cust?.city, cust?.district, cust?.country !== 'Türkiye' ? cust?.country : null]
                              .filter(Boolean)
                              .join(' / ') || '-'}
                          </span>
                          {cust?.phone && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="font-mono font-semibold text-slate-700">{cust.phone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Device & Model */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">
                            {dev?.brand || 'Konica Minolta'}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold border ${
                              dev?.model === 'CM-36dG'
                                ? 'bg-purple-100 text-purple-950 border-purple-300'
                                : dev?.model?.includes('3600')
                                ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
                                : 'bg-slate-100 text-slate-900 border-slate-300'
                            }`}
                          >
                            {dev?.model || 'CM-36d'}
                          </span>
                        </div>
                        <div className="font-mono font-semibold text-[11px] text-slate-500 mt-1">
                          SN: {dev?.serialNumber || 'Bilinmiyor'}
                        </div>
                      </td>

                      {/* Price & Currency */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-extrabold text-slate-950 text-sm tracking-tight">
                          {formatCurrency(sale.price, sale.currency)}
                        </div>
                      </td>

                      {/* Payment Type (+KDV = official) & Condition (Sıfır / 2. El) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {sale.condition === 'second_hand' ? (
                            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 border border-amber-300 shadow-2xs">
                              2. El Makine
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-950 border border-emerald-300 shadow-2xs">
                              Sıfır Cihaz
                            </span>
                          )}

                          {sale.paymentType === 'official' ? (
                            <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-950 border border-blue-300">
                              Resmi (+KDV)
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-800 border border-slate-300">
                              Gayriresmi
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 1st Year Calibration Due Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {formatDateTR(sale.firstCalibrationDueDate)}
                        </div>
                        <div className="mt-1">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-950 border border-red-300 animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-red-700" />
                              {Math.abs(days)} Gün Gecikti
                            </span>
                          ) : isDueSoon ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 border border-amber-300">
                              <Clock className="h-3 w-3 text-amber-700" />
                              {days} Gün Kaldı
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-950 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                              Vakti Var
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Notes & Takas */}
                      <td className="py-3.5 px-4 max-w-xs text-slate-700 font-medium">
                        {sale.notes ? (
                          <span className="line-clamp-2 text-xs" title={sale.notes}>
                            {sale.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Schedule Calibration button */}
                          <button
                            onClick={() => onScheduleCalibration(sale.customerId, sale.deviceId)}
                            title="Bu cihaz için Kalibrasyon İşlemi Oluştur"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-[11px] font-extrabold transition-colors shadow-2xs cursor-pointer"
                          >
                            <Wrench className="h-3 w-3 text-white" />
                            Kalibrasyon Aç
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onEditSale(sale)}
                            title="Düzenle"
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm('Bu makine satış kaydını silmek istediğinize emin misiniz?')) {
                                onDeleteSale(sale.id);
                              }
                            }}
                            title="Satış Kaydını Sil"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
