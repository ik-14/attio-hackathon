// Central config + key-presence helpers. In Next.js, env vars are loaded from
// .env.local automatically — no dotenv needed. Every external client checks
// `has*` before making a real call and otherwise falls back to a deterministic
// stub, so the whole pipeline runs end-to-end with ZERO keys for local demos.

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function csv(name: string, fallback: string[]): string[] {
  const v = env(name);
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback;
}

export const config = {
  baseUrl: env("BASE_URL", env("NEXT_PUBLIC_API_BASE", "http://localhost:3000")),
  feOrigin: env("FE_ORIGIN", "http://localhost:3000"),

  attioApiKey: env("ATTIO_API_KEY"),
  apolloApiKey: env("APOLLO_API_KEY"),
  geminiApiKey: env("GEMINI_API_KEY"),
  tavilyApiKey: env("TAVILY_API_KEY"),
  resendApiKey: env("RESEND_API_KEY"),
  lobApiKey: env("LOB_API_KEY"),

  calendlyWebhookSigningKey: env("CALENDLY_WEBHOOK_SIGNING_KEY"),
  bookingPageUrl: env("BOOKING_PAGE_URL", "https://calendly.com/kiki-zhang058/30min"),

  mailWaitDays: Number(env("MAIL_WAIT_DAYS", "0")),

  defaultIcp: {
    titles: csv("ICP_TITLES", ["VP Sales", "Head of Sales", "RevOps"]),
    industries: csv("ICP_INDUSTRIES", ["software", "fintech"]),
    headcount: [
      Number(env("ICP_HEADCOUNT_MIN", "50")),
      Number(env("ICP_HEADCOUNT_MAX", "500")),
    ] as [number, number],
  },
};

// Key presence — drives the live-vs-stub branch in each client.
export const has = {
  attio: () => Boolean(config.attioApiKey),
  apollo: () => Boolean(config.apolloApiKey),
  gemini: () => Boolean(config.geminiApiKey),
  tavily: () => Boolean(config.tavilyApiKey),
  resend: () => Boolean(config.resendApiKey),
  lob: () => Boolean(config.lobApiKey && config.lobApiKey !== "test_"),
  calendly: () => Boolean(config.calendlyWebhookSigningKey),
};

export const MODELS = {
  textFast: "gemini-2.5-flash",
  textStrong: "gemini-2.5-pro",
  image: "gemini-2.5-flash-image",
};
