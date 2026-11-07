import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  Cpu,
  Trash2,
  Edit,
  ArrowRight,
  Filter,
  AlertCircle,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  Globe,
  Sparkles,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Customer, Device, Operation } from '../types';

interface CustomersProps {
  customers: Customer[];
  devices: Device[];
  operations: Operation[];
  onOpenCustomerDetail: (customerId: string) => void;
  onNewCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string, force?: boolean) => Promise<void>;
}

export const Customers: React.FC<CustomersProps> = ({
  customers,
  devices,
  operations,
  onOpenCustomerDetail,
  onNewCustomer,
  onEditCustomer,
  onDeleteCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('all');

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    customer: Customer;
    hasHistory: boolean;
    devicesCount: number;
    opsCount: number;
  } | null>(null);

  // Regional breakdown keys: Domestic cities vs International countries
  const regionalOptions = useMemo(() => {
    const domesticCities = new Set<string>();
    const internationalCountries = new Set<string>();

    customers.forEach((c) => {
      if (!c.country || c.country === 'Türkiye') {
        if (c.city) domesticCities.add(c.city);
      } else {
        internationalCountries.add(c.country);
      }
    });

    return {
      cities: Array.from(domesticCities).sort(),
      countries: Array.from(internationalCountries).sort(),
    };
  }, [customers]);

  // Filter customers by search term and selected region
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (selectedRegionFilter !== 'all') {
        const isDomestic = !c.country || c.country === 'Türkiye';
        if (isDomestic) {
          if (c.city !== selectedRegionFilter) return false;
        } else {
          if (c.country !== selectedRegionFilter) return false;
        }
      }

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();

      return (
        c.title.toLowerCase().includes(term) ||
        (c.city && c.city.toLowerCase().includes(term)) ||
        (c.district && c.district.toLowerCase().includes(term)) ||
        (c.country && c.country.toLowerCase().includes(term)) ||
        (c.contactName && c.contactName.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    });
  }, [customers, searchTerm, selectedRegionFilter]);

  // Regional Device Status Statistics for the selected region (or overall)
  const regionalDeviceStats = useMemo(() => {
    const filteredCustIds = new Set(filteredCustomers.map((c) => c.id));
    const regionDevices = devices.filter((d) => filteredCustIds.has(d.customerId));

    let workingCount = 0;
    let notWorkingCount = 0;
    const modelCounts: Record<string, number> = {};
    const softwareCounts: Record<string, number> = {};

    regionDevices.forEach((d) => {
      if ((d.operationalStatus || 'working') === 'working') {
        workingCount++;
      } else {
        notWorkingCount++;
      }

      modelCounts[d.model] = (modelCounts[d.model] || 0) + 1;
      const sw = d.softwareModule || 'ColorSuit Formulation';
      softwareCounts[sw] = (softwareCounts[sw] || 0) + 1;
    });

    return {
      totalCustomers: filteredCustomers.length,
      totalDevices: regionDevices.length,
      workingCount,
      notWorkingCount,
      modelCounts,
      softwareCounts,
    };
  }, [filteredCustomers, devices]);

  const handleDeleteClick = (c: Customer) => {
    const custDevices = devices.filter((d) => d.customerId === c.id);
    const custOps = operations.filter((o) => o.customerId === c.id);
    const hasHistory = custDevices.length > 0 || custOps.length > 0;

    setDeleteConfirmation({
      customer: c,
      hasHistory,
      devicesCount: custDevices.length,
      opsCount: custOps.length,
    });
  };

  const confirmDelete = async (force: boolean) => {
    if (!deleteConfirmation) return;
    try {
      await onDeleteCustomer(deleteConfirmation.customer.id, force);
      setDeleteConfirmation(null);
    } catch (err: any) {
      alert(err.message || 'Silme işlemi başarısız');
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* 1. TOP REGIONAL FILTER & DEVICE STATUS PANEL (Executive Command Cockpit) */}
      <div className="rounded-2xl border-2 border-blue-900/60 bg-linear-to-r from-[#0c1427] via-[#101b33] to-[#162344] text-white p-6 shadow-xl space-y-5">
        {/* Panel Header & Region Filter Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-cyan-400 border border-blue-400/30 shadow-inner">
                <Globe className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-extrabold tracking-tight text-white">
                Bölgesel Filtreleme & Cihaz Durum Paneli
              </h2>
            </div>
            <p className="text-xs text-blue-200/80 font-medium mt-1">
              Türkiye şehirleri ve yurt dışı ülkeleri bazında müşteri ve saha cihazı durum dökümü
            </p>
          </div>

          {/* Region Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-inner">
            <button
              onClick={() => setSelectedRegionFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                selectedRegionFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-1 ring-blue-300'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Tüm Bölgeler ({customers.length})
            </button>

            {/* Türkiye Şehirleri */}
            {regionalOptions.cities.map((city) => {
              const count = customers.filter((c) => c.city === city && (!c.country || c.country === 'Türkiye')).length;
              return (
                <button
                  key={city}
                  onClick={() => setSelectedRegionFilter(selectedRegionFilter === city ? 'all' : city)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedRegionFilter === city
                      ? 'bg-cyan-400 text-slate-950 font-extrabold shadow-md shadow-cyan-400/40 ring-1 ring-cyan-200'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10'
                  }`}
                >
                  <span>{city}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${selectedRegionFilter === city ? 'bg-slate-950 text-cyan-400' : 'bg-black/40 text-slate-300'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Yurt Dışı Ülkeleri */}
            {regionalOptions.countries.map((country) => {
              const count = customers.filter((c) => c.country === country).length;
              return (
                <button
                  key={country}
                  onClick={() => setSelectedRegionFilter(selectedRegionFilter === country ? 'all' : country)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedRegionFilter === country
                      ? 'bg-fuchsia-500 text-white font-extrabold shadow-md shadow-fuchsia-500/40 ring-1 ring-fuchsia-300'
                      : 'bg-purple-950/60 text-purple-200 hover:bg-purple-900/80 border border-purple-500/30'
                  }`}
                >
                  <span>🌍 {country}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${selectedRegionFilter === country ? 'bg-purple-950 text-white' : 'bg-purple-900/80 text-purple-200'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Region Device Status Indicators Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-1">
          {/* Müşteri Sayısı */}
          <div className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-md p-3.5 shadow-sm">
            <span className="text-[11px] font-extrabold text-blue-200/90 uppercase tracking-wider block">
              Seçili Bölge Müşterileri
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-white">
                {regionalDeviceStats.totalCustomers}
              </span>
              <span className="text-xs font-semibold text-slate-300">firma</span>
            </div>
          </div>

          {/* Bölgedeki Toplam Cihaz */}
          <div className="rounded-xl border border-blue-400/30 bg-blue-500/15 backdrop-blur-md p-3.5 shadow-sm">
            <span className="text-[11px] font-extrabold text-cyan-300 uppercase tracking-wider block">
              Bölge Cihaz Parkı
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-cyan-200">
                {regionalDeviceStats.totalDevices}
              </span>
              <span className="text-xs font-semibold text-cyan-400">cihaz</span>
            </div>
          </div>

          {/* Çalışır Durumda */}
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 backdrop-blur-md p-3.5 shadow-sm">
            <span className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider block">
              Çalışır (Aktif)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-emerald-300">
                {regionalDeviceStats.workingCount}
              </span>
              <span className="text-xs font-semibold text-emerald-400">sorunsuz</span>
            </div>
          </div>

          {/* Arızalı / Bakım Bekleyen */}
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 backdrop-blur-md p-3.5 shadow-sm">
            <span className="text-[11px] font-extrabold text-rose-300 uppercase tracking-wider block">
              Servis / Arıza
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-rose-300">
                {regionalDeviceStats.notWorkingCount}
              </span>
              <span className="text-xs font-semibold text-rose-400">müdahale</span>
            </div>
          </div>

          {/* Model ve Yazılım Dağılım Özeti */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-xl border border-indigo-400/30 bg-indigo-500/15 backdrop-blur-md p-3.5 shadow-sm">
            <span className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider block">
              Model & Yazılım
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
              {Object.entries(regionalDeviceStats.modelCounts).map(([model, count]) => (
                <span key={model} className="bg-white/20 border border-white/20 font-bold px-2 py-0.5 rounded-md text-white">
                  {model}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & View Mode Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ünvan, şehir, yetkili kişi veya telefon ile ara..."
            className="w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* View Switcher, City Filter and New Customer */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle: Table vs Cards */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner">
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
            <button
              onClick={() => setViewMode('grid')}
              title="Kurumsal Kartlar"
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-950 font-bold'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kartlar</span>
            </button>
          </div>

          <button
            onClick={onNewCustomer}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30 whitespace-nowrap active:scale-98"
          >
            <Plus className="h-4 w-4" />
            Yeni Müşteri
          </button>
        </div>
      </div>

      {/* Customer List Area */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-12 text-center shadow-sm">
          <Building2 className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-extrabold text-slate-950">
            {searchTerm || selectedRegionFilter !== 'all'
              ? 'Aramanıza veya seçili bölgeye uygun müşteri bulunamadı'
              : 'Henüz müşteri kaydı bulunmuyor'}
          </h3>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Yeni bir müşteri ekleyebilir veya Excel/CSV dosyasından toplu aktarım yapabilirsiniz.
          </p>
          <button
            onClick={onNewCustomer}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30"
          >
            <Plus className="h-4 w-4" />
            İlk Müşteriyi Ekle
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* GÖRÜNÜM 1: KOMPAKT TABLO */
        <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden w-full">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-900 font-extrabold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 w-[40%]">Müşteri / Firma & Konum</th>
                <th className="py-3.5 px-4 w-[28%]">Yetkili & İletişim</th>
                <th className="py-3.5 px-4 w-[16%] text-center">Cihaz & İşlem</th>
                <th className="py-3.5 px-4 w-[16%] text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.map((c) => {
                const custDevices = devices.filter((d) => d.customerId === c.id);
                const custOps = operations.filter((o) => o.customerId === c.id);

                return (
                  <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenCustomerDetail(c.id)}
                          className="font-extrabold text-sm text-slate-950 hover:text-blue-700 hover:underline text-left block truncate"
                          title={c.title}
                        >
                          {c.title}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800">{[c.city, c.district].filter(Boolean).join(' / ') || c.country || 'Türkiye'}</span>
                        {c.notes && (
                          <span className="text-slate-500 truncate max-w-[220px]" title={c.notes}>
                            · {c.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {c.contactName ? (
                        <div className="truncate">
                          <span className="font-bold text-slate-900 block truncate">
                            {c.contactName}
                            {c.contactRole && (
                              <span className="text-slate-600 font-medium text-[11px] ml-1">
                                ({c.contactRole})
                              </span>
                            )}
                          </span>
                          <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 font-mono font-medium">
                            {c.phone && <span className="font-semibold text-slate-800">{c.phone}</span>}
                            {c.email && <span className="truncate max-w-[150px]">{c.email}</span>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-medium">Yetkili belirtilmemiş</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-900 border border-blue-200 shadow-2xs">
                          <Cpu className="h-3.5 w-3.5 text-blue-600" />
                          {custDevices.length} Cihaz
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {custOps.length} servis kaydı
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenCustomerDetail(c.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs transition-colors"
                        >
                          Detay
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onEditCustomer(c)}
                          className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors shadow-2xs"
                          title="Düzenle"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(c)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-2xs"
                          title="Müşteriyi Sil"
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
      ) : (
        /* GÖRÜNÜM 2: KURUMSAL MÜŞTERİ KARTLARI */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCustomers.map((c) => {
            const custDevices = devices.filter((d) => d.customerId === c.id);
            const custOps = operations.filter((o) => o.customerId === c.id);

            return (
              <div
                key={c.id}
                className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <button
                      onClick={() => onOpenCustomerDetail(c.id)}
                      className="font-extrabold text-base text-slate-950 group-hover:text-blue-700 transition-colors text-left line-clamp-1"
                      title={c.title}
                    >
                      {c.title}
                    </button>
                    <span className="shrink-0 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-900">
                      {[c.city, c.district].filter(Boolean).join(' / ') || c.country || 'Türkiye'}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-xs text-slate-700 border-t border-slate-100 pt-2.5 font-medium">
                    {c.contactName ? (
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-900">{c.contactName}</span>
                        {c.contactRole && <span className="text-[11px] text-slate-500 font-normal">({c.contactRole})</span>}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">Yetkili kişi girilmemiş</p>
                    )}

                    {c.phone && (
                      <p className="flex items-center gap-2 font-mono text-[11px] text-slate-800">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">{c.phone}</span>
                      </p>
                    )}

                    {c.email && (
                      <p className="flex items-center gap-2 text-[11px] text-slate-600 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {custDevices.length > 0 ? (
                      custDevices.map((d) => (
                        <span
                          key={d.id}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold text-white shadow-2xs ${
                            d.model.includes('36dG') ? 'bg-purple-600' : 'bg-blue-600'
                          }`}
                        >
                          <Cpu className="h-3 w-3" />
                          {d.model}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Kayıtlı cihaz yok</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-600 font-bold">
                    {custOps.length} servis kaydı
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenCustomerDetail(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                    >
                      Kartı Aç
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => onEditCustomer(c)}
                      className="p-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors shadow-2xs"
                      title="Düzenle"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteClick(c)}
                      className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-2xs"
                      title="Müşteriyi Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
              <h3 className="text-base font-bold text-slate-900">Müşteriyi Sil</h3>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              <strong>{deleteConfirmation.customer.title}</strong> kaydını silmek üzeresiniz.
            </p>

            {deleteConfirmation.hasHistory && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                ⚠️ Bu müşteriye bağlı <strong>{deleteConfirmation.devicesCount} cihaz</strong> ve{' '}
                <strong>{deleteConfirmation.opsCount} servis işlemi</strong> bulunmaktadır.
                Müşteri silindiğinde bağlı tüm cihazlar ve işlemler de silinecektir!
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
