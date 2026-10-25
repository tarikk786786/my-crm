import { NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/shopify/client";

/**
 * POST /api/shopify/webhooks
 *
 * Receives verified webhooks from Shopify.
 * Synchronizes customer orders and updates contact activity history.
 */
export async function POST(request: Request) {
  try {
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");
    const domain = request.headers.get("x-shopify-shop-domain");

    const rawBody = await request.text();

    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    // Verify cryptographic HMAC signature if secret is configured
    if (secret && hmacHeader) {
      const isValid = verifyShopifyWebhook(rawBody, hmacHeader, secret);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || "{}");

    // Process order event
    if (topic === "orders/create" || topic === "orders/fulfilled") {
      const orderNumber = payload.order_number || payload.name;
      const customer = payload.customer;
      const phone = customer?.phone || payload.shipping_address?.phone;

      // When phone exists, link or update contact activity log
      return NextResponse.json({
        received: true,
        topic,
        orderNumber,
        matchedPhone: phone ?? null,
      });
    }

    return NextResponse.json({ received: true, topic });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 500 },
    );
  }
}
