import { describe, it, expect } from "vitest";
import {
  transcribeAudio,
  synthesizeSpeech,
  processInboundVoiceNote,
} from "./voice";

describe("Voice & Speech AI Pipeline", () => {
  it("transcribes English audio and detects language correctly", async () => {
    const res = await transcribeAudio({
      audio: "Please tell me the status of my order #1042.",
      provider: "mock",
    });

    expect(res.text).toBe("Please tell me the status of my order #1042.");
    expect(res.language).toBe("en");
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it("transcribes Hinglish voice note and classifies intent", async () => {
    const res = await transcribeAudio({
      audio: "Bhai delivery kab tak aayegi? Mera order track nahi ho raha hai.",
      provider: "mock",
    });

    expect(res.text).toContain("delivery kab tak aayegi");
    expect(res.language).toBe("hinglish");
  });

  it("transcribes Hindi voice note in Devanagari script", async () => {
    const res = await transcribeAudio({
      audio: "नमस्ते, मुझे नया डिस्काउंट कूपन चाहिए।",
      provider: "mock",
    });

    expect(res.language).toBe("hi");
  });

  it("synthesizes outbound speech audio container", async () => {
    const tts = await synthesizeSpeech({
      text: "Aapka order kal dispatch ho jayega.",
      provider: "mock",
    });

    expect(tts.audioBuffer).toBeDefined();
    expect(tts.audioBuffer.length).toBeGreaterThan(0);
    expect(tts.mimeType).toContain("audio/ogg");
  });

  it("processes inbound voice note end-to-end with Hinglish routing", async () => {
    const result = await processInboundVoiceNote({
      audio: "Bhai product ka price kitna hai? Mujhe discount milega kya?",
      synthesizeAudioReply: true,
    });

    expect(result.detectedLanguage).toBe("hinglish");
    expect(result.analysis.intent).toBe("pricing_discount");
    expect(result.analysis.leadScore).toBeGreaterThanOrEqual(70);
    expect(result.replyText).toContain("Namaste!");
    expect(result.replyAudio).toBeDefined();
    expect(result.replyAudio?.mimeType).toContain("audio/ogg");
  });

  it("supports custom LLM generator in voice pipeline", async () => {
    const customLLM = async (prompt: string, lang: string) => {
      return `[LLM-${lang.toUpperCase()}] Processed request: "${prompt}" successfully.`;
    };

    const result = await processInboundVoiceNote({
      audio: "Can I exchange my shoe size from 9 to 10?",
      llmReplyGenerator: customLLM,
    });

    expect(result.detectedLanguage).toBe("en");
    expect(result.replyText).toContain("[LLM-EN]");
  });
});
