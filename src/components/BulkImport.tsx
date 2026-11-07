import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Building2,
  Cpu,
  FileCheck,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Customer, Device } from '../types';
import { api } from '../services/api';

interface BulkImportProps {
  customers: Customer[];
  devices: Device[];
  onImportComplete: () => void;
}

interface ColumnMapping {
  title: string;
  country: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  contactName: string;
  contactRole: string;
  notes: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  operationalStatus: string;
  softwareModule: string;
  deviceNotes: string;
}

export const BulkImport: React.FC<BulkImportProps> = ({
  customers,
  devices,
  onImportComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Column mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    title: '',
    country: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    contactName: '',
    contactRole: '',
    notes: '',
    deviceType: '',
    brand: '',
    model: '',
    serialNumber: '',
    installationDate: '',
    operationalStatus: '',
    softwareModule: '',
    deviceNotes: '',
  });

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    addedCustomers: number;
    addedDevices: number;
    updatedCustomers: number;
    skipped: number;
  } | null>(null);

  // Generate and Download Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Müşteri Ünvanı': 'Örnek Ambalaj Sanayi A.Ş.',
        'Ülke': 'Türkiye',
        'İl': 'İstanbul',
        'İlçe': 'Esenyurt',
        'Telefon': '0212 875 00 00',
        'E-posta': 'kalite@ornekambalaj.com',
        'Yetkili Kişi': 'Ali Kaya',
        'Yetkili Görevi': 'Laboratuvar Müdürü',
        'Müşteri Notları': 'Yıllık bakım sözleşmeli',
        'Cihaz Türü': 'Masaüstü Spektrofotometre',
        'Marka': 'Konica Minolta',
        'Model': 'CM-36d',
        'Seri Numarası': '1004819',
        'Cihaz Durumu': 'Çalışıyor',
        'Yazılım Modülü': 'ColorSuit Formulation',
        'Kurulum Tarihi': '2024-05-15',
        'Cihaz Notları': 'Baskı hazırlık laboratuvarı',
      },
      {
        'Müşteri Ünvanı': 'Seherboy Tekstil Boyama Sanayi',
        'Ülke': 'Türkiye',
        'İl': 'Tekirdağ',
        'İlçe': 'Ergene / Velimeşe OSB',
        'Telefon': '0282 674 52 31',
        'E-posta': 'info@seherboy.com',
        'Yetkili Kişi': 'Metin Seher',
        'Yetkili Görevi': 'Boyahane Müdürü',
        'Müşteri Notları': '',
        'Cihaz Türü': 'Masaüstü Spektrofotometre',
        'Marka': 'Konica Minolta',
        'Model': 'CM-36dG',
        'Seri Numarası': '1002341',
        'Cihaz Durumu': 'Çalışıyor',
        'Yazılım Modülü': 'ColorSuit Formulation',
        'Kurulum Tarihi': '2023-11-20',
        'Cihaz Notları': 'Entegre parlaklık (gloss) sensörlü',
      },
      {
        'Müşteri Ünvanı': 'Yapraksan Sentetik Dokuma A.Ş.',
        'Ülke': 'Türkiye',
        'İl': 'İstanbul',
        'İlçe': 'Tuzla / İTOSB',
        'Telefon': '0216 593 12 50',
        'E-posta': 'kalite@yapraksan.com',
        'Yetkili Kişi': 'Gülşah Yaprak',
        'Yetkili Görevi': 'Kalite Güvence Lideri',
        'Müşteri Notları': 'QC kalite kontrol lisansı',
        'Cihaz Türü': 'Masaüstü Spektrofotometre',
        'Marka': 'Konica Minolta',
        'Model': 'CM-36d',
        'Seri Numarası': '1006520',
        'Cihaz Durumu': 'Çalışıyor',
        'Yazılım Modülü': 'ColorSuit QC',
        'Kurulum Tarihi': '2024-02-10',
        'Cihaz Notları': 'Masterbatch giriş kalite kontrol',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteri ve Cihazlar');
    XLSX.writeFile(wb, 'ColorCo_Musteri_Cihaz_Aktarim_Sablonu.xlsx');
  };

  // Handle File Upload and Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        // Parse raw string values to preserve leading zeros in serial numbers
        const wb = XLSX.read(bstr, { type: 'binary', raw: false });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];

        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!data || data.length === 0) {
          alert('Dosya boş görünüyor.');
          return;
        }

        const headers = (data[0] || []).map((h: any) => String(h || '').trim());
        const rows = data.slice(1).filter((r) => r.some((c: any) => c !== '' && c !== null));

        setRawHeaders(headers);
        setRawRows(rows);

        // Auto-detect mappings
        const findHeader = (candidates: string[]) => {
          return headers.find((h) => candidates.some((c) => h.toLowerCase().includes(c.toLowerCase()))) || '';
        };

        setMapping({
          title: findHeader(['ünvan', 'unvan', 'müşteri', 'musteri', 'firma', 'şirket', 'name']),
          country: findHeader(['ülke', 'ulke', 'country']),
          city: findHeader(['il', 'şehir', 'sehir', 'city']),
          district: findHeader(['ilçe', 'ilce', 'bölge', 'district']),
          phone: findHeader(['telefon', 'tel', 'phone', 'gsm']),
          email: findHeader(['e-posta', 'eposta', 'email', 'mail']),
          contactName: findHeader(['yetkili', 'kişi', 'kisi', 'kontak', 'contact']),
          contactRole: findHeader(['görev', 'gorev', 'ünvan', 'pozisyon', 'title', 'role']),
          notes: findHeader(['müşteri not', 'firma not', 'notlar', 'aciklama', 'notes']),
          deviceType: findHeader(['cihaz türü', 'tür', 'tur', 'tip', 'type']),
          brand: findHeader(['marka', 'brand', 'üretici']),
          model: findHeader(['model']),
          serialNumber: findHeader(['seri no', 'seri', 'sn', 'serial']),
          installationDate: findHeader(['kurulum', 'tarih', 'installation']),
          operationalStatus: findHeader(['cihaz durum', 'çalışma', 'calisma', 'durum', 'operasyon', 'status']),
          softwareModule: findHeader(['yazılım', 'yazilim', 'modül', 'modul', 'colorsuit', 'software', 'lisans']),
          deviceNotes: findHeader(['cihaz not', 'cihaz açıklama']),
        });

        setStep(2);
      } catch (err: any) {
        alert('Dosya okunurken bir hata oluştu: ' + (err.message || 'Geçersiz dosya'));
      }
    };

    reader.readAsBinaryString(file);
  };

  // Map row array to parsed object
  const getMappedRow = (row: any[]) => {
    const getValue = (colName: string) => {
      const idx = rawHeaders.indexOf(colName);
      if (idx === -1) return '';
      return String(row[idx] || '').trim();
    };

    return {
      title: getValue(mapping.title),
      country: getValue(mapping.country) || 'Türkiye',
      city: getValue(mapping.city),
      district: getValue(mapping.district),
      phone: getValue(mapping.phone),
      email: getValue(mapping.email),
      contactName: getValue(mapping.contactName),
      contactRole: getValue(mapping.contactRole),
      notes: getValue(mapping.notes),
      deviceType: getValue(mapping.deviceType) || 'Spektrofotometre',
      brand: getValue(mapping.brand),
      model: getValue(mapping.model),
      serialNumber: getValue(mapping.serialNumber),
      installationDate: getValue(mapping.installationDate),
      operationalStatus: getValue(mapping.operationalStatus) || 'working',
      softwareModule: getValue(mapping.softwareModule) || 'ColorSuit Formulation',
      deviceNotes: getValue(mapping.deviceNotes),
    };
  };

  // Preview validation items
  const previewItems = rawRows.map((r, i) => {
    const mapped = getMappedRow(r);
    const hasTitle = Boolean(mapped.title);
    const existingCust = customers.find(
      (c) => c.title.toLowerCase().trim() === mapped.title.toLowerCase().trim()
    );
    const hasDevice = Boolean(mapped.brand || mapped.model || mapped.serialNumber);
    const duplicateSerial = mapped.serialNumber
      ? devices.some(
          (d) => d.serialNumber && d.serialNumber.toLowerCase() === mapped.serialNumber.toLowerCase()
        )
      : false;

    return {
      index: i + 1,
      mapped,
      hasTitle,
      existingCust,
      hasDevice,
      duplicateSerial,
    };
  });

  const validItems = previewItems.filter((p) => p.hasTitle).map((p) => p.mapped);

  // Execute Import
  const handleExecuteImport = async () => {
    if (validItems.length === 0) {
      alert('Aktarılacak geçerli kayıt bulunamadı.');
      return;
    }

    setImporting(true);
    try {
      const result = await api.batchImport(validItems);
      setImportResult(result);
      setStep(4);
      onImportComplete();
    } catch (err: any) {
      alert('Aktarım sırasında hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Excel / CSV Dosyasından Toplu Müşteri ve Cihaz Aktarımı
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mevcut listelerinizi yükleyin, sütunları eşleştirin ve tek tıkla sisteme aktarın.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap self-start sm:self-center"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            Örnek Excel Şablonunu İndir
          </button>
        </div>

        {/* Stepper Wizard Progress */}
        <div className="mt-6 grid grid-cols-4 gap-2 text-xs">
          {[
            { stepNum: 1, title: '1. Dosya Yükle' },
            { stepNum: 2, title: '2. Sütun Eşleştir' },
            { stepNum: 3, title: '3. Önizleme ve Doğrulama' },
            { stepNum: 4, title: '4. Aktarım Sonucu' },
          ].map((s) => (
            <div
              key={s.stepNum}
              className={`rounded-lg p-2.5 text-center font-semibold transition-colors ${
                step === s.stepNum
                  ? 'bg-slate-900 text-white'
                  : step > s.stepNum
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {s.title}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload File */}
      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-2xs text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700 mb-4">
            <FileSpreadsheet className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Excel veya CSV Dosyanızı Seçin</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            .xlsx, .xls veya .csv uzantılı müşteri listesini yükleyin. Seri numaralarındaki baştaki sıfırlar korunacaktır.
          </p>

          <div className="mt-6 flex justify-center">
            <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs">
              <Upload className="h-4 w-4" />
              Dosya Seç ve Başla
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Sütun Eşleştirme ({fileName})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dosyanızdaki sütun başlıklarını uygulama alanlarıyla eşleştirin.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Farklı Dosya Seç
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Customer Fields Group */}
            <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Building2 className="h-4 w-4 text-slate-700" />
                Müşteri Alanları
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Müşteri / Firma Ünvanı <span className="text-red-500">* (Zorunlu)</span>
                </label>
                <select
                  value={mapping.title}
                  onChange={(e) => setMapping({ ...mapping, title: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                >
                  <option value="">(Seçilmedi)</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">İl / Şehir</label>
                  <select
                    value={mapping.city}
                    onChange={(e) => setMapping({ ...mapping, city: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">İlçe / Bölge</label>
                  <select
                    value={mapping.district}
                    onChange={(e) => setMapping({ ...mapping, district: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
                  <select
                    value={mapping.phone}
                    onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-posta</label>
                  <select
                    value={mapping.email}
                    onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yetkili Kişi</label>
                  <select
                    value={mapping.contactName}
                    onChange={(e) => setMapping({ ...mapping, contactName: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yetkili Görevi</label>
                  <select
                    value={mapping.contactRole}
                    onChange={(e) => setMapping({ ...mapping, contactRole: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Device Fields Group */}
            <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Cpu className="h-4 w-4 text-slate-700" />
                Cihaz Alanları (İsteğe bağlı)
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cihaz Türü</label>
                <select
                  value={mapping.deviceType}
                  onChange={(e) => setMapping({ ...mapping, deviceType: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                >
                  <option value="">(Seçilmedi)</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Marka</label>
                  <select
                    value={mapping.brand}
                    onChange={(e) => setMapping({ ...mapping, brand: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                  <select
                    value={mapping.model}
                    onChange={(e) => setMapping({ ...mapping, model: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Seri Numarası</label>
                  <select
                    value={mapping.serialNumber}
                    onChange={(e) => setMapping({ ...mapping, serialNumber: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kurulum Tarihi</label>
                  <select
                    value={mapping.installationDate}
                    onChange={(e) => setMapping({ ...mapping, installationDate: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Seçilmedi)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cihaz Durumu</label>
                  <select
                    value={mapping.operationalStatus}
                    onChange={(e) => setMapping({ ...mapping, operationalStatus: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Varsayılan: Çalışıyor)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yazılım / Lisans Modülü</label>
                  <select
                    value={mapping.softwareModule}
                    onChange={(e) => setMapping({ ...mapping, softwareModule: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">(Varsayılan: ColorSuit Formulation)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Geri
            </button>
            <button
              disabled={!mapping.title}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 shadow-2xs"
            >
              Önizlemeye Geç
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview and Validation */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 p-5 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Kayıtların Önizlemesi ({previewItems.length} Satır)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {validItems.length} geçerli kayıt aktarılmaya hazır. Eksik veya mükerrer kayıtlar işaretlenmiştir.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(2)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Eşleştirmeyi Değiştir
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing || validItems.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 shadow-2xs"
              >
                {importing ? 'Aktarılıyor...' : `${validItems.length} Kaydı Sisteme Aktar`}
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3">Müşteri Ünvanı</th>
                  <th className="py-2.5 px-3">Konum</th>
                  <th className="py-2.5 px-3">İletişim</th>
                  <th className="py-2.5 px-3">Cihaz</th>
                  <th className="py-2.5 px-3">Cihaz Durumu</th>
                  <th className="py-2.5 px-3">Yazılım Modülü</th>
                  <th className="py-2.5 px-3">Seri No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewItems.map((item) => {
                  return (
                    <tr
                      key={item.index}
                      className={item.hasTitle ? 'hover:bg-slate-50' : 'bg-red-50/30'}
                    >
                      <td className="py-2 px-3 text-slate-400 font-mono">{item.index}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {!item.hasTitle ? (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                            Eksik Ünvan
                          </span>
                        ) : item.existingCust ? (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            Mevcut Müşteri
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Yeni Müşteri
                          </span>
                        )}
                        {item.duplicateSerial && (
                          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Seri No Zaten Var
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {item.mapped.title || <span className="italic text-red-500">Boş</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {[item.mapped.city, item.mapped.district].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                        {item.mapped.phone || item.mapped.email || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        {item.mapped.brand || item.mapped.model ? (
                          `${item.mapped.brand} ${item.mapped.model}`
                        ) : (
                          <span className="text-slate-400">Cihaz yok</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {item.hasDevice ? (
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              item.mapped.operationalStatus === 'not_working' || String(item.mapped.operationalStatus).toLowerCase().includes('çalışmıyor')
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.mapped.operationalStatus === 'not_working' || String(item.mapped.operationalStatus).toLowerCase().includes('çalışmıyor')
                              ? 'Çalışmıyor'
                              : 'Çalışıyor'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {item.hasDevice ? (
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200">
                            {item.mapped.softwareModule || 'ColorSuit Formulation'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {item.mapped.serialNumber || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 4: Import Complete Summary */}
      {step === 4 && importResult && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-2xs text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Toplu Aktarım Başarıyla Tamamlandı</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Veriler kalıcı veritabanına işlenmiştir. Sayfayı yenileseniz de kayıtlar korunur.
          </p>

          <div className="mx-auto max-w-sm grid grid-cols-2 gap-3 pt-3 text-left">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block">Eklenen Yeni Müşteri</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {importResult.addedCustomers}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block">Eklenen Cihaz</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {importResult.addedDevices}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block">Güncellenen Müşteri</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {importResult.updatedCustomers}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block">Atlanan Kayıt</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {importResult.skipped}
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setStep(1);
                setRawRows([]);
                setRawHeaders([]);
                setImportResult(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Yeni Bir Liste Aktar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
