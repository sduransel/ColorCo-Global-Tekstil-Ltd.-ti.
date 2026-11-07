import React, { useState, useEffect, useCallback } from 'react';
import { NavSection, Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LockScreen } from './components/LockScreen';
import { Overview } from './components/Overview';
import { Customers } from './components/Customers';
import { CustomerDetail } from './components/CustomerDetail';
import { CustomerModal } from './components/CustomerModal';
import { Devices } from './components/Devices';
import { DeviceModal } from './components/DeviceModal';
import { CalendarView } from './components/CalendarView';
import { Notifications } from './components/Notifications';
import { BulkImport } from './components/BulkImport';
import { Settings } from './components/Settings';
import { OperationModal } from './components/OperationModal';
import { PaymentModal } from './components/PaymentModal';
import { MachineSales } from './components/MachineSales';
import { SaleModal } from './components/SaleModal';
import { Reports } from './components/Reports';
import {
  Customer,
  Device,
  Operation,
  Payment,
  SystemNotification,
  AppSettings,
  DatabaseSchema,
  MachineSale,
  OperationType,
} from './types';
import { api } from './services/api';

export default function App() {
  const [data, setData] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Security Lock
  const [isLocked, setIsLocked] = useState(false);

  // Mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null);
  const [defaultCustomerIdForDevice, setDefaultCustomerIdForDevice] = useState<string | undefined>(undefined);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<MachineSale | null>(null);

  const [operationModalOpen, setOperationModalOpen] = useState(false);
  const [operationToEdit, setOperationToEdit] = useState<Operation | null>(null);
  const [defaultCustomerIdForOp, setDefaultCustomerIdForOp] = useState<string | undefined>(undefined);
  const [defaultDeviceIdForOp, setDefaultDeviceIdForOp] = useState<string | undefined>(undefined);
  const [defaultPlannedDateForOp, setDefaultPlannedDateForOp] = useState<string | undefined>(undefined);
  const [defaultOperationTypeForOp, setDefaultOperationTypeForOp] = useState<OperationType | undefined>(undefined);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [operationForPayment, setOperationForPayment] = useState<Operation | null>(null);

  // Fetch / Refresh data from server
  const loadData = useCallback(async () => {
    try {
      const result = await api.getData();
      setData(result);

      // Check pin requirement
      if (result.settings?.pinRequired) {
        const unlocked = sessionStorage.getItem('colorco_unlocked');
        if (unlocked !== 'true') {
          setIsLocked(true);
        }
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle PIN unlock
  const handleUnlock = async (pin: string): Promise<boolean> => {
    const ok = await api.verifyPin(pin);
    if (ok) {
      sessionStorage.setItem('colorco_unlocked', 'true');
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const handleLockApp = () => {
    sessionStorage.removeItem('colorco_unlocked');
    setIsLocked(true);
  };

  // Navigation handlers
  const handleSelectSection = (section: NavSection) => {
    setCurrentSection(section);
    setSelectedCustomerId(null);
  };

  const handleOpenCustomerDetail = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentSection('customers');
  };

  // Customer Actions
  const handleNewCustomer = () => {
    setCustomerToEdit(null);
    setCustomerModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (custData: Partial<Customer>) => {
    if (customerToEdit) {
      await api.updateCustomer(customerToEdit.id, custData);
    } else {
      await api.createCustomer(custData);
    }
    await loadData();
  };

  const handleToggleArchiveCustomer = async (customerId: string) => {
    await api.toggleArchiveCustomer(customerId);
    await loadData();
  };

  const handleDeleteCustomer = async (customerId: string, force = false) => {
    await api.deleteCustomer(customerId, force);
    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null);
    }
    await loadData();
  };

  // Device Actions
  const handleNewDevice = (defaultCustId?: string) => {
    setDeviceToEdit(null);
    setDefaultCustomerIdForDevice(defaultCustId);
    setDeviceModalOpen(true);
  };

  const handleEditDevice = (device: Device) => {
    setDeviceToEdit(device);
    setDeviceModalOpen(true);
  };

  const handleSaveDevice = async (devData: Partial<Device>) => {
    if (deviceToEdit) {
      await api.updateDevice(deviceToEdit.id, devData);
    } else {
      await api.createDevice(devData);
    }
    await loadData();
  };

  const handleToggleArchiveDevice = async (deviceId: string) => {
    await api.toggleArchiveDevice(deviceId);
    await loadData();
  };

  const handleDeleteDevice = async (deviceId: string, force = false) => {
    await api.deleteDevice(deviceId, force);
    await loadData();
  };

  // Machine Sales Actions
  const handleNewSale = () => {
    setSaleToEdit(null);
    setSaleModalOpen(true);
  };

  const handleEditSale = (sale: MachineSale) => {
    setSaleToEdit(sale);
    setSaleModalOpen(true);
  };

  const handleSaveSale = async (saleData: Partial<MachineSale>) => {
    if (saleToEdit) {
      await api.updateSale(saleToEdit.id, saleData);
    } else {
      await api.createSale(saleData);
    }
    await loadData();
  };

  const handleDeleteSale = async (saleId: string) => {
    await api.deleteSale(saleId);
    await loadData();
  };

  const handleScheduleCalibrationFromSale = (customerId: string, deviceId: string) => {
    setOperationToEdit(null);
    setDefaultCustomerIdForOp(customerId);
    setDefaultDeviceIdForOp(deviceId);
    setOperationModalOpen(true);
  };

  // Operation Actions
  const handleNewOperation = (
    defaultCustId?: string,
    defaultDevId?: string,
    defaultPlannedDate?: string,
    defaultOpType?: OperationType
  ) => {
    setOperationToEdit(null);
    setDefaultCustomerIdForOp(defaultCustId);
    setDefaultDeviceIdForOp(defaultDevId);
    setDefaultPlannedDateForOp(defaultPlannedDate);
    setDefaultOperationTypeForOp(defaultOpType);
    setOperationModalOpen(true);
  };

  const handleOpenOperationDetail = (op: Operation) => {
    setOperationToEdit(op);
    setOperationModalOpen(true);
  };

  const handleSaveOperation = async (opData: Partial<Operation>) => {
    if (operationToEdit) {
      await api.updateOperation(operationToEdit.id, opData);
    } else {
      await api.createOperation(opData);
    }
    await loadData();
  };

  // Payment Actions
  const handleAddPaymentFromModal = async (
    operationId: string,
    payment: { date: string; amount: number; note?: string }
  ) => {
    await api.addPayment(operationId, payment);
    await loadData();
  };

  const handleDeletePayment = async (paymentId: string) => {
    await api.deletePayment(paymentId);
    await loadData();
  };

  const handleOpenPaymentModal = (op: Operation) => {
    setOperationForPayment(op);
    setPaymentModalOpen(true);
  };

  // Notification Actions
  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    await loadData();
  };

  const handleMarkAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    await loadData();
  };

  const handleDeleteNotification = async (id: string) => {
    await api.deleteNotification(id);
    await loadData();
  };

  const handleClearAllNotifications = async () => {
    if (confirm('Tüm bildirimler silinecektir. Emin misiniz?')) {
      await api.clearAllNotifications();
      await loadData();
    }
  };

  // Settings Actions
  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    await api.updateSettings(newSettings);
    await loadData();
  };

  const handleClearSampleData = async () => {
    if (confirm('Sistemdeki tüm örnek demo kayıtlar kalıcı olarak temizlenecektir. Devam etmek istiyor musunuz?')) {
      await api.clearSampleData();
      await loadData();
    }
  };

  const handleSeedSampleData = async () => {
    await api.seedSampleData();
    await loadData();
  };

  const handleRestoreBackup = async (backupData: any) => {
    await api.restoreBackup(backupData);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent mx-auto" />
          <p className="text-xs font-semibold text-slate-700">ColorCo Satış & Servis Takip Programı yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Show PIN Lock screen if active
  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  const customersList = data?.customers || [];
  const devicesList = data?.devices || [];
  const operationsList = data?.operations || [];
  const paymentsList = data?.payments || [];
  const notificationsList = data?.notifications || [];
  const salesList = data?.machineSales || [];
  const settingsData = data?.settings || {
    recipientEmail: 'colorcoglobal@gmail.com',
    notificationDays: [30, 7, 0],
    dailyNotificationHour: 9,
    defaultCurrency: 'TRY',
    smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '' },
    emailConfigured: false,
    accessPin: '1234',
    pinRequired: false,
  };

  const overdueSalesCount = salesList.filter((s) => s.calibrationStatus === 'overdue').length;
  const unreadNotificationsCount = notificationsList.filter((n) => n.status === 'unread').length;
  const hasSampleData = customersList.some((c) => c.isSample) || devicesList.some((d) => d.isSample);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={handleSelectSection}
        unreadCount={unreadNotificationsCount}
        overdueSalesCount={overdueSalesCount}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLockApp={handleLockApp}
        pinRequired={settingsData.pinRequired}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <Header
          currentSection={currentSection}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onSelectSection={handleSelectSection}
          unreadCount={unreadNotificationsCount}
          hasSampleData={hasSampleData}
          onClearSampleData={handleClearSampleData}
          onNewCustomer={handleNewCustomer}
          onNewOperation={() => handleNewOperation()}
        />

        {/* Page Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {/* 1. Overview */}
          {currentSection === 'overview' && (
            <Overview
              customers={customersList}
              devices={devicesList}
              operations={operationsList}
              sales={salesList}
              onSelectSection={handleSelectSection}
              onOpenCustomerDetail={handleOpenCustomerDetail}
              onOpenOperationDetail={handleOpenOperationDetail}
              onNewCustomer={handleNewCustomer}
              onNewOperation={() => handleNewOperation()}
            />
          )}

          {/* 2. Customers List or Detail */}
          {currentSection === 'customers' && (
            selectedCustomerId ? (
              <CustomerDetail
                customerId={selectedCustomerId}
                customers={customersList}
                devices={devicesList}
                operations={operationsList}
                payments={paymentsList}
                onBack={() => setSelectedCustomerId(null)}
                onEditCustomer={handleEditCustomer}
                onAddDeviceForCustomer={(cId) => handleNewDevice(cId)}
                onAddOperationForCustomer={(cId) => handleNewOperation(cId)}
                onOpenOperationDetail={handleOpenOperationDetail}
                onOpenDeviceDetail={handleEditDevice}
                onAddPaymentForOperation={handleOpenPaymentModal}
              />
            ) : (
              <Customers
                customers={customersList}
                devices={devicesList}
                operations={operationsList}
                onOpenCustomerDetail={handleOpenCustomerDetail}
                onNewCustomer={handleNewCustomer}
                onEditCustomer={handleEditCustomer}
                onDeleteCustomer={handleDeleteCustomer}
              />
            )
          )}

          {/* 3. Devices */}
          {currentSection === 'devices' && (
            <Devices
              devices={devicesList}
              customers={customersList}
              operations={operationsList}
              onOpenCustomerDetail={handleOpenCustomerDetail}
              onNewDevice={() => handleNewDevice()}
              onEditDevice={handleEditDevice}
              onDeleteDevice={handleDeleteDevice}
              onAddOperationForDevice={(cId, dId) => handleNewOperation(cId, dId)}
              onOpenOperationDetail={handleOpenOperationDetail}
            />
          )}

          {/* 4. Satılan Makineler */}
          {currentSection === 'sales' && (
            <MachineSales
              sales={salesList}
              customers={customersList}
              devices={devicesList}
              onOpenCustomerDetail={handleOpenCustomerDetail}
              onNewSale={handleNewSale}
              onEditSale={handleEditSale}
              onDeleteSale={handleDeleteSale}
              onScheduleCalibration={handleScheduleCalibrationFromSale}
            />
          )}

          {/* 5. Satış Grafikleri & Raporlar */}
          {currentSection === 'reports' && (
            <Reports
              sales={salesList}
              operations={operationsList}
              customers={customersList}
              devices={devicesList}
              onOpenCustomerDetail={handleOpenCustomerDetail}
              onScheduleCalibration={handleScheduleCalibrationFromSale}
            />
          )}

          {/* 6. Calendar */}
          {currentSection === 'calendar' && (
            <CalendarView
              operations={operationsList}
              customers={customersList}
              devices={devicesList}
              sales={salesList}
              onOpenOperationDetail={handleOpenOperationDetail}
              onOpenCustomerDetail={handleOpenCustomerDetail}
              onNewOperation={handleNewOperation}
            />
          )}

          {/* 5. Notifications */}
          {currentSection === 'notifications' && (
            <Notifications
              notifications={notificationsList}
              customers={customersList}
              devices={devicesList}
              operations={operationsList}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onDeleteNotification={handleDeleteNotification}
              onClearAllNotifications={handleClearAllNotifications}
              onOpenOperationDetail={handleOpenOperationDetail}
              onOpenCustomerDetail={handleOpenCustomerDetail}
            />
          )}

          {/* 6. Bulk Import */}
          {currentSection === 'import' && (
            <BulkImport
              customers={customersList}
              devices={devicesList}
              onImportComplete={loadData}
            />
          )}

          {/* 7. Settings */}
          {currentSection === 'settings' && (
            <Settings
              settings={settingsData}
              onUpdateSettings={handleUpdateSettings}
              hasSampleData={hasSampleData}
              onClearSampleData={handleClearSampleData}
              onSeedSampleData={handleSeedSampleData}
              onRestoreBackup={handleRestoreBackup}
            />
          )}
        </main>
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        customerToEdit={customerToEdit}
      />

      {/* Device Modal */}
      <DeviceModal
        isOpen={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        onSave={handleSaveDevice}
        customers={customersList}
        devices={devicesList}
        deviceToEdit={deviceToEdit}
        defaultCustomerId={defaultCustomerIdForDevice}
      />

      {/* Operation Modal */}
      <OperationModal
        isOpen={operationModalOpen}
        onClose={() => setOperationModalOpen(false)}
        onSave={handleSaveOperation}
        customers={customersList}
        devices={devicesList}
        payments={paymentsList}
        operationToEdit={operationToEdit}
        defaultCustomerId={defaultCustomerIdForOp}
        defaultDeviceId={defaultDeviceIdForOp}
        defaultPlannedDate={defaultPlannedDateForOp}
        defaultOperationType={defaultOperationTypeForOp}
        onAddPayment={handleAddPaymentFromModal}
        onDeletePayment={handleDeletePayment}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setOperationForPayment(null);
        }}
        operation={operationForPayment}
        customer={customersList.find((c) => c.id === operationForPayment?.customerId)}
        device={devicesList.find((d) => d.id === operationForPayment?.deviceId)}
        payments={paymentsList}
        onAddPayment={handleAddPaymentFromModal}
      />

      {/* Sale Modal */}
      <SaleModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSave={handleSaveSale}
        customers={customersList}
        devices={devicesList}
        saleToEdit={saleToEdit}
      />
    </div>
  );
}
