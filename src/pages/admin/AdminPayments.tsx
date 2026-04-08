import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
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
    await supabase.from("payments").update({
      status: newStatus as any,
      verified_at: new Date().toISOString(),
    }).eq("id", payment.id);

    if (approved) {
      await supabase.from("bookings").update({ status: "confirmed" as any }).eq("id", payment.booking_id);
    }

    toast({ title: approved ? "Payment approved" : "Payment rejected" });
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

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold text-foreground mb-6">Payment Verification</h1>

      <div className="space-y-3">
        {payments.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.bookings?.customer_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {p.bookings?.services?.name} · ${Number(p.amount).toFixed(2)} via {p.method === "cash_app" ? "Cash App" : "Zelle"}
                  </p>
                  {p.reference && <p className="text-sm text-muted-foreground">Ref: {p.reference}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(p.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusColor(p.status)} border-0`}>
                    {p.status.replace("_", " ")}
                  </Badge>
                  {p.status === "pending_verification" && (
                    <>
                      <Button variant="outline" size="sm" className="gap-1 text-green-600" onClick={() => verifyPayment(p, true)}>
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => verifyPayment(p, false)}>
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {payments.length === 0 && <p className="text-muted-foreground">No payments yet.</p>}
      </div>
    </div>
  );
};

export default AdminPayments;
