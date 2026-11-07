import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Mail,
  Clock,
  DollarSign,
  Shield,
  Download,
  Upload,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  Database,
  Sparkles,
} from 'lucide-react';
import { AppSettings, Currency } from '../types';
import { api } from '../services/api';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  hasSampleData: boolean;
  onClearSampleData: () => Promise<void>;
  onSeedSampleData: () => Promise<void>;
  onRestoreBackup: (data: any) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  hasSampleData,
  onClearSampleData,
  onSeedSampleData,
  onRestoreBackup,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(settings.recipientEmail || 'colorcoglobal@gmail.com');
  const [notificationDaysStr, setNotificationDaysStr] = useState(
    (settings.notificationDays || [30, 7, 0]).join(', ')
  );
  const [dailyHour, setDailyHour] = useState(settings.dailyNotificationHour ?? 9);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(settings.defaultCurrency || 'TRY');

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState(settings.smtp?.host || '');
  const [smtpPort, setSmtpPort] = useState(String(settings.smtp?.port || 587));
  const [smtpSecure, setSmtpSecure] = useState(Boolean(settings.smtp?.secure));
  const [smtpUser, setSmtpUser] = useState(settings.smtp?.user || '');
  const [smtpPass, setSmtpPass] = useState(settings.smtp?.pass || '');
  const [smtpFrom, setSmtpFrom] = useState(settings.smtp?.from || '');

  // PIN settings
  const [pinRequired, setPinRequired] = useState(Boolean(settings.pinRequired));
  const [accessPin, setAccessPin] = useState(settings.accessPin || '1234');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setRecipientEmail(settings.recipientEmail || 'colorcoglobal@gmail.com');
    setNotificationDaysStr((settings.notificationDays || [30, 7, 0]).join(', '));
    setDailyHour(settings.dailyNotificationHour ?? 9);
    setDefaultCurrency(settings.defaultCurrency || 'TRY');
    setSmtpHost(settings.smtp?.host || '');
    setSmtpPort(String(settings.smtp?.port || 587));
    setSmtpSecure(Boolean(settings.smtp?.secure));
    setSmtpUser(settings.smtp?.user || '');
    setSmtpPass(settings.smtp?.pass || '');
    setSmtpFrom(settings.smtp?.from || '');
    setPinRequired(Boolean(settings.pinRequired));
    setAccessPin(settings.accessPin || '1234');
  }, [settings]);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const parsedDays = notificationDaysStr
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    try {
      await onUpdateSettings({
        recipientEmail: recipientEmail.trim(),
        notificationDays: parsedDays.length > 0 ? parsedDays : [30, 7, 0],
        dailyNotificationHour: Number(dailyHour),
        defaultCurrency,
        pinRequired,
        accessPin: accessPin.trim() || '1234',
        smtp: {
          host: smtpHost.trim(),
          port: Number(smtpPort) || 587,
          secure: smtpSecure,
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
          from: smtpFrom.trim() || `ColorCo Servis Takip <${recipientEmail.trim()}>`,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Ayarlar kaydedilirken hata oluştu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestResult(null);

    const payload = {
      recipientEmail: recipientEmail.trim(),
      smtp: {
        host: smtpHost.trim(),
        port: Number(smtpPort) || 587,
        secure: smtpSecure,
        user: smtpUser.trim(),
        pass: smtpPass.trim(),
        from: smtpFrom.trim() || smtpUser.trim(),
      },
    };

    try {
      const res = await api.sendTestEmail(payload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'E-posta testi başarısız oldu.',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  // Restore file picker
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (confirm('Yedek dosyasını geri yüklemek istediğinize emin misiniz? Mevcut veriler güncellenecektir.')) {
          await onRestoreBackup(json);
          alert('Yedek başarıyla geri yüklendi!');
        }
      } catch (err: any) {
        alert('Geçersiz yedek dosyası: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Ayarlar başarıyla kaydedildi ve uygulandı.</span>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* 1. Email Notifications Card */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-2xs">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-950">
                  Otomatik E-posta Bildirim Ayarları
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Uygulama veya tarayıcı kapalıyken sunucu tarafından otomatik gönderilecek e-postalar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="text-slate-500">Durum:</span>
              {settings.emailConfigured ? (
                <span className="text-emerald-950 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg font-extrabold">
                  ✓ Bağlantı Aktif
                </span>
              ) : (
                <span className="text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg font-extrabold">
                  Yapılandırma Bekleniyor
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bildirimlerin Gönderileceği E-posta Adresim <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="colorcoglobal@gmail.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Müşterilere hiçbir zaman e-posta gönderilmez; yalnızca sizin bu adresinize hatırlatma gelir.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kaç Gün Önce Hatırlatılsın? (Virgülle ayırın)
              </label>
              <input
                type="text"
                value={notificationDaysStr}
                onChange={(e) => setNotificationDaysStr(e.target.value)}
                placeholder="30, 7, 0"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Varsayılan: 30 gün önce, 7 gün önce ve takip gününde (0).
              </span>
            </div>
          </div>

          {/* SMTP Configuration Sub-box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                SMTP Sunucu Bağlantı Bilgileri
              </span>
              <span className="text-[11px] text-slate-500">
                E-postaların sunucudan gönderilebilmesi için gereklidir
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Sunucu Host
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com / mail.colorco.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Port</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587 veya 465"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Kullanıcı Adı / E-posta
                </label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="colorcoglobal@gmail.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Şifre / Uygulama Şifresi
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span>Güvenli SSL/TLS (Port 465 için açık, Port 587 için kapalı tutun)</span>
              </label>

              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail || !smtpHost || !smtpUser}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Send className="h-3 w-3 text-slate-600" />
                {testingEmail ? 'Gönderiliyor...' : 'Test Bildirimi Gönder'}
              </button>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`rounded-lg p-3 text-xs border ${
                  testResult.success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <strong>{testResult.success ? '✓ Test Başarılı: ' : '✗ Test Başarısız: '}</strong>
                {testResult.message}
              </div>
            )}

            {settings.lastEmailLog && (
              <div className="text-[11px] text-slate-500 pt-1">
                Son sistem durumu: {settings.lastEmailLog.message}
              </div>
            )}
          </div>
        </div>

        {/* 2. System Defaults & Preferences */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-2xs">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-950">
                Sistem Tercihleri ve Para Birimi
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Varsayılan para birimi ve günlük bildirim kontrol zamanı
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1.5 uppercase tracking-wider text-[11px]">
                Varsayılan Para Birimi
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value as Currency)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-950 font-bold focus:border-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="TRY">Türk Lirası (TRY - ₺)</option>
                <option value="USD">Amerikan Doları (USD - $)</option>
                <option value="EUR">Euro (EUR - €)</option>
                <option value="GBP">İngiliz Sterlini (GBP - £)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1.5 uppercase tracking-wider text-[11px]">
                Günlük Bildirim Gönderim Saati (Europe/Istanbul)
              </label>
              <select
                value={dailyHour}
                onChange={(e) => setDailyHour(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-950 font-bold focus:border-blue-600 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Security & Access PIN */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-2xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-950">
                Güvenli Erişim ve Giriş Kilidi
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Uygulama açılışında yönetici PIN kodu koruması
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-900 cursor-pointer">
              <input
                type="checkbox"
                checked={pinRequired}
                onChange={(e) => setPinRequired(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Uygulama açılışında PIN Kodu Kilidini Aktif Et</span>
            </label>

            {pinRequired && (
              <div className="max-w-xs pt-1">
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5 uppercase tracking-wider text-[11px]">
                  Yönetici PIN Kodu
                </label>
                <input
                  type="text"
                  value={accessPin}
                  onChange={(e) => setAccessPin(e.target.value)}
                  placeholder="1234"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-950 focus:border-blue-600 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button for Form */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-7 py-3 text-xs font-extrabold text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {saving ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}
          </button>
        </div>
      </form>

      {/* 4. Database, Backup and Sample Data Management */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-2xs">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-950">
              Veri Yönetimi, Yedekleme ve Örnek Veriler
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              Tüm müşteri, cihaz, işlem ve tahsilat kayıtlarını dışa aktarma veya geri yükleme
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Download Backup */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Kalıcı Veritabanı Yedeği</h4>
            <p className="text-[11px] text-slate-500">
              Sistemdeki tüm kayıtları JSON dosyası olarak bilgisayarınıza indirin.
            </p>
            <a
              href="/api/export/backup"
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Yedek Dosyasını İndir (.json)
            </a>
          </div>

          {/* Restore Backup */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Yedekten Geri Yükle</h4>
            <p className="text-[11px] text-slate-500">
              Daha önce aldığınız bir yedek dosyasını seçerek kayıtları yükleyin.
            </p>
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
              <Upload className="h-3.5 w-3.5 text-slate-600" />
              Yedek Dosyası Seç (.json)
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Sample Data Controls */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-slate-800">
              Örnek Demo Veriler {hasSampleData ? '(Şu an aktif)' : '(Temizlenmiş)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasSampleData ? (
              <button
                type="button"
                onClick={onClearSampleData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Örnek Verileri Temizle
              </button>
            ) : (
              <button
                type="button"
                onClick={onSeedSampleData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Örnek Verileri Yeniden Yükle
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
