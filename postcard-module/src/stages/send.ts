import { sendViaLob } from "../clients/lobClient.js";
import type { ComposedCard, MailInput } from "../types.js";

// Stage 6 — submit to Lob (test mode) → proof PDF. No postage charged.
export async function send(input: MailInput, card: ComposedCard) {
  const result = await sendViaLob(input, card.frontPng, card.backPng);
  return result;
}
