/**
 * Package Engine — reusable catering packages + matching.
 */

import { getPackageByCode, listPackages, upsertPackage } from "./repository";
import type { EventPackage, EventRequirements } from "./types";

export async function getActivePackages(locationId: string): Promise<EventPackage[]> {
  return listPackages(locationId, true);
}

export async function savePackage(
  pkg: Parameters<typeof upsertPackage>[0],
): Promise<EventPackage | null> {
  return upsertPackage(pkg);
}

export function scorePackage(pkg: EventPackage, req: EventRequirements): number {
  let score = 0;
  const guests = req.guestCount ?? 0;
  if (guests >= pkg.minGuests) score += 30;
  else score -= (pkg.minGuests - guests) * 2;

  if (req.budget != null && req.budget > 0) {
    const estimate = pkg.basePrice + pkg.pricePerGuest * Math.max(guests, pkg.minGuests);
    const ratio = estimate / req.budget;
    if (ratio <= 1) score += 40 - Math.abs(1 - ratio) * 20;
    else score -= (ratio - 1) * 50;
  } else {
    score += 10;
  }

  const type = (req.eventType ?? "").toLowerCase();
  if (type === "wedding" && pkg.tier === "platinum") score += 25;
  if (type === "corporate" && pkg.code.includes("CORP")) score += 25;
  if (type === "birthday" && pkg.code.includes("BDAY")) score += 25;
  if (type === "office_lunch" && pkg.code.includes("CORP")) score += 20;
  if (req.needs?.liveCounter && Array.isArray(pkg.menuJson.live_counters)) score += 10;
  if (req.needs?.decorations && Object.keys(pkg.decorJson).length) score += 8;
  return score;
}

export async function recommendPackages(
  locationId: string,
  req: EventRequirements,
  limit = 3,
): Promise<EventPackage[]> {
  const all = await getActivePackages(locationId);
  return [...all]
    .map((p) => ({ p, s: scorePackage(p, req) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}

export async function resolvePackage(
  locationId: string,
  codeOrId?: string,
): Promise<EventPackage | null> {
  if (!codeOrId) return null;
  if (codeOrId.includes("-")) {
    const byList = await listPackages(locationId, false);
    const hit = byList.find((p) => p.id === codeOrId);
    if (hit) return hit;
  }
  return getPackageByCode(locationId, codeOrId);
}

export function estimatePackageTotal(pkg: EventPackage, guestCount: number): number {
  const guests = Math.max(guestCount, pkg.minGuests);
  return pkg.basePrice + pkg.pricePerGuest * guests;
}
