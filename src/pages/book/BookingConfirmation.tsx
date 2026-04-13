import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, CheckCircle, AlertCircle, XCircle, CreditCard } from "lucide-react";
import { format, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import PublicFooter from "@/components/PublicFooter";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending_payment: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  pending_verification: { label: "Pending Verification", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-muted text-muted-foreground", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
  no_show: { label: "No Show", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const BookingConfirmation = () => {
  const { token } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchBooking = async () => {
      const { data, error } = await supabase.rpc("get_booking_by_token", {
        _token: token,
      });

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      setBooking(data[0]);
      
      // Fetch associated payments to calculate remaining balance
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, service_total")
        .eq("booking_id", data[0].id);
      if (payments && payments.length > 0) {
        const totalService = Number(payments[0].service_total || 0);
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        setBalance(Math.max(0, totalService - totalPaid));
      }

      const { data: settingsData } = await supabase.from("settings").select("value").eq("key", "email_config").maybeSingle();
      if (settingsData?.value?.admin_email) setContactEmail(settingsData.value.admin_email);

      setLoading(false);
    };
    fetchBooking();
  }, [token]);

  const handleCancel = async () => {
    if (!booking) return;
    const { data, error } = await supabase.rpc("cancel_booking_by_token", {
      _token: token,
    });

    if (error) {
      toast({ title: "Error cancelling", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Booking cancelled" });
      setBooking({ ...booking, status: "cancelled" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-serif font-semibold mb-2">Booking Not Found</h2>
              <p className="text-muted-foreground mb-4">This booking link is invalid or has expired.</p>
              <Button onClick={() => navigate("/")} className="rounded-full">
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const status = statusConfig[booking.status] || statusConfig.pending_payment;
  const StatusIcon = status.icon;
  const displayDate = format(parse(booking.booking_date, "yyyy-MM-dd", new Date()), "MMMM d, yyyy");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-2xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="text-center mb-8">
          <StatusIcon className={`w-12 h-12 mx-auto mb-4 ${booking.status === "confirmed" ? "text-green-600" : "text-primary"}`} />
          
          <Badge className={`${status.color} border-0`}>{status.label}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{displayDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">{booking.start_time?.substring(0, 5)} - {booking.end_time?.substring(0, 5)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">✂</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{booking.service_name}</p>
              </div>
            </div>
            {booking.staff_name && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stylist</p>
                  <p className="font-medium">{booking.staff_name}</p>
                </div>
              </div>
            )}

            {balance > 0 && !["cancelled", "completed", "no_show"].includes(booking.status) && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Remaining Balance</p>
                  <p className="font-bold text-lg">${balance.toFixed(2)}</p>
                </div>
                <Button
                  onClick={() => navigate(`/book/pay-balance/${token}`)}
                  className="rounded-full gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Pay Balance
                </Button>
              </div>
            )}

            {booking.status === "pending_verification" && (
              <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
                Your payment is being verified. You'll receive a confirmation once approved.
              </div>
            )}

            {!["cancelled", "completed", "no_show"].includes(booking.status) && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full rounded-full text-destructive hover:text-destructive"
                  onClick={handleCancel}
                >
                  Cancel Booking
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {contactEmail && (
          <div className="mt-8 bg-secondary/30 p-4 rounded-lg border border-border text-center">
            <p className="text-sm text-muted-foreground mb-2">Need to make changes to your booking?</p>
            <a href={`mailto:${contactEmail}`} className="text-sm font-medium text-primary hover:underline">
              Contact Support
            </a>
          </div>
        )}

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
            Book Another Service
          </Button>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
};

export default BookingConfirmation;
