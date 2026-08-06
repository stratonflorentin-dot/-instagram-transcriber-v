import { useCallback, useEffect, useState } from "react";
import { getHistory } from "../api/client";
import type { HistoryItem } from "../api/types";

export function useHistory() {
  const [entries, setEntries] = useState<HistoryItem[]>([]);

  const refresh = useCallback(() => {
    getHistory()
      .then(setEntries)
      .catch(() => undefined);
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, refresh, remove };
}
