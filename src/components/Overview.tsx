import React, { useState, useMemo } from 'react';
import {
  Users,
  Cpu,
  AlertTriangle,
  Clock,
  Plus,
  FileSpreadsheet,
  ArrowRight,
  ExternalLink,
  Calendar,
  CheckCircle2,
  ShoppingBag,
  BarChart3,
  Building2,
  ShieldCheck,
  Wrench,
  Sparkles,
  TrendingUp,
  Globe,
  MapPin,
} from 'lucide-react';
import { Customer, Device, Operation, OPERATION_TYPE_LABELS, MachineSale } from '../types';
import { diffDays, formatDateTR, getDateStatus, getTodayTR, formatCurrency } from '../utils/date';
import { NavSection } from './Sidebar';

interface OverviewProps {
  customers: Customer[];
  devices: Device[];
  operations: Operation[];
  sales?: MachineSale[];
  onSelectSection: (section: NavSection) => void;
  onOpenCustomerDetail: (customerId: string) => void;
  onOpenOperationDetail: (operation: Operation) => void;
  onNewCustomer: () => void;
  onNewOperation: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  customers,
  devices,
  operations,
  sales = [],
  onSelectSection,
  onOpenCustomerDetail,
  onOpenOperationDetail,
  onNewCustomer,
  onNewOperation,
}) => {
  const today = getTodayTR();

  const [regionTab, setRegionTab] = useState<'turkey' | 'abroad'>('turkey');

  // Active customers & devices count
  const activeCustomers = useMemo(() => customers.filter((c) => !c.isArchived), [customers]);
  const activeDevices = useMemo(() => devices.filter((d) => d.status === 'active'), [devices]);

  // Breakdown of Machine Sales: New vs 2. Hand
  const salesBreakdown = useMemo(() => {
    const newSales = sales.filter((s) => s.condition !== 'second_hand');
    const secondHandSales = sales.filter((s) => s.condition === 'second_hand');

    return {
      total: sales.length,
      newCount: newSales.length,
      secondHandCount: secondHandSales.length,
    };
  }, [sales]);

  // Planned operations
  const plannedOps = useMemo(
    () => operations.filter((o) => o.status === 'planned' && o.plannedDate),
    [operations]
  );

  // Overdue & upcoming operations
  const overdueOps = useMemo(
    () =>
      plannedOps
        .filter((o) => diffDays(o.plannedDate, today) < 0)
        .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)),
    [plannedOps, today]
  );

  const next30DaysOps = useMemo(
    () =>
      plannedOps
        .filter((o) => {
          const d = diffDays(o.plannedDate, today);
          return d >= 0 && d <= 30;
        })
        .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)),
    [plannedOps, today]
  );

  const urgentOpsList = useMemo(() => [...overdueOps, ...next30DaysOps], [overdueOps, next30DaysOps]);

  // Calibration status in sales
  const overdueSales = useMemo(() => sales.filter((s) => s.calibrationStatus === 'overdue'), [sales]);
  const dueSoonSales = useMemo(() => sales.filter((s) => s.calibrationStatus === 'due_soon'), [sales]);

  // Detailed Regional Concentration: Turkey by City, Abroad by Country (Requested)
  const regionalConcentration = useMemo(() => {
    const turkeyCityMap: Record<string, { city: string; customerCount: number; deviceCount: number }> = {};
    const abroadCountryMap: Record<string, { country: string; customerCount: number; deviceCount: number }> = {};

    customers.forEach((c) => {
      const custDevs = devices.filter((d) => d.customerId === c.id);
      const devCount = custDevs.length;

      const isDomestic = !c.country || c.country === 'Türkiye';

      if (isDomestic) {
        const city = c.city || 'Bursa';
        if (!turkeyCityMap[city]) {
          turkeyCityMap[city] = { city, customerCount: 0, deviceCount: 0 };
        }
        turkeyCityMap[city].customerCount += 1;
        turkeyCityMap[city].deviceCount += devCount;
      } else {
        const country = c.country;
        if (!abroadCountryMap[country]) {
          abroadCountryMap[country] = { country, customerCount: 0, deviceCount: 0 };
        }
        abroadCountryMap[country].customerCount += 1;
        abroadCountryMap[country].deviceCount += devCount;
      }
    });

    const turkeyList = Object.values(turkeyCityMap).sort((a, b) => b.customerCount - a.customerCount);
    const abroadList = Object.values(abroadCountryMap).sort((a, b) => b.customerCount - a.customerCount);

    return { turkeyList, abroadList };
  }, [customers, devices]);

  return (
    <div className="space-y-6">
      {/* 4 Distinctive Executive Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Müşteri Portföyü - Indigo / Violet Corporate Theme */}
        <div
          onClick={() => onSelectSection('customers')}
          className="group cursor-pointer rounded-2xl border-2 border-indigo-200/90 bg-linear-to-br from-indigo-50/80 via-white to-white p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all active:scale-99"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-950">
              Müşteri Portföyü
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-indigo-950 font-mono">
              {activeCustomers.length}
            </span>
            <span className="text-xs font-bold text-indigo-700">kayıtlı firma</span>
          </div>
          <div className="mt-3 text-xs text-indigo-800/90 pt-2.5 border-t border-indigo-100 flex items-center justify-between font-semibold">
            <span>Türkiye & Yurt Dışı</span>
            <span className="font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">Portföy Detayı →</span>
          </div>
        </div>

        {/* 2. Toplam Makine Satış Hacmi (Sıfır + 2.El) - Royal Blue Theme */}
        <div
          onClick={() => onSelectSection('sales')}
          className="group cursor-pointer rounded-2xl border-2 border-blue-200/90 bg-linear-to-br from-blue-50/80 via-white to-white p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all active:scale-99"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-950">
              Makine Satış Hacmi
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-blue-950 font-mono">
              {salesBreakdown.total}
            </span>
            <span className="text-xs font-bold text-blue-700">teslim edilen makine</span>
          </div>
          <div className="mt-3 text-xs text-blue-900 pt-2.5 border-t border-blue-100 flex items-center justify-between font-semibold">
            <span>Sıfır: <strong className="text-emerald-700">{salesBreakdown.newCount}</strong> · 2.El: <strong className="text-amber-700">{salesBreakdown.secondHandCount}</strong></span>
            <span className="font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">Listeyi Aç →</span>
          </div>
        </div>

        {/* 3. Sahadaki Aktif Cihaz Parkı - Emerald / Teal Theme */}
        <div
          onClick={() => onSelectSection('devices')}
          className="group cursor-pointer rounded-2xl border-2 border-emerald-200/90 bg-linear-to-br from-emerald-50/80 via-white to-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all active:scale-99"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950">
              Sahadaki Cihaz Parkı
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-950 font-mono">
              {activeDevices.length}
            </span>
            <span className="text-xs font-bold text-emerald-700">spektrofotometre</span>
          </div>
          <div className="mt-3 text-xs text-emerald-900 pt-2.5 border-t border-emerald-100 flex items-center justify-between font-semibold">
            <span>Çalışır Durumda: <strong className="text-emerald-700 font-bold">{activeDevices.filter(d => d.operationalStatus !== 'not_working').length}</strong></span>
            <span className="font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">Cihazlar →</span>
          </div>
        </div>

        {/* 4. Kalibrasyon & Servis Takip Uyarısı - Rose / Crimson Theme */}
        <div
          onClick={() => onSelectSection('sales')}
          className="group cursor-pointer rounded-2xl border-2 border-rose-200/90 bg-linear-to-br from-rose-50/80 via-white to-white p-5 shadow-xs hover:border-rose-400 hover:shadow-md transition-all active:scale-99"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-950">
              Kalibrasyon Uyarısı
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-rose-950 font-mono">
              {overdueSales.length}
            </span>
            <span className="text-xs font-bold text-rose-700">vadesi dolan makine</span>
          </div>
          <div className="mt-3 text-xs text-rose-900 pt-2.5 border-t border-rose-100 flex items-center justify-between font-semibold">
            <span>{dueSoonSales.length} cihaz vadesi yaklaşıyor</span>
            <span className="font-bold text-rose-600 group-hover:translate-x-0.5 transition-transform">İşlem Aç →</span>
          </div>
        </div>
      </div>

      {/* DETAILED REGIONAL CONCENTRATION CARD (Turkey by City & Abroad by Country) */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Globe className="h-5 w-5" />
              </div>
              Bölgesel Müşteri Yoğunluğu ve Saha Cihaz Dağılımı
            </h3>
            <p className="text-xs font-medium text-slate-600 mt-1">
              Türkiye şehir şehir, yurt dışı ise ülke bazında analiz edilmektedir
            </p>
          </div>

          {/* Tab Switcher: Türkiye vs Yurt Dışı */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1.5 text-xs shadow-inner">
            <button
              onClick={() => setRegionTab('turkey')}
              className={`px-3.5 py-2 rounded-lg font-extrabold transition-all flex items-center gap-2 ${
                regionTab === 'turkey'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <span>🇹🇷 Türkiye (Şehir Şehir)</span>
              <span className="bg-blue-600 text-white text-[11px] px-2 py-0.5 rounded-md font-mono font-bold">
                {regionalConcentration.turkeyList.reduce((acc, curr) => acc + curr.customerCount, 0)}
              </span>
            </button>

            <button
              onClick={() => setRegionTab('abroad')}
              className={`px-3.5 py-2 rounded-lg font-extrabold transition-all flex items-center gap-2 ${
                regionTab === 'abroad'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <span>🌍 Yurt Dışı (Ülke Bazlı)</span>
              <span className="bg-purple-900 text-white text-[11px] px-2 py-0.5 rounded-md font-mono font-bold">
                {regionalConcentration.abroadList.reduce((acc, curr) => acc + curr.customerCount, 0)}
              </span>
            </button>
          </div>
        </div>

        {/* Regional Grid Display */}
        {regionTab === 'turkey' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 pt-1">
            {regionalConcentration.turkeyList.map((item) => (
              <div
                key={item.city}
                onClick={() => onSelectSection('customers')}
                className="cursor-pointer rounded-xl border-2 border-slate-200 bg-slate-50/80 p-3.5 hover:bg-blue-50/60 hover:border-blue-400 transition-all space-y-2 shadow-2xs hover:shadow-xs group"
              >
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-950">
                  <span className="flex items-center gap-1.5 truncate group-hover:text-blue-700 transition-colors">
                    <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                    {item.city}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-700 font-mono">
                  <span className="text-[11px] font-medium text-slate-500">Müşteri:</span>
                  <span className="font-extrabold text-slate-950">{item.customerCount} firma</span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-700 font-mono pt-1 border-t border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-500">Cihaz:</span>
                  <span className="font-extrabold text-blue-700">{item.deviceCount} makine</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
            {regionalConcentration.abroadList.map((item) => (
              <div
                key={item.country}
                onClick={() => onSelectSection('customers')}
                className="cursor-pointer rounded-xl border-2 border-purple-200 bg-purple-50/40 p-4 hover:bg-purple-100/60 transition-all space-y-2.5 shadow-2xs hover:shadow-xs group"
              >
                <div className="flex items-center justify-between text-sm font-extrabold text-purple-950">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4.5 w-4.5 text-purple-600" />
                    {item.country}
                  </span>
                  <span className="bg-purple-200 text-purple-950 text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border border-purple-300">
                    Uluslararası
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-800 font-mono pt-1">
                  <span className="text-slate-600 font-medium">Müşteri Sayısı:</span>
                  <span className="font-extrabold text-slate-950">{item.customerCount} Müşteri</span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-800 font-mono pt-1 border-t border-purple-200/80">
                  <span className="text-slate-600 font-medium">Aktif Cihaz Parkı:</span>
                  <span className="font-extrabold text-purple-700">{item.deviceCount} Spektrofotometre</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Second Hand Sales & Quick Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Sales Category Summary */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-950 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <ShoppingBag className="h-4 w-4" />
              </div>
              Satış Kategorisi Dağılımı
            </h3>
            <span className="text-xs font-mono font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs">
              {salesBreakdown.total} Makine
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Sıfır Makine Satışları */}
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-950">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Sıfır Kurumsal Makineler
                </div>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">KM CM-36d, CM-36dG orijinal teslimatlar</p>
              </div>
              <span className="text-2xl font-extrabold font-mono text-emerald-800">
                {salesBreakdown.newCount} <span className="text-xs font-sans font-medium text-slate-600">adet</span>
              </span>
            </div>

            {/* 2. El Makine Satışları */}
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/40 p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  2. El Makine Satışları
                </div>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">Revizyonlu 3600d, 3600a ve CM cihazlar</p>
              </div>
              <span className="text-2xl font-extrabold font-mono text-amber-800">
                {salesBreakdown.secondHandCount} <span className="text-xs font-sans font-medium text-slate-600">adet</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => onSelectSection('sales')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-400 transition-all shadow-xs"
          >
            Satılan Tüm Makineleri Detaylı Gör
            <ArrowRight className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Financial Overview Card */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-950 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
              </div>
              Finansal Performans Özeti
            </h3>
            <span className="text-xs font-bold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              2023-2026
            </span>
          </div>

          <div className="space-y-2 pt-1 font-mono text-xs">
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex justify-between items-center shadow-2xs">
              <span className="text-blue-900 font-bold">EUR Toplam Satış Ciro:</span>
              <span className="font-extrabold text-blue-950 text-sm">
                {formatCurrency(sales.filter(s => s.currency === 'EUR').reduce((a,b) => a + b.price, 0), 'EUR')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex justify-between items-center shadow-2xs">
              <span className="text-emerald-900 font-bold">USD Toplam Satış Ciro:</span>
              <span className="font-extrabold text-emerald-950 text-sm">
                {formatCurrency(sales.filter(s => s.currency === 'USD').reduce((a,b) => a + b.price, 0), 'USD')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex justify-between items-center shadow-2xs">
              <span className="text-amber-900 font-bold">TRY Toplam Satış Ciro:</span>
              <span className="font-extrabold text-amber-950 text-sm">
                {formatCurrency(sales.filter(s => s.currency === 'TRY').reduce((a,b) => a + b.price, 0), 'TRY')}
              </span>
            </div>
          </div>

          <button
            onClick={() => onSelectSection('reports')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-400 transition-all shadow-xs"
          >
            Detaylı Grafikler ve Raporlar
            <ArrowRight className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Executive Quick Actions */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-950 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Sparkles className="h-4 w-4" />
              </div>
              Yönetici Hızlı Erişim Menüsü
            </h3>
            <p className="text-xs font-medium text-slate-600 mt-1">
              Müşteri tanımı, makine satışı veya servis kaydı açın
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={onNewCustomer}
              className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-2xs group"
            >
              <span className="flex items-center gap-2.5">
                <Plus className="h-4 w-4 text-blue-600" /> Yeni Müşteri Tanımla
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onSelectSection('sales')}
              className="w-full flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs font-bold text-blue-950 hover:bg-blue-100/70 hover:border-blue-300 transition-all shadow-2xs group"
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag className="h-4 w-4 text-blue-700" /> Yeni Makine Satışı Ekle (Sıfır / 2.El)
              </span>
              <ArrowRight className="h-4 w-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={onNewOperation}
              className="w-full flex items-center justify-between rounded-xl bg-blue-600 p-3 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/30 group"
            >
              <span className="flex items-center gap-2.5">
                <Wrench className="h-4 w-4 text-white" /> Yeni Servis / Bakım İşlemi Aç
              </span>
              <ArrowRight className="h-4 w-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onSelectSection('reports')}
              className="w-full flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs font-bold text-purple-950 hover:bg-purple-100/70 hover:border-purple-300 transition-all shadow-2xs group"
            >
              <span className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 text-purple-700" /> Satış Grafikleri & Raporlar
              </span>
              <ArrowRight className="h-4 w-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Overdue and Upcoming Operations Table */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">
              Geciken ve Yaklaşan Servis / Takip İşlemleri
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Öncelikli müdahale gerektiren servis, periyodik bakım ve kalibrasyonlar
            </p>
          </div>
          <button
            onClick={() => onSelectSection('calendar')}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
          >
            Tüm Takvimi Aç
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {urgentOpsList.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">
              Geciken veya yaklaşan acil bir işlem bulunmuyor
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Önümüzdeki 30 gün içinde planlanan tüm servis ve kalibrasyonlar tamamlanmış durumda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-900 font-extrabold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Takip Tarihi</th>
                  <th className="py-3.5 px-4">Müşteri</th>
                  <th className="py-3.5 px-4">İl / İlçe</th>
                  <th className="py-3.5 px-4">Cihaz & Seri No</th>
                  <th className="py-3.5 px-4">İşlem Türü</th>
                  <th className="py-3.5 px-4 text-right">Eylem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {urgentOpsList.map((op) => {
                  const customer = customers.find((c) => c.id === op.customerId);
                  const device = devices.find((d) => d.id === op.deviceId);
                  const statusInfo = getDateStatus(op.plannedDate);

                  let rowBg = 'hover:bg-blue-50/40';
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 font-mono">
                      {statusInfo.label}
                    </span>
                  );

                  if (statusInfo.status === 'overdue') {
                    rowBg = 'bg-rose-50/40 hover:bg-rose-50/70';
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300 font-mono shadow-2xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        Gecikti ({Math.abs(statusInfo.daysDiff)} gün)
                      </span>
                    );
                  } else if (statusInfo.status === 'due_today') {
                    rowBg = 'bg-amber-50/40 hover:bg-amber-50/70';
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-extrabold bg-amber-100 text-amber-950 border border-amber-300 font-mono shadow-2xs">
                        Bugün Yapılacak
                      </span>
                    );
                  } else if (statusInfo.status === 'due_soon') {
                    rowBg = 'bg-blue-50/30 hover:bg-blue-50/60';
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-300 font-mono shadow-2xs">
                        {statusInfo.daysDiff} gün kaldı
                      </span>
                    );
                  }

                  return (
                    <tr key={op.id} className={`transition-colors ${rowBg}`}>
                      <td className="py-3.5 px-4 whitespace-nowrap">{statusBadge}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatDateTR(op.plannedDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onOpenCustomerDetail(op.customerId)}
                          className="font-extrabold text-slate-950 hover:text-blue-700 hover:underline text-left text-sm"
                        >
                          {customer?.title || 'Bilinmeyen Müşteri'}
                        </button>
                        {customer?.contactName && (
                          <div className="text-[11px] font-medium text-slate-600">
                            Yetkili: <strong className="text-slate-800">{customer.contactName}</strong> {customer.phone ? `(${customer.phone})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {[customer?.city, customer?.district].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {device ? `${device.brand} ${device.model}` : 'Cihaz seçilmedi'}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono font-semibold">
                          SN: {device?.serialNumber || 'Bilinmiyor'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {op.operationTypes.map((typeKey) => (
                            <span
                              key={typeKey}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 border border-slate-200"
                            >
                              {OPERATION_TYPE_LABELS[typeKey] || typeKey}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenOperationDetail(op)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs"
                        >
                          Detay / Yönet
                          <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                        </button>
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
