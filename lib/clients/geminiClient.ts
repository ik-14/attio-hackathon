// Gemini AI client. Structured JSON output via responseSchema.
// Retries on 429/500/503 with exponential backoff + jitter.
// Stub mode: deterministic outputs, tiny 1×1 PNG buffer for images.

import { GoogleGenAI, Type } from "@google/genai";
import { config, has, MODELS } from "@/lib/config";
import type { Icp, Lead } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

let _ai: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return _ai;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429 || status === 500 || status === 503) {
        const delay = (2 ** i) * 500 + Math.random() * 300;
        await new Promise((r) => setTimeout(r, delay));
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function generateJson<T>(
  prompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  model = MODELS.textFast
): Promise<T> {
  const response = await withRetry(() =>
    ai().models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    })
  );
  const text = response.text ?? "{}";
  return JSON.parse(text) as T;
}

// Deterministic stub score from string hash (70–95 range)
function hashScore(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return 70 + (Math.abs(h) % 26);
}

// Minimal valid 1×1 transparent PNG
const STUB_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Module-level image cache keyed by trackingId / cacheKey
const imageCache = new Map<string, Buffer>();

// ── Public API ────────────────────────────────────────────────────────────────

export async function parseIcp(message: string): Promise<Icp> {
  if (!has.gemini()) {
    console.log(`[gemini stub] parseIcp("${message}")`);
    return {
      titles: ["VP Sales", "Head of Sales"],
      industries: ["software", "fintech"],
      headcount: [50, 500],
      raw: message,
    };
  }
  return generateJson<Icp>(
    `Extract an Ideal Customer Profile from this message: "${message}". Return titles (job titles), industries, and headcount range [min, max].`,
    {
      type: Type.OBJECT,
      properties: {
        titles: { type: Type.ARRAY, items: { type: Type.STRING } },
        industries: { type: Type.ARRAY, items: { type: Type.STRING } },
        headcount: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 2, maxItems: 2 },
        raw: { type: Type.STRING },
      },
      required: ["titles", "industries", "headcount"],
    }
  ).then((r) => ({ ...r, raw: message }));
}

export async function scoreLead(
  lead: Pick<Lead, "name" | "company" | "enrichmentSignal"> & { title?: string; industry?: string },
  icp: Icp
): Promise<{ score: number; reason: string }> {
  if (!has.gemini()) {
    const score = hashScore(lead.name + lead.company);
    console.log(`[gemini stub] scoreLead(${lead.name}) → ${score}`);
    return { score, reason: `Stub: ${lead.company} matches ICP profile for ${icp.titles[0]}` };
  }
  return generateJson<{ score: number; reason: string }>(
    `Rate this lead for our ICP on a scale 0-100.\nLead: ${lead.name} (${lead.title ?? "unknown title"}) at ${lead.company} (${lead.industry ?? "unknown industry"}). Signal: ${lead.enrichmentSignal ?? "none"}.\nICP: titles=${icp.titles.join(",")} industries=${icp.industries.join(",")} headcount=${icp.headcount[0]}-${icp.headcount[1]}.\nThese leads were pre-selected as plausible ICP matches. Score 0-100 reflecting FIT QUALITY: title alignment, industry alignment, company-size fit. Most genuine matches should land 70-95; only score low (<50) for a clear mismatch.\nReturn score (integer 0-100) and a one-line reason.`,
    {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER },
        reason: { type: Type.STRING },
      },
      required: ["score", "reason"],
    }
  );
}

export async function writeEmailCopy(brief: {
  name: string;
  company: string;
  signal: string;
  icp: Icp;
}): Promise<{ subject: string; html: string }> {
  if (!has.gemini()) {
    console.log(`[gemini stub] writeEmailCopy for ${brief.name}`);
    return {
      subject: `Quick question about ${brief.company}'s growth`,
      html: `<p>Hi ${brief.name.split(" ")[0]},</p><p>Saw that ${brief.signal}. Thought it might be relevant — we help ${brief.icp.industries[0]} companies like yours close more pipeline.</p><p>Worth a 15-min call?</p>`,
    };
  }
  return generateJson<{ subject: string; html: string }>(
    `Write a short, personal outbound sales email (no fluff, under 100 words) for:\nName: ${brief.name}\nCompany: ${brief.company}\nRecent signal: ${brief.signal}\nBuyer profile: ${brief.icp.titles.join(", ")} in ${brief.icp.industries.join(", ")}.\nReturn subject line and html body.`,
    {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        html: { type: Type.STRING },
      },
      required: ["subject", "html"],
    }
  );
}

export async function writePostcardCopy(brief: {
  name: string;
  company: string;
  signal: string;
}): Promise<{ personalLine: string; body: string; cta: string }> {
  if (!has.gemini()) {
    console.log(`[gemini stub] writePostcardCopy for ${brief.name}`);
    return {
      personalLine: `Congrats on ${brief.signal}.`,
      body: `We help ${brief.company}-stage teams close deals faster with autonomous outbound. 15 mins could change your quarter.`,
      cta: "Scan to book a call →",
    };
  }
  return generateJson<{ personalLine: string; body: string; cta: string }>(
    `Write postcard copy (max 3 short sentences) for a physical direct-mail piece to ${brief.name} at ${brief.company}. Signal hook: "${brief.signal}". Return: personalLine (1 line referencing the signal), body (2 lines selling the value), cta (call-to-action for the QR code).`,
    {
      type: Type.OBJECT,
      properties: {
        personalLine: { type: Type.STRING },
        body: { type: Type.STRING },
        cta: { type: Type.STRING },
      },
      required: ["personalLine", "body", "cta"],
    }
  );
}

export async function imagePrompt(brief: {
  company: string;
  industry: string;
}): Promise<{ prompt: string; negative: string }> {
  if (!has.gemini()) {
    return {
      prompt: `Professional direct mail postcard for ${brief.industry} company ${brief.company}, clean modern design, blue and white`,
      negative: "text, words, letters, low quality",
    };
  }
  return generateJson<{ prompt: string; negative: string }>(
    `Write an image generation prompt for a postcard visual targeting ${brief.company} in ${brief.industry}. Keep it short, artistic, and professional. No text in image. Also return a negative prompt.`,
    {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING },
        negative: { type: Type.STRING },
      },
      required: ["prompt", "negative"],
    }
  );
}

export async function generateImage(prompt: string, cacheKey: string): Promise<Buffer> {
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey)!;

  if (!has.gemini()) {
    console.log(`[gemini stub] generateImage for ${cacheKey}`);
    imageCache.set(cacheKey, STUB_PNG);
    return STUB_PNG;
  }

  try {
    const response = await withRetry(() =>
      ai().models.generateContent({
        model: MODELS.image,
        contents: prompt,
        config: { responseModalities: ["IMAGE"] },
      })
    );
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inline = parts.find((p: any) => p.inlineData?.data);
    const buf = inline ? Buffer.from(inline.inlineData!.data as string, "base64") : STUB_PNG;
    imageCache.set(cacheKey, buf);
    return buf;
  } catch (err) {
    console.warn(`[gemini] generateImage failed, using stub:`, (err as Error).message);
    imageCache.set(cacheKey, STUB_PNG);
    return STUB_PNG;
  }
}

export function getCachedImage(cacheKey: string): Buffer | null {
  return imageCache.get(cacheKey) ?? null;
}

export async function extractFacts(text: string): Promise<{ signal: string }> {
  if (!has.gemini()) {
    console.log(`[gemini stub] extractFacts`);
    return { signal: text.slice(0, 120) };
  }
  return generateJson<{ signal: string }>(
    `Extract the single most relevant sales signal from this research text about a company. Keep it under 2 sentences.\n\n${text}`,
    {
      type: Type.OBJECT,
      properties: { signal: { type: Type.STRING } },
      required: ["signal"],
    }
  );
}
