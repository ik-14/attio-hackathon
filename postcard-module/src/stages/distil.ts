import { generateJSON } from "../clients/llmClient.js";
import { resolveBrandKit } from "../brandKit.js";
import type { Brief, MailInput } from "../types.js";

// Stage 1 — distil enrichment → personalisation brief.
// Pick the single strongest, current, verifiably-true hook. Never invent facts;
// if no strong hook exists, hook = null (Stage 5 catches that and flags a human).

const SYSTEM = `You are a creative director preparing ONE bespoke postcard for a cold prospect. From the enrichment signals provided, choose the single most specific, current, verifiably-true hook that proves we did our homework. Never invent facts; only use what is in the signals. If no strong, current hook exists, set "hook" to null. Use the supplied brand palette as-is. Output JSON only.`;

export async function distil(input: MailInput): Promise<{ brief: Brief; via: string }> {
  const { prospect, enrichment } = input;
  const brand_kit = resolveBrandKit(input.brand_kit, prospect.industry);

  const user = {
    prospect: {
      first_name: prospect.first_name,
      last_name: prospect.last_name,
      title: prospect.title,
      company: prospect.company,
      industry: prospect.industry,
      // address deliberately omitted — never goes to the LLM
    },
    enrichment,
    palette: brand_kit.palette,
    fonts: brand_kit.fonts,
  };

  // Deterministic fallback: take the most recent signal as the hook.
  const mock = (): Brief => {
    const sorted = [...enrichment].sort(
      (a, b) => (b.published_date ?? "").localeCompare(a.published_date ?? ""),
    );
    const top = sorted[0];
    return {
      hook: top ? top.signal : null,
      hook_source: top ? top.source_url : null,
      brand_cues: {
        palette: brand_kit.palette,
        visual_style: "clean, modern, editorial; generous negative space",
        sector: prospect.industry,
      },
      tone: "warm, curious, peer-to-peer — not salesy",
      why_relevant: top
        ? `${prospect.company} just had a notable moment (${top.signal}); a timely, human note lands now.`
        : `Reaching out to ${prospect.company} while the timing is fresh.`,
    };
  };

  const { value, via } = await generateJSON<Brief>({ system: SYSTEM, user, mock, label: "stage1.distil" });

  // Normalise: a live model may omit fields. Preserve an intentional null hook
  // (Stage 5 must still catch it) but backfill the rest so downstream never breaks.
  const fallback = mock();
  const brief: Brief = {
    hook: value.hook ?? null, // keep null on purpose
    hook_source: value.hook_source ?? (value.hook ? fallback.hook_source : null),
    brand_cues: {
      palette: value.brand_cues?.palette?.length ? value.brand_cues.palette : brand_kit.palette,
      visual_style: value.brand_cues?.visual_style || fallback.brand_cues.visual_style,
      sector: value.brand_cues?.sector || prospect.industry,
    },
    tone: value.tone || fallback.tone,
    why_relevant: value.why_relevant || fallback.why_relevant,
  };
  return { brief, via };
}
