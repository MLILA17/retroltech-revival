import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RAFIKI_API_KEY = Deno.env.get("RAFIKI_API_KEY")!;
const RAFIKI_SENDER_ID = "DMLTECH";

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+255")) return cleaned.slice(1);
  if (cleaned.startsWith("255")) return cleaned;
  if (cleaned.startsWith("0")) return `255${cleaned.slice(1)}`;
  return `255${cleaned}`;
}

async function sendRafikiSMS(phone: string, message: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const normalizedPhone = normalizePhone(phone);

  try {
    const response = await fetch("https://api.rafikisms.com/v1/vendor/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": RAFIKI_API_KEY,
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        message: message,
        sender_id: RAFIKI_SENDER_ID,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, error: `Rafiki API error (${response.status}): ${JSON.stringify(data)}` };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendBulkRafikiSMS(phones: string[], message: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const normalizedPhones = phones.map(p => normalizePhone(p)).join(",");

  try {
    const response = await fetch("https://api.rafikisms.com/v1/vendor/send-bulk-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": RAFIKI_API_KEY,
      },
      body: JSON.stringify({
        phone: normalizedPhones,
        message: message,
        sender_id: RAFIKI_SENDER_ID,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, error: `Rafiki bulk API error (${response.status}): ${JSON.stringify(data)}` };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function saveSmsLog(supabase: any, phone: string, message: string, status: string, orderId?: string, error?: string, smsType?: string) {
  try {
    await supabase.from("sms_logs").insert({
      phone,
      message,
      status,
      order_id: orderId || null,
      error: error || null,
      sms_type: smsType || null,
    });
  } catch {
    // Silent fail for logging
  }
}

function buildMessage(type: string, params: Record<string, any>): string {
  const { orderNumber, amount, trackingNumber, code } = params;

  switch (type) {
    case "order_confirmation":
      return `Retro-Tech Revival: Your order #${orderNumber} has been received! Total: ${amount || '0'}. We'll notify you when it ships. Thank you for shopping!`;

    case "payment_successful":
      return `Retro-Tech Revival: Payment successful for order #${orderNumber}! Amount: ${amount || '0'}. Your order is now being processed.`;

    case "payment_pending":
      return `Retro-Tech Revival: Your payment for order #${orderNumber} is pending. Please complete your payment to proceed.`;

    case "payment_failed":
      return `Retro-Tech Revival: Payment failed for order #${orderNumber}. Please try again or contact support.`;

    case "order_processing":
      return `Retro-Tech Revival: Good news! Order #${orderNumber} is now being prepared for shipment.`;

    case "order_shipped":
      return `Retro-Tech Revival: Great news! Order #${orderNumber} has been shipped and is on its way to you. ${trackingNumber ? `Tracking: ${trackingNumber}` : ''} Thank you!`;

    case "order_delivered":
      return `Retro-Tech Revival: Your order #${orderNumber} has been delivered! Thank you for shopping with us. We'd love to hear your feedback.`;

    case "order_cancelled":
      return `Retro-Tech Revival: Order #${orderNumber} has been cancelled. If you have any questions, please contact support.`;

    case "welcome":
      return `Welcome to Retro-Tech Revival! Thank you for creating an account. Browse our collection of refurbished and vintage electronics.`;

    case "verification":
      return `Retro-Tech Revival: Your verification code is ${code}. Valid for 5 minutes. Do not share this code.`;

    default:
      return params.message || '';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { phone, phones, message, type, orderId, orderNumber, amount, trackingNumber, code } = body;

    // Handle bulk SMS
    if (phones && Array.isArray(phones)) {
      const bulkMessage = message || buildMessage(type, { orderNumber, amount });
      if (!bulkMessage) {
        return new Response(JSON.stringify({ error: "Missing message for bulk SMS" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await sendBulkRafikiSMS(phones, bulkMessage);

      if (result.success) {
        for (const p of phones) {
          await saveSmsLog(supabase, p, bulkMessage, "sent", undefined, undefined, type);
        }
      }

      return new Response(JSON.stringify({ success: result.success, data: result.data, error: result.error }), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single SMS
    if (!phone) {
      return new Response(JSON.stringify({ error: "Missing required field: phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalMessage = message;

    // Build message from type
    if (type && !message) {
      finalMessage = buildMessage(type, { orderNumber, amount, trackingNumber, code });
    }

    if (!finalMessage) {
      return new Response(JSON.stringify({ error: "Missing message or valid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate if too long (160 chars max for SMS)
    if (finalMessage.length > 160) {
      finalMessage = finalMessage.substring(0, 157) + "...";
    }

    const result = await sendRafikiSMS(phone, finalMessage);

    if (result.success) {
      await saveSmsLog(supabase, phone, finalMessage, "sent", orderId, undefined, type);
    } else {
      await saveSmsLog(supabase, phone, finalMessage, "failed", orderId, result.error, type);
    }

    return new Response(JSON.stringify({
      success: result.success,
      data: result.data,
      error: result.error,
      phone: normalizePhone(phone),
      message: finalMessage,
    }), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("SMS error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
