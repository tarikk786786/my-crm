// ============================================================
// Shopify Admin API Client & Webhook Verifier
//
// Communicates with Shopify 2026-01 REST Admin API.
// Validates HMAC signatures on incoming Shopify webhooks.
// ============================================================

import { createHmac, timingSafeEqual } from "crypto";
import type {
  ShopifyConfig,
  ShopifyOrderSummary,
  ShopifyProductSummary,
} from "./types";

/**
 * Validates HMAC SHA-256 signature on Shopify webhooks (header `x-shopify-hmac-sha256`).
 */
export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string,
  secret: string,
): boolean {
  if (!rawBody || !hmacHeader || !secret) return false;

  try {
    const generated = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");

    const headerBuf = Buffer.from(hmacHeader, "base64");
    const genBuf = Buffer.from(generated, "base64");

    if (headerBuf.length !== genBuf.length) return false;
    return timingSafeEqual(headerBuf, genBuf);
  } catch {
    return false;
  }
}

/**
 * Normalizes store domain into a clean `https://[store].myshopify.com` base.
 */
export function normalizeShopifyDomain(domain: string): string {
  let clean = domain.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!clean.includes(".myshopify.com") && !clean.includes(".")) {
    clean = `${clean}.myshopify.com`;
  }
  return clean;
}

/**
 * Fetches order details by order name/number (e.g., "#1001" or "1001").
 */
export async function fetchShopifyOrder(
  config: ShopifyConfig,
  orderRef: string,
): Promise<ShopifyOrderSummary | null> {
  const domain = normalizeShopifyDomain(config.storeDomain);
  const cleanOrderName = orderRef.trim().replace(/^#/, "");

  const url = `https://${domain}/admin/api/2026-01/orders.json?name=${encodeURIComponent(cleanOrderName)}&status=any`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.adminAccessToken,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Shopify API error: HTTP ${res.status}`);
  }

  const json = (await res.json()) as { orders?: any[] };
  const order = json.orders?.[0];
  if (!order) return null;

  const fulfillment = order.fulfillments?.[0];

  return {
    id: String(order.id),
    orderNumber: String(order.order_number || order.name),
    createdAt: order.created_at,
    financialStatus: order.financial_status,
    fulfillmentStatus: order.fulfillment_status,
    totalPrice: String(order.total_price),
    currency: order.currency || "USD",
    trackingCompany: fulfillment?.tracking_company || null,
    trackingNumber: fulfillment?.tracking_number || null,
    trackingUrl: fulfillment?.tracking_url || null,
    items: (order.line_items || []).map((item: any) => ({
      title: item.title,
      quantity: item.quantity,
      price: String(item.price),
    })),
  };
}

/**
 * Searches store products by query string.
 */
export async function searchShopifyProducts(
  config: ShopifyConfig,
  query: string,
): Promise<ShopifyProductSummary[]> {
  const domain = normalizeShopifyDomain(config.storeDomain);
  const url = `https://${domain}/admin/api/2026-01/products.json?title=${encodeURIComponent(query)}&limit=5`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.adminAccessToken,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];

  const json = (await res.json()) as { products?: any[] };
  return (json.products || []).map((p: any) => {
    const variant = p.variants?.[0];
    return {
      id: String(p.id),
      title: p.title,
      handle: p.handle,
      price: String(variant?.price ?? "0.00"),
      currency: "USD",
      isAvailable: (variant?.inventory_quantity ?? 1) > 0,
      inventoryQuantity: variant?.inventory_quantity,
    };
  });
}
