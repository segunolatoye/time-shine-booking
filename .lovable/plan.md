

## Plan: Admin Panel Fixes and Enhancements

This plan covers 7 areas of work across the admin panel.

---

### 1. Auto-Save Settings

**Current issue**: Each settings card has a manual "Save" button.

**Change**: Replace manual save buttons with auto-save using debounced `useEffect` hooks. Each setting will save automatically ~800ms after the user stops typing/changing. A subtle "Saving..." / "Saved" indicator replaces the buttons.

**File**: `src/pages/admin/AdminSettings.tsx`

---

### 2. Email Configuration Section in Settings

**Approach**: Add a new "Email Configuration" card section to AdminSettings that stores email config in the `settings` table (key: `email_config`). This will include:

- **Resend API Key input** (saved as a secret via the connector flow)
- **From Name / From Email** fields
- **Toggle switches** for email types: Booking Confirmation (to customer), Payment Received (to customer), New Booking Alert (to admin), Cancellation Notice (to admin)
- **Email Template Editor**: A simple textarea-based editor per email type where admin can edit subject line and HTML body with placeholder tokens like `{{customer_name}}`, `{{service_name}}`, `{{booking_date}}`, `{{booking_time}}`
- Templates stored in `settings` table as JSON (key: `email_templates`)

**Files**: `src/pages/admin/AdminSettings.tsx` (add Email section), new `src/components/admin/EmailTemplateEditor.tsx`

**Database**: No schema changes needed -- uses existing `settings` table.

---

### 3. Fix Closures/Holidays CRUD

**Current issues**: The closures section in AdminAvailability only adds and deletes. Missing edit functionality and potential RLS issues with unauthenticated operations.

**Fix**:
- Add an inline edit mode or edit dialog for closures (date, reason, start_time, end_time)
- Add confirmation dialog before delete
- Ensure proper error handling and toast feedback on all operations

**File**: `src/pages/admin/AdminAvailability.tsx`

---

### 4. Fix Services CRUD

**Current issues**: Add/edit/delete may fail silently without proper error feedback. Delete has no confirmation.

**Fix**:
- Add confirmation dialog before deleting a service
- Add proper error handling with toast messages on insert, update, delete
- Ensure dialog resets properly after save

**File**: `src/pages/admin/AdminServices.tsx`

---

### 5. Fix Staff CRUD

**Same pattern as Services**:
- Add delete confirmation dialog
- Better error handling with toasts on all operations
- Ensure staff_services cleanup works correctly on delete (cascade should handle, but verify)

**File**: `src/pages/admin/AdminStaff.tsx`

---

### 6. Booking Cancel & Reschedule

**Current state**: Admin can change status via dropdown. Customer can cancel from confirmation page.

**Enhancements**:
- Add explicit **Cancel** button on each booking card in admin (with confirmation dialog)
- Add **Reschedule** button that opens a dialog to pick a new date/time, updates the booking record
- When cancelled/rescheduled, update the booking status accordingly

**File**: `src/pages/admin/AdminBookings.tsx`

---

### 7. Payment Refund Option

**Current state**: Admin can approve/reject payments with `pending_verification` status. The `payment_status` enum already includes `refunded`.

**Enhancement**:
- Add a **Refund** button on payments that are `paid_full` or `paid_partial`
- Clicking opens a confirmation dialog with optional admin notes
- Sets payment status to `refunded` and optionally updates booking status to `cancelled`

**File**: `src/pages/admin/AdminPayments.tsx`

---

### Technical Details

- **Auto-save**: Uses `useRef` for debounce timers, `useCallback` for the save function, and a small status indicator component
- **Email templates**: Stored as JSON in `settings.value` with key `email_templates`. Each template has `subject`, `body` (HTML string), `enabled` (boolean). Placeholder tokens are documented in the UI
- **No database migrations needed** -- all features use existing tables and enums (`refunded` status already exists in `payment_status`, `cancelled` in `booking_status`)
- **Confirmation dialogs**: Use existing `AlertDialog` component from shadcn
- **Files modified**: ~7 files total, no new routes needed

