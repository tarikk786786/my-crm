// ============================================================
// Multilingual Intelligence & Intent/Sentiment Classifier
//
// Supports Hindi (हिन्दी), Hinglish, and English for WhatsApp commerce.
// Performs intent detection, sentiment scoring, and lead qualification.
// ============================================================

export type SupportedLanguage = "en" | "hi" | "hinglish";

export type CustomerIntent =
  | "order_status"
  | "product_inquiry"
  | "pricing_discount"
  | "technical_support"
  | "complaint_refund"
  | "human_agent"
  | "general_greeting"
  | "unknown";

export type SentimentScore = "positive" | "neutral" | "negative" | "urgent_frustrated";

export interface ConversationAnalysis {
  language: SupportedLanguage;
  intent: CustomerIntent;
  sentiment: SentimentScore;
  leadScore: number; // 0 to 100
  recommendedAction: "reply_ai" | "handoff_human" | "trigger_flow" | "escalate_priority";
  summary: string;
}

// Common Hinglish / Hindi lexical markers
const HINDI_DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const HINGLISH_KEYWORDS = [
  "kya", "hai", "nahi", "karo", "chahiye", "kitna", "bhai", "batao",
  "kab", "aayega", "milega", "shukriya", "dhanyawad", "namaste", "accha",
  "theek", "kaise", "hoga", "paisa", "daam", "rate", "bhejo"
];

/**
 * Detects whether incoming customer text is English, Hindi, or Hinglish.
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || !text.trim()) return "en";

  // Check Devanagari script for direct Hindi
  if (HINDI_DEVANAGARI_REGEX.test(text)) {
    return "hi";
  }

  const lower = text.toLowerCase();
  const tokens = lower.split(/[^a-zA-Z0-9]+/).filter(Boolean);

  let hinglishHits = 0;
  for (const token of tokens) {
    if (HINGLISH_KEYWORDS.includes(token)) {
      hinglishHits++;
    }
  }

  // If at least 1 prominent Hinglish marker or >15% of tokens match
  if (hinglishHits >= 2 || (tokens.length > 0 && hinglishHits / tokens.length >= 0.15)) {
    return "hinglish";
  }

  return "en";
}

/**
 * Generates culturally appropriate, language-tailored system instructions
 * for the AI assistant.
 */
export function getMultilingualSystemPrompt(opts: {
  basePrompt?: string | null;
  language: SupportedLanguage;
  businessName?: string;
}): string {
  const business = opts.businessName || "our business";
  const custom = opts.basePrompt ? `${opts.basePrompt.trim()}\n\n` : "";

  if (opts.language === "hi") {
    return `${custom}आप ${business} के लिए आधिकारिक व्हाट्सएप सहायक हैं।
कृपया हमेशा विनम्र, आदरपूर्ण और सहायक हिन्दी (Hindi) में उत्तर दें।
- यदि ग्राहक किसी उत्पाद, ऑर्डर या सेवा के बारे में पूछे, तो सटीक और संक्षिप्त जानकारी दें।
- यदि आप किसी प्रश्न का उत्तर नहीं जानते या ग्राहक मानवीय सहायता (human agent) चाहता है, तो विनम्रता से बताएं कि हमारी टीम शीघ्र ही उनसे संपर्क करेगी।
- कभी भी भ्रामक या अमान्य जानकारी न दें।`;
  }

  if (opts.language === "hinglish") {
    return `${custom}You are the official WhatsApp assistant for ${business}.
The customer is communicating in Hinglish (conversational Hindi written in English letters).
- Respond in polite, friendly, and natural Hinglish (e.g., "Namaste! Aapka order track karne ke liye please order number share karein").
- Keep sentences clear, short, and helpful for WhatsApp chat.
- If you don't know the answer or the customer asks for a human agent, politely say: "Main hamari team ke ek executive ko connect kar raha hoon jo aapse jaldi baat karenge."
- Do not make up facts or unauthorized promises.`;
  }

  return `${custom}You are the official WhatsApp customer support assistant for ${business}.
- Provide friendly, concise, and helpful responses formatted for mobile chat.
- If you cannot resolve the inquiry or the customer requests human assistance, politely inform them that a team member has been notified.
- Never invent policies, unauthorized discounts, or false order details.`;
}

/**
 * Fast heuristics-based classification for customer intent and sentiment
 * to enable real-time routing even before an LLM completion turn.
 */
export function analyzeCustomerMessage(text: string): ConversationAnalysis {
  const language = detectLanguage(text);
  const lower = text.toLowerCase();

  // Intent classification
  let intent: CustomerIntent = "general_greeting";
  let leadScore = 50;

  if (lower.includes("order") || lower.includes("track") || lower.includes("status") || lower.includes("aayega") || lower.includes("kab")) {
    intent = "order_status";
    leadScore = 65;
  } else if (lower.includes("price") || lower.includes("cost") || lower.includes("discount") || lower.includes("rate") || lower.includes("kitna") || lower.includes("daam") || lower.includes("offer")) {
    intent = "pricing_discount";
    leadScore = 85; // High buying intent
  } else if (lower.includes("buy") || lower.includes("purchase") || lower.includes("chahiye") || lower.includes("product") || lower.includes("size") || lower.includes("stock")) {
    intent = "product_inquiry";
    leadScore = 90; // Very high conversion intent
  } else if (lower.includes("refund") || lower.includes("return") || lower.includes("cancel") || lower.includes("kharab") || lower.includes("broken") || lower.includes("wapas")) {
    intent = "complaint_refund";
    leadScore = 30;
  } else if (lower.includes("human") || lower.includes("agent") || lower.includes("executive") || lower.includes("baat") || lower.includes("call me") || lower.includes("person")) {
    intent = "human_agent";
    leadScore = 70;
  } else if (lower.includes("hi") || lower.includes("hello") || lower.includes("namaste") || lower.includes("hey")) {
    intent = "general_greeting";
    leadScore = 50;
  } else {
    intent = "unknown";
    leadScore = 40;
  }

  // Sentiment scoring
  let sentiment: SentimentScore = "neutral";
  if (lower.includes("cheat") || lower.includes("fraud") || lower.includes("worst") || lower.includes("angry") || lower.includes("bakwas") || lower.includes("terrible") || lower.includes("scam")) {
    sentiment = "urgent_frustrated";
  } else if (lower.includes("bad") || lower.includes("slow") || lower.includes("problem") || lower.includes("late") || lower.includes("issue")) {
    sentiment = "negative";
  } else if (lower.includes("thank") || lower.includes("great") || lower.includes("awesome") || lower.includes("shukriya") || lower.includes("dhanyawad") || lower.includes("good") || lower.includes("nice")) {
    sentiment = "positive";
  }

  // Recommended action
  let recommendedAction: ConversationAnalysis["recommendedAction"] = "reply_ai";
  if (sentiment === "urgent_frustrated" || intent === "human_agent" || intent === "complaint_refund") {
    recommendedAction = "handoff_human";
  } else if (intent === "order_status" || intent === "product_inquiry") {
    recommendedAction = "reply_ai";
  }

  return {
    language,
    intent,
    sentiment,
    leadScore,
    recommendedAction,
    summary: `Customer asking about ${intent.replace("_", " ")} in ${language.toUpperCase()}. Sentiment: ${sentiment}.`,
  };
}

export const analyzeConversation = analyzeCustomerMessage;

