export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type PaymentType = 'official' | 'unofficial'; // Resmi / Gayriresmi

export type OperationType = 
  | 'service_repair' 
  | 'periodic_maintenance' 
  | 'lamp_replacement' 
  | 'calibration';

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  service_repair: 'Servis / Arıza Müdahalesi',
  periodic_maintenance: 'Periyodik Bakım',
  lamp_replacement: 'Lamba Değişimi',
  calibration: 'Kalibrasyon',
};

export type OperationStatus = 'planned' | 'completed' | 'cancelled';

export type FollowUpInterval = 
  | 'none'
  | '3_months' 
  | '6_months' 
  | '1_year' 
  | 'custom_months' 
  | 'manual_date';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Customer {
  id: string;
  title: string; // Müşteri / firma ünvanı (zorunlu)
  country: string; // Varsayılan: Türkiye
  city: string; // İl (veya serbest metin)
  district: string; // İlçe (veya bölge)
  email?: string;
  phone?: string;
  contactName?: string; // Yetkili kişinin adı soyadı
  contactRole?: string; // Yetkili kişinin görevi
  notes?: string;
  isArchived: boolean;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DeviceOperationalStatus = 'working' | 'not_working' | 'other';

export const DEVICE_OPERATIONAL_STATUS_LABELS: Record<DeviceOperationalStatus, string> = {
  working: 'Çalışıyor',
  not_working: 'Çalışmıyor',
  other: 'Diğer',
};

export const STANDARD_BRANDS = ['Konica Minolta', 'X-rite', 'Datacolor', 'Diğer'];
export const STANDARD_MODELS = ['CM-3600d', 'CM-3600A', 'CM-36d', 'CM-36dG', 'CM-36dGV', 'Diğer'];
export const STANDARD_SOFTWARE_MODULES = [
  'ColorSuit Formulation',
  'ColorSuit QC',
  'ColorMission',
  'Diğer',
];

export interface Device {
  id: string;
  customerId: string;
  deviceType: string; // Cihaz türü (örn: Spektrofotometre, Işık Kabini)
  brand: string; // Marka (Konica Minolta, X-rite, Datacolor, Diğer)
  model: string; // Model (CM-3600d, CM-3600A, CM-36d, CM-36dG, CM-36dGV, Diğer)
  serialNumber?: string; // Seri numarası (metin, baştaki sıfırları korur)
  operationalStatus?: DeviceOperationalStatus; // Çalışıyor / Çalışmıyor / Diğer
  softwareModule?: string; // ColorSuit Formulation / ColorSuit QC / vb.
  installationDate?: string; // Kurulum tarihi (GG.AA.YYYY / YYYY-MM-DD)
  notes?: string;
  status: 'active' | 'archived';
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  operationId: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: Currency;
  note?: string;
  createdAt: string;
}

export interface NextFollowUpConfig {
  interval: FollowUpInterval;
  customMonths?: number;
  manualDate?: string;
  targetDate?: string; // Hesaplanmış sonraki tarih
}

export interface Operation {
  id: string;
  customerId: string;
  deviceId: string;
  operationTypes: OperationType[];
  plannedDate: string; // Planlanan işlem tarihi (YYYY-MM-DD)
  actualDate?: string; // Gerçekleşen işlem tarihi (Tamamlananlarda zorunlu)
  status: OperationStatus;
  faultDescription?: string; // Arıza / talep açıklaması
  actionDescription?: string; // Yapılan işlem açıklaması
  replacedParts?: string; // Değiştirilen parça
  price?: number | null; // null: Fiyat girilmedi, 0: Ücretsiz işlem, >0: tutar
  currency: Currency;
  paymentType: PaymentType; // Resmi / Gayriresmi
  notes?: string;
  attachments?: Attachment[];
  nextFollowUps?: Record<OperationType, NextFollowUpConfig>;
  rescheduledFrom?: string; // Erteleme geçmişi
  rescheduledReason?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemNotification {
  id: string;
  operationId: string;
  customerId: string;
  deviceId: string;
  operationTypes: OperationType[];
  targetDate: string; // Takip tarihi
  daysBefore: number; // 30, 7, 0, veya negatif (gecikti)
  status: 'unread' | 'read';
  emailSent: boolean;
  emailSentAt?: string;
  emailError?: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface AppSettings {
  recipientEmail: string;
  notificationDays: number[]; // Örn: [30, 7, 0]
  dailyNotificationHour: number; // Örn: 9 (09:00)
  defaultCurrency: Currency;
  smtp: SmtpConfig;
  emailConfigured: boolean;
  accessPin: string; // Güvenli giriş PIN kodu
  pinRequired: boolean;
  lastEmailCheck?: string;
  lastEmailLog?: {
    timestamp: string;
    success: boolean;
    message: string;
    details?: string;
  };
}

export interface MachineSale {
  id: string;
  customerId: string;
  deviceId: string;
  saleDate: string; // YYYY-MM-DD (İlk kuruluş tarihi)
  price: number;
  currency: Currency;
  paymentType: PaymentType; // 'official' (+KDV) | 'unofficial' (Gayriresmi)
  condition?: 'new' | 'second_hand'; // Sıfır | 2. El
  notes?: string;
  firstCalibrationDueDate: string; // saleDate + 1 year
  calibrationStatus: 'overdue' | 'due_soon' | 'upcoming';
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  customers: Customer[];
  devices: Device[];
  operations: Operation[];
  payments: Payment[];
  notifications: SystemNotification[];
  settings: AppSettings;
  machineSales: MachineSale[];
}

export interface FinancialSummaryByCurrency {
  currency: Currency;
  totalPrice: number;
  totalCollected: number;
  remainingAmount: number;
  operationCount: number;
}
