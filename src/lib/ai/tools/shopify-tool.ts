// ============================================================
// Shopify Tools for Super Agent
//
// Enables the AI assistant to look up live, authoritative order status
// and inventory directly from Shopify rather than hallucinating details.
// ============================================================

import type { AgentTool } from "./registry";
import { fetchShopifyOrder, searchShopifyProducts } from "@/lib/shopify/client";
import type { ShopifyConfig } from "@/lib/shopify/types";

/**
 * Super Agent tool for checking customer order status.
 */
export const lookupShopifyOrderTool: AgentTool<{ orderNumber: string }> = {
  name: "lookup_shopify_order",
  description: "Check live fulfillment status, tracking link, and line items for a customer's Shopify order number.",
  permission: "read_only",
  parameters: {
    type: "object",
    properties: {
      orderNumber: { type: "string", description: "The order number (e.g. '1001' or '#1001')" },
    },
    required: ["orderNumber"],
  },
  execute: async (args, ctx) => {
    // Read shopify config for account from database or environment fallback
    const { data } = await ctx.supabase
      .from("integrations")
      .select("config")
      .eq("account_id", ctx.accountId)
      .eq("provider", "shopify")
      .maybeSingle();

    const config = (data?.config as ShopifyConfig | undefined) || {
      storeDomain: process.env.SHOPIFY_STORE_DOMAIN || "demo-store.myshopify.com",
      adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "shpat_mock_demo",
      isActive: true,
    };

    if (!config.storeDomain || !config.adminAccessToken) {
      return {
        found: false,
        message: "Shopify integration is not configured for this account.",
      };
    }

    try {
      const order = await fetchShopifyOrder(config, args.orderNumber);
      if (!order) {
        return {
          found: false,
          message: `Order #${args.orderNumber} was not found. Please verify the order number.`,
        };
      }

      return {
        found: true,
        orderNumber: order.orderNumber,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus ?? "unfulfilled",
        trackingCompany: order.trackingCompany,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        itemsCount: order.items.length,
        itemsSummary: order.items.map((i) => `${i.quantity}x ${i.title}`).join(", "),
      };
    } catch (err) {
      return {
        found: false,
        error: `Could not retrieve order: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};

/**
 * Super Agent tool for querying store catalog and prices.
 */
export const searchShopifyCatalogTool: AgentTool<{ query: string }> = {
  name: "search_shopify_catalog",
  description: "Search available products, pricing, and stock in the connected Shopify store catalog.",
  permission: "read_only",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Product name or search keywords" },
    },
    required: ["query"],
  },
  execute: async (args, ctx) => {
    const { data } = await ctx.supabase
      .from("integrations")
      .select("config")
      .eq("account_id", ctx.accountId)
      .eq("provider", "shopify")
      .maybeSingle();

    const config = (data?.config as ShopifyConfig | undefined) || {
      storeDomain: process.env.SHOPIFY_STORE_DOMAIN || "demo-store.myshopify.com",
      adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "shpat_mock_demo",
      isActive: true,
    };

    try {
      const products = await searchShopifyProducts(config, args.query);
      return {
        matched: products.length > 0,
        products: products.map((p) => ({
          title: p.title,
          price: `${p.price} ${p.currency}`,
          isAvailable: p.isAvailable,
        })),
      };
    } catch (err) {
      return { matched: false, products: [], error: String(err) };
    }
  },
};
