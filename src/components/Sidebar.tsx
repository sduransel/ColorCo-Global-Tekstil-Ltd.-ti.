import React from 'react';
import {
  LayoutDashboard,
  Users,
  Cpu,
  Calendar,
  Bell,
  FileSpreadsheet,
  Settings,
  Lock,
  Menu,
  X,
  ShoppingBag,
  BarChart3,
  ExternalLink,
  Headset,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'customers'
  | 'devices'
  | 'sales'
  | 'reports'
  | 'calendar'
  | 'notifications'
  | 'import'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  unreadCount: number;
  overdueSalesCount?: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLockApp: () => void;
  pinRequired: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  unreadCount,
  overdueSalesCount = 0,
  isOpenMobile,
  onCloseMobile,
  onLockApp,
  pinRequired,
}) => {
  const navItems = [
    { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },
    { id: 'customers', label: 'Müşteriler', icon: Users },
    { id: 'devices', label: 'Cihazlar', icon: Cpu },
    {
      id: 'sales',
      label: 'Satılan Makineler',
      icon: ShoppingBag,
      badge: overdueSalesCount > 0 ? overdueSalesCount : undefined,
    },
    {
      id: 'reports',
      label: 'Satış Grafikleri & Raporlar',
      icon: BarChart3,
    },
    { id: 'calendar', label: 'İşlem Takvimi', icon: Calendar },
    {
      id: 'notifications',
      label: 'Bildirimler',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { id: 'import', label: 'Toplu Aktarım', icon: FileSpreadsheet },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ];

  const handleNavClick = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#1e293b] bg-[#0a0f1d] transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Prominent ColorCo Global Logo Header with Colorful Spectrum Background */}
        <div className="relative border-b border-[#1e293b] p-3.5 bg-gradient-to-br from-[#0d162d] via-[#142654] to-[#1d3570] overflow-hidden shadow-lg">
          {/* Subtle Spectrophotometer Ambient Light Glows */}
          <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-500/25 blur-xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-cyan-400/20 blur-xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 h-16 w-16 -translate-y-1/2 rounded-full bg-purple-500/15 blur-lg pointer-events-none" />

          {/* Logo Frame: Fills the area prominently */}
          <div className="relative flex flex-col items-center justify-center rounded-xl bg-white/5 p-3 backdrop-blur-xs border border-white/10 shadow-inner">
            <img
              src="/assets/aistudio/ColorCo_Logo_white.png"
              alt="ColorCo Global Logo"
              className="w-full h-auto max-h-[68px] object-contain transform hover:scale-[1.02] transition-transform drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            />

            {/* Industrial Color Spectrum Bar (Cyan, Magenta, Yellow, Blue, Emerald) */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5 w-full px-2">
              <span className="h-1.5 flex-1 rounded-full bg-[#00A3E0]" title="Cyan" />
              <span className="h-1.5 flex-1 rounded-full bg-[#E5007D]" title="Magenta" />
              <span className="h-1.5 flex-1 rounded-full bg-[#FFD100]" title="Yellow" />
              <span className="h-1.5 flex-1 rounded-full bg-[#0033A0]" title="Cobalt Blue" />
              <span className="h-1.5 flex-1 rounded-full bg-[#00A859]" title="Emerald Green" />
            </div>

            <div className="mt-1.5 text-[9px] font-extrabold uppercase tracking-widest text-cyan-300 font-mono text-center">
              Spektrofotometre & Renk Teknolojileri
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white md:hidden transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1.5 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as NavSection)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/30 ring-1 ring-white/10'
                    : 'text-slate-300 font-semibold hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold font-mono ${
                      isActive
                        ? 'bg-white text-blue-900 shadow-xs'
                        : 'bg-rose-500 text-white shadow-xs'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Left: Remote Support Quick Tools (AnyDesk & TeamViewer) & Lock */}
        <div className="border-t border-[#1e293b] p-4 space-y-2">
          <div className="rounded-xl bg-[#111827] p-3 space-y-2 border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Headset className="h-3.5 w-3.5 text-sky-400" />
                Uzak Destek / Bağlantı
              </span>
              {pinRequired && (
                <button
                  onClick={onLockApp}
                  title="Ekranı Kilitle"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="https://anydesk.com/downloads"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/40 bg-red-950/40 px-2.5 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-900/60 hover:text-white transition-all shadow-xs"
                title="AnyDesk Uzak Masaüstü İndir / Aç"
              >
                <span>AnyDesk</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href="https://www.teamviewer.com/download/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-500/40 bg-blue-950/40 px-2.5 py-1.5 text-[11px] font-bold text-blue-300 hover:bg-blue-900/60 hover:text-white transition-all shadow-xs"
                title="TeamViewer Uzaktan Destek İndir / Aç"
              >
                <span>TeamViewer</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
