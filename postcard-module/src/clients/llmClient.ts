import { config } from "../config.js";

// Text generation for Stage 1/2/3a (distil, copy, image-prompt).
//
// Provider: Gemini (gemini-3.5-flash) with responseMimeType: application/json.
// Each stage supplies its own mock() so the deterministic fallback is shaped
// for that stage. The pipeline always produces a card — even fully offline.

interface GenerateOpts<T> {
  system: string;
  user: unknown; // serialised to JSON for the model
  mock: () => T; // deterministic fallback derived from the stage's own input
  label: string; // for logs, e.g. "stage1.distil"
  temperature?: number; // defaults to 0.4; lower for fact-picking stages (distil)
}

function cleanJson(raw: string): string {
  // Gemini sometimes emits trailing commas before } or ] even with
  // responseMimeType: "application/json". Strip them before parsing.
  return raw.replace(/,\s*([}\]])/g, "$1");
}

function extractJson<T>(text: string): T {
  // Models occasionally wrap JSON in ```json fences or leading prose; be forgiving.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`no JSON object in model output (got: ${text.slice(0, 120)})`);
  return JSON.parse(cleanJson(candidate.slice(start, end + 1))) as T;
}

async function callGeminiText(system: string, user: unknown, temperature: number): Promise<string> {
  const { apiKey, model } = config.text.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(user) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data: any = await res.json();
  const candidate = data?.candidates?.[0];

  // Surface finish reason when content is absent (safety block, recitation, etc.)
  if (!candidate?.content) {
    const reason = candidate?.finishReason ?? "unknown";
    throw new Error(`Gemini returned no content (finishReason=${reason})`);
  }

  const text: string = candidate.content.parts?.[0]?.text ?? "";
  if (!text.trim()) throw new Error("Gemini returned empty text");
  return text;
}

export async function generateJSON<T>(opts: GenerateOpts<T>): Promise<{ value: T; via: string }> {
  const { provider } = config.text;

  if (provider === "mock" || !config.text.gemini.apiKey) {
    if (provider !== "mock") {
      console.warn(`[llm] ${opts.label}: no Gemini key → deterministic mock`);
    }
    return { value: opts.mock(), via: "mock" };
  }

  try {
    const raw = await callGeminiText(opts.system, opts.user, opts.temperature ?? 0.4);
    return { value: extractJson<T>(raw), via: "gemini" };
  } catch (err) {
    console.warn(`[llm] ${opts.label}: gemini failed (${(err as Error).message}) → mock fallback`);
    return { value: opts.mock(), via: "mock-fallback" };
  }
}
