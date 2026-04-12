import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [salonName, setSalonName] = useState("Hair by Rhuqqui");
  const [baseUrl, setBaseUrl] = useState("");
  const [terms, setTerms] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [emailConfig, setEmailConfig] = useState({ from_name: "", from_email: "", admin_email: "", resend_api_key: "" });
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplates>(DEFAULT_TEMPLATES);
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [loaded, setLoaded] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState("booking_confirmation");
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
        if (s.key === "salon_name") setSalonName(v.name || "Hair by Rhuqqui");
        if (s.key === "base_url") setBaseUrl(v.url || "");
        if (s.key === "terms_and_conditions") setTerms(v.text || "");
        if (s.key === "timezone") setTimezone(v.timezone || "America/New_York");
        if (s.key === "email_config") setEmailConfig({ from_name: "", from_email: "", admin_email: "", resend_api_key: "", ...v });
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
  useEffect(() => { debouncedSave("base_url", { url: baseUrl }); }, [baseUrl]);
  useEffect(() => { debouncedSave("terms_and_conditions", { text: terms }); }, [terms]);
  useEffect(() => { debouncedSave("timezone", { timezone }); }, [timezone]);
  useEffect(() => { debouncedSave("cash_app_details", cashApp); }, [cashApp]);
  useEffect(() => { debouncedSave("zelle_details", zelle); }, [zelle]);
  useEffect(() => { debouncedSave("deposit_rules", deposit); }, [deposit]);
  useEffect(() => { debouncedSave("buffer_time", buffer); }, [buffer]);
  useEffect(() => { debouncedSave("email_config", emailConfig); }, [emailConfig]);
  useEffect(() => { debouncedSave("email_templates", emailTemplates); }, [emailTemplates]);

  const handleTestEmail = async () => {
    if (!emailConfig.resend_api_key || !emailConfig.from_email || !emailConfig.admin_email) {
      toast({ title: "Missing configuration", description: "Please fill in From Email, Admin Email, and API Key to test.", variant: "destructive" });
      return;
    }
    setTestingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: emailConfig.admin_email,
          subject: "Test Email from " + salonName,
          html: "<p>Your email configuration is working perfectly!</p>",
          config: emailConfig
        }
      });
      if (error) throw error;
      toast({ title: "Test email sent!", description: "Check the admin inbox." });
    } catch (error: any) {
      toast({ title: "Failed to send test email", description: error.message || "Make sure you have deployed the 'send-email' edge function.", variant: "destructive" });
    } finally {
      setTestingEmail(false);
    }
  };

  const getPreviewHtml = (templateKey: string) => {
    const template = (emailTemplates as any)[templateKey];
    if (!template) return "";
    let html = template.body || "";
    html = html.replace(/{{customer_name}}/g, "Jane Doe")
               .replace(/{{service_name}}/g, "Signature Haircut")
               .replace(/{{booking_date}}/g, "October 25, 2024")
               .replace(/{{booking_time}}/g, "2:00 PM")
               .replace(/{{amount}}/g, "$50.00")
               .replace(/{{salon_name}}/g, salonName || "Our Salon")
               .replace(/{{token}}/g, "abc-123-xyz")
               .replace(/{{base_url}}/g, baseUrl ? baseUrl.replace(/\/$/, '') : "https://your-website.com");
               
    const sName = salonName || "Our Salon";
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #3f3f46; line-height: 1.6; border-radius: 8px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e4e4e7;">
          <div style="background-color: #18181b; color: #ffffff; padding: 24px; text-align: center; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${sName}</div>
          <div style="padding: 32px; font-size: 15px;">${html}</div>
          <div style="padding: 20px; text-align: center; font-size: 12px; color: #a1a1aa; border-top: 1px solid #e4e4e7; background-color: #fafafa;">&copy; ${new Date().getFullYear()} ${sName}. All rights reserved.</div>
        </div>
      </div>
    `;
  };

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base md:text-lg">Salon Info</CardTitle>
              <SaveIndicator status={saveStatuses["salon_name"] || saveStatuses["base_url"] || "idle"} />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>Salon Name</Label>
              <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Website Base URL</Label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="mt-1" placeholder="https://example.com" />
              <p className="text-xs text-muted-foreground mt-1.5">Used for generating links in emails (e.g., booking status).</p>
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

      <Card>
        <CardHeader className="px-4 md:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-base md:text-lg">Terms & Conditions</CardTitle>
            <SaveIndicator status={saveStatuses["terms_and_conditions"] || "idle"} />
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6 space-y-3">
          <div>
            <Label>Booking Terms & Policy</Label>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1 min-h-[100px]" placeholder="e.g. All deposits are non-refundable. Please arrive 10 minutes early..." />
            <p className="text-xs text-muted-foreground mt-1.5">Displayed to customers during the details step of the booking process.</p>
          </div>
        </CardContent>
      </Card>

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
            <div><Label>From Name</Label><Input value={emailConfig.from_name} onChange={(e) => setEmailConfig({ ...emailConfig, from_name: e.target.value })} className="mt-1" placeholder="Hair by Rhuqqui" /></div>
            <div><Label>From Email</Label><Input type="email" value={emailConfig.from_email} onChange={(e) => setEmailConfig({ ...emailConfig, from_email: e.target.value })} className="mt-1" placeholder="noreply@yoursalon.com" /></div>
          </div>
          <div>
            <Label>Admin Notification Email</Label>
            <Input type="email" value={emailConfig.admin_email} onChange={(e) => setEmailConfig({ ...emailConfig, admin_email: e.target.value })} className="mt-1" placeholder="admin@yoursalon.com" />
            <p className="text-xs text-muted-foreground mt-1">Receives new booking alerts and cancellation notices.</p>
          </div>
          <div>
            <Label>Resend API Key</Label>
            <Input type="password" value={emailConfig.resend_api_key || ""} onChange={(e) => setEmailConfig({ ...emailConfig, resend_api_key: e.target.value })} className="mt-1" placeholder="re_..." />
            <p className="text-xs text-muted-foreground mt-1">Used to send emails via Resend. Get this from your Resend dashboard.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleTestEmail} disabled={testingEmail}>
              {testingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Test Email Config
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              Preview Templates
            </Button>
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif">Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div>
              <Label>Select Template to Preview</Label>
              <Select value={previewTemplate} onValueChange={setPreviewTemplate}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking_confirmation">Booking Confirmed</SelectItem>
                  <SelectItem value="payment_received">Payment Received (Customer)</SelectItem>
                  <SelectItem value="payment_admin">Payment Received (Admin)</SelectItem>
                  <SelectItem value="new_booking_admin">New Booking Alert</SelectItem>
                  <SelectItem value="cancellation_notice">Cancellation Notice</SelectItem>
                  <SelectItem value="cancellation_customer">Cancellation Notice (Customer)</SelectItem>
                  <SelectItem value="reschedule_customer">Booking Rescheduled (Customer)</SelectItem>
                  <SelectItem value="reschedule_admin">Booking Rescheduled (Admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-auto rounded-md">
              <div dangerouslySetInnerHTML={{ __html: getPreviewHtml(previewTemplate) }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
