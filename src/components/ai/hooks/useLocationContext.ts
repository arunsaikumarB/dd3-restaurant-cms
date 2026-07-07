import { DEFAULT_PUBLIC_LOCATION_ID, isLocationId, type LocationId } from "../../../config/locations";
import { useLocationSelection } from "../../../context/LocationContext";
import { useCheffyContext } from "../CheffyContext";



/** Resolves the active location and live CMS knowledge from Cheffy context. */

export function useConciergeLocation(_enabled = true) {

  const ctx = useLocationSelection();

  const locationId = (ctx.selectedLocationId ?? DEFAULT_PUBLIC_LOCATION_ID) as LocationId;

  const { knowledge, knowledgeLoading } = useCheffyContext();



  return {

    locationId,

    setLocation: ctx.setLocation,

    isValidLocation: isLocationId(locationId),

    knowledge: _enabled ? knowledge : null,

    loading: _enabled ? knowledgeLoading : false,

  };

}

