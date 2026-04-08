

# Salon Booking Web App — Implementation Plan

## Design System
- **Theme**: Warm & luxurious — gold (#C5975B) and cream (#FFF8F0) palette, elegant serif headings (Playfair Display), clean sans-serif body (Inter)
- **Accents**: Deep charcoal (#2D2A26) for text, soft rose (#F5E6E0) for backgrounds, gold gradients for CTAs
- **Cards**: Soft shadows, rounded corners, subtle borders

## Backend (Lovable Cloud / Supabase)
Set up tables with RLS:
- **services** — name, duration, price, description, image, active
- **staff** — name, bio, photo, active
- **staff_services** — many-to-many linking staff ↔ services
- **working_hours** — global + per-staff schedules (day_of_week, start_time, end_time)
- **staff_breaks** — lunch/break times per staff
- **closures** — full/partial day closures (date, start_time, end_time, reason)
- **bookings** — service, staff, customer info (name, email, phone), date, start_time, end_time, status, access_token, hold_expires_at
- **payments** — booking_id, method (cash_app/zelle), amount, status (pending/pending_verification/paid/failed/refunded), reference, proof_screenshot_url
- **settings** — key/value store for admin config (payment details, business info, cancellation policy, buffer time, deposit rules)
- **user_roles** — admin role management per security guidelines

## Customer Booking Flow (5 pages)

### 1. Landing / Service Selection Page
- Hero section with salon branding
- Service cards with name, duration, price, description
- "Book Now" button per service

### 2. Staff Selection Page
- Grid of available staff for chosen service
- "Any Available" option prominently shown
- Staff cards with photo, name, brief bio

### 3. Date & Time Selection Page
- Calendar date picker
- Generated time slots based on: staff availability, working hours, existing bookings, breaks, closures, buffer time
- Slots shown in salon's configured timezone

### 4. Customer Details Form
- Name, email, phone (no account required)
- Summary sidebar showing selected service, staff, date/time, price

### 5. Payment Page
- Choose: Cash App or Zelle
- Display payment instructions (admin-configured $Cashtag / Zelle details)
- Deposit amount shown (admin-configured % or fixed)
- Upload proof / enter reference number
- Submit → booking created with "pending_verification" status
- 15-min hold on the time slot

### 6. Booking Confirmation / Management Page
- Accessed via unique token link (emailed)
- View booking details
- Cancel or reschedule options (within admin-configured policy)

## Admin Panel (protected routes)

### Admin Login
- Supabase auth (email/password)
- Role-based access via user_roles table

### Dashboard
- Today's bookings overview
- Pending payment verifications count
- Quick stats (bookings this week, revenue)

### Booking Calendar
- Daily/weekly view of all bookings per staff
- Color-coded by status
- Click to view/edit booking, block time

### Service Management
- CRUD for services (name, duration, price, staff assignment)

### Staff Management
- CRUD for staff profiles
- Per-staff working hours & breaks
- Days off management

### Availability Settings
- Global working hours
- Closures/holidays management
- Buffer time between bookings

### Payment Management
- List of pending verifications with proof/reference
- Approve/reject payments
- Configure Cash App & Zelle details
- Set deposit rules (percentage or fixed amount)

### Booking Management
- All bookings list with filters (status, date, staff)
- Edit, cancel, reschedule bookings
- Cancellation policy settings (free window, late fees)

## Key Logic
- **Time slot generation**: Server-side function computing available slots from working hours, breaks, closures, existing bookings, and buffer time
- **Booking hold**: 15-min reservation on slot selection; auto-released via DB check
- **Double-booking prevention**: Check conflicts before confirming
- **Timezone handling**: Store UTC, display in admin-configured timezone
- **Secure booking links**: UUID tokens for customer access without login

## Email Notifications (Lovable Emails)
- Booking confirmation with secure management link
- Payment instructions for manual methods
- Payment verified confirmation
- Cancellation/reschedule confirmations
- Reminders (configurable timing)

