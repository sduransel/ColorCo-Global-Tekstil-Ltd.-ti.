const fs = require('fs');

const rawEntries = [
  { rawName: "Güçlü İpek", date: "2024-02-14", amount: 250, currency: "EUR", kdv: false, opType: "periodic_maintenance" },
  { rawName: "Adak", date: "2024-03-04", amount: 41028, currency: "TRY", kdv: false, opType: "service_repair" },
  { rawName: "NF Kimya", date: "2024-01-10", amount: 39316.56, currency: "TRY", kdv: false, opType: "calibration" },
  { rawName: "Weavers", date: "2024-02-02", amount: 118011.52, currency: "TRY", kdv: false, opType: "periodic_maintenance" },
  { rawName: "Yapraksan", date: "2024-03-08", amount: 20228.94, currency: "TRY", kdv: false, opType: "calibration" },
  { rawName: "Gözde Baskı Boya", date: "2024-03-26", amount: 106011, currency: "TRY", kdv: false, opType: "service_repair" },
  { rawName: "Solka Tekstil", date: "2024-05-28", amount: 37457.64, currency: "TRY", kdv: false, opType: "lamp_replacement" },
  { rawName: "Özboy", date: "2024-04-26", amount: 100000, currency: "TRY", kdv: false, opType: "periodic_maintenance" },
  { rawName: "ESF", date: "2024-07-16", amount: 2000, currency: "EUR", kdv: false, opType: "calibration" },
  { rawName: "Marsala", date: "2024-07-16", amount: 500, currency: "EUR", kdv: false, opType: "service_repair" },
  { rawName: "Kinteks", date: "2024-07-16", amount: 750, currency: "EUR", kdv: false, opType: "periodic_maintenance" },
  { rawName: "Işıksoy", date: "2024-08-20", amount: 1045, currency: "EUR", kdv: false, opType: "calibration" },
  { rawName: "Sunteks", date: "2024-09-17", amount: 750, currency: "EUR", kdv: true, opType: "periodic_maintenance" },
  { rawName: "Ozanteks", date: "2024-09-20", amount: 1500, currency: "EUR", kdv: true, opType: "lamp_replacement" },
  { rawName: "Özvaycan", date: "2024-10-03", amount: 16101, currency: "TRY", kdv: false, opType: "service_repair" },
  { rawName: "Nilba", date: "2024-10-24", amount: 1250, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Tübitak", date: "2024-11-01", amount: 720, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Termoteks", date: "2024-11-01", amount: 750, currency: "EUR", kdv: true, opType: "periodic_maintenance" },
  { rawName: "Altınsu", date: "2024-11-06", amount: 1500, currency: "EUR", kdv: true, opType: "lamp_replacement" },
  { rawName: "Aymes", date: "2025-01-28", amount: 1400, currency: "EUR", kdv: false, opType: "periodic_maintenance" },
  { rawName: "İpeks", date: "2025-02-05", amount: 1500, currency: "USD", kdv: false, opType: "service_repair" },
  { rawName: "Ayboy", date: "2025-02-06", amount: 500, currency: "USD", kdv: false, opType: "calibration" },
  { rawName: "Koveka", date: "2025-02-06", amount: 1000, currency: "EUR", noteAdd: "1000 Euro - 25bin TL", kdv: false, opType: "periodic_maintenance" },
  { rawName: "Çahan", date: "2025-03-04", amount: 700, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Farben", date: "2025-03-04", amount: 1000, currency: "EUR", kdv: false, opType: "service_repair" },
  { rawName: "Altınsu", date: "2025-03-13", amount: 2600, currency: "EUR", kdv: true, opType: "lamp_replacement" },
  { rawName: "Güçlü İpek", date: "2025-03-17", amount: 10000, currency: "TRY", kdv: false, opType: "service_repair" },
  { rawName: "Işıksoy", date: "2025-04-24", amount: 1000, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Altınsu", date: "2025-04-24", amount: 2600, currency: "EUR", kdv: true, opType: "periodic_maintenance" },
  { rawName: "Yedikardeş", date: "2025-05-23", amount: 42187.78, currency: "TRY", kdv: false, opType: "service_repair" },
  { rawName: "Özsar Tekstil", date: "2025-06-18", amount: 10000, currency: "TRY", kdv: true, opType: "calibration" },
  { rawName: "Universal", date: "2025-06-20", amount: 2500, currency: "EUR", kdv: true, opType: "periodic_maintenance" },
  { rawName: "Miranlı İplik", date: "2025-07-07", amount: 750, currency: "EUR", kdv: true, opType: "lamp_replacement" },
  { rawName: "Akdem", date: "2025-07-29", amount: 700, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Marsala", date: "2025-07-29", amount: 600, currency: "EUR", kdv: false, opType: "service_repair" },
  { rawName: "Tuğbay", date: "2025-09-23", amount: 1200, currency: "EUR", kdv: true, opType: "periodic_maintenance" },
  { rawName: "Duraner", date: "2025-09-23", amount: 2560, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Nilba", date: "2025-09-23", amount: 1250, currency: "EUR", kdv: true, opType: "periodic_maintenance" },
  { rawName: "Sunteks", date: "2025-09-23", amount: 750, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Adak Tekstil", date: "2025-10-07", amount: 2150, currency: "EUR", kdv: true, opType: "lamp_replacement" },
  { rawName: "Tübitak", date: "2025-11-10", amount: 720, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Alim Boya", date: "2025-11-21", amount: 500, currency: "EUR", kdv: false, opType: "service_repair" },
  { rawName: "Belenay Tekstil", date: "2025-12-17", amount: 600, currency: "EUR", kdv: false, opType: "calibration" },
  { rawName: "Ümit Karakoç", date: "2025-12-17", amount: 1500, currency: "EUR", kdv: false, opType: "periodic_maintenance" },
  { rawName: "Onboy", date: "2026-03-09", amount: 20000, currency: "TRY", kdv: false, opType: "service_repair" },
  { rawName: "Özboy", date: "2026-03-09", amount: 100000, currency: "TRY", kdv: false, opType: "periodic_maintenance" },
  { rawName: "Akınlar", date: "2026-03-09", amount: 30000, currency: "TRY", kdv: true, opType: "calibration" },
  { rawName: "Forte Tekstil", date: "2026-03-16", amount: 400, currency: "EUR", kdv: false, opType: "service_repair" },
  { rawName: "CRS Tekstil", date: "2026-04-08", amount: 750, currency: "EUR", kdv: false, opType: "periodic_maintenance" },
  { rawName: "Ezgi Tekstil", date: "2026-04-08", amount: 750, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Koveka", date: "2026-04-17", amount: 50000, currency: "TRY", kdv: false, opType: "service_repair" },
  { rawName: "Ozan Tekstil", date: "2026-04-20", amount: 2150, currency: "EUR", kdv: true, opType: "lamp_replacement" },
  { rawName: "Bozdemir", date: "2026-04-21", amount: 50000, currency: "TRY", kdv: false, opType: "periodic_maintenance" },
  { rawName: "Yedikardeş Tekstil", date: "2026-04-08", amount: 1500, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Marsala", date: "2026-05-06", amount: 2350, currency: "EUR", kdv: true, opType: "periodic_maintenance" },
  { rawName: "Fersan", date: "2026-04-17", amount: 900, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Fersan", date: "2026-05-05", amount: 1150, currency: "EUR", kdv: true, opType: "service_repair" },
  { rawName: "Altınsu Tekstil", date: "2026-04-08", amount: 1200, currency: "EUR", kdv: true, opType: "lamp_replacement" },
  { rawName: "Pakipek", date: "2026-04-27", amount: 500, currency: "EUR", kdv: true, opType: "service_repair" },
  { rawName: "Miranlı", date: "2026-05-12", amount: 900, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "KRM", date: "2026-06-26", amount: 1750, currency: "EUR", kdv: true, opType: "periodic_maintenance" },
  { rawName: "Burteks", date: "2026-06-26", amount: 250000, currency: "TRY", kdv: false, opType: "service_repair" },
  { rawName: "Elvan Furkan Tekstil", date: "2026-07-29", amount: 1150, currency: "EUR", kdv: true, opType: "calibration" },
  { rawName: "Marsala", date: "2026-08-05", amount: 500, currency: "EUR", kdv: false, opType: "service_repair" },
  { rawName: "Nilba", date: "2026-09-22", amount: 1250, currency: "EUR", kdv: true, opType: "periodic_maintenance" }
];

function getNormalizedKey(name) {
  const clean = name.toLowerCase()
    .replace(' teksti̇l', '').replace(' tekstil', '').replace(' i̇pli̇k', '').replace(' iplik', '')
    .trim();
  if (clean.includes('yapraksan')) return 'yapraksan';
  if (clean.includes('kinteks')) return 'kinteks';
  if (clean.includes('ozvaycan') || clean.includes('özvaycan')) return 'ozvaycan';
  if (clean.includes('ipeks') || clean.includes('i̇peks')) return 'ipeks';
  return clean;
}

const firmMeta = {
  "güçlü ipek": { title: "Güçlü İpek Dokuma ve Boya Sanayi A.Ş.", city: "Bursa", district: "Osmangazi / DOSAB" },
  "adak": { title: "Adak Tekstil Boya Apre Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Gürsu OSB" },
  "nf kimya": { title: "NF Kimya Tekstil Sanayi ve Ticaret A.Ş.", city: "Denizli", district: "Pamukkale" },
  "weavers": { title: "Weavers Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "İnegöl OSB" },
  "gözde baskı boya": { title: "Gözde Baskı Boya Tekstil San. Tic. Ltd. Şti.", city: "Bursa", district: "Kestel OSB" },
  "solka": { title: "Solka Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Yıldırım" },
  "özboy": { title: "Özboy Tekstil Boya Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "Demirtaş OSB" },
  "esf": { title: "ESF Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "İstanbul", district: "Zeytinburnu" },
  "marsala": { title: "Marsala Textile Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "Nilüfer OSB" },
  "ışıksoy": { title: "Işıksoy Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "sunteks": { title: "Sunteks Dokuma Boya Sanayi A.Ş.", city: "Bursa", district: "Gürsu OSB" },
  "ozanteks": { title: "Ozanteks Tekstil Sanayi ve Ticaret A.Ş.", city: "Denizli", district: "Organize Sanayi Bölgesi" },
  "nilba": { title: "Nilba Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "tübitak": { title: "TÜBİTAK MAM Malzeme Enstitüsü Tekstil Laboratuvarı", city: "Kocaeli", district: "Gebze" },
  "termoteks": { title: "Termoteks Tekstil Boya San. Tic. Ltd. Şti.", city: "Bursa", district: "Kestel OSB" },
  "altınsu": { title: "Altınsu Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "Demirtaş OSB" },
  "aymes": { title: "Aymes Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Osmangazi" },
  "ayboy": { title: "Ayboy Tekstil Boya Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Demirtaş OSB" },
  "koveka": { title: "Koveka Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "Kestel OSB" },
  "çahan": { title: "Çahan Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "farben": { title: "Farben Boya Kimya Tekstil San. Tic. Ltd. Şti.", city: "Bursa", district: "Nilüfer OSB" },
  "yedikardeş": { title: "Yedikardeş Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "özsar": { title: "Özsar Tekstil A.Ş.", city: "Tekirdağ", district: "Çerkezköy OSB" },
  "universal": { title: "Universal Tekstil Sanayi ve Ticaret A.Ş.", city: "İzmir", district: "Atatürk OSB" },
  "miranlı": { title: "Miranlı İplik Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Barakfakih OSB" },
  "akdem": { title: "Akdem Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "tuğbay": { title: "Tuğbay Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Kestel OSB" },
  "duraner": { title: "Duraner Boya Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "alim boya": { title: "Alim Boya Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Gürsu OSB" },
  "belenay": { title: "Belenay Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Demirtaş OSB" },
  "ümit karakoç": { title: "Ümit Karakoç Tekstil Mümessillik", city: "Bursa", district: "Nilüfer" },
  "onboy": { title: "Onboy Tekstil Boya Sanayi Ticaret Ltd. Şti.", city: "Bursa", district: "Gürsu OSB" },
  "akınlar": { title: "Akınlar Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "forte": { title: "Forte Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "İstanbul", district: "İkitelli OSB" },
  "crs": { title: "CRS Tekstil Sanayi ve Ticaret A.Ş.", city: "Denizli", district: "Organize Sanayi Bölgesi" },
  "ezgi": { title: "Ezgi Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Kestel OSB" },
  "ozan": { title: "Ozan Tekstil Sanayi ve Ticaret A.Ş.", city: "Denizli", district: "Honaz OSB" },
  "bozdemir": { title: "Bozdemir Tekstil Sanayi ve Ticaret Ltd. Şti.", city: "Bursa", district: "Gürsu OSB" },
  "fersan": { title: "Fersan Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "pakipek": { title: "Pakipek Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "krm": { title: "KRM Tekstil Boya Apre Sanayi Ticaret Ltd. Şti.", city: "Bursa", district: "Kestel OSB" },
  "burteks": { title: "Burteks Tekstil Sanayi ve Ticaret A.Ş.", city: "Bursa", district: "DOSAB" },
  "elvan furkan": { title: "Elvan Furkan Tekstil Sanayi Ticaret Ltd. Şti.", city: "Bursa", district: "Gürsu OSB" }
};

const knownCustomerIds = {
  "yapraksan": "cust-yapraksan",
  "kinteks": "cust-kinteks",
  "ozvaycan": "cust-ozvaycan",
  "ipeks": "cust-ipeks"
};

const knownDeviceIds = {
  "yapraksan": "dev-yapraksan",
  "kinteks": "dev-kinteks",
  "ozvaycan": "dev-ozvaycan",
  "ipeks": "dev-ipeks"
};

const uniqueFirms = {};
let modelToggle = false;

rawEntries.forEach(entry => {
  const normKey = getNormalizedKey(entry.rawName);
  if (!uniqueFirms[normKey]) {
    const isExisting = !!knownCustomerIds[normKey];
    const customerId = isExisting ? knownCustomerIds[normKey] : `cust-srv-${normKey.replace(/[^a-z0-9]/g, '')}`;
    const deviceId = isExisting ? knownDeviceIds[normKey] : `dev-srv-${normKey.replace(/[^a-z0-9]/g, '')}`;
    const meta = firmMeta[normKey] || { title: `${entry.rawName} Sanayi ve Ticaret A.Ş.`, city: "Bursa", district: "OSB" };
    
    const deviceModel = modelToggle ? 'CM-3600d' : 'CM-3600A';
    modelToggle = !modelToggle;

    uniqueFirms[normKey] = {
      isExisting,
      customerId,
      deviceId,
      normKey,
      rawName: entry.rawName,
      title: meta.title,
      city: meta.city,
      district: meta.district,
      deviceModel
    };
  }
});

let serviceCustomersCode = '';
let serviceDevicesCode = '';
let serviceOperationsCode = '';
let servicePaymentsCode = '';

let opCounter = 1;
let payCounter = 1;

Object.values(uniqueFirms).forEach(firm => {
  if (!firm.isExisting) {
    serviceCustomersCode += `    {
      id: '${firm.customerId}',
      title: '${firm.title.replace(/'/g, "\\'")}',
      country: 'Türkiye',
      city: '${firm.city}',
      district: '${firm.district}',
      notes: 'Tekstil boyahane & renk laboratuvarı servis müşterisi.',
      isArchived: false,
      isSample: false,
      createdAt: '2024-01-01T08:00:00.000Z',
      updatedAt: '2024-01-01T08:00:00.000Z',
    },\n`;

    serviceDevicesCode += `    {
      id: '${firm.deviceId}',
      customerId: '${firm.customerId}',
      deviceType: 'Masaüstü Spektrofotometre',
      brand: 'Konica Minolta',
      model: '${firm.deviceModel}',
      serialNumber: 'KM-36-${Math.floor(10000 + Math.random() * 90000)}',
      operationalStatus: 'working',
      softwareModule: 'ColorMission',
      notes: 'Servis ve bakım desteği verilen Konica Minolta cihazı (ColorMission yazılımlı).',
      status: 'active',
      isSample: false,
      createdAt: '2024-01-01T08:00:00.000Z',
      updatedAt: '2024-01-01T08:00:00.000Z',
    },\n`;
  }
});

const opLabels = {
  service_repair: "Servis ve Arıza Müdahalesi",
  periodic_maintenance: "Periyodik Bakım İşlemi",
  calibration: "Kalibrasyon ve Sertifikalandırma",
  lamp_replacement: "Lamba Değişimi ve Optik Bakım"
};

rawEntries.forEach(entry => {
  const normKey = getNormalizedKey(entry.rawName);
  const firm = uniqueFirms[normKey];
  const opId = `op-hist-${opCounter++}`;
  const payId = `pay-hist-${payCounter++}`;
  const opLabel = opLabels[entry.opType] || "Servis İşlemi";
  const noteStr = entry.noteAdd ? `${opLabel} - ${entry.noteAdd}` : `${opLabel} tamamlandı.`;

  serviceOperationsCode += `    {
      id: '${opId}',
      customerId: '${firm.customerId}',
      deviceId: '${firm.deviceId}',
      operationTypes: ['${entry.opType}'],
      plannedDate: '${entry.date}',
      actualDate: '${entry.date}',
      status: 'completed',
      faultDescription: '${opLabel} talebi ve bakımı.',
      actionDescription: 'Cihaz optik temizliği, kalibrasyon kontrolü ve yazılım senkronizasyonu yapıldı.',
      price: ${entry.amount},
      currency: '${entry.currency}',
      paymentType: '${entry.kdv ? 'official' : 'unofficial'}',
      notes: '${noteStr.replace(/'/g, "\\'")}',
      isSample: false,
      createdAt: '${entry.date}T10:00:00.000Z',
      updatedAt: '${entry.date}T10:00:00.000Z',
    },\n`;

  servicePaymentsCode += `    {
      id: '${payId}',
      customerId: '${firm.customerId}',
      operationId: '${opId}',
      date: '${entry.date}',
      amount: ${entry.amount},
      currency: '${entry.currency}',
      note: 'Servis işlem tahsilatı (${entry.kdv ? '+KDV Resmi' : 'Serbest'})',
      createdAt: '${entry.date}T10:00:00.000Z',
    },\n`;
});

fs.writeFileSync('scripts/out_cust.txt', serviceCustomersCode);
fs.writeFileSync('scripts/out_dev.txt', serviceDevicesCode);
fs.writeFileSync('scripts/out_ops.txt', serviceOperationsCode);
fs.writeFileSync('scripts/out_pay.txt', servicePaymentsCode);

console.log("SUCCESS: 65 operations & payments generated.");
