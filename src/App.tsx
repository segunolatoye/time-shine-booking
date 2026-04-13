import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StaffSelect from "./pages/book/StaffSelect";
import DateTimeSelect from "./pages/book/DateTimeSelect";
import CustomerDetails from "./pages/book/CustomerDetails";
import Payment from "./pages/book/Payment";
import BookingConfirmation from "./pages/book/BookingConfirmation";
import PayBalance from "./pages/book/PayBalance";
import PaymentSuccess from "./pages/book/PaymentSuccess";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminServices from "./pages/admin/AdminServices";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminAvailability from "./pages/admin/AdminAvailability";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReports from "./pages/admin/AdminReports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/book/staff" element={<StaffSelect />} />
            <Route path="/book/datetime" element={<DateTimeSelect />} />
            <Route path="/book/details" element={<CustomerDetails />} />
            <Route path="/book/payment" element={<Payment />} />
            <Route path="/book/pay-balance/:token" element={<PayBalance />} />
            <Route path="/book/payment-success/:token" element={<PaymentSuccess />} />
            <Route path="/booking/:token" element={<BookingConfirmation />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="staff" element={<AdminStaff />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="availability" element={<AdminAvailability />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
