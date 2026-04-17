import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { XCircle, CalendarClock, Trash2 } from "lucide-react";
import { DataTable, Column } from "@/components/admin/DataTable";

const statusOptions = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const statusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending_payment: "bg-yellow-100 text-yellow-800",
    pending_verification: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-muted text-muted-foreground",
  };
  return colors[status] || "";
};

const AdminBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "" });
  const { toast } = useToast();

  const fetchBookings = async () => {
    setLoading(true);
    let query = supabase
      .from("bookings")
      .select("*, services(name, duration), staff(name)")
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter as any);
    }
    const { data } = await query;
    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status: status as any }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { fetchBookings(); }
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" as any }).eq("id", cancelId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Booking cancelled" }); fetchBookings(); }
    setCancelId(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("bookings").delete().eq("id", deleteId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Booking deleted" }); fetchBookings(); }
    setDeleteId(null);
  };

  const confirmReschedule = async () => {
    if (!rescheduleBooking || !rescheduleForm.date || !rescheduleForm.time) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }
    const duration = rescheduleBooking.services?.duration || 60;
    const [h, m] = rescheduleForm.time.split(":").map(Number);
    const endMinutes = h * 60 + m + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const { error } = await supabase.from("bookings").update({
      booking_date: rescheduleForm.date,
      start_time: rescheduleForm.time,
      end_time: endTime,
      status: "confirmed" as any,
    }).eq("id", rescheduleBooking.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Booking rescheduled" }); fetchBookings(); }
    setRescheduleBooking(null);
  };

  const canCancel = (status: string) => !["cancelled", "completed", "no_show"].includes(status);
  const canReschedule = (status: string) => !["cancelled", "completed", "no_show"].includes(status);

  const columns: Column<any>[] = [
    {
      key: "customer_name",
      header: "Customer",
      sortable: true,
      render: (b) => (
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{b.customer_name}</p>
          <p className="text-xs text-muted-foreground truncate">{b.customer_email}</p>
          {b.customer_phone && <p className="text-xs text-muted-foreground truncate">{b.customer_phone}</p>}
        </div>
      ),
    },
    {
      key: "service",
      header: "Service",
      hideOnMobile: true,
      render: (b) => <span className="text-sm">{b.services?.name || "—"}</span>,
    },
    {
      key: "staff",
      header: "Staff",
      hideOnMobile: true,
      render: (b) => <span className="text-sm">{b.staff?.name || "Any"}</span>,
    },
    {
      key: "booking_date",
      header: "Date & Time",
      sortable: true,
      render: (b) => (
        <div className="text-sm">
          <p>{format(parse(b.booking_date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">{b.start_time?.substring(0, 5)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <Select value={b.status} onValueChange={(v) => updateStatus(b.id, v)}>
          <SelectTrigger className="h-7 w-[140px] text-xs">
            <Badge className={`${statusColor(b.status)} border-0 text-xs`}>
              {statusOptions.find((s) => s.value === b.status)?.label || b.status}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground mb-4 md:mb-6">Bookings</h1>

      <DataTable
        data={bookings}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by name, email, or phone..."
        searchFn={(b, q) =>
          b.customer_name?.toLowerCase().includes(q) ||
          b.customer_email?.toLowerCase().includes(q) ||
          b.customer_phone?.toLowerCase().includes(q) ||
          b.services?.name?.toLowerCase().includes(q)
        }
        filters={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={(b) => (
          <div className="flex gap-1">
            {canReschedule(b.status) && (
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Reschedule" onClick={() => {
                setRescheduleBooking(b);
                setRescheduleForm({ date: b.booking_date, time: b.start_time?.substring(0, 5) || "" });
              }}>
                <CalendarClock className="w-4 h-4" />
              </Button>
            )}
            {canCancel(b.status) && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Cancel" onClick={() => setCancelId(b.id)}>
                <XCircle className="w-4 h-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setDeleteId(b.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        emptyMessage="No bookings found."
      />

      <AlertDialog open={!!cancelId} onOpenChange={(v) => !v && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? The customer will need to rebook.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will permanently delete this booking. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rescheduleBooking} onOpenChange={(v) => !v && setRescheduleBooking(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Reschedule Booking</DialogTitle>
          </DialogHeader>
          {rescheduleBooking && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {rescheduleBooking.customer_name} — {rescheduleBooking.services?.name}
              </p>
              <div className="bg-secondary/30 p-3 rounded-md text-xs text-muted-foreground space-y-1 border border-border/50">
                <p><strong className="text-foreground">Current Date:</strong> {format(parse(rescheduleBooking.booking_date, "yyyy-MM-dd", new Date()), "MMMM d, yyyy")}</p>
                <p><strong className="text-foreground">Current Time:</strong> {rescheduleBooking.start_time?.substring(0, 5)}</p>
              </div>
              <div>
                <Label>New Date</Label>
                <Input type="date" value={rescheduleForm.date} onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>New Time</Label>
                <Input type="time" value={rescheduleForm.time} onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })} className="mt-1" />
              </div>
              <Button className="w-full rounded-full" onClick={confirmReschedule}>Confirm Reschedule</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBookings;
