import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Retro-Tech Revival <noreply@dml-tech.online>";
const VERIFICATION_EXPIRY_HOURS = 24;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://dml-tech.online";

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendResendEmail(to: string, subject: string, html: string, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };

  const body: Record<string, any> = {
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
  };

  if (idempotencyKey) {
    body.idempotency_key = idempotencyKey;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

function buildVerificationEmail(verificationLink: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px;text-align:center;">
      <div style="font-size:24px;font-weight:bold;color:#16a34a;margin-bottom:8px;">Retro-Tech Revival</div>
      <div style="color:#fff;font-size:14px;opacity:0.8;">Bringing Technology Back To Life</div>
    </div>
    <div style="padding:32px;color:#374151;">
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Verify Your Email Address</h2>
      <p style="margin:0 0 24px;color:#6b7280;">Thank you for creating an account with Retro-Tech Revival.</p>

      <p style="margin:0 0 16px;">To activate your account and start shopping for refurbished and retro technology products, please verify your email address by clicking the button below.</p>

      <div style="margin:32px 0;text-align:center;">
        <a href="${verificationLink}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Verify Email</a>
      </div>

      <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">If you did not create this account, you can safely ignore this email.</p>

      <p style="margin:16px 0 0;color:#9ca3af;font-size:13px;">This verification link will expire in ${VERIFICATION_EXPIRY_HOURS} hours for security reasons.</p>
    </div>
    <div style="background:#f9fafb;padding:20px;text-align:center;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;">Retro-Tech Revival — Dar es Salaam, Tanzania</p>
      <p style="margin:4px 0 0;">Questions? Contact us at support@dml-tech.online</p>
    </div>
  </div>
</body>
</html>`;
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
    const { email, userId } = await req.json();

    if (!email || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    // Store token in user metadata (Supabase Auth)
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        email_verification_token: token,
        email_verification_expires: expiresAt,
        email_verified: false,
      },
    });

    if (updateError) {
      console.error("Failed to store verification token:", updateError);
      // Continue anyway, we can still send the email
    }

    // Build verification link - use the app base URL
    const verificationLink = `${APP_BASE_URL}/#verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    console.log("Sending verification email to:", email, "link:", verificationLink);

    // Send verification email
    const html = buildVerificationEmail(verificationLink);
    const idempotencyKey = `email-verification/${email}/${token.slice(0, 16)}`;

    const result = await sendResendEmail(
      email,
      "Verify Your Email — Retro-Tech Revival",
      html,
      idempotencyKey
    );

    console.log("Verification email sent to:", email, "result:", result.id);

    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Verification email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
