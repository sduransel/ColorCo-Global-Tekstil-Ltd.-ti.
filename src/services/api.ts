import {
  Customer,
  Device,
  Operation,
  Payment,
  SystemNotification,
  AppSettings,
  DatabaseSchema,
  Attachment,
  MachineSale,
} from '../types';

export const api = {
  async getData(): Promise<DatabaseSchema> {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('Veriler yüklenirken hata oluştu');
    return res.json();
  },

  async verifyPin(pin: string): Promise<boolean> {
    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return res.ok;
  },

  // Customers
  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Müşteri eklenemedi');
    }
    return res.json();
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Müşteri güncellenemedi');
    }
    return res.json();
  },

  async toggleArchiveCustomer(id: string): Promise<Customer> {
    const res = await fetch(`/api/customers/${id}/archive`, { method: 'POST' });
    if (!res.ok) throw new Error('Arşivleme işlemi başarısız');
    return res.json();
  },

  async deleteCustomer(id: string, force = false): Promise<{ success: boolean }> {
    const res = await fetch(`/api/customers/${id}?force=${force}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      const customErr: any = new Error(err.error || 'Müşteri silinemedi');
      customErr.hasHistory = err.hasHistory;
      customErr.devicesCount = err.devicesCount;
      customErr.opsCount = err.opsCount;
      throw customErr;
    }
    return res.json();
  },

  // Devices
  async createDevice(device: Partial<Device>): Promise<Device> {
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
    if (res.status === 409) {
      const data = await res.json();
      const customErr: any = new Error(data.warning);
      customErr.warning = data.warning;
      customErr.existingDevice = data.existingDevice;
      customErr.existingCustomer = data.existingCustomer;
      throw customErr;
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Cihaz eklenemedi');
    }
    return res.json();
  },

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
    const res = await fetch(`/api/devices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Cihaz güncellenemedi');
    }
    return res.json();
  },

  async toggleArchiveDevice(id: string): Promise<Device> {
    const res = await fetch(`/api/devices/${id}/archive`, { method: 'POST' });
    if (!res.ok) throw new Error('Cihaz arşivleme işlemi başarısız');
    return res.json();
  },

  async deleteDevice(id: string, force = false): Promise<{ success: boolean }> {
    const res = await fetch(`/api/devices/${id}?force=${force}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      const customErr: any = new Error(err.error || 'Cihaz silinemedi');
      customErr.hasHistory = err.hasHistory;
      customErr.opsCount = err.opsCount;
      throw customErr;
    }
    return res.json();
  },

  // Operations
  async createOperation(op: Partial<Operation>): Promise<Operation> {
    const res = await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(op),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'İşlem eklenemedi');
    }
    return res.json();
  },

  async updateOperation(id: string, updates: Partial<Operation>): Promise<Operation> {
    const res = await fetch(`/api/operations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'İşlem güncellenemedi');
    }
    return res.json();
  },

  async rescheduleOperation(id: string, newDate: string, reason?: string): Promise<Operation> {
    const res = await fetch(`/api/operations/${id}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDate, reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'İşlem ertelenemedi');
    }
    return res.json();
  },

  async completeOperation(
    id: string,
    data: {
      actualDate: string;
      actionDescription?: string;
      replacedParts?: string;
      nextFollowUps?: any;
    }
  ): Promise<Operation> {
    const res = await fetch(`/api/operations/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'İşlem tamamlanamadı');
    }
    return res.json();
  },

  async deleteOperation(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/operations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('İşlem silinemedi');
    return res.json();
  },

  // Payments
  async addPayment(
    operationId: string,
    payment: { date: string; amount: number; note?: string }
  ): Promise<Payment> {
    const res = await fetch(`/api/operations/${operationId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Tahsilat eklenemedi');
    }
    return res.json();
  },

  async deletePayment(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Tahsilat silinemedi');
    return res.json();
  },

  // Machine Sales
  async getSales(): Promise<MachineSale[]> {
    const res = await fetch('/api/sales');
    if (!res.ok) throw new Error('Satış kayıtları yüklenemedi');
    return res.json();
  },

  async createSale(sale: Partial<MachineSale>): Promise<MachineSale> {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Satış kaydı eklenemedi');
    }
    return res.json();
  },

  async updateSale(id: string, updates: Partial<MachineSale>): Promise<MachineSale> {
    const res = await fetch(`/api/sales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Satış kaydı güncellenemedi');
    }
    return res.json();
  },

  async deleteSale(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Satış kaydı silinemedi');
    return res.json();
  },

  // Notifications
  async markNotificationRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
  },

  async deleteNotification(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
  },

  async clearAllNotifications(): Promise<void> {
    await fetch('/api/notifications', { method: 'DELETE' });
  },

  // File Upload
  async uploadFile(file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Dosya yüklenemedi');
    }
    return res.json();
  },

  // Batch Import
  async batchImport(items: any[]): Promise<{
    addedCustomers: number;
    addedDevices: number;
    updatedCustomers: number;
    skipped: number;
  }> {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Aktarım başarısız oldu');
    }
    return res.json();
  },

  // Settings & Email
  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Ayarlar kaydedilemedi');
    return res.json();
  },

  async sendTestEmail(payload: { smtp: any; recipientEmail: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/settings/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Test e-postası gönderilemedi');
    }
    return data;
  },

  // Backup & Restore
  async restoreBackup(data: any): Promise<void> {
    const res = await fetch('/api/export/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Yedek geri yüklenemedi');
    }
  },

  async clearSampleData(): Promise<void> {
    const res = await fetch('/api/clear-sample-data', { method: 'POST' });
    if (!res.ok) throw new Error('Örnek veriler temizlenemedi');
  },

  async seedSampleData(): Promise<void> {
    const res = await fetch('/api/seed-sample-data', { method: 'POST' });
    if (!res.ok) throw new Error('Örnek veriler yüklenemedi');
  },
};
