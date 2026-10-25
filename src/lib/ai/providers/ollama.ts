// ============================================================
// Ollama & LiteLLM Provider Adapter
//
// Native client for local offline LLM inference via Ollama
// (default: http://localhost:11434) and LiteLLM proxy gateways
// (default: http://localhost:4000).
// ============================================================

import type { ChatMessage, ProviderResult } from "../types";
import { AiError } from "../types";

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
export const DEFAULT_LITELLM_BASE_URL = "http://localhost:4000";

export interface OllamaModelTag {
  name: string;
  modified_at: string;
  size: number;
}

/**
 * Checks if local Ollama daemon is reachable.
 */
export async function checkOllamaHealth(
  baseUrl: string = DEFAULT_OLLAMA_BASE_URL,
): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/version`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return { ok: false, error: `Ollama returned HTTP ${res.status}` };
    }
    const data = (await res.json()) as { version?: string };
    return { ok: true, version: data.version ?? "unknown" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Ollama connection failed",
    };
  }
}

/**
 * Lists installed models on the local Ollama instance.
 */
export async function listOllamaModels(
  baseUrl: string = DEFAULT_OLLAMA_BASE_URL,
): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: OllamaModelTag[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return [];
  }
}

/**
 * Calls Ollama `/api/chat` for local AI generation.
 */
export async function callOllama(opts: {
  baseUrl?: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<ProviderResult> {
  const baseUrl = (opts.baseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
  const messages = [
    { role: "system", content: opts.systemPrompt },
    ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        messages,
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.3,
        },
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new AiError("Ollama request timed out after 45s", {
        code: "local_timeout",
        status: 504,
      });
    }
    throw new AiError(
      `Cannot reach Ollama at ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
      { code: "local_unreachable", status: 503 },
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiError(
      `Ollama request failed with HTTP ${res.status}: ${body}`,
      { code: "local_error", status: 502 },
    );
  }

  const json = (await res.json()) as {
    message?: { content?: string };
    prompt_eval_count?: number;
    eval_count?: number;
  };

  const text = json.message?.content?.trim() ?? "";
  const promptTokens = json.prompt_eval_count ?? 0;
  const completionTokens = json.eval_count ?? 0;

  return {
    text,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}
