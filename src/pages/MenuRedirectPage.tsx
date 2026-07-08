import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocationSelection } from "../context/LocationContext";
import { useLocationOrderUrl } from "../hooks/useLocationOrderUrl";
import { redirectToOnlineOrdering } from "../utils/menuOrder";

/** Legacy `/menu` route — redirects to the outlet ChefGaa ordering URL from CMS settings. */
export default function MenuRedirectPage() {
  const { selectedLocationId } = useLocationSelection();
  const orderUrl = useLocationOrderUrl();
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedLocationId) {
      navigate("/", { replace: true });
      return;
    }
    redirectToOnlineOrdering(orderUrl);
  }, [navigate, orderUrl, selectedLocationId]);

  return null;
}
