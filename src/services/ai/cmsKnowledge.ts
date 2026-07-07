import type { LocationId } from "../../config/locations";
import type { CMSKnowledge } from "../cms/knowledge";
import { buildCMSKnowledge } from "../cms/knowledge";

/** @deprecated Use CMSKnowledge from services/cms/knowledge */
export type ConciergeKnowledge = CMSKnowledge;

/** Loads the Cheffy CMS knowledge bundle for a location. */
export async function buildConciergeKnowledge(locationId: LocationId): Promise<CMSKnowledge> {
  return buildCMSKnowledge(locationId);
}
