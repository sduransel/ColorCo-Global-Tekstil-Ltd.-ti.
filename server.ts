import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import {
  Customer,
  Device,
  Operation,
  Payment,
  SystemNotification,
  AppSettings,
  DatabaseSchema,
  OperationType,
  NextFollowUpConfig,
  OPERATION_TYPE_LABELS,
  MachineSale,
} from './src/types/index.ts';
import { addCalendarMonths, diffDays, formatDateTR, getTodayTR } from './src/utils/date.ts';
import { createSampleData } from './serverSampleData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

// Ensure data and upload directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for documents & photos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  recipientEmail: 'colorcoglobal@gmail.com',
  notificationDays: [30, 7, 0],
  dailyNotificationHour: 9,
  defaultCurrency: 'TRY',
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: 'ColorCo Servis Takip <colorcoglobal@gmail.com>',
  },
  emailConfigured: false,
  accessPin: '1234',
  pinRequired: false,
  lastEmailCheck: undefined,
  lastEmailLog: {
    timestamp: new Date().toISOString(),
    success: false,
    message: 'E-posta servisi henüz yapılandırılmadı. Ayarlar bölümünden SMTP bilgilerinizi girebilirsiniz.',
  },
};

// Sample data is managed modularly in serverSampleData.ts

// Database Manager
class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          customers: parsed.customers || [],
          devices: parsed.devices || [],
          operations: parsed.operations || [],
          payments: parsed.payments || [],
          notifications: parsed.notifications || [],
          machineSales: parsed.machineSales || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      } catch (err) {
        console.error('Error reading database file, creating fresh:', err);
      }
    }

    // Initialize with sample data
    const sample = createSampleData();
    const initial: DatabaseSchema = {
      customers: sample.customers,
      devices: sample.devices,
      operations: sample.operations,
      payments: sample.payments,
      machineSales: sample.machineSales,
      notifications: sample.notifications,
      settings: DEFAULT_SETTINGS,
    };
    this.save(initial);
    return initial;
  }

  public save(newData?: DatabaseSchema): void {
    if (newData) {
      this.data = newData;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public clearSampleData(): void {
    this.data.customers = this.data.customers.filter((c) => !c.isSample);
    this.data.devices = this.data.devices.filter((d) => !d.isSample);
    this.data.operations = this.data.operations.filter((o) => !o.isSample);
    this.data.machineSales = (this.data.machineSales || []).filter((s) => !s.isSample);
    const validOpIds = new Set(this.data.operations.map((o) => o.id));
    this.data.payments = this.data.payments.filter((p) => validOpIds.has(p.operationId));
    this.data.notifications = this.data.notifications.filter((n) => validOpIds.has(n.operationId) || !n.id.startsWith('notif-sale-'));
    this.save();
  }

  public seedSampleData(): void {
    this.clearSampleData();
    const sample = createSampleData();
    this.data.customers.push(...sample.customers);
    this.data.devices.push(...sample.devices);
    this.data.operations.push(...sample.operations);
    this.data.payments.push(...sample.payments);
    this.data.machineSales.push(...sample.machineSales);
    this.data.notifications.push(...sample.notifications);
    this.save();
  }
}

const db = new Database();

// Helper to check and generate notifications and send emails
async function checkDueNotifications(sendEmailIfConfigured = true) {
  const currentDb = db.get();
  const today = getTodayTR();
  const settings = currentDb.settings;
  const daysToCheck = settings.notificationDays || [30, 7, 0];

  const plannedOps = currentDb.operations.filter((o) => o.status === 'planned' && o.plannedDate);

  let newNotificationsCount = 0;
  const newNotifications: SystemNotification[] = [];

  for (const op of plannedOps) {
    const days = diffDays(op.plannedDate, today);
    const customer = currentDb.customers.find((c) => c.id === op.customerId);
    const device = currentDb.devices.find((d) => d.id === op.deviceId);

    // Check if days matches any configured alert interval (e.g. 30, 7, 0) or is overdue
    let shouldAlert = false;
    let daysBeforeAlert = days;

    if (days < 0) {
      // Overdue alert
      shouldAlert = true;
      daysBeforeAlert = days;
    } else if (daysToCheck.includes(days)) {
      shouldAlert = true;
      daysBeforeAlert = days;
    }

    if (shouldAlert) {
      // Check if we already created a notification for this op and this daysBefore bucket
      const existing = currentDb.notifications.find(
        (n) => n.operationId === op.id && n.daysBefore === daysBeforeAlert
      );

      if (!existing) {
        const opTypeNames = (op.operationTypes || [])
          .map((t) => OPERATION_TYPE_LABELS[t] || t)
          .join(', ');

        const custTitle = customer?.title || 'Bilinmeyen Müşteri';
        const location = [customer?.city, customer?.district].filter(Boolean).join(' / ');
        const devInfo = device ? `${device.brand} ${device.model} (SN: ${device.serialNumber || 'Bilinmiyor'})` : 'Cihaz';
        
        let title = '';
        if (days < 0) {
          title = `Gecikmiş İşlem: ${custTitle} (${Math.abs(days)} gün geçti)`;
        } else if (days === 0) {
          title = `Bugün Yapılacak İşlem: ${custTitle}`;
        } else {
          title = `Yaklaşan Takip: ${custTitle} (${days} gün kaldı)`;
        }

        const message = `${custTitle} firmasına ait ${devInfo} için ${opTypeNames} işlemi ${formatDateTR(op.plannedDate)} tarihinde planlanmıştır. Yetkili: ${customer?.contactName || '-'} (${customer?.phone || '-'})`;

        const newNotif: SystemNotification = {
          id: `notif-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
          operationId: op.id,
          customerId: op.customerId,
          deviceId: op.deviceId,
          operationTypes: op.operationTypes,
          targetDate: op.plannedDate,
          daysBefore: daysBeforeAlert,
          status: 'unread',
          emailSent: false,
          title,
          message,
          createdAt: new Date().toISOString(),
        };

        currentDb.notifications.unshift(newNotif);
        newNotifications.push(newNotif);
        newNotificationsCount++;
      }
    }
  }

  if (newNotificationsCount > 0) {
    db.save();
  }

  // Handle email sending if SMTP configured and recipient set
  if (sendEmailIfConfigured && settings.recipientEmail) {
    await processPendingEmails(newNotifications, settings);
  }
}

async function processPendingEmails(
  notifications: SystemNotification[],
  settings: AppSettings
) {
  if (!settings.emailConfigured || !settings.smtp?.host || !settings.smtp?.user) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    auth: {
      user: settings.smtp.user,
      pass: settings.smtp.pass,
    },
  });

  for (const notif of notifications) {
    if (notif.emailSent) continue;

    try {
      await transporter.sendMail({
        from: settings.smtp.from || settings.smtp.user,
        to: settings.recipientEmail,
        subject: `[ColorCo Servis Takip] ${notif.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">ColorCo Servis & Kalibrasyon Hatırlatması</h2>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1e293b;">${notif.title}</p>
              <p style="margin: 0; color: #475569; line-height: 1.5;">${notif.message}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Takip Tarihi:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${formatDateTR(notif.targetDate)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Yapılacak İşlem:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${notif.operationTypes.map(t => OPERATION_TYPE_LABELS[t] || t).join(', ')}</td>
              </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              Bu bildirim ColorCo Servis Takip Programı otomatik zamanlayıcısı tarafından oluşturulmuştur.
            </p>
          </div>
        `,
      });

      notif.emailSent = true;
      notif.emailSentAt = new Date().toISOString();
      notif.emailError = undefined;
    } catch (err: any) {
      console.error('Email send failed for notification:', notif.id, err);
      notif.emailSent = false;
      notif.emailError = err.message || 'Gönderim hatası';
    }
  }

  db.save();
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ----------------------------------------------------
  // API Routes
  // ----------------------------------------------------

  // Get full application data
  app.get('/api/data', (_req: Request, res: Response) => {
    res.json(db.get());
  });

  // Verify PIN
  app.post('/api/auth/verify-pin', (req: Request, res: Response) => {
    const { pin } = req.body;
    const current = db.get().settings;
    if (!current.pinRequired || pin === current.accessPin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Hatalı PIN kodu' });
    }
  });

  // Customers
  app.post('/api/customers', (req: Request, res: Response) => {
    const { title, country, city, district, email, phone, contactName, contactRole, notes } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Müşteri ünvanı zorunludur' });
    }

    const current = db.get();
    const newCustomer: Customer = {
      id: `cust-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      title: title.trim(),
      country: country?.trim() || 'Türkiye',
      city: city?.trim() || '',
      district: district?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      contactName: contactName?.trim() || '',
      contactRole: contactRole?.trim() || '',
      notes: notes?.trim() || '',
      isArchived: false,
      isSample: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    current.customers.unshift(newCustomer);
    db.save();
    res.json(newCustomer);
  });

  app.put('/api/customers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    const idx = current.customers.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Müşteri bulunamadı' });
    }

    const updated: Customer = {
      ...current.customers[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    current.customers[idx] = updated;
    db.save();
    res.json(updated);
  });

  app.post('/api/customers/:id/archive', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    const cust = current.customers.find((c) => c.id === id);
    if (!cust) return res.status(404).json({ error: 'Müşteri bulunamadı' });

    cust.isArchived = !cust.isArchived;
    cust.updatedAt = new Date().toISOString();
    db.save();
    res.json(cust);
  });

  app.delete('/api/customers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { force } = req.query;
    const current = db.get();

    // Check if customer has devices or operations
    const customerDevices = current.devices.filter((d) => d.customerId === id);
    const customerOps = current.operations.filter((o) => o.customerId === id);

    if ((customerDevices.length > 0 || customerOps.length > 0) && force !== 'true') {
      return res.status(400).json({
        error: 'Bu müşteriye bağlı cihaz veya işlem geçmişi bulunmaktadır. Lütfen arşivlemeyi tercih edin veya açık onay ile silin.',
        hasHistory: true,
        devicesCount: customerDevices.length,
        opsCount: customerOps.length,
      });
    }

    current.customers = current.customers.filter((c) => c.id !== id);
    if (force === 'true') {
      current.devices = current.devices.filter((d) => d.customerId !== id);
      const remainingOps = current.operations.filter((o) => o.customerId !== id);
      const validOpIds = new Set(remainingOps.map((o) => o.id));
      current.operations = remainingOps;
      current.payments = current.payments.filter((p) => validOpIds.has(p.operationId));
      current.notifications = current.notifications.filter((n) => validOpIds.has(n.operationId));
    }
    db.save();
    res.json({ success: true });
  });

  // Devices
  app.post('/api/devices', (req: Request, res: Response) => {
    const {
      customerId,
      deviceType,
      brand,
      model,
      serialNumber,
      operationalStatus,
      softwareModule,
      installationDate,
      notes,
    } = req.body;
    if (!customerId || !brand || !model) {
      return res.status(400).json({ error: 'Müşteri, marka ve model zorunludur' });
    }

    const current = db.get();

    // Check duplicate serial number
    if (serialNumber && serialNumber.trim()) {
      const existing = current.devices.find(
        (d) => d.serialNumber && d.serialNumber.trim().toLowerCase() === serialNumber.trim().toLowerCase()
      );
      if (existing) {
        const owner = current.customers.find((c) => c.id === existing.customerId);
        return res.status(409).json({
          warning: 'Bu seri numarası sisteme daha önce kaydedilmiş!',
          existingDevice: existing,
          existingCustomer: owner?.title || 'Bilinmeyen Müşteri',
        });
      }
    }

    const newDevice: Device = {
      id: `dev-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      customerId,
      deviceType: deviceType?.trim() || 'Masaüstü Spektrofotometre',
      brand: brand.trim(),
      model: model.trim(),
      serialNumber: serialNumber ? String(serialNumber).trim() : undefined,
      operationalStatus: operationalStatus || 'working',
      softwareModule: softwareModule?.trim() || 'ColorSuit Formulation',
      installationDate: installationDate || undefined,
      notes: notes?.trim() || '',
      status: 'active',
      isSample: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    current.devices.unshift(newDevice);
    db.save();
    res.json(newDevice);
  });

  app.put('/api/devices/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    const idx = current.devices.findIndex((d) => d.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Cihaz bulunamadı' });

    const updated: Device = {
      ...current.devices[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    current.devices[idx] = updated;
    db.save();
    res.json(updated);
  });

  app.post('/api/devices/:id/archive', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    const dev = current.devices.find((d) => d.id === id);
    if (!dev) return res.status(404).json({ error: 'Cihaz bulunamadı' });

    dev.status = dev.status === 'active' ? 'archived' : 'active';
    dev.updatedAt = new Date().toISOString();
    db.save();
    res.json(dev);
  });

  app.delete('/api/devices/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { force } = req.query;
    const current = db.get();

    const relatedOps = current.operations.filter((o) => o.deviceId === id);
    if (relatedOps.length > 0 && force !== 'true') {
      return res.status(400).json({
        error: 'Bu cihaza ait işlem kayıtları bulunmaktadır. Arşivlemeyi tercih edebilirsiniz.',
        hasHistory: true,
        opsCount: relatedOps.length,
      });
    }

    current.devices = current.devices.filter((d) => d.id !== id);
    if (force === 'true') {
      current.operations = current.operations.filter((o) => o.deviceId !== id);
    }
    db.save();
    res.json({ success: true });
  });

  // Operations
  app.post('/api/operations', (req: Request, res: Response) => {
    const {
      customerId,
      deviceId,
      operationTypes,
      plannedDate,
      actualDate,
      status,
      faultDescription,
      actionDescription,
      replacedParts,
      price,
      currency,
      paymentType,
      notes,
      attachments,
      nextFollowUps,
    } = req.body;

    if (!customerId || !deviceId || !plannedDate) {
      return res.status(400).json({ error: 'Müşteri, cihaz ve planlanan tarih zorunludur' });
    }

    if (!operationTypes || !Array.isArray(operationTypes) || operationTypes.length === 0) {
      return res.status(400).json({ error: 'En az bir işlem türü seçilmelidir' });
    }

    if (status === 'completed' && !actualDate) {
      return res.status(400).json({ error: 'Tamamlanan işlemlerde gerçekleşen işlem tarihi zorunludur' });
    }

    const current = db.get();
    const newOp: Operation = {
      id: `op-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      customerId,
      deviceId,
      operationTypes,
      plannedDate,
      actualDate: actualDate || undefined,
      status: status || 'planned',
      faultDescription: faultDescription || '',
      actionDescription: actionDescription || '',
      replacedParts: replacedParts || '',
      price: price !== undefined && price !== '' && price !== null ? Number(price) : null,
      currency: currency || current.settings.defaultCurrency || 'TRY',
      paymentType: paymentType || 'official',
      notes: notes || '',
      attachments: attachments || [],
      nextFollowUps: nextFollowUps || undefined,
      isSample: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    current.operations.unshift(newOp);

    // If marked as completed and has follow-ups configured, create next planned operation(s)
    if (newOp.status === 'completed' && nextFollowUps && newOp.actualDate) {
      handleNextFollowUpCreation(newOp, current);
    }

    db.save();
    checkDueNotifications(true).catch(console.error);
    res.json(newOp);
  });

  app.put('/api/operations/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    const idx = current.operations.findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'İşlem bulunamadı' });

    const prevOp = current.operations[idx];
    const updated: Operation = {
      ...prevOp,
      ...req.body,
      price:
        req.body.price !== undefined && req.body.price !== '' && req.body.price !== null
          ? Number(req.body.price)
          : req.body.price === null
          ? null
          : prevOp.price,
      updatedAt: new Date().toISOString(),
    };

    if (updated.status === 'completed' && !updated.actualDate) {
      return res.status(400).json({ error: 'Tamamlanan işlemlerde gerçekleşen işlem tarihi zorunludur' });
    }

    // If newly completed with follow-up settings
    if (prevOp.status !== 'completed' && updated.status === 'completed' && updated.nextFollowUps && updated.actualDate) {
      handleNextFollowUpCreation(updated, current);
    }

    current.operations[idx] = updated;
    db.save();
    checkDueNotifications(true).catch(console.error);
    res.json(updated);
  });

  // Reschedule (Erteleme) operation
  app.post('/api/operations/:id/reschedule', (req: Request, res: Response) => {
    const { id } = req.params;
    const { newDate, reason } = req.body;
    if (!newDate) return res.status(400).json({ error: 'Yeni tarih zorunludur' });

    const current = db.get();
    const op = current.operations.find((o) => o.id === id);
    if (!op) return res.status(404).json({ error: 'İşlem bulunamadı' });

    op.rescheduledFrom = op.plannedDate;
    op.rescheduledReason = reason || 'Kullanıcı erteleme talebi';
    op.plannedDate = newDate;
    op.updatedAt = new Date().toISOString();

    // Cancel / remove old pending notifications for this operation
    current.notifications = current.notifications.filter((n) => n.operationId !== id);

    db.save();
    checkDueNotifications(true).catch(console.error);
    res.json(op);
  });

  // Complete operation directly
  app.post('/api/operations/:id/complete', (req: Request, res: Response) => {
    const { id } = req.params;
    const { actualDate, actionDescription, replacedParts, nextFollowUps } = req.body;
    if (!actualDate) return res.status(400).json({ error: 'Gerçekleşen tarih zorunludur' });

    const current = db.get();
    const op = current.operations.find((o) => o.id === id);
    if (!op) return res.status(404).json({ error: 'İşlem bulunamadı' });

    op.status = 'completed';
    op.actualDate = actualDate;
    if (actionDescription) op.actionDescription = actionDescription;
    if (replacedParts) op.replacedParts = replacedParts;
    if (nextFollowUps) op.nextFollowUps = nextFollowUps;
    op.updatedAt = new Date().toISOString();

    if (nextFollowUps) {
      handleNextFollowUpCreation(op, current);
    }

    db.save();
    checkDueNotifications(true).catch(console.error);
    res.json(op);
  });

  app.delete('/api/operations/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    current.operations = current.operations.filter((o) => o.id !== id);
    current.payments = current.payments.filter((p) => p.operationId !== id);
    current.notifications = current.notifications.filter((n) => n.operationId !== id);
    db.save();
    res.json({ success: true });
  });

  // Payments (Tahsilatlar)
  app.post('/api/operations/:id/payments', (req: Request, res: Response) => {
    const { id } = req.params;
    const { date, amount, note } = req.body;
    const numAmount = Number(amount);
    if (!date || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Geçerli bir tarih ve pozitif tutar giriniz' });
    }

    const current = db.get();
    const op = current.operations.find((o) => o.id === id);
    if (!op) return res.status(404).json({ error: 'İşlem bulunamadı' });

    const newPayment: Payment = {
      id: `pay-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      operationId: id,
      customerId: op.customerId,
      date,
      amount: numAmount,
      currency: op.currency,
      note: note?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    current.payments.unshift(newPayment);
    db.save();
    res.json(newPayment);
  });

  app.delete('/api/payments/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    current.payments = current.payments.filter((p) => p.id !== id);
    db.save();
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // Machine Sales (Satılan Makineler) Routes
  // ----------------------------------------------------
  app.get('/api/sales', (_req: Request, res: Response) => {
    const current = db.get();
    const today = getTodayTR();
    const sales = (current.machineSales || []).map((sale) => {
      const days = diffDays(sale.firstCalibrationDueDate, today);
      let status: 'overdue' | 'due_soon' | 'upcoming';
      if (days < 0) {
        status = 'overdue';
      } else if (days <= 45) {
        status = 'due_soon';
      } else {
        status = 'upcoming';
      }
      return {
        ...sale,
        calibrationStatus: status,
      };
    });
    res.json(sales);
  });

  app.post('/api/sales', (req: Request, res: Response) => {
    const { customerId, deviceId, saleDate, price, currency, paymentType, notes } = req.body;
    if (!customerId || !deviceId || !saleDate) {
      return res.status(400).json({ error: 'Müşteri, cihaz ve satış tarihi zorunludur' });
    }

    const current = db.get();
    const [y, m, d] = saleDate.split('-');
    const firstDueDate = `${parseInt(y, 10) + 1}-${m}-${d}`;
    const today = getTodayTR();
    const days = diffDays(firstDueDate, today);

    let calibrationStatus: 'overdue' | 'due_soon' | 'upcoming';
    if (days < 0) {
      calibrationStatus = 'overdue';
    } else if (days <= 45) {
      calibrationStatus = 'due_soon';
    } else {
      calibrationStatus = 'upcoming';
    }

    const newSale: MachineSale = {
      id: `sale-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      customerId,
      deviceId,
      saleDate,
      price: Number(price) || 0,
      currency: currency || 'EUR',
      paymentType: paymentType || 'unofficial',
      notes: notes?.trim() || '',
      firstCalibrationDueDate: firstDueDate,
      calibrationStatus,
      isSample: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!current.machineSales) current.machineSales = [];
    current.machineSales.unshift(newSale);

    const cust = current.customers.find((c) => c.id === customerId);
    const dev = current.devices.find((d) => d.id === deviceId);

    if (calibrationStatus === 'overdue') {
      const overdueDays = Math.abs(days);
      current.notifications.unshift({
        id: `notif-sale-overdue-${newSale.id}`,
        operationId: newSale.id,
        customerId: newSale.customerId,
        deviceId: newSale.deviceId,
        operationTypes: ['calibration'],
        targetDate: newSale.firstCalibrationDueDate,
        daysBefore: days,
        status: 'unread',
        emailSent: false,
        title: `⚠️ 1. Yıl Kalibrasyon Vadesi Geçti: ${cust?.title || 'Müşteri'}`,
        message: `${cust?.title} firmasına ${formatDateTR(saleDate)} tarihinde kurulan ${dev?.brand} ${dev?.model} cihazının 1. yıl kalibrasyonu ${formatDateTR(firstDueDate)} tarihinde dolmuştur (${overdueDays} gün gecikti).`,
        createdAt: new Date().toISOString(),
      });
    }

    db.save();
    res.json(newSale);
  });

  app.put('/api/sales/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    const sale = (current.machineSales || []).find((s) => s.id === id);
    if (!sale) return res.status(404).json({ error: 'Satış kaydı bulunamadı' });

    const { saleDate, price, currency, paymentType, notes, deviceId, customerId } = req.body;
    if (saleDate) {
      sale.saleDate = saleDate;
      const [y, m, d] = saleDate.split('-');
      sale.firstCalibrationDueDate = `${parseInt(y, 10) + 1}-${m}-${d}`;
    }
    if (price !== undefined) sale.price = Number(price) || 0;
    if (currency) sale.currency = currency;
    if (paymentType) sale.paymentType = paymentType;
    if (notes !== undefined) sale.notes = notes;
    if (deviceId) sale.deviceId = deviceId;
    if (customerId) sale.customerId = customerId;

    const today = getTodayTR();
    const days = diffDays(sale.firstCalibrationDueDate, today);
    if (days < 0) {
      sale.calibrationStatus = 'overdue';
    } else if (days <= 45) {
      sale.calibrationStatus = 'due_soon';
    } else {
      sale.calibrationStatus = 'upcoming';
    }
    sale.updatedAt = new Date().toISOString();

    db.save();
    res.json(sale);
  });

  app.delete('/api/sales/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    current.machineSales = (current.machineSales || []).filter((s) => s.id !== id);
    current.notifications = current.notifications.filter((n) => !n.id.includes(id));
    db.save();
    res.json({ success: true });
  });

  // Notifications
  app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    const notif = current.notifications.find((n) => n.id === id);
    if (notif) {
      notif.status = 'read';
      db.save();
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/mark-all-read', (_req: Request, res: Response) => {
    const current = db.get();
    current.notifications.forEach((n) => (n.status = 'read'));
    db.save();
    res.json({ success: true });
  });

  app.delete('/api/notifications/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const current = db.get();
    current.notifications = current.notifications.filter((n) => n.id !== id);
    db.save();
    res.json({ success: true });
  });

  app.delete('/api/notifications', (_req: Request, res: Response) => {
    const current = db.get();
    current.notifications = [];
    db.save();
    res.json({ success: true });
  });

  // File Upload
  app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenemedi' });
    }

    const attachment = {
      id: `att-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      type: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    res.json(attachment);
  });

  // Batch Import (Toplu Aktarım)
  app.post('/api/import', (req: Request, res: Response) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Aktarılacak geçerli kayıt bulunamadı' });
    }

    const current = db.get();
    let addedCustomers = 0;
    let addedDevices = 0;
    let updatedCustomers = 0;
    let skipped = 0;

    for (const row of items) {
      const title = row.title?.trim();
      if (!title) {
        skipped++;
        continue;
      }

      // Check if customer already exists by exact title match (case insensitive)
      let customer = current.customers.find(
        (c) => c.title.toLowerCase().trim() === title.toLowerCase()
      );

      if (!customer) {
        customer = {
          id: `cust-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          title,
          country: row.country?.trim() || 'Türkiye',
          city: row.city?.trim() || '',
          district: row.district?.trim() || '',
          email: row.email?.trim() || '',
          phone: row.phone?.trim() || '',
          contactName: row.contactName?.trim() || '',
          contactRole: row.contactRole?.trim() || '',
          notes: row.notes?.trim() || '',
          isArchived: false,
          isSample: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        current.customers.push(customer);
        addedCustomers++;
      } else {
        // Do not erase existing data with blank cells
        if (!customer.city && row.city) customer.city = row.city.trim();
        if (!customer.district && row.district) customer.district = row.district.trim();
        if (!customer.phone && row.phone) customer.phone = row.phone.trim();
        if (!customer.email && row.email) customer.email = row.email.trim();
        if (!customer.contactName && row.contactName) customer.contactName = row.contactName.trim();
        if (!customer.contactRole && row.contactRole) customer.contactRole = row.contactRole.trim();
        customer.updatedAt = new Date().toISOString();
        updatedCustomers++;
      }

      // If device data exists in row
      if (row.brand || row.model || row.deviceType) {
        const brand = row.brand?.trim() || 'Genel';
        const model = row.model?.trim() || 'Model';
        const serialNumber = row.serialNumber !== undefined ? String(row.serialNumber).trim() : '';

        // Check if device with same serial number already exists
        let exists = false;
        if (serialNumber) {
          exists = current.devices.some(
            (d) => d.serialNumber && d.serialNumber.toLowerCase() === serialNumber.toLowerCase()
          );
        }

        if (!exists) {
          const newDev: Device = {
            id: `dev-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
            customerId: customer.id,
            deviceType: row.deviceType?.trim() || 'Masaüstü Spektrofotometre',
            brand,
            model,
            serialNumber: serialNumber || undefined,
            operationalStatus: row.operationalStatus || 'working',
            softwareModule: row.softwareModule || 'ColorSuit Formulation',
            installationDate: row.installationDate || undefined,
            notes: row.deviceNotes?.trim() || '',
            status: 'active',
            isSample: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          current.devices.push(newDev);
          addedDevices++;
        }
      }
    }

    db.save();
    res.json({
      success: true,
      addedCustomers,
      addedDevices,
      updatedCustomers,
      skipped,
    });
  });

  // Settings
  app.get('/api/settings', (_req: Request, res: Response) => {
    res.json(db.get().settings);
  });

  app.post('/api/settings', (req: Request, res: Response) => {
    const current = db.get();
    current.settings = {
      ...current.settings,
      ...req.body,
    };
    db.save();
    res.json(current.settings);
  });

  // Test Email
  app.post('/api/settings/test-email', async (req: Request, res: Response) => {
    const { smtp, recipientEmail } = req.body;
    const targetEmail = recipientEmail || db.get().settings.recipientEmail;

    if (!smtp?.host || !smtp?.user || !smtp?.pass) {
      const errMessage = 'SMTP sunucu adresi, kullanıcı adı ve şifresi eksik!';
      db.get().settings.lastEmailLog = {
        timestamp: new Date().toISOString(),
        success: false,
        message: errMessage,
      };
      db.save();
      return res.status(400).json({ success: false, error: errMessage });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: Number(smtp.port) || 587,
        secure: Boolean(smtp.secure),
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      });

      // Verify connection
      await transporter.verify();

      // Send test email
      await transporter.sendMail({
        from: smtp.from || smtp.user,
        to: targetEmail,
        subject: '[ColorCo Servis Takip] Test Bildirimi Başarılı',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
            <h2 style="color: #065f46; margin-top: 0;">✓ E-posta Bağlantısı Başarılı</h2>
            <p style="color: #334155; line-height: 1.6;">
              Tebrikler! ColorCo Servis Takip Programı e-posta bildirim sistemi başarıyla çalışmaktadır.
            </p>
            <p style="color: #64748b; font-size: 14px;">
              Periyodik bakım ve kalibrasyon takip bildirimleri tarayıcınız kapalıyken de bu adrese gönderilecektir.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
              Tarih: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
            </p>
          </div>
        `,
      });

      db.get().settings.emailConfigured = true;
      db.get().settings.lastEmailLog = {
        timestamp: new Date().toISOString(),
        success: true,
        message: `Test e-postası ${targetEmail} adresine başarıyla gönderildi.`,
      };
      db.save();

      res.json({ success: true, message: `Test e-postası ${targetEmail} adresine başarıyla iletildi.` });
    } catch (err: any) {
      console.error('SMTP test failure:', err);
      const errMsg = err.message || 'SMTP sunucusuna bağlanılamadı';
      db.get().settings.emailConfigured = false;
      db.get().settings.lastEmailLog = {
        timestamp: new Date().toISOString(),
        success: false,
        message: 'Gönderim başarısız oldu: ' + errMsg,
      };
      db.save();
      res.status(500).json({ success: false, error: errMsg });
    }
  });

  // Backup & Restore
  app.get('/api/export/backup', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=colorco-backup-${getTodayTR()}.json`
    );
    res.send(JSON.stringify(db.get(), null, 2));
  });

  app.post('/api/export/restore', (req: Request, res: Response) => {
    const backupData = req.body;
    if (!backupData || !Array.isArray(backupData.customers) || !Array.isArray(backupData.devices)) {
      return res.status(400).json({ error: 'Geçersiz yedek dosyası biçimi' });
    }

    db.save({
      customers: backupData.customers || [],
      devices: backupData.devices || [],
      operations: backupData.operations || [],
      payments: backupData.payments || [],
      notifications: backupData.notifications || [],
      settings: { ...DEFAULT_SETTINGS, ...(backupData.settings || {}) },
      machineSales: backupData.machineSales || [],
    });

    res.json({ success: true });
  });

  // Clear & Seed Sample Data
  app.post('/api/clear-sample-data', (_req: Request, res: Response) => {
    db.clearSampleData();
    res.json({ success: true });
  });

  app.post('/api/seed-sample-data', (_req: Request, res: Response) => {
    db.seedSampleData();
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // Helper for generating next follow-up planned operations
  // ----------------------------------------------------
  function handleNextFollowUpCreation(op: Operation, currentDb: DatabaseSchema) {
    if (!op.nextFollowUps || !op.actualDate) return;

    for (const [typeKey, config] of Object.entries(op.nextFollowUps) as [OperationType, NextFollowUpConfig][]) {
      if (!config || config.interval === 'none') continue;

      let nextDate = '';
      if (config.interval === '3_months') {
        nextDate = addCalendarMonths(op.actualDate, 3);
      } else if (config.interval === '6_months') {
        nextDate = addCalendarMonths(op.actualDate, 6);
      } else if (config.interval === '1_year') {
        nextDate = addCalendarMonths(op.actualDate, 12);
      } else if (config.interval === 'custom_months' && config.customMonths) {
        nextDate = addCalendarMonths(op.actualDate, config.customMonths);
      } else if (config.interval === 'manual_date' && config.manualDate) {
        nextDate = config.manualDate;
      }

      if (!nextDate) continue;

      // Prevent duplicate planned operations for same device, same operation type and same date
      const alreadyExists = currentDb.operations.some(
        (existing) =>
          existing.deviceId === op.deviceId &&
          existing.status === 'planned' &&
          existing.plannedDate === nextDate &&
          existing.operationTypes.includes(typeKey)
      );

      if (!alreadyExists) {
        const typeLabel = OPERATION_TYPE_LABELS[typeKey] || typeKey;
        const newPlannedOp: Operation = {
          id: `op-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
          customerId: op.customerId,
          deviceId: op.deviceId,
          operationTypes: [typeKey],
          plannedDate: nextDate,
          status: 'planned',
          faultDescription: `Periyodik ${typeLabel} takibi (${formatDateTR(op.actualDate)} tarihli işlemin devamı)`,
          actionDescription: '',
          price: null, // Critical requirement: Do not copy previous price or payments!
          currency: op.currency,
          paymentType: op.paymentType,
          notes: `Önceki işlem referansı: ${formatDateTR(op.actualDate)}`,
          isSample: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        currentDb.operations.unshift(newPlannedOp);
      }
    }
  }

  // ----------------------------------------------------
  // Mount Vite or Serve Static Production Files
  // ----------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Periodic notification checker (runs every 5 minutes in background)
  setInterval(() => {
    checkDueNotifications(true).catch((err) => console.error('Background check error:', err));
  }, 5 * 60 * 1000);

  // Run initial check on startup
  setTimeout(() => {
    checkDueNotifications(false).catch(console.error);
  }, 2000);

  app.listen(PORT, () => {
    console.log(`ColorCo Servis Takip Programı sunucusu çalışıyor: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
