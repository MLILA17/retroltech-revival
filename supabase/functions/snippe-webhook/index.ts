import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WEBHOOK_SECRET = Deno.env.get("SNIPPE_WEBHOOK_SECRET")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Retro-Tech Revival <noreply@dml-tech.online>";
const RAFIKI_API_KEY = Deno.env.get("RAFIKI_API_KEY")!;
const RAFIKI_SENDER_ID = "DMLTECH";

const LOGO_URL = "https://vywdpyaxkdhtnyoaumkn.supabase.co/storage/v1/object/public/public/logo.png";

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+255")) return cleaned.slice(1);
  if (cleaned.startsWith("255")) return cleaned;
  if (cleaned.startsWith("0")) return `255${cleaned.slice(1)}`;
  return `255${cleaned}`;
}

async function sendEmail(to: string, subject: string, type: string, payload: any) {
  try {
    const body: any = { to, subject, type, logoUrl: LOGO_URL };

    if (type === "order_confirmation" || type === "payment_successful" || type === "order_shipped" || type === "payment_failed") {
      body.orderNumber = payload.orderNumber;
      body.amount = payload.amount;
      body.status = payload.status;
    } else if (type === "email_confirmation") {
      body.body = payload.confirmUrl;
    } else {
      body.body = payload.body;
    }

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Email send error:", data);
    } else {
      console.log("Email sent:", type, "to:", to);
    }
  } catch (err) {
    console.error("Email send exception:", err);
  }
}

async function sendSMS(phone: string, type: string, payload: any) {
  try {
    const body: any = { phone, type, orderId: payload.orderId, orderNumber: payload.orderNumber, amount: payload.amount };

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("SMS send error:", data);
    } else {
      console.log("SMS sent:", type, "to:", phone);
    }
  } catch (err) {
    console.error("SMS send exception:", err);
  }
}

async function logTransaction(supabase: any, orderId: string, type: string, status: string, amount: number | null, method: string | null, reference: string | null) {
  try {
    const { error } = await supabase.from("transactions").insert({
      order_id: orderId,
      type,
      status,
      amount,
      method,
      reference,
    });
    if (error) console.error("Transaction log error:", error);
  } catch (err) {
    console.error("Transaction log exception:", err);
  }
}

async function getOrder(supabase: any, orderId: string) {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_email, customer_phone, total_amount, status, payment_status")
    .eq("id", orderId)
    .single();
  return data;
}

async function getOrderBySessionRef(supabase: any, sessionRef: string) {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_email, customer_phone, total_amount, status, payment_status")
    .eq("snippe_session_reference", sessionRef)
    .single();
  return data;
}

async function verifySignature(rawBody: string, timestamp: string, signature: string): Promise<boolean> {
  try {
    const message = `${timestamp}.${rawBody}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    const expected = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (expected.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const rawBody = await req.text();

  try {
    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const signature = req.headers.get("x-webhook-signature") || "";

    if (signature) {
      const valid = await verifySignature(rawBody, timestamp, signature);
      if (!valid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const eventTime = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - eventTime > 300) {
        console.error("Webhook timestamp too old");
        return new Response(JSON.stringify({ error: "Timestamp too old" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const { type, data } = payload;

    console.log("Webhook received:", type, "data:", JSON.stringify(data));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let order = null;
    const orderId = data?.metadata?.order_id;
    const sessionRef = data?.session_reference;

    if (orderId) {
      order = await getOrder(supabase, orderId);
    } else if (sessionRef) {
      order = await getOrderBySessionRef(supabase, sessionRef);
    }

    if (type === "payment.completed") {
      if (orderId) {
        await supabase
          .from("orders")
          .update({ payment_status: "completed", status: "processing" })
          .eq("id", orderId);
      } else if (sessionRef) {
        await supabase
          .from("orders")
          .update({ payment_status: "completed", status: "processing" })
          .eq("snippe_session_reference", sessionRef);
      }

      if (order) {
        const amount = order.total_amount;
        const method = data?.payment_method || "mobile_money";
        const ref = data?.reference || sessionRef;

        await logTransaction(supabase, order.id, "payment", "completed", amount, method, ref);

        if (order.customer_email) {
          await sendEmail(order.customer_email, "Payment Successful — Retro-Tech Revival", "payment_successful", {
            orderNumber: order.order_number,
            amount: `TZS ${amount.toLocaleString()}`,
            status: "Completed",
          });
        }

        if (order.customer_phone) {
          await sendSMS(order.customer_phone, "payment_successful", {
            orderId: order.id,
            orderNumber: order.order_number,
            amount: `TZS ${amount.toLocaleString()}`,
          });
        }
      }
    } else if (type === "payment.failed" || type === "payment.voided" || type === "payment.expired") {
      if (orderId) {
        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", orderId);
      } else if (sessionRef) {
        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("snippe_session_reference", sessionRef);
      }

      if (order) {
        const amount = order.total_amount;
        const method = data?.payment_method || "mobile_money";
        const ref = data?.reference || sessionRef;

        await logTransaction(supabase, order.id, "payment", "failed", amount, method, ref);

        if (order.customer_email) {
          await sendEmail(order.customer_email, "Payment Failed — Retro-Tech Revival", "payment_failed", {
            orderNumber: order.order_number,
            amount: `TZS ${amount.toLocaleString()}`,
            status: "Failed",
          });
        }

        if (order.customer_phone) {
          await sendSMS(order.customer_phone, "payment_failed", {
            orderId: order.id,
            orderNumber: order.order_number,
            amount: `TZS ${amount.toLocaleString()}`,
          });
        }
      }
    } else if (type === "payment.pending") {
      if (order) {
        const amount = order.total_amount;
        const method = data?.payment_method || "mobile_money";
        const ref = data?.reference || sessionRef;

        await logTransaction(supabase, order.id, "payment", "pending", amount, method, ref);

        if (order.customer_phone) {
          await sendSMS(order.customer_phone, "payment_pending", {
            orderId: order.id,
            orderNumber: order.order_number,
            amount: `TZS ${amount.toLocaleString()}`,
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
