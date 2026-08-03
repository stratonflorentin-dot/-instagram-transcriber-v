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

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, refresh };
}
