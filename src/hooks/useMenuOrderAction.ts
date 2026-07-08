import { useCallback } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLocationSelection } from "../context/LocationContext";
import { redirectToOnlineOrdering } from "../utils/menuOrder";
import { useLocationOrderUrl } from "./useLocationOrderUrl";

/**
 * Opens the live ChefGaa menu for the selected outlet.
 * If no outlet is selected, sends the guest to the location gate.
 */
export function useMenuOrderAction() {
  const { selectedLocationId } = useLocationSelection();
  const orderUrl = useLocationOrderUrl();
  const navigate = useNavigate();

  const goToLiveMenu = useCallback(
    (event?: MouseEvent<HTMLElement>) => {
      event?.preventDefault();
      if (!selectedLocationId) {
        navigate("/");
        return;
      }
      redirectToOnlineOrdering(orderUrl);
    },
    [navigate, orderUrl, selectedLocationId],
  );

  return {
    orderUrl,
    hasLocation: Boolean(selectedLocationId),
    menuHref: selectedLocationId ? orderUrl : "/",
    goToLiveMenu,
  };
}
