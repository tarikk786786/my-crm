// ============================================================
// Shopify E-Commerce Integration Types
// ============================================================

export interface ShopifyConfig {
  storeDomain: string; // e.g. "my-shop.myshopify.com"
  adminAccessToken: string; // "shpat_..."
  webhookSecret?: string | null;
  isActive: boolean;
}

export interface ShopifyOrderItem {
  title: string;
  quantity: number;
  price: string;
}

export interface ShopifyOrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  financialStatus: "paid" | "pending" | "refunded" | "partially_refunded" | "voided";
  fulfillmentStatus: "fulfilled" | "unfulfilled" | "partial" | "restocked" | null;
  totalPrice: string;
  currency: string;
  trackingCompany?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items: ShopifyOrderItem[];
}

export interface ShopifyProductSummary {
  id: string;
  title: string;
  handle: string;
  price: string;
  currency: string;
  isAvailable: boolean;
  inventoryQuantity?: number;
}
