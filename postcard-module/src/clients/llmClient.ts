import { config } from "../config.js";

// Text generation for Stage 1/2/3a (distil, copy, image-prompt).
// Provider: Gemini (`gemini-3.5-flash`) with a deterministic per-stage mock
// fallback so the pipeline always produces a card even without a key.

interface GenerateOpts<T> {
  system: string;
  user: unknown; // serialised to JSON for the model
  mock: () => T; // deterministic fallback derived from the stage's own input
  label: string; // for logs, e.g. "stage1.distil"
}

function extractJson<T>(text: string): T {
  // Models occasionally wrap JSON in ```json fences or prose; be forgiving.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model output");
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

async function callGeminiText(system: string, user: unknown): Promise<string> {
  const { apiKey, model } = config.text.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(user) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini text ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function generateJSON<T>(opts: GenerateOpts<T>): Promise<{ value: T; via: string }> {
  const { provider } = config.text;

  if (provider === "mock" || !config.text.gemini.apiKey) {
    if (provider !== "mock") {
      console.warn(`[llm] ${opts.label}: no gemini key → deterministic mock`);
    }
    return { value: opts.mock(), via: "mock" };
  }

  try {
    const raw = await callGeminiText(opts.system, opts.user);
    return { value: extractJson<T>(raw), via: provider };
  } catch (err) {
    console.warn(`[llm] ${opts.label}: ${provider} failed (${(err as Error).message}) → mock fallback`);
    return { value: opts.mock(), via: "mock-fallback" };
  }
}
