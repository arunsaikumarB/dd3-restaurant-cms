import { Navigate, useLocation } from "react-router-dom";

/**
 * Every canonical route in this app ends with a trailing slash
 * (e.g. /oak-tree/menu/). Redirect any non-slash hit to its canonical form.
 */
export default function TrailingSlashRedirect() {
  const { pathname, search, hash } = useLocation();

  if (pathname !== "/" && !pathname.endsWith("/")) {
    return <Navigate to={`${pathname}/${search}${hash}`} replace />;
  }

  return null;
}
