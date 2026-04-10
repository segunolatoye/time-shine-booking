import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Globe, Check, Loader2, Mail } from "lucide-react";
import EmailTemplateEditor, { DEFAULT_TEMPLATES, type EmailTemplates } from "@/components/admin/EmailTemplateEditor";

const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "America/Toronto",
  "America/Vancouver", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Australia/Sydney", "Pacific/Auckland",
];

type SaveStatus = "idle" | "saving" | "saved";

const SaveIndicator = ({ status }: { status: SaveStatus }) => {
  if (status === "idle") return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {status === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
      {status === "saved" && <><Check className="w-3 h-3 text-green-600" /> Saved</>}
    </span>
  );
};

const AdminSettings = () => {
  const [cashApp, setCashApp] = useState({ cashtag: "", note: "" });
  const [zelle, setZelle] = useState({ email: "", phone: "", note: "" });
  const [deposit, setDeposit] = useState({ type: "none", value: 0 });
  const [buffer, setBuffer] = useState({ minutes: 0 });
  const [salonName, setSalonName] = useState("Luxe Salon");
  const [timezone, setTimezone] = useState("America/New_York");
  const [emailConfig, setEmailConfig] = useState({ from_name: "", from_email: "", admin_email: "" });
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplates>(DEFAULT_TEMPLATES);
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("settings").select("key, value");
      (data || []).forEach((s: any) => {
        const v = s.value as any;
        if (s.key === "cash_app_details") setCashApp(v);
        if (s.key === "zelle_details") setZelle(v);
        if (s.key === "deposit_rules") setDeposit(v);
        if (s.key === "buffer_time") setBuffer(v);
        if (s.key === "salon_name") setSalonName(v.name || "Luxe Salon");
        if (s.key === "timezone") setTimezone(v.timezone || "America/New_York");
        if (s.key === "email_config") setEmailConfig(v);
        if (s.key === "email_templates") setEmailTemplates({ ...DEFAULT_TEMPLATES, ...v });
      });
      setLoaded(true);
    };
    fetchSettings();
  }, []);

  const saveSetting = useCallback(async (key: string, value: any) => {
    setSaveStatuses((p) => ({ ...p, [key]: "saving" }));
    const { data: existing } = await supabase.from("settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("settings").insert({ key, value });
    }
    setSaveStatuses((p) => ({ ...p, [key]: "saved" }));
    setTimeout(() => setSaveStatuses((p) => ({ ...p, [key]: "idle" })), 2000);
  }, []);

  const debouncedSave = useCallback((key: string, value: any) => {
    if (!loaded) return;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => saveSetting(key, value), 800);
  }, [loaded, saveSetting]);

  useEffect(() => { debouncedSave("salon_name", { name: salonName }); }, [salonName]);
  useEffect(() => { debouncedSave("timezone", { timezone }); }, [timezone]);
  useEffect(() => { debouncedSave("cash_app_details", cashApp); }, [cashApp]);
  useEffect(() => { debouncedSave("zelle_details", zelle); }, [zelle]);
  useEffect(() => { debouncedSave("deposit_rules", deposit); }, [deposit]);
  useEffect(() => { debouncedSave("buffer_time", buffer); }, [buffer]);
  useEffect(() => { debouncedSave("email_config", emailConfig); }, [emailConfig]);
  useEffect(() => { debouncedSave("email_templates", emailTemplates); }, [emailTemplates]);

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base md:text-lg">Salon Info</CardTitle>
              <SaveIndicator status={saveStatuses["salon_name"] || "idle"} />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>Salon Name</Label>
              <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base md:text-lg flex items-center gap-2">
                <Globe className="w-4 h-4" /> Timezone
              </CardTitle>
              <SaveIndicator status={saveStatuses["timezone"] || "idle"} />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>Salon Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">All booking times will be displayed in this timezone.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base md:text-lg">Cash App</CardTitle>
              <SaveIndicator status={saveStatuses["cash_app_details"] || "idle"} />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div><Label>$Cashtag</Label><Input value={cashApp.cashtag} onChange={(e) => setCashApp({ ...cashApp, cashtag: e.target.value })} className="mt-1" placeholder="$YourCashTag" /></div>
            <div><Label>Note / Instructions</Label><Input value={cashApp.note} onChange={(e) => setCashApp({ ...cashApp, note: e.target.value })} className="mt-1" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base md:text-lg">Zelle</CardTitle>
              <SaveIndicator status={saveStatuses["zelle_details"] || "idle"} />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div><Label>Email</Label><Input value={zelle.email} onChange={(e) => setZelle({ ...zelle, email: e.target.value })} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={zelle.phone} onChange={(e) => setZelle({ ...zelle, phone: e.target.value })} className="mt-1" /></div>
            <div><Label>Note / Instructions</Label><Input value={zelle.note} onChange={(e) => setZelle({ ...zelle, note: e.target.value })} className="mt-1" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base md:text-lg">Deposit Rules</CardTitle>
              <SaveIndicator status={saveStatuses["deposit_rules"] || "idle"} />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>Deposit Type</Label>
              <Select value={deposit.type} onValueChange={(v) => setDeposit({ ...deposit, type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Full Payment</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {deposit.type !== "none" && (
              <div>
                <Label>{deposit.type === "percentage" ? "Percentage (%)" : "Amount ($)"}</Label>
                <Input type="number" value={deposit.value} onChange={(e) => setDeposit({ ...deposit, value: parseFloat(e.target.value) || 0 })} className="mt-1" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base md:text-lg">Buffer Time</CardTitle>
              <SaveIndicator status={saveStatuses["buffer_time"] || "idle"} />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>Minutes between bookings</Label>
              <Input type="number" value={buffer.minutes} onChange={(e) => setBuffer({ minutes: parseInt(e.target.value) || 0 })} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Configuration */}
      <Card>
        <CardHeader className="px-4 md:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-base md:text-lg flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email Configuration
            </CardTitle>
            <SaveIndicator status={saveStatuses["email_config"] || "idle"} />
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>From Name</Label><Input value={emailConfig.from_name} onChange={(e) => setEmailConfig({ ...emailConfig, from_name: e.target.value })} className="mt-1" placeholder="Luxe Salon" /></div>
            <div><Label>From Email</Label><Input type="email" value={emailConfig.from_email} onChange={(e) => setEmailConfig({ ...emailConfig, from_email: e.target.value })} className="mt-1" placeholder="noreply@yoursalon.com" /></div>
          </div>
          <div>
            <Label>Admin Notification Email</Label>
            <Input type="email" value={emailConfig.admin_email} onChange={(e) => setEmailConfig({ ...emailConfig, admin_email: e.target.value })} className="mt-1" placeholder="admin@yoursalon.com" />
            <p className="text-xs text-muted-foreground mt-1">Receives new booking alerts and cancellation notices.</p>
          </div>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader className="px-4 md:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-base md:text-lg">Email Templates</CardTitle>
            <SaveIndicator status={saveStatuses["email_templates"] || "idle"} />
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <EmailTemplateEditor templates={emailTemplates} onChange={setEmailTemplates} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
