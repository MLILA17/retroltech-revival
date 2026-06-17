import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "re_DvoZLyrq_DzSJ9D4UxP174Da3yGuUNC7F";
const FROM_EMAIL = "daudymussa1705@gmail.com";

async function sendResendEmail(to: string, subject: string, html: string, text?: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "retro-tech-revival/1.0",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

function buildEmailTemplate(subject: string, body: string, logoUrl?: string): string {
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="Retro-Tech Revival" style="max-width:120px;height:auto;margin-bottom:16px;" />`
    : `<div style="font-size:24px;font-weight:bold;color:#16a34a;margin-bottom:16px;">Retro-Tech Revival</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px;text-align:center;">
      ${logo}
      <div style="color:#fff;font-size:14px;opacity:0.8;">Giving Technology a Second Life</div>
    </div>
    <div style="padding:24px;color:#374151;">
      <h2 style="margin:0 0 16px;color:#111827;">${subject}</h2>
      ${body}
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;">Retro-Tech Revival — Dar es Salaam, Tanzania</p>
      <p style="margin:4px 0 0;">Questions? Reply to this email or visit our website.</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { to, subject, body, type, orderNumber, amount, status, logoUrl } = await req.json();

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let html = body || "";
    let text = body || "";

    if (type === "welcome") {
      html = buildEmailTemplate(
        "Welcome to Retro-Tech Revival!",
        `<p>Hi there,</p>
        <p>Thank you for creating an account with Retro-Tech Revival. We're excited to have you on board!</p>
        <p>Browse our curated collection of refurbished and vintage electronics, or start shopping now.</p>
        <div style="margin:20px 0;">
          <a href="${logoUrl ? window?.location?.origin || '' : ''}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Start Shopping</a>
        </div>`,
        logoUrl
      );
    } else if (type === "order_confirmation") {
      html = buildEmailTemplate(
        `Order Confirmation — #${orderNumber}`,
        `<p>Hi there,</p>
        <p>Your order <strong>#${orderNumber}</strong> has been received and is being processed.</p>
        <p>Order Total: <strong>${amount || '0'}</strong></p>
        <p>Status: <strong>${status || 'Pending'}</strong></p>
        <p>We'll send you an update once your order ships.</p>`,
        logoUrl
      );
    } else if (type === "payment_successful") {
      html = buildEmailTemplate(
        `Payment Successful — Order #${orderNumber}`,
        `<p>Hi there,</p>
        <p>Great news! Your payment for order <strong>#${orderNumber}</strong> has been successfully received.</p>
        <p>Amount: <strong>${amount || '0'}</strong></p>
        <p>Your order is now being processed and will be shipped soon.</p>`,
        logoUrl
      );
    } else if (type === "order_shipped") {
      html = buildEmailTemplate(
        `Order Shipped — #${orderNumber}`,
        `<p>Hi there,</p>
        <p>Your order <strong>#${orderNumber}</strong> has been shipped!</p>
        <p>It will arrive at your delivery address soon. Thank you for shopping with us.</p>`,
        logoUrl
      );
    } else if (type === "email_confirmation") {
      html = buildEmailTemplate(
        "Confirm Your Email Address",
        `<p>Hi there,</p>
        <p>Thank you for signing up with Retro-Tech Revival. Please confirm your email address by clicking the button below:</p>
        <div style="margin:20px 0;">
          <a href="${body}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm Email</a>
        </div>
        <p>If you didn't sign up, you can safely ignore this email.</p>`,
        logoUrl
      );
    } else if (!html) {
      html = buildEmailTemplate(subject, body || "", logoUrl);
    }

    const result = await sendResendEmail(to, subject, html, text);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
