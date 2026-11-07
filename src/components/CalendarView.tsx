import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Plus,
  Zap,
  Sparkles,
  Wrench,
  Phone,
  ExternalLink,
  Search,
  Cpu,
  X,
  ShieldCheck,
  Activity,
  CalendarDays,
} from 'lucide-react';
import {
  Customer,
  Device,
  Operation,
  OPERATION_TYPE_LABELS,
  OperationType,
  MachineSale,
} from '../types';
import { formatDateTR, getTodayTR, diffDays } from '../utils/date';

interface CalendarViewProps {
  operations: Operation[];
  customers: Customer[];
  devices: Device[];
  sales?: MachineSale[];
  onOpenOperationDetail: (op: Operation) => void;
  onOpenCustomerDetail?: (customerId: string) => void;
  onNewOperation: (
    defaultCustId?: string,
    defaultDevId?: string,
    defaultPlannedDate?: string,
    defaultOpType?: OperationType
  ) => void;
}

export interface DueTrackingItem {
  id: string;
  sourceType: 'planned_op' | 'follow_up' | 'sale_warranty' | 'periodic_cycle';
  itemType: 'calibration' | 'lamp_replacement';
  customerId: string;
  deviceId: string;
  customer?: Customer;
  device?: Device;
  targetDate: string;
  daysRemaining: number;
  urgency: 'overdue' | 'this_week' | 'this_month' | 'future';
  lastOperationDate?: string;
  notes?: string;
  existingOperationId?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  operations,
  customers,
  devices,
  sales = [],
  onOpenOperationDetail,
  onOpenCustomerDetail,
  onNewOperation,
}) => {
  const today = getTodayTR();

  // Navigation state: year and month (0-indexed)
  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  // Main View Switcher Mode: 'calendar' | 'calibration_radar' | 'lamp_radar' | 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'calibration_radar' | 'lamp_radar' | 'list'>('calendar');

  // Filters for Calendar & List
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filters inside Radar view
  const [radarSearch, setRadarSearch] = useState('');
  const [radarUrgency, setRadarUrgency] = useState<'all' | 'overdue' | 'this_week' | 'this_month'>('all');

  // Selected Day for Day Details Drawer / Modal
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  // Cities list
  const cities = useMemo(() => {
    return Array.from(new Set(customers.map((c) => c.city))).filter(Boolean);
  }, [customers]);

  // Next / Prev Month navigation
  const prevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };
  const goToToday = () => {
    const [y, m] = today.split('-').map(Number);
    setCurrentDate(new Date(y, m - 1, 1));
    setSelectedDayStr(today);
  };

  // ==========================================
  // 1. ADVANCED DUE TRACKING ENGINE:
  // Calibration & Lamp Replacement Follow-ups
  // ==========================================
  const allDueTrackingItems = useMemo(() => {
    const items: DueTrackingItem[] = [];
    const processedDeviceTypes = new Set<string>();

    // 1. Planned Operations for calibration & lamp replacement
    operations.forEach((op) => {
      if (op.status !== 'planned' || !op.plannedDate) return;
      const days = diffDays(op.plannedDate, today);
      let urgency: DueTrackingItem['urgency'] = 'future';
      if (days < 0) urgency = 'overdue';
      else if (days <= 7) urgency = 'this_week';
      else if (days <= 30) urgency = 'this_month';

      if (op.operationTypes.includes('calibration')) {
        items.push({
          id: `op-cal-${op.id}`,
          sourceType: 'planned_op',
          itemType: 'calibration',
          customerId: op.customerId,
          deviceId: op.deviceId,
          customer: customers.find((c) => c.id === op.customerId),
          device: devices.find((d) => d.id === op.deviceId),
          targetDate: op.plannedDate,
          daysRemaining: days,
          urgency,
          notes: op.faultDescription || op.notes || 'Planlanmış Kalibrasyon Randevusu',
          existingOperationId: op.id,
        });
        processedDeviceTypes.add(`${op.deviceId}-calibration`);
      }

      if (op.operationTypes.includes('lamp_replacement')) {
        items.push({
          id: `op-lamp-${op.id}`,
          sourceType: 'planned_op',
          itemType: 'lamp_replacement',
          customerId: op.customerId,
          deviceId: op.deviceId,
          customer: customers.find((c) => c.id === op.customerId),
          device: devices.find((d) => d.id === op.deviceId),
          targetDate: op.plannedDate,
          daysRemaining: days,
          urgency,
          notes: op.faultDescription || op.notes || 'Planlanmış Lamba Değişimi Randevusu',
          existingOperationId: op.id,
        });
        processedDeviceTypes.add(`${op.deviceId}-lamp_replacement`);
      }
    });

    // 2. Follow-Up Targets from Completed Operations
    operations.forEach((op) => {
      if (op.status !== 'completed' || !op.nextFollowUps) return;

      // Calibration follow up
      if (
        op.nextFollowUps.calibration?.targetDate &&
        !processedDeviceTypes.has(`${op.deviceId}-calibration`)
      ) {
        const target = op.nextFollowUps.calibration.targetDate;
        const days = diffDays(target, today);
        let urgency: DueTrackingItem['urgency'] = 'future';
        if (days < 0) urgency = 'overdue';
        else if (days <= 7) urgency = 'this_week';
        else if (days <= 30) urgency = 'this_month';

        items.push({
          id: `followup-cal-${op.id}`,
          sourceType: 'follow_up',
          itemType: 'calibration',
          customerId: op.customerId,
          deviceId: op.deviceId,
          customer: customers.find((c) => c.id === op.customerId),
          device: devices.find((d) => d.id === op.deviceId),
          targetDate: target,
          daysRemaining: days,
          urgency,
          lastOperationDate: op.actualDate || op.plannedDate,
          notes: 'Periyodik Dalgaboyu & Sertifikalı Kalibrasyon Takibi',
        });
        processedDeviceTypes.add(`${op.deviceId}-calibration`);
      }

      // Lamp Replacement follow up
      if (
        op.nextFollowUps.lamp_replacement?.targetDate &&
        !processedDeviceTypes.has(`${op.deviceId}-lamp_replacement`)
      ) {
        const target = op.nextFollowUps.lamp_replacement.targetDate;
        const days = diffDays(target, today);
        let urgency: DueTrackingItem['urgency'] = 'future';
        if (days < 0) urgency = 'overdue';
        else if (days <= 7) urgency = 'this_week';
        else if (days <= 30) urgency = 'this_month';

        items.push({
          id: `followup-lamp-${op.id}`,
          sourceType: 'follow_up',
          itemType: 'lamp_replacement',
          customerId: op.customerId,
          deviceId: op.deviceId,
          customer: customers.find((c) => c.id === op.customerId),
          device: devices.find((d) => d.id === op.deviceId),
          targetDate: target,
          daysRemaining: days,
          urgency,
          lastOperationDate: op.actualDate || op.plannedDate,
          notes: 'Ksenon Flaş Lambası Ömür & Yenileme Takibi',
        });
        processedDeviceTypes.add(`${op.deviceId}-lamp_replacement`);
      }
    });

    // 3. Machine Sales 1st Year Warranty Calibration Due Date
    sales.forEach((s) => {
      if (
        s.firstCalibrationDueDate &&
        !processedDeviceTypes.has(`${s.deviceId}-calibration`)
      ) {
        const days = diffDays(s.firstCalibrationDueDate, today);
        let urgency: DueTrackingItem['urgency'] = 'future';
        if (days < 0) urgency = 'overdue';
        else if (days <= 7) urgency = 'this_week';
        else if (days <= 30) urgency = 'this_month';

        items.push({
          id: `sale-cal-${s.id}`,
          sourceType: 'sale_warranty',
          itemType: 'calibration',
          customerId: s.customerId,
          deviceId: s.deviceId,
          customer: customers.find((c) => c.id === s.customerId),
          device: devices.find((d) => d.id === s.deviceId),
          targetDate: s.firstCalibrationDueDate,
          daysRemaining: days,
          urgency,
          lastOperationDate: s.saleDate,
          notes: '1. Yıl Satış Sonrası Garanti & Sertifikalı Kalibrasyon',
        });
        processedDeviceTypes.add(`${s.deviceId}-calibration`);
      }
    });

    // Sort by daysRemaining ascending (overdue first, then upcoming soonest)
    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [operations, customers, devices, sales, today]);

  // Calibration items
  const dueCalibrationItems = useMemo(() => {
    return allDueTrackingItems.filter((i) => i.itemType === 'calibration');
  }, [allDueTrackingItems]);

  // Lamp items
  const dueLampItems = useMemo(() => {
    return allDueTrackingItems.filter((i) => i.itemType === 'lamp_replacement');
  }, [allDueTrackingItems]);

  // Overall counts for KPI counters
  const overdueCount = useMemo(() => {
    return allDueTrackingItems.filter((i) => i.daysRemaining < 0).length;
  }, [allDueTrackingItems]);

  const dueSoonCalibrationCount = useMemo(() => {
    return dueCalibrationItems.filter((i) => i.daysRemaining <= 30).length;
  }, [dueCalibrationItems]);

  const dueSoonLampCount = useMemo(() => {
    return dueLampItems.filter((i) => i.daysRemaining <= 30).length;
  }, [dueLampItems]);

  // Filtered operations for calendar & list
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      const customer = customers.find((c) => c.id === op.customerId);

      if (filterCustomer !== 'all' && op.customerId !== filterCustomer) return false;
      if (filterCity !== 'all' && customer?.city !== filterCity) return false;
      if (filterType !== 'all' && !op.operationTypes.includes(filterType as OperationType)) return false;
      if (filterStatus !== 'all' && op.status !== filterStatus) return false;

      return true;
    });
  }, [operations, customers, filterCustomer, filterCity, filterType, filterStatus]);

  // Month Grid calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const monthName = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(currentDate);

  // Month Days
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calendar cells
  const calendarCells = useMemo(() => {
    const cells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}-${pad(d)}`;
      cells.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      cells.push({ dateStr, dayNumber: d, isCurrentMonth: true });
    }

    // Next month padding to fill row (multiples of 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(year, month + 1, d);
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(d)}`;
        cells.push({ dateStr, dayNumber: d, isCurrentMonth: false });
      }
    }

    return cells;
  }, [year, month, startingDayOfWeek, daysInMonth]);

  // Operations map by date
  const operationsByDate = useMemo(() => {
    const map: Record<string, Operation[]> = {};
    for (const op of filteredOperations) {
      const targetDate = op.actualDate || op.plannedDate;
      if (!targetDate) continue;
      if (!map[targetDate]) map[targetDate] = [];
      map[targetDate].push(op);
    }
    return map;
  }, [filteredOperations]);

  // Operations for this month
  const thisMonthOpsCount = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const prefix = `${year}-${pad(month + 1)}`;
    return filteredOperations.filter((op) => (op.actualDate || op.plannedDate).startsWith(prefix)).length;
  }, [filteredOperations, year, month]);

  // Operations for selected day
  const selectedDayOperations = useMemo(() => {
    if (!selectedDayStr) return [];
    return operationsByDate[selectedDayStr] || [];
  }, [selectedDayStr, operationsByDate]);

  // Radar items filtered by user search and urgency
  const filteredRadarItems = useMemo(() => {
    const base = viewMode === 'calibration_radar' ? dueCalibrationItems : dueLampItems;

    return base.filter((item) => {
      if (radarUrgency === 'overdue' && item.daysRemaining >= 0) return false;
      if (radarUrgency === 'this_week' && (item.daysRemaining < 0 || item.daysRemaining > 7)) return false;
      if (radarUrgency === 'this_month' && (item.daysRemaining < 0 || item.daysRemaining > 30)) return false;

      if (radarSearch.trim()) {
        const q = radarSearch.toLowerCase();
        const custTitle = item.customer?.title?.toLowerCase() || '';
        const custCity = item.customer?.city?.toLowerCase() || '';
        const devBrand = item.device?.brand?.toLowerCase() || '';
        const devModel = item.device?.model?.toLowerCase() || '';
        const devSn = item.device?.serialNumber?.toLowerCase() || '';
        return (
          custTitle.includes(q) ||
          custCity.includes(q) ||
          devBrand.includes(q) ||
          devModel.includes(q) ||
          devSn.includes(q)
        );
      }

      return true;
    });
  }, [viewMode, dueCalibrationItems, dueLampItems, radarUrgency, radarSearch]);

  const WEEKDAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP EXECUTIVE TRACKING RADAR & KPI COCKPIT             */}
      {/* ========================================================= */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-extrabold text-blue-900 mb-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              SERVİS & PLANLAMA RADARI
            </div>
            <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">
              İşlem Takvimi & Periyodik Bakım / Lamba Radarı
            </h2>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              Spektrofotometre kalibrasyon döngüleri, ksenon flaş lambası değişimleri ve planlanan tüm servis randevularını tek merkezden yönetin.
            </p>
          </div>

          {/* Primary View Switcher Tabs */}
          <div className="flex flex-wrap items-center rounded-xl bg-slate-100 p-1.5 border-2 border-slate-200 shadow-inner">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Grid className="h-4 w-4" />
              Aylık Takvim
            </button>

            <button
              onClick={() => setViewMode('calibration_radar')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                viewMode === 'calibration_radar'
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Kalibrasyon Takibi ({dueCalibrationItems.length})
              {dueSoonCalibrationCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black">
                  {dueSoonCalibrationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setViewMode('lamp_radar')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                viewMode === 'lamp_radar'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <Zap className="h-4 w-4 text-amber-200" />
              Lamba Değişimi Takibi ({dueLampItems.length})
              {dueSoonLampCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-slate-950 text-[10px] font-black">
                  {dueSoonLampCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              <List className="h-4 w-4" />
              Tüm Liste ({filteredOperations.length})
            </button>
          </div>
        </div>

        {/* 4 Summary Actionable Cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 pt-2">
          {/* 1. Calibration Due */}
          <div
            onClick={() => setViewMode('calibration_radar')}
            className={`rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
              viewMode === 'calibration_radar'
                ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                : 'border-blue-200 bg-gradient-to-br from-white to-blue-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900">
                Kalibrasyon Vakti Gelenler
              </span>
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-blue-950">
              {dueCalibrationItems.length} <span className="text-xs font-bold text-blue-700">Cihaz</span>
            </div>
            <div className="mt-1 text-[11px] font-bold text-blue-800">
              {dueSoonCalibrationCount} cihazın vadesi dolmak üzere
            </div>
          </div>

          {/* 2. Lamp Replacement Due */}
          <div
            onClick={() => setViewMode('lamp_radar')}
            className={`rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
              viewMode === 'lamp_radar'
                ? 'border-amber-600 bg-amber-50/70 shadow-sm'
                : 'border-amber-200 bg-gradient-to-br from-white to-amber-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950">
                Lamba Değişimi Vakti Gelenler
              </span>
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-amber-950">
              {dueLampItems.length} <span className="text-xs font-bold text-amber-700">Cihaz</span>
            </div>
            <div className="mt-1 text-[11px] font-bold text-amber-800">
              Ksenon flaş lambası yenileme
            </div>
          </div>

          {/* 3. Overdue Urgent Operations */}
          <div
            onClick={() => {
              setViewMode('calibration_radar');
              setRadarUrgency('overdue');
            }}
            className="rounded-xl border-2 border-rose-200 bg-gradient-to-br from-white to-rose-50/40 p-4 transition-all cursor-pointer hover:shadow-md hover:border-rose-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900">
                Geciken Acil İşlemler
              </span>
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-rose-950">
              {overdueCount} <span className="text-xs font-bold text-rose-700">Acil Müdahale</span>
            </div>
            <div className="mt-1 text-[11px] font-bold text-rose-800">
              Vade tarihi geçmiş spektrofotometreler
            </div>
          </div>

          {/* 4. This Month's Scheduled Operations */}
          <div
            onClick={() => setViewMode('calendar')}
            className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition-all cursor-pointer hover:shadow-md hover:border-slate-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                {monthName} Randevuları
              </span>
              <CalendarIcon className="h-5 w-5 text-slate-700" />
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-slate-950">
              {thisMonthOpsCount} <span className="text-xs font-bold text-slate-600">İşlem</span>
            </div>
            <div className="mt-1 text-[11px] font-bold text-slate-600">
              Takvimde planlanan randevular
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. RADAR VIEW MODE: Calibration or Lamp Due Cockpit       */}
      {/* ========================================================= */}
      {(viewMode === 'calibration_radar' || viewMode === 'lamp_radar') && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                {viewMode === 'calibration_radar' ? (
                  <Sparkles className="h-5 w-5 text-blue-600" />
                ) : (
                  <Zap className="h-5 w-5 text-amber-600" />
                )}
                <h3 className="text-base font-extrabold text-slate-950">
                  {viewMode === 'calibration_radar'
                    ? 'Zamanı Gelen / Geciken Kalibrasyon Takip Paneli'
                    : 'Zamanı Gelen Ksenon Lamba Değişimi Takip Paneli'}
                </h3>
                <span
                  className={`rounded-lg px-2.5 py-0.5 text-xs font-extrabold border ${
                    viewMode === 'calibration_radar'
                      ? 'bg-blue-100 text-blue-950 border-blue-300'
                      : 'bg-amber-100 text-amber-950 border-amber-300'
                  }`}
                >
                  {filteredRadarItems.length} Cihaz
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {viewMode === 'calibration_radar'
                  ? 'Test çinisi, optik dalgaboyu doğrulaması ve yıllık sertifikasyon vadesi yaklaşan spektrofotometreler'
                  : 'Flaş sayısı ve periyodik kullanım ömrü dolan spektrofotometre ksenon flaş lambaları'}
              </p>
            </div>

            {/* Quick Action to Schedule */}
            <button
              onClick={() =>
                onNewOperation(
                  undefined,
                  undefined,
                  today,
                  viewMode === 'calibration_radar' ? 'calibration' : 'lamp_replacement'
                )
              }
              className={`inline-flex items-center gap-2 rounded-xl text-white px-4 py-2.5 text-xs font-extrabold transition-all shadow-sm cursor-pointer whitespace-nowrap ${
                viewMode === 'calibration_radar'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              {viewMode === 'calibration_radar' ? 'Yeni Kalibrasyon Kaydı Aç' : 'Yeni Lamba Değişimi Aç'}
            </button>
          </div>

          {/* Search & Urgency Filter Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={radarSearch}
                onChange={(e) => setRadarSearch(e.target.value)}
                placeholder="Firma ünvanı, şehir, model veya seri no ile ara..."
                className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Urgency Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-slate-100 p-1 text-xs">
              <button
                onClick={() => setRadarUrgency('all')}
                className={`rounded-lg px-3 py-1 font-extrabold transition-all cursor-pointer ${
                  radarUrgency === 'all'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                Tümü ({allDueTrackingItems.filter((i) => i.itemType === (viewMode === 'calibration_radar' ? 'calibration' : 'lamp_replacement')).length})
              </button>
              <button
                onClick={() => setRadarUrgency('overdue')}
                className={`rounded-lg px-3 py-1 font-extrabold transition-all cursor-pointer ${
                  radarUrgency === 'overdue'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                Gecikenler ⚠️
              </button>
              <button
                onClick={() => setRadarUrgency('this_week')}
                className={`rounded-lg px-3 py-1 font-extrabold transition-all cursor-pointer ${
                  radarUrgency === 'this_week'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                Bu Hafta ⏰
              </button>
              <button
                onClick={() => setRadarUrgency('this_month')}
                className={`rounded-lg px-3 py-1 font-extrabold transition-all cursor-pointer ${
                  radarUrgency === 'this_month'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-800 hover:text-blue-950'
                }`}
              >
                30 Gün İçinde 📅
              </button>
            </div>
          </div>

          {/* Due Tracking Cards List */}
          {filteredRadarItems.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
              <h4 className="text-base font-extrabold text-slate-900">
                Seçilen kriterde vadesi yaklaşan işlem bulunmuyor
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tüm spektrofotometreler periyodik bakım takvimine uygun durumdadır.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRadarItems.map((item) => {
                const isOverdue = item.daysRemaining < 0;
                const isThisWeek = item.daysRemaining >= 0 && item.daysRemaining <= 7;

                let cardBorder = 'border-2 border-slate-200 bg-white hover:border-slate-300';
                if (isOverdue) {
                  cardBorder = 'border-2 border-rose-300 bg-linear-to-br from-white to-rose-50/30 hover:border-rose-400';
                } else if (isThisWeek) {
                  cardBorder = 'border-2 border-amber-300 bg-linear-to-br from-white to-amber-50/30 hover:border-amber-400';
                }

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between ${cardBorder}`}
                  >
                    <div>
                      {/* Top Header: Customer & Location */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            onClick={() => onOpenCustomerDetail && onOpenCustomerDetail(item.customerId)}
                            className="font-extrabold text-slate-950 hover:text-blue-600 hover:underline text-left text-sm block line-clamp-1 cursor-pointer"
                            title={item.customer?.title}
                          >
                            {item.customer?.title || 'Müşteri Kaydı'}
                          </button>
                          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            {[item.customer?.city, item.customer?.district].filter(Boolean).join(' / ') || 'Türkiye'}
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-950 border border-rose-300 animate-pulse">
                            <AlertTriangle className="h-3 w-3 text-rose-700" />
                            {Math.abs(item.daysRemaining)} Gün Gecikti
                          </span>
                        ) : isThisWeek ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 border border-amber-300">
                            <Clock className="h-3 w-3 text-amber-700" />
                            {item.daysRemaining} Gün Kaldı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-950 border border-blue-300">
                            <CalendarDays className="h-3 w-3 text-blue-700" />
                            {item.daysRemaining} Gün Kaldı
                          </span>
                        )}
                      </div>

                      {/* Device & Model Information Box */}
                      <div className="mt-3.5 rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900">
                            {item.device?.brand || 'Konica Minolta'} {item.device?.model || 'CM-3600d'}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold border ${
                              item.itemType === 'calibration'
                                ? 'bg-blue-100 text-blue-950 border-blue-200'
                                : 'bg-amber-100 text-amber-950 border-amber-200'
                            }`}
                          >
                            {item.itemType === 'calibration' ? 'Kalibrasyon' : 'Lamba Değişimi'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 font-semibold">
                          SN: {item.device?.serialNumber || 'Bilinmiyor'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-200/60 flex items-center justify-between">
                          <span>Vade Tarihi:</span>
                          <span className="font-mono font-bold text-slate-900">{formatDateTR(item.targetDate)}</span>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="mt-2 text-[11px] font-medium text-slate-600 line-clamp-2">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t-2 border-slate-100 flex items-center justify-between gap-2">
                      {/* Customer Phone Link */}
                      {item.customer?.phone ? (
                        <a
                          href={`tel:${item.customer.phone}`}
                          title={`Müşteriyi Ara: ${item.customer.phone}`}
                          className="inline-flex items-center gap-1 rounded-lg border-2 border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                        >
                          <Phone className="h-3 w-3 text-emerald-600" />
                          Ara
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Telefon yok</span>
                      )}

                      {/* Direct Schedule Operation Button */}
                      <button
                        onClick={() => {
                          if (item.existingOperationId) {
                            const op = operations.find((o) => o.id === item.existingOperationId);
                            if (op) onOpenOperationDetail(op);
                          } else {
                            onNewOperation(item.customerId, item.deviceId, item.targetDate, item.itemType);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold text-white transition-all shadow-xs cursor-pointer ${
                          item.itemType === 'calibration'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                      >
                        {item.existingOperationId ? (
                          <>
                            <ExternalLink className="h-3.5 w-3.5" />
                            İşleme Git
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            Randevu Aç
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CALENDAR VIEW MODE: Interactive Month Grid & Day Drawer */}
      {/* ========================================================= */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Navigation & Filters Strip */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
            {/* Month Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border-2 border-slate-200 bg-slate-50 p-1 shadow-2xs">
                <button
                  onClick={prevMonth}
                  title="Önceki Ay"
                  className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-slate-950 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-44 text-center text-xs font-extrabold text-slate-950 capitalize">
                  {monthName}
                </span>
                <button
                  onClick={nextMonth}
                  title="Sonraki Ay"
                  className="rounded-lg p-1.5 text-slate-700 hover:bg-white hover:text-slate-950 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={goToToday}
                className="rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
              >
                Bugüne Git
              </button>
            </div>

            {/* Global Calendar Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm İşlem Türleri</option>
                <option value="calibration">🔬 Sadece Kalibrasyon</option>
                <option value="lamp_replacement">⚡ Sadece Lamba Değişimi</option>
                <option value="periodic_maintenance">🛠️ Periyodik Bakım</option>
                <option value="service_repair">🔧 Servis & Onarım</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="planned">Planlandı</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>

              {/* City Filter */}
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm İller</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              {/* New Operation Button */}
              <button
                onClick={() => onNewOperation(undefined, undefined, today)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-extrabold transition-colors shadow-sm whitespace-nowrap cursor-pointer"
              >
                <Plus className="h-4 w-4 text-white" />
                İşlem Ekle
              </button>
            </div>
          </div>

          {/* Calendar Month Grid */}
          <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b-2 border-slate-200 bg-slate-100 text-center text-xs font-extrabold text-slate-950 uppercase tracking-wider">
              {WEEKDAYS_TR.map((dayName) => (
                <div key={dayName} className="py-3">
                  {dayName}
                </div>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 min-h-[580px]">
              {calendarCells.map((cell, idx) => {
                const opsOnDay = operationsByDate[cell.dateStr] || [];
                const isToday = cell.dateStr === today;
                const isSelected = selectedDayStr === cell.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayStr(cell.dateStr)}
                    className={`p-2.5 transition-colors min-h-[110px] flex flex-col justify-between group cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-blue-600 bg-blue-50/40'
                        : cell.isCurrentMonth
                        ? 'bg-white hover:bg-slate-50/80'
                        : 'bg-slate-50/40 text-slate-400'
                    }`}
                  >
                    {/* Top Day Number & Add Button */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg text-xs font-extrabold font-mono ${
                          isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isSelected
                            ? 'bg-slate-900 text-white'
                            : cell.isCurrentMonth
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewOperation(undefined, undefined, cell.dateStr);
                        }}
                        title={`${formatDateTR(cell.dateStr)} tarihine randevu ekle`}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-blue-600 p-1 rounded-md transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Operations Badges on this day */}
                    <div className="space-y-1 flex-1 overflow-y-auto max-h-24">
                      {opsOnDay.map((op) => {
                        const cust = customers.find((c) => c.id === op.customerId);
                        const isLamp = op.operationTypes.includes('lamp_replacement');
                        const isCal = op.operationTypes.includes('calibration');
                        const isCompleted = op.status === 'completed';

                        let badgeStyle = 'bg-blue-100 text-blue-950 border-blue-300 font-bold';
                        let icon = <Wrench className="h-3 w-3 shrink-0" />;

                        if (isLamp) {
                          badgeStyle = 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold';
                          icon = <Zap className="h-3 w-3 text-amber-700 shrink-0" />;
                        } else if (isCal) {
                          badgeStyle = 'bg-indigo-100 text-indigo-950 border-indigo-300 font-extrabold';
                          icon = <Sparkles className="h-3 w-3 text-indigo-700 shrink-0" />;
                        } else if (isCompleted) {
                          badgeStyle = 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold';
                          icon = <CheckCircle2 className="h-3 w-3 text-emerald-700 shrink-0" />;
                        }

                        return (
                          <button
                            key={op.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenOperationDetail(op);
                            }}
                            className={`w-full text-left rounded-md border px-2 py-1 text-[10px] truncate flex items-center gap-1 transition-transform hover:scale-[1.02] shadow-2xs cursor-pointer ${badgeStyle}`}
                            title={`${cust?.title || 'Müşteri'} - ${op.operationTypes
                              .map((t) => OPERATION_TYPE_LABELS[t] || t)
                              .join(', ')}`}
                          >
                            {icon}
                            <span className="font-extrabold truncate">{cust?.title || 'Müşteri'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Day Details Drawer / Modal when a day is clicked */}
          {selectedDayStr && (
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950">
                      {formatDateTR(selectedDayStr)} Randevuları & İşlem Listesi
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      {selectedDayOperations.length > 0
                        ? `Bu tarihte kayıtlı ${selectedDayOperations.length} işlem bulunuyor.`
                        : 'Bu tarihe henüz planlanmış işlem bulunmuyor.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNewOperation(undefined, undefined, selectedDayStr)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-extrabold transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Bu Güne Randevu Ekle
                  </button>
                  <button
                    onClick={() => setSelectedDayStr(null)}
                    className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {selectedDayOperations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDayOperations.map((op) => {
                    const cust = customers.find((c) => c.id === op.customerId);
                    const dev = devices.find((d) => d.id === op.deviceId);
                    const isLamp = op.operationTypes.includes('lamp_replacement');
                    const isCal = op.operationTypes.includes('calibration');

                    return (
                      <div
                        key={op.id}
                        className="rounded-xl border-2 border-slate-200 bg-slate-50/70 p-4 space-y-2 hover:border-blue-400 hover:bg-white transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onOpenCustomerDetail && onOpenCustomerDetail(op.customerId)}
                            className="font-extrabold text-slate-950 hover:text-blue-600 hover:underline text-xs block truncate"
                          >
                            {cust?.title || 'Müşteri'}
                          </button>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold border ${
                              isLamp
                                ? 'bg-amber-100 text-amber-950 border-amber-300'
                                : isCal
                                ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
                                : 'bg-blue-100 text-blue-950 border-blue-300'
                            }`}
                          >
                            {isLamp ? 'Lamba Değişimi' : isCal ? 'Kalibrasyon' : 'Servis'}
                          </span>
                        </div>

                        <div className="text-[11px] font-semibold text-slate-700">
                          {dev ? `${dev.brand} ${dev.model}` : 'Cihaz'} (SN: {dev?.serialNumber || '-'})
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {[cust?.city, cust?.district].filter(Boolean).join(' / ') || '-'}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800">
                            Durum: {op.status === 'completed' ? 'Tamamlandı' : 'Planlandı'}
                          </span>
                          <button
                            onClick={() => onOpenOperationDetail(op)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors"
                          >
                            İşlem Kartını Aç
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  Bu tarihe ait kayıt bulunmamaktadır. Randevu eklemek için sağ üstteki butonu kullanabilirsiniz.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. LIST VIEW MODE: Dense Table of All Operations          */}
      {/* ========================================================= */}
      {viewMode === 'list' && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
            <div>
              <h3 className="text-base font-extrabold text-slate-950">
                Tüm Planlanan ve Gerçekleşen Servis Kayıtları
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Kronolojik olarak listelenmiş işlemler
              </p>
            </div>

            <button
              onClick={() => onNewOperation(undefined, undefined, today)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-extrabold transition-colors shadow-2xs"
            >
              <Plus className="h-4 w-4 text-white" />
              Yeni İşlem Ekle
            </button>
          </div>

          {filteredOperations.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Seçilen kriterlerde kayıt bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-950 font-extrabold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-4">Tarih</th>
                    <th className="py-3.5 px-4">Müşteri / Firma</th>
                    <th className="py-3.5 px-4">Şehir</th>
                    <th className="py-3.5 px-4">Cihaz Model & Seri No</th>
                    <th className="py-3.5 px-4">İşlem Türü</th>
                    <th className="py-3.5 px-4">Durum</th>
                    <th className="py-3.5 px-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOperations
                    .sort((a, b) => (b.plannedDate || '').localeCompare(a.plannedDate || ''))
                    .map((op) => {
                      const cust = customers.find((c) => c.id === op.customerId);
                      const dev = devices.find((d) => d.id === op.deviceId);
                      const isLamp = op.operationTypes.includes('lamp_replacement');
                      const isCal = op.operationTypes.includes('calibration');

                      return (
                        <tr
                          key={op.id}
                          onClick={() => onOpenOperationDetail(op)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatDateTR(op.actualDate || op.plannedDate)}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-950">
                            {cust?.title || 'Müşteri'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                            {cust?.city || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900">
                              {dev ? `${dev.brand} ${dev.model}` : '-'}
                            </span>
                            <span className="block text-[11px] font-mono text-slate-500">
                              SN: {dev?.serialNumber || 'Bilinmiyor'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {op.operationTypes.map((t) => (
                                <span
                                  key={t}
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold border ${
                                    t === 'lamp_replacement'
                                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                                      : t === 'calibration'
                                      ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
                                      : 'bg-slate-200 text-slate-800 border-slate-300'
                                  }`}
                                >
                                  {OPERATION_TYPE_LABELS[t] || t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
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
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenOperationDetail(op);
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs"
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
          )}
        </div>
      )}
    </div>
  );
};
