import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Building2,
  Cpu,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  PieChart,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  Wrench,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MachineSale, Operation, Customer, Device, Currency, OperationType } from '../types';
import { formatDateTR, formatCurrency, getTodayTR } from '../utils/date';
import * as XLSX from 'xlsx';

interface ReportsProps {
  sales: MachineSale[];
  operations?: Operation[];
  customers: Customer[];
  devices: Device[];
  onOpenCustomerDetail: (customerId: string) => void;
  onScheduleCalibration: (customerId: string, deviceId: string) => void;
}

const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export const Reports: React.FC<ReportsProps> = ({
  sales,
  operations = [],
  customers,
  devices,
  onOpenCustomerDetail,
  onScheduleCalibration,
}) => {
  const [revenueMode, setRevenueMode] = useState<'sales' | 'service'>('sales');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'trends' | 'categories' | 'monthly' | 'breakdowns' | 'table'>('trends');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Completed service operations with prices
  const completedOperations = useMemo(() => {
    return operations.filter(
      (op) => op.status === 'completed' && op.price !== undefined && op.price !== null && op.price > 0
    );
  }, [operations]);

  // Available years from sales & operations
  const availableYears = useMemo(() => {
    const saleYears = sales.map((s) => s.saleDate.substring(0, 4));
    const opYears = completedOperations.map((op) => (op.actualDate || op.plannedDate).substring(0, 4));
    return Array.from(new Set([...saleYears, ...opYears])).sort();
  }, [sales, completedOperations]);

  // Filtered machine sales based on year & currency
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const saleYear = s.saleDate.substring(0, 4);
      if (selectedYear !== 'all' && saleYear !== selectedYear) return false;
      if (selectedCurrency !== 'all' && s.currency !== selectedCurrency) return false;
      return true;
    });
  }, [sales, selectedYear, selectedCurrency]);

  // Filtered service operations based on year & currency
  const filteredOperations = useMemo(() => {
    return completedOperations.filter((op) => {
      const opYear = (op.actualDate || op.plannedDate).substring(0, 4);
      if (selectedYear !== 'all' && opYear !== selectedYear) return false;
      if (selectedCurrency !== 'all' && op.currency !== selectedCurrency) return false;
      return true;
    });
  }, [completedOperations, selectedYear, selectedCurrency]);

  // Totals by currency for Machine Sales
  const salesTotalsByCurrency = useMemo(() => {
    const result: Record<Currency, { total: number; count: number }> = {
      EUR: { total: 0, count: 0 },
      USD: { total: 0, count: 0 },
      TRY: { total: 0, count: 0 },
      GBP: { total: 0, count: 0 },
    };

    filteredSales.forEach((s) => {
      if (result[s.currency]) {
        result[s.currency].total += s.price;
        result[s.currency].count += 1;
      }
    });

    return result;
  }, [filteredSales]);

  // Totals by currency for Service & Maintenance
  const serviceTotalsByCurrency = useMemo(() => {
    const result: Record<Currency, { total: number; count: number }> = {
      EUR: { total: 0, count: 0 },
      USD: { total: 0, count: 0 },
      TRY: { total: 0, count: 0 },
      GBP: { total: 0, count: 0 },
    };

    filteredOperations.forEach((op) => {
      if (result[op.currency] && op.price) {
        result[op.currency].total += op.price;
        result[op.currency].count += 1;
      }
    });

    return result;
  }, [filteredOperations]);

  // Service breakdown by required categories:
  // 1. Bakım Anlaşması & Servis (service_repair)
  // 2. Bakım & Kalibrasyon (periodic_maintenance, calibration)
  // 3. Lamba Değişimi (lamp_replacement)
  const serviceCategoryBreakdown = useMemo(() => {
    const categories = {
      service_repair: { title: 'Bakım Anlaşması & Servis (Arıza / Onarım)', eur: 0, usd: 0, try: 0, count: 0 },
      maintenance_calibration: { title: 'Bakım & Kalibrasyon (Sertifikalı / Sertifikasız)', eur: 0, usd: 0, try: 0, count: 0 },
      lamp_replacement: { title: 'Lamba Değişimi & Optik Bakım', eur: 0, usd: 0, try: 0, count: 0 },
    };

    filteredOperations.forEach((op) => {
      const price = op.price || 0;
      const isLamp = op.operationTypes.includes('lamp_replacement');
      const isMaintCal = op.operationTypes.includes('periodic_maintenance') || op.operationTypes.includes('calibration');
      
      let key: keyof typeof categories = 'service_repair';
      if (isLamp) {
        key = 'lamp_replacement';
      } else if (isMaintCal) {
        key = 'maintenance_calibration';
      }

      categories[key].count += 1;
      if (op.currency === 'EUR') categories[key].eur += price;
      if (op.currency === 'USD') categories[key].usd += price;
      if (op.currency === 'TRY') categories[key].try += price;
    });

    return categories;
  }, [filteredOperations]);

  // Yearly Aggregates for Machine Sales
  const yearlySalesData = useMemo(() => {
    const data: Record<string, { year: string; count: number; eur: number; usd: number; try: number }> = {};
    availableYears.forEach((y) => {
      data[y] = { year: y, count: 0, eur: 0, usd: 0, try: 0 };
    });

    sales.forEach((s) => {
      const y = s.saleDate.substring(0, 4);
      if (data[y]) {
        data[y].count += 1;
        if (s.currency === 'EUR') data[y].eur += s.price;
        if (s.currency === 'USD') data[y].usd += s.price;
        if (s.currency === 'TRY') data[y].try += s.price;
      }
    });

    return Object.values(data);
  }, [sales, availableYears]);

  // Yearly Aggregates for Service
  const yearlyServiceData = useMemo(() => {
    const data: Record<string, { year: string; count: number; eur: number; usd: number; try: number }> = {};
    availableYears.forEach((y) => {
      data[y] = { year: y, count: 0, eur: 0, usd: 0, try: 0 };
    });

    completedOperations.forEach((op) => {
      const y = (op.actualDate || op.plannedDate).substring(0, 4);
      if (data[y]) {
        data[y].count += 1;
        const p = op.price || 0;
        if (op.currency === 'EUR') data[y].eur += p;
        if (op.currency === 'USD') data[y].usd += p;
        if (op.currency === 'TRY') data[y].try += p;
      }
    });

    return Object.values(data);
  }, [completedOperations, availableYears]);

  const maxYearlyCount = useMemo(() => {
    const dataset = revenueMode === 'sales' ? yearlySalesData : yearlyServiceData;
    return Math.max(...dataset.map((d) => d.count), 1);
  }, [revenueMode, yearlySalesData, yearlyServiceData]);

  // Monthly Aggregates (1 to 12)
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      return {
        monthNum,
        monthName: MONTH_NAMES[i],
        count: 0,
        eur: 0,
        usd: 0,
        try: 0,
        salesItems: [] as MachineSale[],
        opItems: [] as Operation[],
      };
    });

    if (revenueMode === 'sales') {
      filteredSales.forEach((s) => {
        const mStr = s.saleDate.substring(5, 7);
        const mIdx = parseInt(mStr, 10) - 1;
        if (months[mIdx]) {
          months[mIdx].count += 1;
          months[mIdx].salesItems.push(s);
          if (s.currency === 'EUR') months[mIdx].eur += s.price;
          if (s.currency === 'USD') months[mIdx].usd += s.price;
          if (s.currency === 'TRY') months[mIdx].try += s.price;
        }
      });
    } else {
      filteredOperations.forEach((op) => {
        const dateStr = op.actualDate || op.plannedDate;
        const mStr = dateStr.substring(5, 7);
        const mIdx = parseInt(mStr, 10) - 1;
        if (months[mIdx]) {
          months[mIdx].count += 1;
          months[mIdx].opItems.push(op);
          const p = op.price || 0;
          if (op.currency === 'EUR') months[mIdx].eur += p;
          if (op.currency === 'USD') months[mIdx].usd += p;
          if (op.currency === 'TRY') months[mIdx].try += p;
        }
      });
    }

    return months;
  }, [revenueMode, filteredSales, filteredOperations]);

  const maxMonthlyCount = useMemo(() => {
    return Math.max(...monthlyData.map((m) => m.count), 1);
  }, [monthlyData]);

  // Export reports to Excel
  const handleExportExcel = () => {
    let rows: any[] = [];
    let filename = '';

    if (revenueMode === 'sales') {
      rows = filteredSales.map((s, idx) => {
        const customer = customers.find((c) => c.id === s.customerId);
        const device = devices.find((d) => d.id === s.deviceId);
        return {
          'Sıra No': idx + 1,
          'Müşteri Ünvanı': customer?.title || 'Bilinmiyor',
          'Şehir': customer?.city || '-',
          'Cihaz Model': device ? `${device.brand} ${device.model}` : 'KM CM-36d',
          'Yazılım': device?.softwareModule || 'ColorSuit Formulation',
          'Satış Tarihi': formatDateTR(s.saleDate),
          'Fiyat': s.price,
          'Para Birimi': s.currency,
          'Fatura Tipi': 'Resmi Faturalı',
          'Notlar': s.notes || '',
        };
      });
      filename = `colorco-makine-satis-raporu-${getTodayTR()}.xlsx`;
    } else {
      rows = filteredOperations.map((op, idx) => {
        const customer = customers.find((c) => c.id === op.customerId);
        const device = devices.find((d) => d.id === op.deviceId);
        return {
          'Sıra No': idx + 1,
          'Müşteri Ünvanı': customer?.title || 'Bilinmiyor',
          'Şehir': customer?.city || '-',
          'Cihaz Model': device ? `${device.brand} ${device.model}` : 'CM-3600d / CM-3600a',
          'İşlem Tarihi': formatDateTR(op.actualDate || op.plannedDate),
          'İşlem Türü': op.operationTypes.join(', '),
          'Servis Fiyatı': op.price,
          'Para Birimi': op.currency,
          'Ödeme Türü': op.paymentType === 'official' ? 'Resmi (+KDV)' : 'Serbest',
          'Açıklama': op.notes || op.actionDescription || '',
        };
      });
      filename = `colorco-servis-bakim-gelir-raporu-${getTodayTR()}.xlsx`;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finansal Rapor');
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="space-y-6">
      {/* Revenue Mode Switcher Banner: Satılan Makineler vs Servis & Bakım Gelirleri */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-900 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              FINANSAL KONTROL MERKEZİ
            </div>
            <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">
              Gelir & Performans Analitiği
            </h2>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              Satılan spektrofotometre makineleri ile periyodik servis/bakım/kalibrasyon gelirlerini ayrı finansal kanallarda yönetin
            </p>
          </div>

          {/* Major Mode Switcher Tabs */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1.5 border-2 border-slate-200 shadow-inner">
            <button
              onClick={() => setRevenueMode('sales')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                revenueMode === 'sales'
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-900 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Cpu className="h-4 w-4" />
              Makine Satış Gelirleri ({sales.length} Satış)
            </button>

            <button
              onClick={() => setRevenueMode('service')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                revenueMode === 'service'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-900 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Wrench className="h-4 w-4" />
              Servis & Bakım Gelirleri ({completedOperations.length} İşlem)
            </button>
          </div>
        </div>
      </div>

      {/* Top Header Controls Strip */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-extrabold text-slate-950">
              {revenueMode === 'sales' ? 'Makine Satış Grafikleri & Ciro' : 'Servis & Bakım Operasyonel Gelirleri'}
            </h3>
            <span
              className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-extrabold border ${
                revenueMode === 'sales'
                  ? 'bg-blue-100 text-blue-950 border-blue-300'
                  : 'bg-emerald-100 text-emerald-950 border-emerald-300'
              }`}
            >
              {revenueMode === 'sales' ? `${filteredSales.length} Makine Satışı` : `${filteredOperations.length} Servis Kaydı`}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-600 mt-1">
            {revenueMode === 'sales'
              ? 'ColorCo kurumsal spektrofotometre teslimatları ve sözleşme ciroları'
              : 'Bakım anlaşması, periyodik bakım, sertifikalı/sertifikasız kalibrasyon ve lamba değişim gelirleri'}
          </p>
        </div>

        {/* Global Filter & Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">Yıl:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="all">Tüm Yıllar (2024-2026)</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} Yılı
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">Döviz:</span>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="all">Tüm Para Birimleri</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="TRY">TRY (₺)</option>
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-extrabold transition-all shadow-sm cursor-pointer"
          >
            <Download className="h-4 w-4 text-white" />
            Excel İndir
          </button>
        </div>
      </div>

      {/* KPI Cards based on Revenue Mode */}
      {revenueMode === 'sales' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border-2 border-indigo-200 bg-linear-to-br from-white to-indigo-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900">Toplam Satış Hacmi</span>
              <Cpu className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold font-mono text-indigo-950 tracking-tight">{filteredSales.length} <span className="text-sm font-bold text-indigo-700">Makine</span></div>
            <div className="mt-2 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> %100 Kurumsal Kayıt
            </div>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-white to-blue-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900">EUR Makine Ciro</span>
              <span className="font-mono font-bold text-xs bg-blue-100 text-blue-900 px-2 py-0.5 rounded">€</span>
            </div>
            <div className="mt-3 text-2xl font-extrabold font-mono text-blue-950 tracking-tight">{formatCurrency(salesTotalsByCurrency.EUR.total, 'EUR')}</div>
            <div className="mt-2 text-xs font-bold text-blue-800">{salesTotalsByCurrency.EUR.count} Makine Satışı</div>
          </div>
          <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-white to-emerald-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">USD Makine Ciro</span>
              <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">$</span>
            </div>
            <div className="mt-3 text-2xl font-extrabold font-mono text-emerald-950 tracking-tight">{formatCurrency(salesTotalsByCurrency.USD.total, 'USD')}</div>
            <div className="mt-2 text-xs font-bold text-emerald-800">{salesTotalsByCurrency.USD.count} Makine Satışı</div>
          </div>
          <div className="rounded-2xl border-2 border-amber-200 bg-linear-to-br from-white to-amber-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">TRY Makine Ciro</span>
              <span className="font-mono font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded">₺</span>
            </div>
            <div className="mt-3 text-2xl font-extrabold font-mono text-amber-950 tracking-tight">{formatCurrency(salesTotalsByCurrency.TRY.total, 'TRY')}</div>
            <div className="mt-2 text-xs font-bold text-amber-800">{salesTotalsByCurrency.TRY.count} Makine Satışı</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-white to-emerald-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">Servis İşlem Adedi</span>
              <Wrench className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold font-mono text-emerald-950 tracking-tight">{filteredOperations.length} <span className="text-sm font-bold text-emerald-700">İşlem</span></div>
            <div className="mt-2 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Tamamlanan Müdahaleler
            </div>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-white to-blue-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900">EUR Servis Geliri</span>
              <span className="font-mono font-bold text-xs bg-blue-100 text-blue-900 px-2 py-0.5 rounded">€</span>
            </div>
            <div className="mt-3 text-2xl font-extrabold font-mono text-blue-950 tracking-tight">{formatCurrency(serviceTotalsByCurrency.EUR.total, 'EUR')}</div>
            <div className="mt-2 text-xs font-bold text-blue-800">{serviceTotalsByCurrency.EUR.count} Servis Kaydı</div>
          </div>
          <div className="rounded-2xl border-2 border-teal-200 bg-linear-to-br from-white to-teal-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900">USD Servis Geliri</span>
              <span className="font-mono font-bold text-xs bg-teal-100 text-teal-900 px-2 py-0.5 rounded">$</span>
            </div>
            <div className="mt-3 text-2xl font-extrabold font-mono text-teal-950 tracking-tight">{formatCurrency(serviceTotalsByCurrency.USD.total, 'USD')}</div>
            <div className="mt-2 text-xs font-bold text-teal-800">{serviceTotalsByCurrency.USD.count} Servis Kaydı</div>
          </div>
          <div className="rounded-2xl border-2 border-purple-200 bg-linear-to-br from-white to-purple-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900">TRY Servis Geliri</span>
              <span className="font-mono font-bold text-xs bg-purple-100 text-purple-900 px-2 py-0.5 rounded">₺</span>
            </div>
            <div className="mt-3 text-2xl font-extrabold font-mono text-purple-950 tracking-tight">{formatCurrency(serviceTotalsByCurrency.TRY.total, 'TRY')}</div>
            <div className="mt-2 text-xs font-bold text-purple-800">{serviceTotalsByCurrency.TRY.count} Servis Kaydı</div>
          </div>
        </div>
      )}

      {/* Sub Category Breakdown for Service Revenue Mode */}
      {revenueMode === 'service' && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
              <Filter className="h-5 w-5 text-emerald-600" />
              Servis & Bakım Gelirlerinin Operasyonel Bölüm Dökümü
            </h3>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              Bakım Anlaşması & Servis, Sertifikalı/Sertifikasız Kalibrasyon ve Lamba Değişimi bölümleri ayrı muhasebeleştirilmiştir
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Category 1: Bakım Anlaşması & Servis */}
            <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-950 font-extrabold text-sm">
                <Wrench className="h-5 w-5 text-blue-600" />
                Bakım Anlaşması & Servis
              </div>
              <p className="text-xs font-medium text-slate-600">Arıza müdahale, teknik onarım ve yıllık servis sözleşmeleri</p>
              <div className="pt-3 border-t-2 border-blue-100 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">İşlem Sayısı:</span>
                  <span className="font-extrabold text-slate-950">{serviceCategoryBreakdown.service_repair.count} adet</span>
                </div>
                {serviceCategoryBreakdown.service_repair.eur > 0 && (
                  <div className="flex justify-between text-blue-900 font-bold">
                    <span>EUR Toplam:</span>
                    <span>{formatCurrency(serviceCategoryBreakdown.service_repair.eur, 'EUR')}</span>
                  </div>
                )}
                {serviceCategoryBreakdown.service_repair.try > 0 && (
                  <div className="flex justify-between text-amber-900 font-bold">
                    <span>TRY Toplam:</span>
                    <span>{formatCurrency(serviceCategoryBreakdown.service_repair.try, 'TRY')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Category 2: Bakım ve Kalibrasyon */}
            <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Bakım & Kalibrasyon (Sertifikalı / Sertifikasız)
              </div>
              <p className="text-xs font-medium text-slate-600">Periyodik optik temizlik, dalgaboyu ayarı ve test çinisi sertifikasyonu</p>
              <div className="pt-3 border-t-2 border-emerald-100 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">İşlem Sayısı:</span>
                  <span className="font-extrabold text-slate-950">{serviceCategoryBreakdown.maintenance_calibration.count} adet</span>
                </div>
                {serviceCategoryBreakdown.maintenance_calibration.eur > 0 && (
                  <div className="flex justify-between text-blue-900 font-bold">
                    <span>EUR Toplam:</span>
                    <span>{formatCurrency(serviceCategoryBreakdown.maintenance_calibration.eur, 'EUR')}</span>
                  </div>
                )}
                {serviceCategoryBreakdown.maintenance_calibration.usd > 0 && (
                  <div className="flex justify-between text-emerald-900 font-bold">
                    <span>USD Toplam:</span>
                    <span>{formatCurrency(serviceCategoryBreakdown.maintenance_calibration.usd, 'USD')}</span>
                  </div>
                )}
                {serviceCategoryBreakdown.maintenance_calibration.try > 0 && (
                  <div className="flex justify-between text-amber-900 font-bold">
                    <span>TRY Toplam:</span>
                    <span>{formatCurrency(serviceCategoryBreakdown.maintenance_calibration.try, 'TRY')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Category 3: Lamba Değişimi */}
            <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
                <Zap className="h-5 w-5 text-amber-600" />
                Lamba Değişimi & Optik Aksam
              </div>
              <p className="text-xs font-medium text-slate-600">Ksenon flaş lambası yenileme, odak merceği ve küre reflektör bakımı</p>
              <div className="pt-3 border-t-2 border-amber-100 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">İşlem Sayısı:</span>
                  <span className="font-extrabold text-slate-950">{serviceCategoryBreakdown.lamp_replacement.count} adet</span>
                </div>
                {serviceCategoryBreakdown.lamp_replacement.eur > 0 && (
                  <div className="flex justify-between text-blue-900 font-bold">
                    <span>EUR Toplam:</span>
                    <span>{formatCurrency(serviceCategoryBreakdown.lamp_replacement.eur, 'EUR')}</span>
                  </div>
                )}
                {serviceCategoryBreakdown.lamp_replacement.try > 0 && (
                  <div className="flex justify-between text-amber-900 font-bold">
                    <span>TRY Toplam:</span>
                    <span>{formatCurrency(serviceCategoryBreakdown.lamp_replacement.try, 'TRY')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation View Switcher (Tabs) */}
      <div className="flex border-b-2 border-slate-200 bg-white rounded-t-2xl px-5 pt-3 gap-3 shadow-2xs">
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-colors cursor-pointer ${
            activeTab === 'trends'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Yıllık Dağılım Grafiği
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-colors cursor-pointer ${
            activeTab === 'monthly'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          <Calendar className="h-4 w-4" />
          12 Aylık Trend ({selectedYear === 'all' ? 'Tüm Yıllar' : `${selectedYear} Yılı`})
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-colors cursor-pointer ${
            activeTab === 'table'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {revenueMode === 'sales' ? 'Makine Satış Tablosu' : 'Servis Gelir Detay Tablosu'}
        </button>
      </div>

      {/* TAB 1: Yıllık Grafikler */}
      {activeTab === 'trends' && (
        <div className="rounded-b-2xl border-2 border-t-0 border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-950">
                {revenueMode === 'sales'
                  ? 'Yıllara Göre Makine Satış Adetleri ve Ciro'
                  : 'Yıllara Göre Tamamlanan Servis & Bakım İşlemleri'}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">2024'ten 2026 sonuna kadar performans göstergesi</p>
            </div>
          </div>

          <div className="pt-2 space-y-5">
            {(revenueMode === 'sales' ? yearlySalesData : yearlyServiceData).map((d) => {
              const percentage = Math.round((d.count / maxYearlyCount) * 100);

              return (
                <div key={d.year} className="space-y-2 group">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold font-mono px-2.5 py-1 rounded-lg bg-slate-950 text-white text-xs shadow-2xs">
                        {d.year} Yılı
                      </span>
                      <span className="text-slate-700 font-bold">
                        {d.count} {revenueMode === 'sales' ? 'makine teslimatı' : 'servis işlemi'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      {d.eur > 0 && <span className="text-blue-900 font-extrabold">{formatCurrency(d.eur, 'EUR')}</span>}
                      {d.usd > 0 && <span className="text-emerald-900 font-extrabold">{formatCurrency(d.usd, 'USD')}</span>}
                      {d.try > 0 && <span className="text-amber-900 font-extrabold">{formatCurrency(d.try, 'TRY')}</span>}
                    </div>
                  </div>

                  <div className="relative h-9 w-full rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center p-1">
                    <div
                      className={`h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3 text-xs font-extrabold text-white font-mono shadow-xs ${
                        revenueMode === 'sales'
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800'
                          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-800'
                      }`}
                      style={{ width: `${Math.max(percentage, 12)}%` }}
                    >
                      {d.count} Kayıt
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 12 Aylık Trend */}
      {activeTab === 'monthly' && (
        <div className="rounded-b-2xl border-2 border-t-0 border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-950">
                Aylık Dağılım Grafiği (Ocak - Aralık)
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {selectedYear === 'all'
                  ? 'Tüm yıllardaki aylık yoğunluk ve gelir trendleri'
                  : `${selectedYear} yılına ait aylık döküm`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2.5 pt-4">
            {monthlyData.map((m) => {
              const heightPct = Math.round((m.count / maxMonthlyCount) * 100);
              const hasItems = m.count > 0;
              const isHovered = hoveredMonth === m.monthNum;

              return (
                <div
                  key={m.monthNum}
                  onMouseEnter={() => setHoveredMonth(m.monthNum)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  className={`flex flex-col items-center justify-end rounded-xl border-2 p-2.5 transition-all cursor-pointer ${
                    isHovered
                      ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                      : hasItems
                      ? 'border-slate-300 bg-white hover:border-slate-400'
                      : 'border-slate-200 bg-slate-50/50 opacity-60'
                  }`}
                  style={{ minHeight: '200px' }}
                >
                  <span className={`text-xs font-extrabold font-mono mb-2 ${hasItems ? 'text-slate-950' : 'text-slate-400'}`}>
                    {m.count > 0 ? `${m.count} ad` : '-'}
                  </span>

                  <div className="relative w-full flex-1 flex items-end justify-center py-2">
                    <div
                      className={`w-8 rounded-t-lg transition-all duration-300 ${
                        revenueMode === 'sales'
                          ? 'bg-gradient-to-t from-blue-700 to-indigo-500 shadow-2xs'
                          : 'bg-gradient-to-t from-emerald-700 to-teal-500 shadow-2xs'
                      }`}
                      style={{ height: hasItems ? `${Math.max(heightPct, 15)}%` : '4px' }}
                    />
                  </div>

                  <div className="mt-2 text-center border-t-2 border-slate-100 w-full pt-1.5">
                    <span className="text-[11px] font-extrabold text-slate-900 block">{m.monthName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Detay Tablosu */}
      {activeTab === 'table' && (
        <div className="rounded-b-2xl border-2 border-t-0 border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-base font-extrabold text-slate-950">
                {revenueMode === 'sales' ? 'Makine Satış Kayıtları' : 'Servis & Bakım Operasyon Kayıtları'}
              </h3>
            </div>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Excel Olarak İndir
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-950 font-extrabold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Sıra</th>
                  <th className="py-3.5 px-4">Müşteri / Firma</th>
                  <th className="py-3.5 px-4">Şehir</th>
                  <th className="py-3.5 px-4">{revenueMode === 'sales' ? 'Model & Yazılım' : 'İşlem Türü'}</th>
                  <th className="py-3.5 px-4">Tarih</th>
                  <th className="py-3.5 px-4">Tutar / Fiyat</th>
                  <th className="py-3.5 px-4">Ödeme Türü</th>
                  <th className="py-3.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {revenueMode === 'sales'
                  ? filteredSales.map((s, idx) => {
                      const customer = customers.find((c) => c.id === s.customerId);
                      const device = devices.find((d) => d.id === s.deviceId);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => onOpenCustomerDetail(s.customerId)}
                              className="font-extrabold text-slate-950 hover:text-blue-600 hover:underline text-left block text-xs"
                            >
                              {customer?.title}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">{customer?.city || '-'}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {device?.model || 'CM-36d'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{formatDateTR(s.saleDate)}</td>
                          <td className="py-3.5 px-4 font-mono font-extrabold text-slate-950 text-sm">
                            {formatCurrency(s.price, s.currency)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-950 border border-emerald-300">
                              Resmi Faturalı
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => onOpenCustomerDetail(s.customerId)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
                            >
                              Detay
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  : filteredOperations.map((op, idx) => {
                      const customer = customers.find((c) => c.id === op.customerId);
                      const isLamp = op.operationTypes.includes('lamp_replacement');
                      const isCal = op.operationTypes.includes('calibration') || op.operationTypes.includes('periodic_maintenance');

                      return (
                        <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => onOpenCustomerDetail(op.customerId)}
                              className="font-extrabold text-slate-950 hover:text-blue-600 hover:underline text-left block text-xs"
                            >
                              {customer?.title}
                            </button>
                            <span className="text-[11px] font-medium text-slate-500">{op.notes || op.faultDescription}</span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">{customer?.city || '-'}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-extrabold border ${
                                isLamp
                                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                                  : isCal
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                  : 'bg-blue-100 text-blue-950 border-blue-300'
                              }`}
                            >
                              {isLamp
                                ? 'Lamba Değişimi'
                                : isCal
                                ? 'Bakım & Kalibrasyon'
                                : 'Bakım Anlaşması / Servis'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {formatDateTR(op.actualDate || op.plannedDate)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-extrabold text-slate-950 text-sm">
                            {formatCurrency(op.price || 0, op.currency)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-extrabold border ${
                                op.paymentType === 'official'
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                  : 'bg-slate-200 text-slate-800 border-slate-300'
                              }`}
                            >
                              {op.paymentType === 'official' ? '+KDV Resmi' : 'Serbest'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => onOpenCustomerDetail(op.customerId)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
                            >
                              Detay
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
