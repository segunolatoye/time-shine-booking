import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [refundPayment, setRefundPayment] = useState<any>(null);
  const [refundNotes, setRefundNotes] = useState("");
  const [cancelBookingToo, setCancelBookingToo] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, bookings(customer_name, customer_email, booking_date, services(name))")
      .order("created_at", { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => { fetchPayments(); }, []);

  const verifyPayment = async (payment: any, approved: boolean) => {
    const newStatus = approved ? "paid_full" : "failed";
    const { error } = await supabase.from("payments").update({
      status: newStatus as any,
      verified_at: new Date().toISOString(),
      admin_notes: approved ? null : "Rejected by admin",
    }).eq("id", payment.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    if (approved) {
      await supabase.from("bookings").update({ status: "confirmed" as any }).eq("id", payment.booking_id);
    }
    toast({ title: approved ? "Payment approved" : "Payment rejected" });
    fetchPayments();
  };

  const confirmRefund = async () => {
    if (!refundPayment) return;
    const { error } = await supabase.from("payments").update({
      status: "refunded" as any,
      admin_notes: refundNotes || "Refunded by admin",
      verified_at: new Date().toISOString(),
    }).eq("id", refundPayment.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    if (cancelBookingToo) {
      await supabase.from("bookings").update({ status: "cancelled" as any }).eq("id", refundPayment.booking_id);
    }
    toast({ title: "Payment refunded" });
    setRefundPayment(null);
    setRefundNotes("");
    setCancelBookingToo(true);
    fetchPayments();
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      pending_verification: "bg-blue-100 text-blue-800",
      paid_partial: "bg-green-100 text-green-800",
      paid_full: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      refunded: "bg-muted text-muted-foreground",
    };
    return colors[status] || "";
  };

  const canRefund = (status: string) => ["paid_full", "paid_partial"].includes(status);

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground mb-4 md:mb-6">Payment Verification</h1>

      <div className="space-y-3">
        {payments.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm md:text-base truncate">{p.bookings?.customer_name}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {p.bookings?.services?.name} · ${Number(p.amount).toFixed(2)} via {p.method === "cash_app" ? "Cash App" : "Zelle"}
                    </p>
                    {p.reference && <p className="text-xs text-muted-foreground">Ref: {p.reference}</p>}
                    {p.admin_notes && <p className="text-xs text-muted-foreground italic">Note: {p.admin_notes}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(p.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <Badge className={`${statusColor(p.status)} border-0 shrink-0 text-xs`}>
                    {p.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status === "pending_verification" && (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-green-600 text-xs" onClick={() => verifyPayment(p, true)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-destructive text-xs" onClick={() => verifyPayment(p, false)}>
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {canRefund(p.status) && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setRefundPayment(p); setRefundNotes(""); setCancelBookingToo(true); }}>
                      <RotateCcw className="w-3.5 h-3.5" /> Refund
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {payments.length === 0 && <p className="text-muted-foreground text-sm">No payments yet.</p>}
      </div>

      {/* Refund Dialog */}
      <Dialog open={!!refundPayment} onOpenChange={(v) => !v && setRefundPayment(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Refund Payment</DialogTitle>
          </DialogHeader>
          {refundPayment && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>{refundPayment.bookings?.customer_name}</strong></p>
                <p className="text-muted-foreground">${Number(refundPayment.amount).toFixed(2)} via {refundPayment.method === "cash_app" ? "Cash App" : "Zelle"}</p>
              </div>
              <div>
                <Label>Admin Notes (optional)</Label>
                <Textarea value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} className="mt-1" placeholder="Reason for refund..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={cancelBookingToo} onCheckedChange={setCancelBookingToo} />
                <Label className="text-sm">Also cancel the associated booking</Label>
              </div>
              <Button className="w-full rounded-full" onClick={confirmRefund}>Confirm Refund</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;
