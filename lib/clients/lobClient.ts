// Lob postcards. Basic auth (lobApiKey as username, blank password).
// Use a test_ prefixed key for sandbox sends — never ships, costs nothing.
// Per API-SPEC §6: native qr_code object, image must be at a Lob-reachable URL.

import axios from "axios";
import { config, has } from "@/lib/config";

export interface PostcardAddress {
  name: string;
  address_line1: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
}

export interface PostcardParams {
  to: PostcardAddress;
  trackingId: string;
  personalLine: string;
  body: string;
  cta: string;
  /** Public URL where Lob can fetch the front image (the /api/assets/:id route) */
  imageUrl: string;
}

const FROM_ADDRESS: PostcardAddress = {
  name: "Reachd HQ",
  address_line1: "760 Market St Ste 900",
  address_city: "San Francisco",
  address_state: "CA",
  address_zip: "94102",
  address_country: "US",
};

export async function sendPostcard(params: PostcardParams): Promise<{ proofUrl: string }> {
  if (!has.lob()) {
    const fakeProof = `https://lob-stub.example.com/proof/${params.trackingId}.pdf`;
    console.log(`[lob stub] sendPostcard to=${params.to.name} trackingId=${params.trackingId} → ${fakeProof}`);
    return { proofUrl: fakeProof };
  }

  const redirectUrl = `${config.baseUrl}/r/${params.trackingId}`;

  const response = await axios.post(
    "https://api.lob.com/v1/postcards",
    {
      description: `Reachd outreach — ${params.to.name}`,
      to: params.to,
      from: FROM_ADDRESS,
      size: "6x11",
      front: `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <img src="${params.imageUrl}" style="max-width:100%;margin-bottom:20px;"/>
        <p style="font-size:18px;color:#333;">${params.personalLine}</p>
        <p style="font-size:15px;">${params.body}</p>
      </body></html>`,
      back: `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2 style="font-size:22px;">${params.cta}</h2>
        <p style="font-size:14px;color:#666;">${redirectUrl}</p>
      </body></html>`,
      qr_code: {
        position: "front",
        redirect_url: redirectUrl,
        width: "2.5",
        top: "2.5",
        right: "0.5",
      },
    },
    {
      auth: { username: config.lobApiKey, password: "" },
    }
  );

  const proofUrl: string = response.data?.url ?? response.data?.front ?? "";
  return { proofUrl };
}
