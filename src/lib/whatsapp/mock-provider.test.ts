import { describe, expect, it } from "vitest";
import {
  isMockProvider,
  sendMockWhatsAppMessage,
  generateMockInboundWebhook,
  generateMockDeliveryStatusWebhook,
} from "./mock-provider";

describe("WhatsApp Mock Provider", () => {
  it("identifies sandbox / mock phone number IDs", () => {
    expect(isMockProvider(null)).toBe(true);
    expect(isMockProvider("mock")).toBe(true);
    expect(isMockProvider("sandbox")).toBe(true);
    expect(isMockProvider("mock_12345")).toBe(true);
    expect(isMockProvider("109283746501928")).toBe(false);
  });

  it("generates a valid simulated outbound message response", () => {
    const res = sendMockWhatsAppMessage({
      to: "+1 (555) 019-2834",
      type: "text",
      text: { body: "Hello sandbox" },
    });

    expect(res.messaging_product).toBe("whatsapp");
    expect(res.contacts[0].wa_id).toBe("15550192834");
    expect(res.messages[0].id).toMatch(/^wamid\.MOCK_\d+_[a-f0-9]+$/);
  });

  it("generates compliant inbound text webhook payloads", () => {
    const payload = generateMockInboundWebhook({
      fromPhone: "+91 98765 43210",
      fromName: "Rahul Sharma",
      phoneNumberId: "mock_phone_id",
      text: "Namaste! Order status kya hai?",
    });

    expect(payload.object).toBe("whatsapp_business_account");
    const change = payload.entry[0].changes[0].value;
    expect(change.metadata.phone_number_id).toBe("mock_phone_id");
    expect(change.contacts[0].profile.name).toBe("Rahul Sharma");
    expect(change.contacts[0].wa_id).toBe("919876543210");
    expect(change.messages[0].type).toBe("text");
    expect((change.messages[0].text as { body: string }).body).toBe(
      "Namaste! Order status kya hai?",
    );
  });

  it("generates compliant interactive button reply payloads", () => {
    const payload = generateMockInboundWebhook({
      fromPhone: "+1 555-1234",
      fromName: "Alice",
      phoneNumberId: "mock_phone_id",
      buttonPayload: "BTN_CONFIRM_ORDER",
      buttonText: "Confirm Order",
    });

    const msg = payload.entry[0].changes[0].value.messages[0];
    expect(msg.type).toBe("interactive");
    expect(msg.interactive).toEqual({
      type: "button_reply",
      button_reply: {
        id: "BTN_CONFIRM_ORDER",
        title: "Confirm Order",
      },
    });
  });

  it("generates delivery status webhooks", () => {
    const payload = generateMockDeliveryStatusWebhook({
      messageId: "wamid.MOCK_123",
      recipientPhone: "+1 555-9876",
      phoneNumberId: "mock_phone_id",
      status: "delivered",
    });

    const status = payload.entry[0].changes[0].value.statuses[0];
    expect(status.id).toBe("wamid.MOCK_123");
    expect(status.status).toBe("delivered");
    expect(status.recipient_id).toBe("15559876");
  });
});
