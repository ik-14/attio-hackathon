import "dotenv/config";

const bool = (v: string | undefined, def = false) =>
  v == null ? def : ["1", "true", "yes", "on"].includes(v.toLowerCase());

export const config = {
  text: {
    provider: (process.env.TEXT_LLM_PROVIDER ?? "sie") as "sie" | "gemini" | "mock",
    sie: {
      baseUrl: process.env.SIE_BASE_URL ?? "https://api.superlinked.com",
      apiKey: process.env.SIE_API_KEY ?? "",
      model: process.env.SIE_TEXT_MODEL ?? "Qwen/Qwen3-4B-Instruct-2507",
    },
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
  outDir: process.env.OUT_DIR ?? "./out",
};

export type Config = typeof config;
