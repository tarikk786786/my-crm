import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import {
  generateMockInboundWebhook,
  generateMockDeliveryStatusWebhook,
} from "@/lib/whatsapp/mock-provider";

/**
 * POST /api/whatsapp/mock
 *
 * Local developer sandbox endpoint. Injects a simulated inbound message
 * or delivery status directly into the local webhook pipeline so developers
 * can test message flow, flows, automations, and AI replies without Meta credentials.
 */
export async function POST(request: Request) {
  try {
    const { accountId } = await getCurrentAccount();

    const body = (await request.json().catch(() => ({}))) as {
      action?: "inbound_message" | "delivery_status";
      fromPhone?: string;
      fromName?: string;
      text?: string;
      buttonPayload?: string;
      buttonText?: string;
      messageId?: string;
      status?: "sent" | "delivered" | "read" | "failed";
    };

    const action = body.action ?? "inbound_message";
    const fromPhone = body.fromPhone || "+1 555-0199";
    const fromName = body.fromName || "Sandbox Customer";

    let payload: Record<string, unknown>;

    if (action === "delivery_status") {
      payload = generateMockDeliveryStatusWebhook({
        messageId: body.messageId || "wamid.MOCK_SAMPLE",
        recipientPhone: fromPhone,
        phoneNumberId: "mock_sandbox_number",
        status: body.status || "delivered",
      });
    } else {
      payload = generateMockInboundWebhook({
        fromPhone,
        fromName,
        phoneNumberId: "mock_sandbox_number",
        text: body.text || "Hello! Testing the WhatsApp CRM Sandbox.",
        buttonPayload: body.buttonPayload,
        buttonText: body.buttonText,
      });
    }

    // Compute legitimate HMAC signature using the environment's META_APP_SECRET
    const crypto = await import("crypto");
    const rawPayload = JSON.stringify(payload);
    const secret = (process.env.META_APP_SECRET || "dummy_meta_app_secret").split(",")[0].trim();
    const signature = "sha256=" + crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");

    // Call the local webhook endpoint directly
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
    const webhookRes = await fetch(`${siteUrl}/api/whatsapp/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
        "x-wacrm-account-id": accountId,
        "x-wacrm-mock-event": "true",
      },
      body: rawPayload,
    });

    const webhookResult = await webhookRes.text();

    return NextResponse.json({
      success: true,
      mode: "sandbox",
      simulatedPayload: payload,
      webhookStatus: webhookRes.status,
      webhookResponse: webhookResult,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mock webhook injection failed" },
      { status: 500 },
    );
  }
}
