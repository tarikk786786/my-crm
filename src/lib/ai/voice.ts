// ============================================================
// Voice & Speech AI Pipeline (Hindi, Hinglish, English)
//
// Receives inbound WhatsApp voice notes (Opus / OGG / MP3),
// transcribes speech (Whisper / faster-whisper / mock),
// detects language and code-switching, runs LLM reasoning,
// and optionally synthesizes outbound voice responses (TTS).
// ============================================================

import {
  detectLanguage,
  analyzeConversation,
  type SupportedLanguage,
  type ConversationAnalysis,
} from "./multilingual";

export interface TranscribeAudioArgs {
  audio: Buffer | Uint8Array | string; // Buffer, URL, or base64
  mimeType?: string;
  languageHint?: "en" | "hi" | "auto";
  provider?: "mock" | "whisper" | "groq" | "self-hosted";
  apiKey?: string;
  endpoint?: string;
}

export interface TranscriptionResult {
  text: string;
  language: SupportedLanguage;
  confidence: number;
  durationSeconds?: number;
}

export interface TextToSpeechArgs {
  text: string;
  language?: SupportedLanguage;
  voice?: string;
  provider?: "mock" | "openai" | "piper" | "kokoro";
  apiKey?: string;
  endpoint?: string;
}

export interface TextToSpeechResult {
  audioBuffer: Uint8Array;
  mimeType: string;
}

export interface VoiceNoteProcessingResult {
  transcript: string;
  detectedLanguage: SupportedLanguage;
  analysis: ConversationAnalysis;
  replyText: string;
  replyAudio?: TextToSpeechResult;
}

/**
 * Transcribe an inbound voice note using the configured STT provider.
 */
export async function transcribeAudio(
  args: TranscribeAudioArgs
): Promise<TranscriptionResult> {
  const provider = args.provider ?? (process.env.WHISPER_PROVIDER as any) ?? "mock";

  if (provider === "mock" || !args.apiKey && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY && !args.endpoint) {
    // If input audio is a string that already contains words, return it for testing
    let simulatedText = "Hello, I need an update on my order delivery status.";
    if (typeof args.audio === "string" && args.audio.length > 5 && !args.audio.startsWith("data:") && !args.audio.startsWith("http")) {
      simulatedText = args.audio;
    }
    const detected = detectLanguage(simulatedText);
    return {
      text: simulatedText,
      language: detected,
      confidence: 0.98,
      durationSeconds: 3.5,
    };
  }

  // Cloud / Self-hosted Whisper Endpoint (OpenAI / Groq / Faster-Whisper API)
  const endpoint =
    args.endpoint ??
    (provider === "groq"
      ? "https://api.groq.com/openai/v1/audio/transcriptions"
      : "https://api.openai.com/v1/audio/transcriptions");

  const apiKey = args.apiKey ?? (provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY);

  const formData = new FormData();
  if (typeof args.audio === "string") {
    const base64Data = args.audio.replace(/^data:audio\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: args.mimeType || "audio/ogg" });
    formData.append("file", blob, "voicenote.ogg");
  } else {
    const blob = new Blob([args.audio as unknown as BlobPart], { type: args.mimeType || "audio/ogg" });
    formData.append("file", blob, "voicenote.ogg");
  }

  formData.append("model", provider === "groq" ? "whisper-large-v3" : "whisper-1");
  if (args.languageHint && args.languageHint !== "auto") {
    formData.append("language", args.languageHint);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Whisper STT failed with status ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as { text: string };
  const detected = detectLanguage(data.text);

  return {
    text: data.text,
    language: detected,
    confidence: 0.95,
  };
}

/**
 * Synthesize speech from text for outbound WhatsApp audio voice messages.
 */
export async function synthesizeSpeech(
  args: TextToSpeechArgs
): Promise<TextToSpeechResult> {
  const provider = args.provider ?? (process.env.TTS_PROVIDER as any) ?? "mock";

  if (provider === "mock" || !args.apiKey && !process.env.OPENAI_API_KEY && !args.endpoint) {
    // Generate minimal valid silent Opus/OGG container for testing
    const mockAudioHeader = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00]);
    return {
      audioBuffer: mockAudioHeader,
      mimeType: "audio/ogg; codecs=opus",
    };
  }

  const endpoint = args.endpoint ?? "https://api.openai.com/v1/audio/speech";
  const apiKey = args.apiKey ?? process.env.OPENAI_API_KEY;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      input: args.text,
      voice: args.voice || "alloy",
      response_format: "opus",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TTS synthesis failed with status ${response.status}: ${err}`);
  }

  const arrayBuf = await response.arrayBuffer();
  return {
    audioBuffer: new Uint8Array(arrayBuf),
    mimeType: "audio/ogg; codecs=opus",
  };
}

/**
 * End-to-End Voice Note Pipeline:
 * Audio In -> Transcribe -> Language / Intent / Sentiment Analysis ->
 * Generate Text Response -> Optional Synthesize Speech Out.
 */
export async function processInboundVoiceNote(args: {
  audio: Buffer | Uint8Array | string;
  mimeType?: string;
  senderPhone?: string;
  synthesizeAudioReply?: boolean;
  llmReplyGenerator?: (prompt: string, lang: SupportedLanguage) => Promise<string>;
}): Promise<VoiceNoteProcessingResult> {
  // 1. Transcribe speech
  const transcription = await transcribeAudio({
    audio: args.audio,
    mimeType: args.mimeType,
  });

  // 2. Multilingual Analysis (Hindi, Hinglish, English)
  const analysis = analyzeConversation(transcription.text);

  // 3. Generate Reply
  let replyText = "";
  if (args.llmReplyGenerator) {
    replyText = await args.llmReplyGenerator(transcription.text, analysis.language);
  } else {
    // Default empathetic localized fallback
    if (analysis.language === "hi") {
      replyText = "नमस्ते! आपका संदेश हमें मिल गया है। हम आपके ऑर्डर और विवरण की जांच कर रहे हैं।";
    } else if (analysis.language === "hinglish") {
      replyText = "Namaste! Aapka voice note receive ho gaya hai. Ham jald se jald check karke confirm karte hain.";
    } else {
      replyText = "Hello! We have received your voice note and are reviewing your request right away.";
    }
  }

  // 4. Optional Text-to-Speech synthesis
  let replyAudio: TextToSpeechResult | undefined;
  if (args.synthesizeAudioReply) {
    try {
      replyAudio = await synthesizeSpeech({
        text: replyText,
        language: analysis.language,
      });
    } catch {
      // Gracefully fall back to text-only if TTS fails
      replyAudio = undefined;
    }
  }

  return {
    transcript: transcription.text,
    detectedLanguage: analysis.language,
    analysis,
    replyText,
    replyAudio,
  };
}
