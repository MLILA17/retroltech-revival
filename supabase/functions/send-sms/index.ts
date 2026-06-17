import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RAFIKI_API_KEY = Deno.env.get("RAFIKI_API_KEY") || "sk_HbDq195unGBJmaiuj8hvwg4r1NyeUHUn5gW7hTA7b5DGkmIV";
const RAFIKI_SENDER_ID = "DMLTECH";

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+255")) return cleaned.slice(1);
  if (cleaned.startsWith("255")) return cleaned;
  if (cleaned.startsWith("0")) return `255${cleaned.slice(1)}`;
  return `255${cleaned}`;
}

async function sendRafikiSMS(phone: string, message: string) {
  const normalizedPhone = normalizePhone(phone);
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
    throw new Error(`Rafiki API error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

async function saveSmsLog(supabase: any, phone: string, message: string, status: string, orderId?: string, error?: string) {
  try {
    await supabase.from("sms_logs").insert({
      phone,
      message,
      status,
      order_id: orderId || null,
      error: error || null,
    });
  } catch {
    // Silent fail for logging
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
    const { phone, message, type, orderId, orderNumber, amount } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: phone, message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalMessage = message;

    if (type === "order_confirmation" && orderNumber) {
      finalMessage = `Retro-Tech Revival: Your order #${orderNumber} has been received! Total: ${amount || '0'}. We'll notify you when it ships. Thank you for shopping!`;
    } else if (type === "payment_successful" && orderNumber) {
      finalMessage = `Retro-Tech Revival: Payment successful for order #${orderNumber}! Amount: ${amount || '0'}. Your order is now being processed.`;
    } else if (type === "order_shipped" && orderNumber) {
      finalMessage = `Retro-Tech Revival: Great news! Order #${orderNumber} has been shipped and is on its way to you. Thank you for your patience!`;
    } else if (type === "payment_pending" && orderNumber) {
      finalMessage = `Retro-Tech Revival: Your payment for order #${orderNumber} is pending. Please complete your payment to proceed with your order.`;
    } else if (type === "payment_failed" && orderNumber) {
      finalMessage = `Retro-Tech Revival: Payment failed for order #${orderNumber}. Please try again or contact support for assistance.`;
    }

    if (finalMessage.length > 160) {
      finalMessage = finalMessage.substring(0, 157) + "...";
    }

    const result = await sendRafikiSMS(phone, finalMessage);
    await saveSmsLog(supabase, phone, finalMessage, "sent", orderId);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    await saveSmsLog(supabase, "", "", "failed", undefined, err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
