import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface EmailTemplate {
  enabled: boolean;
  subject: string;
  body: string;
}

export interface EmailTemplates {
  booking_confirmation: EmailTemplate;
  payment_received: EmailTemplate;
  new_booking_admin: EmailTemplate;
  cancellation_notice: EmailTemplate;
}

const DEFAULT_TEMPLATES: EmailTemplates = {
  booking_confirmation: {
    enabled: true,
    subject: "Your booking is confirmed - {{salon_name}}",
    body: `<h2>Hi {{customer_name}},</h2>
<p>Your booking has been confirmed!</p>
<p><strong>Service:</strong> {{service_name}}</p>
<p><strong>Date:</strong> {{booking_date}}</p>
<p><strong>Time:</strong> {{booking_time}}</p>
<p>Thank you for choosing {{salon_name}}!</p>`,
  },
  payment_received: {
    enabled: true,
    subject: "Payment received - {{salon_name}}",
    body: `<h2>Hi {{customer_name}},</h2>
<p>We've received your payment of {{amount}}.</p>
<p><strong>Service:</strong> {{service_name}}</p>
<p><strong>Date:</strong> {{booking_date}}</p>
<p>Thank you!</p>`,
  },
  new_booking_admin: {
    enabled: true,
    subject: "New booking: {{customer_name}} - {{service_name}}",
    body: `<h2>New Booking Alert</h2>
<p><strong>Customer:</strong> {{customer_name}} ({{customer_email}})</p>
<p><strong>Service:</strong> {{service_name}}</p>
<p><strong>Date:</strong> {{booking_date}} at {{booking_time}}</p>`,
  },
  cancellation_notice: {
    enabled: true,
    subject: "Booking cancelled - {{customer_name}}",
    body: `<h2>Booking Cancelled</h2>
<p><strong>Customer:</strong> {{customer_name}}</p>
<p><strong>Service:</strong> {{service_name}}</p>
<p><strong>Date:</strong> {{booking_date}} at {{booking_time}}</p>`,
  },
};

const TEMPLATE_INFO: Record<keyof EmailTemplates, { label: string; recipient: string }> = {
  booking_confirmation: { label: "Booking Confirmation", recipient: "Customer" },
  payment_received: { label: "Payment Received", recipient: "Customer" },
  new_booking_admin: { label: "New Booking Alert", recipient: "Admin" },
  cancellation_notice: { label: "Cancellation Notice", recipient: "Admin" },
};

const PLACEHOLDERS = [
  "{{customer_name}}", "{{customer_email}}", "{{service_name}}",
  "{{booking_date}}", "{{booking_time}}", "{{amount}}", "{{salon_name}}",
];

interface Props {
  templates: EmailTemplates;
  onChange: (templates: EmailTemplates) => void;
}

const EmailTemplateEditor: React.FC<Props> = ({ templates, onChange }) => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const updateTemplate = (key: keyof EmailTemplates, field: keyof EmailTemplate, value: any) => {
    onChange({
      ...templates,
      [key]: { ...templates[key], [field]: value },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="text-xs text-muted-foreground">Available placeholders:</span>
        {PLACEHOLDERS.map((p) => (
          <Badge key={p} variant="secondary" className="text-xs font-mono">{p}</Badge>
        ))}
      </div>

      {(Object.keys(TEMPLATE_INFO) as (keyof EmailTemplates)[]).map((key) => {
        const info = TEMPLATE_INFO[key];
        const tmpl = templates[key] || DEFAULT_TEMPLATES[key];
        const isOpen = openKey === key;

        return (
          <Collapsible key={key} open={isOpen} onOpenChange={(v) => setOpenKey(v ? key : null)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">{info.label}</CardTitle>
                      <Badge variant="outline" className="text-xs">{info.recipient}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tmpl.enabled}
                        onCheckedChange={(v) => updateTemplate(key, "enabled", v)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div>
                    <Label className="text-xs">Subject Line</Label>
                    <Input
                      value={tmpl.subject}
                      onChange={(e) => updateTemplate(key, "subject", e.target.value)}
                      className="mt-1 text-sm"
                      placeholder="Email subject..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs">HTML Body</Label>
                    <Textarea
                      value={tmpl.body}
                      onChange={(e) => updateTemplate(key, "body", e.target.value)}
                      className="mt-1 text-sm font-mono min-h-[150px]"
                      placeholder="<h2>Hello {{customer_name}}</h2>..."
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export { DEFAULT_TEMPLATES };
export default EmailTemplateEditor;
