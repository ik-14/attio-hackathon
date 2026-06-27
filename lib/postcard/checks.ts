import * as jsQRModule from "jsqr";
import sharp from "sharp";
import type { Brief, CheckResult, ComposedCard, Copy } from "@/lib/postcard/types";

const jsQR = ((jsQRModule as unknown as { default?: typeof import("jsqr").default }).default ??
  jsQRModule) as typeof import("jsqr").default;

const HEADLINE_MAX_WORDS = 8;
const BODY_MAX_CHARS = 150; // matches the copy prompt target; compose is the hard geometric enforcement

async function decodeQr(qrPng: Buffer): Promise<string | null> {
  const { data, info } = await sharp(qrPng)
    .resize(512, 512, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const result = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height);
  return result?.data ?? null;
}

async function urlReachable(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    clearTimeout(t);
    const ok = res.status >= 200 && res.status < 400;
    return { ok, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

export async function runChecks(
  brief: Brief,
  copy: Copy,
  card: ComposedCard,
  bookingUrl: string,
): Promise<CheckResult> {
  const ran: CheckResult["ran"] = [];
  const add = (name: string, ok: boolean, detail?: string) => ran.push({ name, ok, detail });

  add("hook_present", brief.hook != null && brief.hook.trim().length > 0, brief.hook ?? "null");

  const words = copy.headline.trim().split(/\s+/).length;
  add("headline_length", words <= HEADLINE_MAX_WORDS, `${words} words`);
  add("body_length", copy.body.length <= BODY_MAX_CHARS, `${copy.body.length} chars`);

  const meta = await sharp(card.frontPng).metadata();
  add("image_present", !!meta.width && meta.width >= 1500, `${meta.width}×${meta.height}`);

  const decoded = await decodeQr(card.qrPng);
  add("qr_decodes_to_booking_url", decoded === bookingUrl, decoded ?? "no decode");

  const requireReachable = process.env.QR_REQUIRE_REACHABLE === "true";
  if (requireReachable) {
    if (/localhost|127\.0\.0\.1/.test(bookingUrl)) {
      add("qr_reachable", false, "booking_url is localhost — a phone scan won't resolve");
    } else {
      const r = await urlReachable(bookingUrl);
      add("qr_reachable", r.ok, r.detail);
    }
  }

  const failures = ran.filter((r) => !r.ok).map((r) => `${r.name} (${r.detail})`);
  return { ok: failures.length === 0, failures, ran };
}
