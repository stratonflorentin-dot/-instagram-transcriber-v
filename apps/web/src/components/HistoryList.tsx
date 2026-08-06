import { useEffect, useState } from "react";

import { getJobResult } from "../api/client";
import type { TranscriptResult } from "../api/types";
import { useJobContext } from "../context/JobContext";
import { useHistory } from "../hooks/useHistory";
import { TranscriptView } from "./TranscriptView";

export function HistoryList() {
  const { entries, refresh } = useHistory();
  const { state } = useJobContext();
  const [openId, setOpenId] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "completed") refresh();
  }, [state.status, refresh]);

  const toggleEntry = async (entryId: string, jobId: string) => {
    if (openId === entryId) {
      setOpenId(null);
      return;
    }

    setOpenId(entryId);
    setResult(null);
    setLoadError(null);
    setLoading(true);
    try {
      setResult(await getJobResult(jobId));
    } catch {
      setLoadError("Couldn't load this transcript.");
    } finally {
      setLoading(false);
    }
  };

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">Recent</h2>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => toggleEntry(entry.id, entry.job_id)}
              className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm shadow-soft transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-700 dark:text-stone-200">{entry.title}</p>
                <p className="truncate text-xs text-stone-400">{entry.source}</p>
              </div>
              <span className="ml-3 shrink-0 text-xs text-stone-400">{entry.word_count} words</span>
            </button>

            {openId === entry.id && (
              <>
                {loading && <p className="px-1 text-xs text-stone-400">Loading transcript…</p>}
                {loadError && <p className="px-1 text-xs text-red-500">{loadError}</p>}
                {result && <TranscriptView jobId={entry.job_id} result={result} />}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
