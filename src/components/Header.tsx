import React from 'react';
import { Menu, Bell, Plus, Calendar as CalendarIcon, Sparkles, Trash2 } from 'lucide-react';
import { formatDateTR, getTodayTR } from '../utils/date';
import { NavSection } from './Sidebar';

interface HeaderProps {
  currentSection: NavSection;
  onOpenMobileSidebar: () => void;
  onSelectSection: (section: NavSection) => void;
  unreadCount: number;
  hasSampleData: boolean;
  onClearSampleData: () => void;
  onNewCustomer: () => void;
  onNewOperation: () => void;
}

const SECTION_TITLES: Record<NavSection, { title: string; subtitle: string }> = {
  overview: {
    title: 'Genel Bakış',
    subtitle: 'Aktif servis durumu, geciken takipler ve genel göstergeler',
  },
  customers: {
    title: 'Müşteriler',
    subtitle: 'Kayıtlı firmalar, iletişim ve yetkili bilgileri',
  },
  devices: {
    title: 'Cihazlar',
    subtitle: 'Spektrofotometre, ışık kabini ve test cihazları envanteri',
  },
  sales: {
    title: 'Satılan Makineler',
    subtitle: 'İlk kuruluş tarihleri, satış fiyatları, resmi fatura ve 1. yıl kalibrasyon takibi',
  },
  reports: {
    title: 'Satış Grafikleri & Raporlar',
    subtitle: 'Aylık ve yıllık satış trendleri, ciro analizleri, model dağılımları ve kalibrasyon potansiyeli',
  },
  calendar: {
    title: 'İşlem Takvimi',
    subtitle: 'Planlanan periyodik bakım, kalibrasyon ve servis ajandası',
  },
  notifications: {
    title: 'Bildirimler',
    subtitle: 'Periyodik takip uyarıları ve zamanlanmış hatırlatmalar',
  },
  import: {
    title: 'Toplu Aktarım',
    subtitle: 'Excel veya CSV dosyasından müşteri ve cihaz aktarımı',
  },
  settings: {
    title: 'Ayarlar',
    subtitle: 'E-posta bildirimleri, para birimi, güvenlik ve yedekleme',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  onOpenMobileSidebar,
  onSelectSection,
  unreadCount,
  hasSampleData,
  onClearSampleData,
  onNewCustomer,
  onNewOperation,
}) => {
  const current = SECTION_TITLES[currentSection];
  const today = getTodayTR();

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-6 backdrop-blur-md shadow-xs">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{current.title}</h1>
            {hasSampleData && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-300 shadow-2xs">
                <Sparkles className="h-3 w-3 text-amber-600" />
                Örnek Veriler Aktif
              </span>
            )}
          </div>
          <p className="hidden text-xs font-medium text-slate-600 sm:block">{current.subtitle}</p>
        </div>
      </div>

      {/* Right: Actions & Tools */}
      <div className="flex items-center gap-3">
        {/* Sample data clear button if active */}
        {hasSampleData && (
          <button
            onClick={onClearSampleData}
            title="Sistemdeki örnek demo kayıtlarını tek tıkla temizle"
            className="hidden lg:flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors shadow-2xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Örnekleri Temizle
          </button>
        )}

        {/* Date Display */}
        <div className="hidden xl:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-700 font-bold font-mono shadow-2xs">
          <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
          <span>{formatDateTR(today)} (İstanbul)</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => onSelectSection('notifications')}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-all shadow-2xs"
          title="Bildirimler"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white font-mono shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onNewCustomer}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 transition-all shadow-xs whitespace-nowrap active:scale-98"
          >
            <Plus className="h-4 w-4 text-blue-600" />
            Müşteri Ekle
          </button>

          <button
            onClick={onNewOperation}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-600/30 whitespace-nowrap active:scale-98"
          >
            <Plus className="h-4 w-4" />
            İşlem Ekle
          </button>
        </div>
      </div>
    </header>
  );
};
