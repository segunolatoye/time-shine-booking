import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Smartphone, Building, Upload, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PublicFooter from "@/components/PublicFooter";

const PayBalance = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState<"cash_app" | "zelle" | null>(null);
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // 1. Fetch booking by token
      const { data: bData, error: bError } = await supabase.rpc("get_booking_by_token", { _token: token });
      
      if (bError || !bData || bData.length === 0) {
        toast({ title: "Booking not found", variant: "destructive" });
        navigate("/");
        return;
      }
      
      const currentBooking = bData[0];
      setBooking(currentBooking);

      // 2. Calculate balance
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, service_total")
        .eq("booking_id", currentBooking.id);

      // Try to get total from previous payments, fallback to querying the service table
      let serviceTotal = payments?.[0]?.service_total;
      if (!serviceTotal) {
        const { data: svc } = await supabase.from("services").select("price").eq("id", currentBooking.service_id).single();
        serviceTotal = svc?.price || 0;
      }

      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Math.max(0, Number(serviceTotal) - totalPaid);

      if (remaining <= 0) {
        toast({ title: "Balance is already fully paid!" });
        navigate(`/booking/${token}`);
        return;
      }
      setBalance(remaining);

      // 3. Fetch payment settings
      const { data: sData } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["cash_app_details", "zelle_details"]);
      
      const map: any = {};
      (sData || []).forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);

      setLoading(false);
    };
    
    loadData();
  }, [token, navigate, toast]);

  const handleSubmit = async () => {
    if (!paymentMethod) return;
    if (!reference && !proofFile) {
      toast({ title: "Please provide a payment reference or upload proof", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const filePath = `${booking.id}/balance-proof-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, proofFile);
        if (!uploadError) {
          proofUrl = filePath;
        }
      }

      // Get the existing service_total to persist it
      const { data: lastPayment } = await supabase.from("payments").select("service_total").eq("booking_id", booking.id).limit(1);
      const serviceTotal = lastPayment?.[0]?.service_total || balance;

      // Insert the secondary payment
      await supabase.from("payments").insert({
        booking_id: booking.id,
        method: paymentMethod,
        amount: balance,
        status: "pending_verification" as any,
        reference: reference || null,
        proof_screenshot_url: proofUrl,
        service_total: serviceTotal,
        balance_remaining: 0,
      } as any);

      toast({ title: "Payment submitted successfully!" });
      navigate(`/book/payment-success/${token}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center animate-pulse">Loading...</div>;
  }

  const cashAppDetails = settings.cash_app_details;
  const zelleDetails = settings.zelle_details;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-2xl mx-auto px-4 py-12 flex-1 w-full">
        <button onClick={() => navigate(`/booking/${token}`)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Booking
        </button>

        <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">Pay Remaining Balance</h1>
        <p className="text-muted-foreground mb-8">
          Amount Due: <span className="font-semibold text-foreground">${balance.toFixed(2)}</span>
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className={`cursor-pointer transition-all ${paymentMethod === "cash_app" ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/50"}`} onClick={() => setPaymentMethod("cash_app")}>
            <CardContent className="p-6 text-center">
              <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Cash App</h3>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${paymentMethod === "zelle" ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/50"}`} onClick={() => setPaymentMethod("zelle")}>
            <CardContent className="p-6 text-center">
              <Building className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Zelle</h3>
            </CardContent>
          </Card>
        </div>

        {paymentMethod && (
          <Card className="mb-8 bg-secondary/50">
            <CardHeader><CardTitle className="text-lg font-serif">Payment Instructions</CardTitle></CardHeader>
            <CardContent>
              {paymentMethod === "cash_app" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Send payment to:</p>
                  <p className="text-lg font-semibold text-foreground">{cashAppDetails?.cashtag || "$SalonCashApp"}</p>
                  {cashAppDetails?.note && <p className="text-sm text-muted-foreground mt-2">{cashAppDetails.note}</p>}
                </div>
              )}
              {paymentMethod === "zelle" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Send payment to:</p>
                  <p className="text-lg font-semibold text-foreground">{zelleDetails?.email || zelleDetails?.phone || "salon@example.com"}</p>
                  {zelleDetails?.note && <p className="text-sm text-muted-foreground mt-2">{zelleDetails.note}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {paymentMethod && (
          <div className="space-y-5">
            <div><Label htmlFor="reference">Payment Reference / Confirmation Number</Label><Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1" placeholder="e.g. Transaction ID or confirmation #" /></div>
            <div><Label htmlFor="proof">Upload Screenshot Proof (optional)</Label><div className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center"><input id="proof" type="file" accept="image/*" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} /><label htmlFor="proof" className="cursor-pointer">{proofFile ? (<div className="flex items-center justify-center gap-2 text-primary"><CheckCircle className="w-5 h-5" /><span className="text-sm">{proofFile.name}</span></div>) : (<div className="text-muted-foreground"><Upload className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">Click to upload</p></div>)}</label></div></div>
            <Button className="w-full rounded-full" size="lg" onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Payment"}</Button>
          </div>
        )}
      </div>
      <PublicFooter />
    </div>
  );
};

export default PayBalance;