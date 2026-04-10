import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { XCircle, CalendarClock } from "lucide-react";

const statusOptions = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const AdminBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "" });
  const { toast } = useToast();

  const fetchBookings = async () => {
    let query = supabase
      .from("bookings")
      .select("*, services(name, duration), staff(name), payments(*)")
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter as any);
    }
    const { data } = await query;
    setBookings(data || []);
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

  const openReschedule = (b: any) => {
    setRescheduleBooking(b);
    setRescheduleForm({ date: b.booking_date, time: b.start_time?.substring(0, 5) || "" });
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

  const canCancel = (status: string) => !["cancelled", "completed", "no_show"].includes(status);
  const canReschedule = (status: string) => !["cancelled", "completed", "no_show"].includes(status);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Bookings</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {bookings.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm md:text-base truncate">{b.customer_name}</h3>
                    <Badge className={`${statusColor(b.status)} border-0 shrink-0 text-xs`}>
                      {statusOptions.find((s) => s.value === b.status)?.label || b.status}
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">
                    {b.customer_email} {b.customer_phone && `· ${b.customer_phone}`}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">
                    {b.services?.name} · {b.staff?.name || "Any"} · {format(parse(b.booking_date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")} · {b.start_time?.substring(0, 5)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={b.status} onValueChange={(v) => updateStatus(b.id, v)}>
                    <SelectTrigger className="w-full sm:w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    {canReschedule(b.status) && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => openReschedule(b)}>
                        <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                      </Button>
                    )}
                    {canCancel(b.status) && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 text-destructive" onClick={() => setCancelId(b.id)}>
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {bookings.length === 0 && <p className="text-muted-foreground text-sm">No bookings found.</p>}
      </div>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={(v) => !v && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel this booking? The customer will need to rebook.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
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
