import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, Clock, User, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(255),
  phone: z.string().max(20).optional(),
});

type FormData = z.infer<typeof schema>;

const CustomerDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const [terms, setTerms] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState(false);
  const [termsError, setTermsError] = React.useState(false);
  const [showDuration, setShowDuration] = React.useState(true);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  React.useEffect(() => {
    if (!state?.serviceId) navigate("/");

    const fetchSettings = async () => {
      const { data } = await supabase.from("settings").select("key, value").in("key", ["terms_and_conditions", "show_service_duration"]);
      if (data) {
        const termsData = data.find(d => d.key === "terms_and_conditions");
        if (termsData?.value?.text) setTerms(termsData.value.text);
        
        const durationData = data.find(d => d.key === "show_service_duration");
        if (durationData?.value !== undefined) {
          setShowDuration(durationData.value.enabled !== false);
        }
      }
    };
    fetchSettings();
  }, [state, navigate]);

  const onSubmit = (data: FormData) => {
    if (terms && !accepted) {
      setTermsError(true);
      return;
    }
    navigate("/book/payment", {
      state: {
        ...state,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone || null,
      },
    });
  };

  const displayDate = state?.date
    ? format(parse(state.date, "yyyy-MM-dd", new Date()), "MMMM d, yyyy")
    : "";
  const displayTime = state?.startTime
    ? state.startTime.substring(0, 5)
    : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate("/book/datetime", { state })}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl font-serif font-semibold text-foreground mb-6">
              Your Details
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...register("name")} className="mt-1" placeholder="Jane Doe" />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register("email")} className="mt-1" placeholder="jane@example.com" />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" {...register("phone")} className="mt-1" placeholder="+1 (555) 123-4567" />
              </div>
              
              {terms && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <Label>Terms & Conditions</Label>
                    <div className="mt-2 bg-secondary/30 p-4 rounded-md text-sm text-muted-foreground whitespace-pre-wrap h-32 overflow-y-auto border border-border">
                      {terms}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={accepted}
                      onCheckedChange={(checked) => {
                        setAccepted(checked as boolean);
                        if (checked) setTermsError(false);
                      }}
                      className="mt-1"
                    />
                    <div className="space-y-1.5">
                      <Label htmlFor="terms" className="text-sm font-medium leading-none cursor-pointer">I agree to the Terms and Conditions *</Label>
                      {termsError && <p className="text-sm text-destructive">You must accept the terms and conditions to proceed.</p>}
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full rounded-full" size="lg">
                Continue to Payment
              </Button>
            </form>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkle className="w-4 h-4" />
                <span>{state?.serviceName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{state?.staffName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{displayDate}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{displayTime}{showDuration && state?.serviceDuration ? ` · ${state.serviceDuration} min` : ""}</span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between font-semibold text-foreground">
                <span>Total</span>
                <span>${state?.servicePrice?.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Small sparkle icon component to avoid extra import
const Sparkle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636 5.636 18.364" />
  </svg>
);

export default CustomerDetails;
