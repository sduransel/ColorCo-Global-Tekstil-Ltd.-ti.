# Implementation Plan - ColorCo Satış & Servis Takip Programı Refinement

## User Requests Addressed
1. **Remove Archive Feature**: Completely remove archive tabs, archive/restore buttons from Customers, Devices, and UI.
2. **Delete Blackram Textile**: Remove Blackram Textile customer record and its associated sale/device.
3. **Customer Delete Button**: Add direct delete action with confirmation modal on Customer list and Customer detail.
4. **Simplify Customer Device Badge**: Clean up device & operation count badge in Customers table to be shorter and cleaner (e.g. `1 Cihaz` / `3 İşlem`).
5. **Clear Contact Names**: Clear default/auto-generated contact names for customers so the user can enter them manually.
6. **Remove Sample Data / Demo Banner**: Remove sample data flags, clear demo badges and "Örnekleri Temizle" header banner.
7. **Notification Delete**: Add delete button for individual notifications and "Tümünü Sil" action in the Notifications view.

## Proposed Changes

### 1. Backend / Sample Data (`serverSampleData.ts`, `server.ts`)
- Remove Blackram Textile customer and machine sale.
- Clear `contactName`, `contactRole`, `phone`, `email` or leave them minimal/blank where requested so user can input them.
- Remove `isSample` flags so data behaves as clean user data without sample banners.
- Ensure notification delete endpoints exist (`DELETE /api/notifications/:id`, `DELETE /api/notifications`).

### 2. Frontend Components
- **`src/components/Sidebar.tsx` & `src/components/Header.tsx`**: Remove sample data banner and clear sample data buttons.
- **`src/components/Customers.tsx`**:
  - Remove archive tab / toggle.
  - Simplify device/operation count display.
  - Add direct delete button (`Trash2`) on table rows and grid cards.
- **`src/components/CustomerDetail.tsx`**: Add delete button for customer.
- **`src/components/Devices.tsx`**: Remove archive tab / toggle.
- **`src/components/Notifications.tsx`**: Add delete button for each notification item and "Tümünü Sil" button.
- **`src/components/Settings.tsx`**: Remove sample data seed/clear buttons since demo mode is removed.

## Verification Plan
- Restart dev server.
- Verify via API (`GET /api/data`) that Blackram is gone, archive is removed, notifications can be deleted, and customers can be deleted.
- Run `compile_applet` and `lint_applet` to ensure zero compilation or type errors.
