import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { token, email } = await req.json();

    if (!token || !email) {
      return new Response(JSON.stringify({ error: "Missing token or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users and find the one matching the email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("Failed to list users:", listError);
      return new Response(JSON.stringify({ error: "Failed to verify email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = users?.find(u => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found", status: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = user.user_metadata || {};
    const storedToken = metadata.email_verification_token;
    const expiresAt = metadata.email_verification_expires;

    // Check if already verified
    if (metadata.email_verified) {
      return new Response(JSON.stringify({ success: true, status: "already_verified" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if token matches
    if (storedToken !== token) {
      return new Response(JSON.stringify({ error: "Invalid token", status: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if token expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expired", status: "expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as verified
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...metadata,
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
      },
    });

    if (updateError) {
      console.error("Failed to update user:", updateError);
      return new Response(JSON.stringify({ error: "Failed to verify email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email verified for:", email);

    return new Response(JSON.stringify({ success: true, status: "verified" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Verification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
