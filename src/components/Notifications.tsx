import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  MailCheck,
  MailX,
  Building2,
  Cpu,
  Calendar,
  Check,
  Trash2,
} from 'lucide-react';
import {
  SystemNotification,
  Customer,
  Device,
  Operation,
  OPERATION_TYPE_LABELS,
} from '../types';
import { formatDateTR, formatDateTimeTR } from '../utils/date';

interface NotificationsProps {
  notifications: SystemNotification[];
  customers: Customer[];
  devices: Device[];
  operations: Operation[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onClearAllNotifications: () => Promise<void>;
  onOpenOperationDetail: (op: Operation) => void;
  onOpenCustomerDetail: (customerId: string) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  customers,
  devices,
  operations,
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onClearAllNotifications,
  onOpenOperationDetail,
  onOpenCustomerDetail,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return n.status === 'unread';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-950">Sistem Bildirimleri & Servis Uyarıları</h2>
            <p className="text-xs font-semibold text-slate-500">Periyodik takip, kalibrasyon ve lamba değişim alarmları</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* All / Unread Filter */}
          <div className="flex items-center rounded-xl border-2 border-slate-200 bg-slate-100 p-1 text-xs font-bold shadow-inner">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-950 text-white font-extrabold shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Tümü ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-3.5 py-1.5 transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Okunmamış ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Check className="h-4 w-4 text-emerald-600" />
              Tümünü Okundu İşaretle
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={onClearAllNotifications}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-extrabold text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Tümünü Sil
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3.5">
        {filteredNotifs.length === 0 ? (
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-12 text-center shadow-sm">
            <Bell className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-extrabold text-slate-900">
              {filter === 'unread'
                ? 'Okunmamış bildirim bulunmuyor'
                : 'Henüz sistem bildirimi oluşturulmadı'}
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1 max-w-md mx-auto">
              Periyodik takip tarihi yaklaşan veya geciken işlemler otomatik olarak burada listelenecektir.
            </p>
          </div>
        ) : (
          filteredNotifs.map((n) => {
            const customer = customers.find((c) => c.id === n.customerId);
            const device = devices.find((d) => d.id === n.deviceId);
            const operation = operations.find((o) => o.id === n.operationId);

            const isOverdue = n.daysBefore < 0;
            const isToday = n.daysBefore === 0;

            let cardBorder = 'border-2 border-slate-200 bg-white';
            let iconBox = 'bg-slate-100 text-slate-700 border border-slate-200';

            if (isOverdue) {
              cardBorder = 'border-2 border-rose-300 bg-gradient-to-r from-white via-rose-50/30 to-rose-50/50';
              iconBox = 'bg-rose-100 text-rose-700 border border-rose-300';
            } else if (isToday) {
              cardBorder = 'border-2 border-amber-300 bg-gradient-to-r from-white via-amber-50/30 to-amber-50/50';
              iconBox = 'bg-amber-100 text-amber-800 border border-amber-300';
            }

            return (
              <div
                key={n.id}
                className={`rounded-2xl border-2 p-5 shadow-sm transition-all ${cardBorder} ${
                  n.status === 'unread' ? 'ring-2 ring-blue-500/20' : 'opacity-90'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-2xs ${iconBox}`}>
                      {isOverdue ? (
                        <AlertTriangle className="h-6 w-6" />
                      ) : isToday ? (
                        <Clock className="h-6 w-6" />
                      ) : (
                        <Bell className="h-6 w-6" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-950">{n.title}</h4>
                        {n.status === 'unread' && (
                          <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            Yeni
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-700">{n.message}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 text-xs">
                        <div className="rounded-xl bg-white p-3 border-2 border-slate-200 shadow-2xs">
                          <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Müşteri</span>
                          <button
                            onClick={() => customer && onOpenCustomerDetail(customer.id)}
                            className="font-extrabold text-slate-950 hover:text-blue-600 hover:underline text-left block truncate mt-0.5 text-xs"
                          >
                            {customer?.title || 'Müşteri'}
                          </button>
                          <span className="text-[11px] font-medium text-slate-600 block mt-0.5">
                            {[customer?.city, customer?.district].filter(Boolean).join(' / ')}
                          </span>
                        </div>

                        <div className="rounded-xl bg-white p-3 border-2 border-slate-200 shadow-2xs">
                          <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Cihaz & Seri No</span>
                          <span className="font-extrabold text-slate-950 block truncate mt-0.5 text-xs">
                            {device ? `${device.brand} ${device.model}` : 'Cihaz'}
                          </span>
                          <span className="text-[11px] text-slate-600 font-mono font-semibold block mt-0.5">
                            SN: {device?.serialNumber || 'Bilinmiyor'}
                          </span>
                        </div>

                        <div className="rounded-xl bg-white p-3 border-2 border-slate-200 shadow-2xs">
                          <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Yapılacak İşlem</span>
                          <span className="font-extrabold text-slate-950 block mt-0.5 text-xs">
                            {n.operationTypes.map((t) => OPERATION_TYPE_LABELS[t] || t).join(', ')}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-700 block mt-0.5">
                            Takip: {formatDateTR(n.targetDate)}
                          </span>
                        </div>

                        <div className="rounded-xl bg-white p-3 border-2 border-slate-200 shadow-2xs">
                          <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">E-posta Durumu</span>
                          {n.emailSent ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px] mt-0.5">
                              <MailCheck className="h-3.5 w-3.5 text-emerald-600" />
                              Gönderildi ({formatDateTimeTR(n.emailSentAt)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600 text-[11px] mt-0.5">
                              <MailX className="h-3.5 w-3.5 text-slate-400" />
                              {n.emailError || 'SMTP yapılandırılmadı'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    {operation && (
                      <button
                        onClick={() => onOpenOperationDetail(operation)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-extrabold transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                      >
                        İşleme Git
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {n.status === 'unread' && (
                      <button
                        onClick={() => onMarkRead(n.id)}
                        title="Okundu Olarak İşaretle"
                        className="rounded-xl border-2 border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Check className="h-4 w-4 text-emerald-600" />
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteNotification(n.id)}
                      title="Bildirimi Sil"
                      className="rounded-xl border-2 border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
