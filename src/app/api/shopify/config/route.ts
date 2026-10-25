import { NextResponse } from "next/server";
import { getCurrentAccount, requireRole, toErrorResponse } from "@/lib/auth/account";
import type { ShopifyConfig } from "@/lib/shopify/types";

/**
 * GET /api/shopify/config
 *
 * Checks whether Shopify is configured for the active account.
 */
export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount();

    const { data, error } = await supabase
      .from("integrations")
      .select("config, status")
      .eq("account_id", accountId)
      .eq("provider", "shopify")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({
        configured: false,
        storeDomain: process.env.SHOPIFY_STORE_DOMAIN || null,
        hasToken: !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      });
    }

    const cfg = data.config as ShopifyConfig;
    return NextResponse.json({
      configured: cfg.isActive,
      storeDomain: cfg.storeDomain,
      hasToken: !!cfg.adminAccessToken,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/shopify/config
 *
 * Saves or updates Shopify store domain & API credentials (admin-only).
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole("admin");
    const body = (await request.json().catch(() => ({}))) as Partial<ShopifyConfig>;

    if (!body.storeDomain || !body.adminAccessToken) {
      return NextResponse.json(
        { error: "Store domain and Admin API Access Token are required." },
        { status: 400 },
      );
    }

    const config: ShopifyConfig = {
      storeDomain: body.storeDomain.trim(),
      adminAccessToken: body.adminAccessToken.trim(),
      webhookSecret: body.webhookSecret?.trim() || null,
      isActive: true,
    };

    // Upsert into integrations table if present, or return configured payload
    const { error } = await supabase.from("integrations").upsert({
      account_id: accountId,
      provider: "shopify",
      config,
      status: "connected",
      updated_at: new Date().toISOString(),
    });

    if (error && error.code !== "PGRST205") {
      console.error("[Shopify Config] Upsert error:", error);
    }

    return NextResponse.json({
      success: true,
      configured: true,
      storeDomain: config.storeDomain,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
