import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // 1. Handle Test Email directly from Admin Settings Panel
    if (payload.config && payload.html) {
      const { to, subject, html, config } = payload;
      const toArray = to.split(',').map((e: string) => e.trim());
      
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.resend_api_key}`,
        },
        body: JSON.stringify({
          from: `${config.from_name} <${config.from_email}>`,
          to: toArray,
          subject,
          html,
        }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Handle Automated Database Webhooks
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, table, record, old_record } = payload;
    if (!record) throw new Error("No record found in webhook payload");

    // Fetch global email settings & templates from the database
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['email_config', 'email_templates', 'salon_name']);
      
    const configMap = (settings || []).reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as any);
    const emailConfig = configMap.email_config || {};
    const templates = configMap.email_templates || {};
    const salonName = configMap.salon_name?.name || "Our Salon";

    if (!emailConfig?.resend_api_key || !emailConfig?.from_email) {
      throw new Error("Resend API key or From Email missing in settings");
    }

    // Helper: Send emails via Resend (supports multiple emails separated by comma for group notifications)
    const sendEmail = async (to: string, subject: string, html: string) => {
      if (!to) return; // Prevent crashes if admin email or customer email is missing
      const toArray = to.split(',').map(e => e.trim()).filter(Boolean);
      if (toArray.length === 0) return;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${emailConfig.resend_api_key}`,
        },
        body: JSON.stringify({
          from: `${emailConfig.from_name || salonName} <${emailConfig.from_email}>`,
          to: toArray,
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Resend API Error for", to, ":", errorText);
      }
    };

    // Helper: Replace template placeholders with real database data
    const populate = (text: string, data: any) => {
      if (!text) return "";
      return text
        .replace(/{{customer_name}}/g, data.customer_name || "")
        .replace(/{{customer_email}}/g, data.customer_email || "")
        .replace(/{{service_name}}/g, data.service_name || "a service")
        .replace(/{{booking_date}}/g, data.booking_date || "")
        .replace(/{{booking_time}}/g, data.start_time ? data.start_time.substring(0, 5) : "")
        .replace(/{{amount}}/g, data.amount ? `$${Number(data.amount).toFixed(2)}` : "")
        .replace(/{{salon_name}}/g, salonName);
    };

    // --- ROUTING LOGIC ---

    // A. Bookings (New, Canceled, Rescheduled)
    if (table === 'bookings') {
      let serviceName = "a service";
      if (record.service_id) {
        const { data: svc } = await supabase.from('services').select('name').eq('id', record.service_id).single();
        if (svc) serviceName = svc.name;
      }
      const tData = { ...record, service_name: serviceName };

      // Event: New Booking
      if (type === 'INSERT') {
        if (templates?.new_booking_admin?.enabled) {
          await sendEmail(emailConfig.admin_email, populate(templates.new_booking_admin.subject, tData), populate(templates.new_booking_admin.body, tData));
        }
        if (templates?.booking_confirmation?.enabled) {
          await sendEmail(record.customer_email, populate(templates.booking_confirmation.subject, tData), populate(templates.booking_confirmation.body, tData));
        }
      }
      // Event: Updated Booking
      else if (type === 'UPDATE') {
        // Condition: Cancelled
        if (record.status === 'cancelled' && old_record.status !== 'cancelled') {
          if (templates?.cancellation_notice?.enabled) {
            await sendEmail(emailConfig.admin_email, populate(templates.cancellation_notice.subject, tData), populate(templates.cancellation_notice.body, tData));
          }
          if (templates?.cancellation_customer?.enabled !== false) {
            const subj = templates?.cancellation_customer?.subject || "Booking Cancelled - {{salon_name}}";
            const body = templates?.cancellation_customer?.body || "<p>Hi {{customer_name}}, your booking for {{service_name}} on {{booking_date}} has been cancelled.</p>";
            await sendEmail(record.customer_email, populate(subj, tData), populate(body, tData));
          }
        }
        // Condition: Rescheduled (Date or Time changed)
        else if ((record.booking_date !== old_record.booking_date || record.start_time !== old_record.start_time) && record.status !== 'cancelled') {
          if (templates?.reschedule_customer?.enabled !== false) {
            const subj = templates?.reschedule_customer?.subject || "Booking Rescheduled - {{salon_name}}";
            const body = templates?.reschedule_customer?.body || "<p>Hi {{customer_name}}, your booking for {{service_name}} has been rescheduled to {{booking_date}} at {{booking_time}}.</p>";
            await sendEmail(record.customer_email, populate(subj, tData), populate(body, tData));
          }
          if (templates?.reschedule_admin?.enabled !== false) {
            const subj = templates?.reschedule_admin?.subject || "Booking Rescheduled: {{customer_name}}";
            const body = templates?.reschedule_admin?.body || "<p>{{customer_name}}'s booking was rescheduled to {{booking_date}} at {{booking_time}}.</p>";
            await sendEmail(emailConfig.admin_email, populate(subj, tData), populate(body, tData));
          }
        }
      }
    }

    // B. Payments (New Payment Submitted)
    else if (table === 'payments' && type === 'INSERT') {
      const { data: bk } = await supabase.from('bookings').select('customer_name, customer_email, booking_date, start_time, services(name)').eq('id', record.booking_id).single();
      if (bk) {
        const pData = {
          ...record,
          customer_name: bk.customer_name, customer_email: bk.customer_email,
          booking_date: bk.booking_date, start_time: bk.start_time,
          service_name: bk.services?.name || "a service"
        };

        if (templates?.payment_received?.enabled) {
          await sendEmail(bk.customer_email, populate(templates.payment_received.subject, pData), populate(templates.payment_received.body, pData));
        }
        // Admin / Group Alert
        if (templates?.payment_admin?.enabled !== false) {
          const subj = templates?.payment_admin?.subject || "Payment Received: {{customer_name}}";
          const body = templates?.payment_admin?.body || "<p>{{customer_name}} just submitted a payment of {{amount}} for {{service_name}}.</p>";
          await sendEmail(emailConfig.admin_email, populate(subj, pData), populate(body, pData));
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});