import { config } from "../config.js";

// Text generation for Stage 1/2/3a (distil, copy, image-prompt).
//
// Provider order per execution-plan workstream B: SIE `generate` primary
// (zero extra signup), Gemini as an alternative, and a deterministic per-stage
// mock so the pipeline ALWAYS produces a card — including fully offline during
// prep or if a model cold-starts/504s on stage.
//
// Each stage supplies its own `mock()` so the fallback output is shaped for that
// stage rather than a generic blob.

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

async function callSie(system: string, user: unknown): Promise<string> {
  const { baseUrl, apiKey, model } = config.text.sie;
  const url = `${baseUrl.replace(/\/$/, "")}/v1/generate`;
  const body = {
    model,
    // Cold-start: first call to a model can take ~60s / 504 while it loads.
    wait_for_capacity: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    response_format: { type: "json_object" },
  };

  // Retry once on a cold-start 5xx (matters live on stage).
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data: any = await res.json();
      // Tolerate a couple of plausible response shapes.
      return (
        data?.choices?.[0]?.message?.content ??
        data?.output ??
        data?.text ??
        JSON.stringify(data)
      );
    }
    if (attempt === 0 && (res.status === 503 || res.status === 504)) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    throw new Error(`SIE generate ${res.status}: ${await res.text()}`);
  }
  throw new Error("SIE generate: exhausted retries");
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
  const hasKey =
    (provider === "sie" && config.text.sie.apiKey) ||
    (provider === "gemini" && config.text.gemini.apiKey);

  if (provider === "mock" || !hasKey) {
    if (provider !== "mock") {
      console.warn(`[llm] ${opts.label}: no ${provider} key → deterministic mock`);
    }
    return { value: opts.mock(), via: "mock" };
  }

  try {
    const raw = provider === "sie" ? await callSie(opts.system, opts.user) : await callGeminiText(opts.system, opts.user);
    return { value: extractJson<T>(raw), via: provider };
  } catch (err) {
    console.warn(`[llm] ${opts.label}: ${provider} failed (${(err as Error).message}) → mock fallback`);
    return { value: opts.mock(), via: "mock-fallback" };
  }
}
