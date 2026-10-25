// ============================================================
// WhatsApp Mock Provider
//
// Enables zero-credential local development, automated testing, and
// UI demonstration without connecting to live Meta WhatsApp servers.
// Generates realistic Meta-compliant message payloads, webhook events,
// and delivery receipts.
// ============================================================

import { randomUUID } from "crypto";

export interface MockMessageRequest {
  to: string;
  type: "text" | "template" | "interactive";
  text?: { body: string };
  template?: { name: string; language: { code: string } };
  interactive?: {
    type: "button" | "list";
    body: { text: string };
    action: Record<string, unknown>;
  };
}

export interface MockMessageResponse {
  messaging_product: "whatsapp";
  contacts: [{ input: string; wa_id: string }];
  messages: [{ id: string }];
}

export interface MockInboundOptions {
  fromPhone: string;
  fromName: string;
  phoneNumberId: string;
  text?: string;
  buttonPayload?: string;
  buttonText?: string;
  timestamp?: number;
}

/**
 * Validates whether the given configuration is configured for mock/sandbox mode.
 */
export function isMockProvider(phoneNumberId?: string | null): boolean {
  return !phoneNumberId || phoneNumberId === "mock" || phoneNumberId === "sandbox" || phoneNumberId.startsWith("mock_");
}

/**
 * Sends a simulated outbound WhatsApp message.
 */
export function sendMockWhatsAppMessage(
  request: MockMessageRequest,
): MockMessageResponse {
  const wamid = `wamid.MOCK_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const cleanTo = request.to.replace(/\D/g, "");

  return {
    messaging_product: "whatsapp",
    contacts: [{ input: request.to, wa_id: cleanTo }],
    messages: [{ id: wamid }],
  };
}

/**
 * Formats a simulated inbound webhook payload that matches the exact
 * structure sent by Meta's WhatsApp Business Platform Cloud API.
 */
export function generateMockInboundWebhook(opts: MockInboundOptions) {
  const messageId = `wamid.MOCK_IN_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const ts = (opts.timestamp ?? Math.floor(Date.now() / 1000)).toString();
  const cleanPhone = opts.fromPhone.replace(/\D/g, "");

  let messagePayload: Record<string, unknown>;

  if (opts.buttonPayload) {
    messagePayload = {
      from: cleanPhone,
      id: messageId,
      timestamp: ts,
      type: "interactive",
      interactive: {
        type: "button_reply",
        button_reply: {
          id: opts.buttonPayload,
          title: opts.buttonText ?? "Selected Button",
        },
      },
    };
  } else {
    messagePayload = {
      from: cleanPhone,
      id: messageId,
      timestamp: ts,
      type: "text",
      text: {
        body: opts.text ?? "Hello from WhatsApp Sandbox!",
      },
    };
  }

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "mock_waba_id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "+1 555-0199",
                phone_number_id: opts.phoneNumberId,
              },
              contacts: [
                {
                  profile: { name: opts.fromName },
                  wa_id: cleanPhone,
                },
              ],
              messages: [messagePayload],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

/**
 * Formats a simulated delivery/read receipt webhook payload.
 */
export function generateMockDeliveryStatusWebhook(opts: {
  messageId: string;
  recipientPhone: string;
  phoneNumberId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp?: number;
}) {
  const ts = (opts.timestamp ?? Math.floor(Date.now() / 1000)).toString();
  const cleanPhone = opts.recipientPhone.replace(/\D/g, "");

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "mock_waba_id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "+1 555-0199",
                phone_number_id: opts.phoneNumberId,
              },
              statuses: [
                {
                  id: opts.messageId,
                  status: opts.status,
                  timestamp: ts,
                  recipient_id: cleanPhone,
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}
