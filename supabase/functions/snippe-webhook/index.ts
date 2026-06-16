import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WEBHOOK_SECRET = "whsec_5d86ed5914da782f58011932eb2e45d9197c19ec44efc1d44bf4c4bc4da01c2f";

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

    // Constant-time comparison
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

    // Verify signature if present (skip in development when no signature sent)
    if (signature) {
      const valid = await verifySignature(rawBody, timestamp, signature);
      if (!valid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reject replays older than 5 minutes
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

    if (type === "payment.completed") {
      const orderId = data?.metadata?.order_id;
      const sessionRef = data?.session_reference;

      if (orderId) {
        const { error } = await supabase
          .from("orders")
          .update({ payment_status: "completed", status: "processing" })
          .eq("id", orderId);
        if (error) console.error("DB update error:", error);
        else console.log("Order", orderId, "marked as completed");
      } else if (sessionRef) {
        const { error } = await supabase
          .from("orders")
          .update({ payment_status: "completed", status: "processing" })
          .eq("snippe_session_reference", sessionRef);
        if (error) console.error("DB update error by session ref:", error);
      }
    } else if (type === "payment.failed" || type === "payment.voided" || type === "payment.expired") {
      const orderId = data?.metadata?.order_id;
      const sessionRef = data?.session_reference;

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
