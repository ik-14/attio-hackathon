import "dotenv/config";

const bool = (v: string | undefined, def = false) =>
  v == null ? def : ["1", "true", "yes", "on"].includes(v.toLowerCase());

export const config = {
  text: {
    provider: (process.env.TEXT_LLM_PROVIDER ?? "gemini") as "gemini" | "mock",
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? "",
      model: process.env.GEMINI_TEXT_MODEL ?? "gemini-3.5-flash",
    },
  },
  image: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image",
    fallbackModel: process.env.GEMINI_IMAGE_FALLBACK_MODEL ?? "gemini-3.1-flash-image",
  },
  lob: {
    apiKey: process.env.LOB_API_KEY ?? "",
    from: {
      name: process.env.LOB_FROM_NAME ?? "Your Company",
      line1: process.env.LOB_FROM_ADDRESS_LINE1 ?? "210 King St",
      city: process.env.LOB_FROM_CITY ?? "San Francisco",
      state: process.env.LOB_FROM_STATE ?? "CA",
      zip: process.env.LOB_FROM_ZIP ?? "94107",
      country: process.env.LOB_FROM_COUNTRY ?? "US",
    },
  },
  attio: {
    apiKey: process.env.ATTIO_API_KEY ?? "",
    object: process.env.ATTIO_OBJECT ?? "people",
  },
  checks: {
    requireReachable: bool(process.env.QR_REQUIRE_REACHABLE, false),
  },
  // In production the QR encodes /r/:trackingId (the tracking redirect that
  // logs engagement in Attio then forwards to Calendly). For demo runs, set
  // CALENDLY_URL to override the fixture booking_url so the QR scans to a
  // real Calendly page directly — useful for testing without a live redirect.
  calendly: {
    url: process.env.CALENDLY_URL ?? "",
  },
  brand: {
    fetch: (process.env.BRAND_FETCH ?? "auto") as "auto" | "always" | "never",
    fetchMissingLogo: bool(process.env.BRAND_FETCH_MISSING_LOGO, true),
    brandfetchApiKey: process.env.BRANDFETCH_API_KEY ?? "",
    timeoutMs: Number(process.env.BRAND_FETCH_TIMEOUT_MS ?? "8000"),
  },
  sender: {
    whatWeDo:
      process.env.SENDER_WHAT_WE_DO ??
      "We send autonomous, AI-personalised physical outreach to your ICP — a real postcard, no manual work.",
    icpDescription:
      process.env.SENDER_ICP_DESCRIPTION ??
      "B2B sales teams and founders who want to stand out with personalised outreach at scale.",
  },
  outDir: process.env.OUT_DIR ?? "./out",
};

export type Config = typeof config;
