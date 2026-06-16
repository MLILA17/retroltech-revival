import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SNIPPE_API_KEY = "snp_246632d32322bbcd018a10234a1ec595f77c38beaf192d0b7eb6c385ef18f657";
const SNIPPE_BASE_URL = "https://api.snippe.sh";

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+255")) return cleaned;
  if (cleaned.startsWith("255")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+255${cleaned.slice(1)}`;
  return `+255${cleaned}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const {
      orderId,
      orderNumber,
      amount,
      customerName,
      customerPhone,
      customerEmail,
      description,
      lineItems,
      redirectUrl,
    } = await req.json();

    if (!orderId || !amount || !customerName || !customerPhone) {
      return respond({ error: "Missing required fields: orderId, amount, customerName, customerPhone" });
    }

    const sessionBody: Record<string, unknown> = {
      amount,
      currency: "TZS",
      allowed_methods: ["mobile_money", "card"],
      customer: {
        name: customerName,
        phone: normalizePhone(customerPhone),
        ...(customerEmail ? { email: customerEmail } : {}),
      },
      description: description || `Order #${orderNumber}`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
      },
      redirect_url: redirectUrl,
      expires_in: 3600,
      display: {
        show_line_items: true,
        line_items_style: "compact",
        show_description: true,
        button_text: "Pay Now",
        success_message: "Payment successful! Your order is confirmed.",
      },
    };

    if (lineItems && lineItems.length > 0) {
      sessionBody.line_items = lineItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        quantity: item.quantity,
        unit_price: item.unit_price,
        category: "Electronics",
      }));
    }

    console.log("Creating Snippe session for order:", orderId, "amount:", amount);

    const response = await fetch(`${SNIPPE_BASE_URL}/api/v1/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SNIPPE_API_KEY}`,
        "X-API-Key": SNIPPE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionBody),
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = { message: `Snippe returned non-JSON response (status ${response.status})` };
    }

    console.log("Snippe response status:", response.status, "body:", JSON.stringify(data));

    if (!response.ok) {
      return respond({
        error: data?.message || data?.error || `Snippe API error (${response.status})`,
        snippe_code: data?.error_code,
        snippe_status: response.status,
      });
    }

    const session = data.data || data;

    if (!session.checkout_url) {
      return respond({ error: "Snippe did not return a checkout_url", raw: data });
    }

    return respond({
      reference: session.reference,
      checkout_url: session.checkout_url,
      payment_link_url: session.payment_link_url,
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return respond({ error: err.message || "Internal server error" });
  }
});
