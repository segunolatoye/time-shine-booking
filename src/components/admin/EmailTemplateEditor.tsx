import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface EmailTemplate {
  subject: string;
  body: string;
  enabled: boolean;
}

export interface EmailTemplates {
  booking_confirmation: EmailTemplate;
  payment_received: EmailTemplate;
  payment_admin: EmailTemplate;
  new_booking_admin: EmailTemplate;
  cancellation_notice: EmailTemplate;
  cancellation_customer: EmailTemplate;
  reschedule_customer: EmailTemplate;
  reschedule_admin: EmailTemplate;
}

export const DEFAULT_TEMPLATES: EmailTemplates = {
  booking_confirmation: {
    subject: "Booking Confirmed: {{service_name}}",
    body: "<p>Hi {{customer_name}},</p>\n<p>Your booking for <strong>{{service_name}}</strong> on <strong>{{booking_date}}</strong> at <strong>{{booking_time}}</strong> is confirmed.</p>\n<p>View your booking details and status here:<br/><a href=\"{{base_url}}/booking/{{token}}\">{{base_url}}/booking/{{token}}</a></p>\n<p>Thank you,<br/>{{salon_name}}</p>",
    enabled: true,
  },
  payment_received: {
    subject: "Payment Received",
    body: "<p>Hi {{customer_name}},</p>\n<p>We have successfully received your payment of <strong>{{amount}}</strong> for your upcoming appointment on {{booking_date}}.</p>\n<p>View your booking details here:<br/><a href=\"{{base_url}}/booking/{{token}}\">{{base_url}}/booking/{{token}}</a></p>\n<p>Thank you,<br/>{{salon_name}}</p>",
    enabled: true,
  },
  payment_admin: {
    subject: "Payment Received: {{customer_name}}",
    body: "<p>{{customer_name}} just submitted a payment of {{amount}} for {{service_name}}.</p>\n<p><a href=\"{{base_url}}/admin/payments\">View Payments in Admin Panel</a></p>",
    enabled: true,
  },
  new_booking_admin: {
    subject: "New Booking: {{customer_name}}",
    body: "<p>You have a new booking.</p>\n<p><strong>Customer:</strong> {{customer_name}}<br/><strong>Service:</strong> {{service_name}}<br/><strong>Date:</strong> {{booking_date}}<br/><strong>Time:</strong> {{booking_time}}</p>\n<p><a href=\"{{base_url}}/admin/bookings\">View Bookings in Admin Panel</a></p>",
    enabled: true,
  },
  cancellation_notice: {
    subject: "Booking Cancelled: {{customer_name}}",
    body: "<p>The following booking has been cancelled.</p>\n<p><strong>Customer:</strong> {{customer_name}}<br/><strong>Service:</strong> {{service_name}}<br/><strong>Date:</strong> {{booking_date}}<br/><strong>Time:</strong> {{booking_time}}</p>\n<p><a href=\"{{base_url}}/admin/bookings\">View Bookings in Admin Panel</a></p>",
    enabled: true,
  },
  cancellation_customer: {
    subject: "Booking Cancelled - {{salon_name}}",
    body: "<p>Hi {{customer_name}},</p>\n<p>Your booking for <strong>{{service_name}}</strong> on <strong>{{booking_date}}</strong> at <strong>{{booking_time}}</strong> has been cancelled.</p>\n<p>View your booking details here:<br/><a href=\"{{base_url}}/booking/{{token}}\">{{base_url}}/booking/{{token}}</a></p>\n<p>If you have any questions or would like to rebook, please contact us.</p>\n<p>Thank you,<br/>{{salon_name}}</p>",
    enabled: true,
  },
  reschedule_customer: {
    subject: "Booking Rescheduled - {{salon_name}}",
    body: "<p>Hi {{customer_name}},</p>\n<p>Your booking for <strong>{{service_name}}</strong> has been rescheduled to <strong>{{booking_date}}</strong> at <strong>{{booking_time}}</strong>.</p>\n<p>View your booking details and status here:<br/><a href=\"{{base_url}}/booking/{{token}}\">{{base_url}}/booking/{{token}}</a></p>\n<p>Thank you,<br/>{{salon_name}}</p>",
    enabled: true,
  },
  reschedule_admin: {
    subject: "Booking Rescheduled: {{customer_name}}",
    body: "<p>A booking has been rescheduled.</p>\n<p><strong>Customer:</strong> {{customer_name}}<br/><strong>Service:</strong> {{service_name}}<br/><strong>New Date:</strong> {{booking_date}}<br/><strong>New Time:</strong> {{booking_time}}</p>\n<p><a href=\"{{base_url}}/admin/bookings\">View Bookings in Admin Panel</a></p>",
    enabled: true,
  },
};

interface EmailTemplateEditorProps {
  templates: EmailTemplates;
  onChange: (templates: EmailTemplates) => void;
}

const templateOptions: { value: keyof EmailTemplates; label: string }[] = [
  { value: "booking_confirmation", label: "Booking Confirmed (Customer)" },
  { value: "payment_received", label: "Payment Received (Customer)" },
  { value: "payment_admin", label: "Payment Received (Admin)" },
  { value: "new_booking_admin", label: "New Booking Alert (Admin)" },
  { value: "cancellation_notice", label: "Cancellation Notice (Admin)" },
  { value: "cancellation_customer", label: "Cancellation Notice (Customer)" },
  { value: "reschedule_customer", label: "Booking Rescheduled (Customer)" },
  { value: "reschedule_admin", label: "Booking Rescheduled (Admin)" },
];

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ templates, onChange }) => {
  const [activeKey, setActiveKey] = useState<keyof EmailTemplates>("booking_confirmation");

  const activeTemplate = templates[activeKey] || DEFAULT_TEMPLATES[activeKey];

  const handleChange = (field: keyof EmailTemplate, value: string | boolean) => {
    onChange({
      ...templates,
      [activeKey]: {
        ...activeTemplate,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Select Template</Label>
        <Select value={activeKey} onValueChange={(v: keyof EmailTemplates) => setActiveKey(v)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templateOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 p-4 border border-border rounded-lg bg-secondary/20">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Edit Template</h3>
          <div className="flex items-center gap-2">
            <Switch checked={activeTemplate.enabled} onCheckedChange={(v) => handleChange("enabled", v)} />
            <Label className="text-sm">Enabled</Label>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Subject Line</Label>
            <Input value={activeTemplate.subject} onChange={(e) => handleChange("subject", e.target.value)} className="mt-1" />
          </div>
          
          <div>
            <Label>Email Body (HTML)</Label>
            <Textarea value={activeTemplate.body} onChange={(e) => handleChange("body", e.target.value)} className="mt-1 min-h-[200px] font-mono text-xs" />
          </div>
        </div>

        <div className="bg-background p-3 rounded border border-border text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground mb-2">Available Placeholders:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <code>{`{{customer_name}}`}</code>
            <code>{`{{service_name}}`}</code>
            <code>{`{{booking_date}}`}</code>
            <code>{`{{booking_time}}`}</code>
            <code>{`{{salon_name}}`}</code>
            <code>{`{{amount}}`}</code>
            <code>{`{{token}}`}</code>
            <code>{`{{base_url}}`}</code>
          </div>
          <p className="pt-2 italic">Placeholders will be replaced with real data when the email is sent.</p>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;