import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Smartphone, Building, Upload, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Payment = () => {
  const [paymentMethod, setPaymentMethod] = useState<"cash_app" | "zelle" | null>(null);
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentOption, setPaymentOption] = useState<"full" | "deposit">("deposit");
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const { toast } = useToast();

  useEffect(() => {
    if (!state?.serviceId) {
      navigate("/");
      return;
    }
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["cash_app_details", "zelle_details", "deposit_rules", "email_config"]);
      const map: any = {};
      (data || []).forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    };
    fetchSettings();
  }, [state, navigate]);

  const handleSubmit = async () => {
    if (!paymentMethod) return;
    if (!reference && !proofFile) {
      toast({ title: "Please provide a payment reference or upload proof", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Create booking
      const bookingId = crypto.randomUUID();
      const holdExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { error: bookingError } = await supabase.from("bookings").insert({
        id: bookingId,
        service_id: state.serviceId,
        staff_id: state.staffId || null,
        customer_name: state.customerName,
        customer_email: state.customerEmail,
        customer_phone: state.customerPhone || null,
        booking_date: state.date,
        start_time: state.startTime,
        end_time: state.endTime,
        status: "pending_verification" as any,
        hold_expires_at: holdExpiry,
      });

      if (bookingError) throw bookingError;

      // Upload proof if provided
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const filePath = `${bookingId}/proof.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, proofFile);
        if (!uploadError) {
          proofUrl = filePath;
        }
      }

      // Create payment
      let depositAmount = state.servicePrice;
      if (settings.deposit_rules?.type === "percentage") {
        depositAmount = (state.servicePrice * (settings.deposit_rules.value || 100)) / 100;
      } else if (settings.deposit_rules?.type === "fixed") {
        depositAmount = Math.min(settings.deposit_rules.value || state.servicePrice, state.servicePrice);
      }
      const hasDeposit = settings.deposit_rules?.type && settings.deposit_rules.type !== "none" && depositAmount > 0 && depositAmount < state.servicePrice;
      const amountToPay = (hasDeposit && paymentOption === "deposit") ? depositAmount : state.servicePrice;

      await supabase.from("payments").insert({
        booking_id: bookingId,
        method: paymentMethod as any,
        amount: amountToPay,
        status: "pending_verification" as any,
        reference: reference || null,
        proof_screenshot_url: proofUrl,
        service_total: state.servicePrice,
        balance_remaining: state.servicePrice - amountToPay,
      } as any);

      // Get access token
      const { data: booking } = await supabase
        .from("bookings")
        .select("access_token")
        .eq("id", bookingId)
        .single();

      navigate(`/booking/${booking?.access_token}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const cashAppDetails = settings.cash_app_details;
  const zelleDetails = settings.zelle_details;
  
  let depositAmount = state?.servicePrice || 0;
  if (settings.deposit_rules?.type === "percentage") {
    depositAmount = (state.servicePrice * (settings.deposit_rules.value || 100)) / 100;
  } else if (settings.deposit_rules?.type === "fixed") {
    depositAmount = Math.min(settings.deposit_rules.value || state.servicePrice, state.servicePrice);
  }
  const hasDeposit = settings.deposit_rules?.type && settings.deposit_rules.type !== "none" && depositAmount > 0 && depositAmount < state.servicePrice;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate("/book/details", { state })}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">
          Payment
        </h1>
        <p className="text-muted-foreground mb-8">
          Total Service Price: <span className="font-semibold text-foreground">${state?.servicePrice?.toFixed(2)}</span>
        </p>

        {/* Deposit or Full Payment Selection */}
        {hasDeposit && (
          <div className="mb-8 space-y-3">
            <Label className="text-base font-serif">Payment Option</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all ${paymentOption === "deposit" ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/50"}`}
                onClick={() => setPaymentOption("deposit")}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-lg">Pay Deposit</h3>
                  <div className="text-2xl font-bold text-primary mt-1">${depositAmount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Balance of ${(state.servicePrice - depositAmount).toFixed(2)} due later</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${paymentOption === "full" ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/50"}`}
                onClick={() => setPaymentOption("full")}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-lg">Pay in Full</h3>
                  <div className="text-2xl font-bold text-primary mt-1">${state.servicePrice.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Nothing due at appointment</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Method selection */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card
            className={`cursor-pointer transition-all ${
              paymentMethod === "cash_app" ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/50"
            }`}
            onClick={() => setPaymentMethod("cash_app")}
          >
            <CardContent className="p-6 text-center">
              <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Cash App</h3>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${
              paymentMethod === "zelle" ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/50"
            }`}
            onClick={() => setPaymentMethod("zelle")}
          >
            <CardContent className="p-6 text-center">
              <Building className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Zelle</h3>
            </CardContent>
          </Card>
        </div>

        {/* Payment instructions */}
        {paymentMethod && (
          <Card className="mb-8 bg-secondary/50">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Payment Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethod === "cash_app" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Send payment to:</p>
                  <p className="text-lg font-semibold text-foreground">
                    {cashAppDetails?.cashtag || "$SalonCashApp"}
                  </p>
                  {cashAppDetails?.note && (
                    <p className="text-sm text-muted-foreground mt-2">{cashAppDetails.note}</p>
                  )}
                </div>
              )}
              {paymentMethod === "zelle" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Send payment to:</p>
                  <p className="text-lg font-semibold text-foreground">
                    {zelleDetails?.email || zelleDetails?.phone || "salon@example.com"}
                  </p>
                  {zelleDetails?.note && (
                    <p className="text-sm text-muted-foreground mt-2">{zelleDetails.note}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reference / Proof */}
        {paymentMethod && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="reference">Payment Reference / Confirmation Number</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1"
                placeholder="e.g. Transaction ID or confirmation #"
              />
            </div>
            <div>
              <Label htmlFor="proof">Upload Screenshot Proof (optional)</Label>
              <div className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  id="proof"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="proof" className="cursor-pointer">
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">{proofFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Click to upload</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <Button
              className="w-full rounded-full"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Booking"}
            </Button>
          </div>
        )}

        {settings.email_config?.admin_email && (
          <div className="mt-8 bg-secondary/30 p-4 rounded-lg border border-border text-center">
            <p className="text-sm text-muted-foreground mb-2">Need help with your payment?</p>
            <a href={`mailto:${settings.email_config.admin_email}`} className="text-sm font-medium text-primary hover:underline">
              Contact Support
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;
