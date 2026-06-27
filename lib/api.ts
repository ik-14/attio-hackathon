/**
 * Reachd API client — always tries the real /api/* endpoints first,
 * falls back to fixture data on network error or non-2xx response.
 */
import type { Icp, Lead, PipelineStatus } from "./types";
import {
  FIXTURE_ICP,
  FIXTURE_ICP_REPLY,
  FIXTURE_STATUS,
} from "./fixture";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function apiFetch<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, { ...init, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${input}`);
  }
  return res.json() as Promise<T>;
}

// ── ICP ─────────────────────────────────────────────────────────────────────

export async function getIcp(): Promise<Icp> {
  try {
    return await apiFetch<Icp>(`${BASE}/api/icp`);
  } catch (err) {
    console.warn("[Reachd] getIcp: API unavailable, using fixture.", err);
    return FIXTURE_ICP;
  }
}

export async function chatIcp(
  message: string
): Promise<{ icp: Icp; reply: string }> {
  try {
    return await apiFetch<{ icp: Icp; reply: string }>(`${BASE}/api/icp/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  } catch (err) {
    console.warn("[Reachd] chatIcp: API unavailable, using fixture.", err);
    return FIXTURE_ICP_REPLY;
  }
}

// ── Status / Leads ───────────────────────────────────────────────────────────

export async function getStatus(): Promise<PipelineStatus> {
  try {
    return await apiFetch<PipelineStatus>(`${BASE}/api/status`);
  } catch (err) {
    console.warn("[Reachd] getStatus: API unavailable, using fixture.", err);
    return { ...FIXTURE_STATUS, updatedAt: new Date().toISOString() };
  }
}

export async function getLeads(stage?: string): Promise<Lead[]> {
  try {
    const url = stage
      ? `${BASE}/api/leads?stage=${encodeURIComponent(stage)}`
      : `${BASE}/api/leads`;
    return await apiFetch<Lead[]>(url);
  } catch (err) {
    console.warn("[Reachd] getLeads: API unavailable, using fixture.", err);
    return FIXTURE_STATUS.leads;
  }
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function triggerJob(
  name: "discover" | "enrich" | "outreach" | "stale-check",
  leadId?: string
): Promise<{ ok: boolean; job?: unknown }> {
  try {
    return await apiFetch<{ ok: boolean; job?: unknown }>(
      `${BASE}/api/jobs/${name}`,
      {
        method: "POST",
        headers: leadId ? { "content-type": "application/json" } : undefined,
        body: leadId ? JSON.stringify({ leadId }) : undefined,
      }
    );
  } catch (err) {
    console.warn(`[Reachd] triggerJob(${name}): API unavailable.`, err);
    return { ok: false };
  }
}

// ── Review ───────────────────────────────────────────────────────────────────

export async function approvePostcard(
  id: string
): Promise<{ ok: boolean }> {
  try {
    return await apiFetch<{ ok: boolean }>(
      `${BASE}/api/review/${encodeURIComponent(id)}/approve`,
      { method: "POST" }
    );
  } catch (err) {
    console.warn("[Reachd] approvePostcard: API unavailable.", err);
    return { ok: false };
  }
}

export async function regenPostcard(
  id: string
): Promise<{ ok: boolean }> {
  try {
    return await apiFetch<{ ok: boolean }>(
      `${BASE}/api/review/${encodeURIComponent(id)}/regen`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "regen" }),
      }
    );
  } catch (err) {
    console.warn("[Reachd] regenPostcard: API unavailable.", err);
    return { ok: false };
  }
}
