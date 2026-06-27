// In-memory ICP store. Module-level global — acceptable for local `next dev`.
// getIcp() returns the current ICP (defaulting to config.defaultIcp).
// setIcp() overwrites it; called by POST /api/icp/chat.

import { config } from "@/lib/config";
import type { Icp } from "@/lib/types";

let current: Icp = { ...config.defaultIcp };

export function getIcp(): Icp {
  return current;
}

export function setIcp(icp: Icp): void {
  current = icp;
}
