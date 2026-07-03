import { useHomepageData } from "../../hooks/useHomepageData";
import { useLocationSelection } from "../../context/LocationContext";
import { resolveOrderUrl } from "../../utils/locationLinks";

/** Resolves the ChefGaa order URL for the currently selected location. */
export function useLocationOrderUrl(): string {
  const { selectedLocationId } = useLocationSelection();
  const { bundle, locationId: bundleLocationId } = useHomepageData();
  return resolveOrderUrl(bundle.settings, selectedLocationId, bundleLocationId);
}
