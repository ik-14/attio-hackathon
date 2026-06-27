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
