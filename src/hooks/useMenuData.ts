import { useEffect, useState } from "react";
import type { MenuData } from "../types/menu";

export function useMenuData() {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/data/menu.json")
      .then((res) => {
        if (!res.ok) throw new Error("Menu data not found");
        return res.json();
      })
      .then((json: MenuData) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
