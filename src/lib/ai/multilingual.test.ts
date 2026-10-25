import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  getMultilingualSystemPrompt,
  analyzeCustomerMessage,
} from "./multilingual";

describe("Multilingual Intelligence & Intent Classifier", () => {
  it("detects Hindi (Devanagari)", () => {
    expect(detectLanguage("नमस्ते, मुझे नया फोन खरीदना है")).toBe("hi");
    expect(detectLanguage("ऑर्डर कब तक आएगा?")).toBe("hi");
  });

  it("detects Hinglish conversational sentences", () => {
    expect(detectLanguage("Bhai order kab tak aayega batao?")).toBe("hinglish");
    expect(detectLanguage("Yeh product kitna ka hai? Discount milega kya?")).toBe("hinglish");
  });

  it("defaults to English for English phrases", () => {
    expect(detectLanguage("Hello, can you give me shipping details?")).toBe("en");
    expect(detectLanguage("What is the price of this subscription?")).toBe("en");
  });

  it("builds tailored system prompts for each language", () => {
    const hiPrompt = getMultilingualSystemPrompt({ language: "hi", businessName: "Apex Retail" });
    expect(hiPrompt).toContain("Apex Retail");
    expect(hiPrompt).toContain("हिन्दी");

    const hinglishPrompt = getMultilingualSystemPrompt({ language: "hinglish", businessName: "Apex Retail" });
    expect(hinglishPrompt).toContain("Hinglish");
    expect(hinglishPrompt).toContain("Namaste!");

    const enPrompt = getMultilingualSystemPrompt({ language: "en", businessName: "Apex Retail" });
    expect(enPrompt).toContain("WhatsApp customer support assistant");
  });

  it("classifies customer intent and computes lead conversion score", () => {
    const buyingInquiry = analyzeCustomerMessage("I want to buy 5 units of this product right now");
    expect(buyingInquiry.intent).toBe("product_inquiry");
    expect(buyingInquiry.leadScore).toBeGreaterThanOrEqual(85);
    expect(buyingInquiry.recommendedAction).toBe("reply_ai");

    const orderStatus = analyzeCustomerMessage("Bhai mera order track karo kab aayega");
    expect(orderStatus.intent).toBe("order_status");
    expect(orderStatus.language).toBe("hinglish");

    const complaint = analyzeCustomerMessage("Worst service ever! Complete fraud, refund my money!");
    expect(complaint.sentiment).toBe("urgent_frustrated");
    expect(complaint.recommendedAction).toBe("handoff_human");
  });
});
