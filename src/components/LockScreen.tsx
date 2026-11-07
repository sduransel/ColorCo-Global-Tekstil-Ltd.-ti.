import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Lütfen erişim PIN kodunu giriniz.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const ok = await onUnlock(pin);
      if (!ok) {
        setError('Hatalı PIN kodu! Lütfen tekrar deneyiniz.');
      }
    } catch {
      setError('Giriş doğrulaması sırasında bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Brand Logo */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative h-14 w-48 mb-3 overflow-hidden">
            <img
              src="/assets/aistudio/Colorco_Global_Logo-PNG_Format_86e4231a.png"
              alt="ColorCo Global"
              className="h-full w-full object-contain scale-150 transform origin-center"
            />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Satış & Servis Takip Programı
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Güvenli Yönetici Girişi
          </p>
        </div>

        {/* Lock Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Yönetici PIN Kodu
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN kodunu giriniz (Varsayılan: 1234)"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Yalnızca yetkili ColorCo personeli içindir.</span>
        </div>
      </div>
    </div>
  );
};
