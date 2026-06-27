import { config, has } from "@/lib/config";
import type { MailInput } from "@/lib/postcard/types";

export interface LobSendResult {
  id: string;
  proof_url?: string;
  mock: boolean;
}

export async function sendViaLob(input: MailInput, frontPng: Buffer, backPng: Buffer): Promise<LobSendResult> {
  if (!has.lob()) {
    console.warn("[lob] no LOB_API_KEY → mock send");
    return { id: `psc_mock_${input.tracking_id}`, mock: true };
  }

  const { prospect } = input;
  const form = new FormData();
  form.append("description", `Postcard ${input.tracking_id} → ${prospect.company}`);
  form.append("size", "4x6");
  form.append("use_type", process.env.LOB_USE_TYPE ?? "marketing");

  form.append("to[name]", `${prospect.first_name} ${prospect.last_name}`);
  form.append("to[company]", prospect.company);
  form.append("to[address_line1]", prospect.postal_address.line1);
  if (prospect.postal_address.line2) form.append("to[address_line2]", prospect.postal_address.line2);
  form.append("to[address_city]", prospect.postal_address.city);
  if (prospect.postal_address.state) form.append("to[address_state]", prospect.postal_address.state);
  form.append("to[address_zip]", prospect.postal_address.postcode);
  form.append("to[address_country]", prospect.postal_address.country);

  form.append("from[name]", config.lobFrom.name);
  form.append("from[address_line1]", config.lobFrom.line1);
  form.append("from[address_city]", config.lobFrom.city);
  form.append("from[address_state]", config.lobFrom.state);
  form.append("from[address_zip]", config.lobFrom.zip);
  form.append("from[address_country]", config.lobFrom.country);

  form.append("front", new Blob([new Uint8Array(frontPng)], { type: "image/png" }), "front.png");
  form.append("back", new Blob([new Uint8Array(backPng)], { type: "image/png" }), "back.png");

  const auth = Buffer.from(`${config.lobApiKey}:`).toString("base64");
  const res = await fetch("https://api.lob.com/v1/postcards", {
    method: "POST",
    headers: { authorization: `Basic ${auth}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Lob ${res.status}: ${await res.text()}`);
  const data = await res.json() as { id: string; url?: string };
  return { id: data.id, proof_url: data.url, mock: false };
}
