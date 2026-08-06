import { useEffect, useState } from "react";

import { deleteHistoryItem } from "../api/client";
import type { HistoryItem } from "../api/types";
import { useJobContext } from "../context/JobContext";
import { useHistory } from "../hooks/useHistory";
import { TrashIcon } from "./Icons";

export function HistoryList({
  selectedJobId,
  onSelect,
}: {
  selectedJobId: string | null;
  onSelect: (entry: HistoryItem) => void;
}) {
  const { entries, refresh, remove } = useHistory();
  const { state } = useJobContext();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "completed") refresh();
  }, [state.status, refresh]);

  const handleDelete = async (e: React.MouseEvent, entry: HistoryItem) => {
    e.stopPropagation();
    setPendingDelete(entry.id);
    try {
      await deleteHistoryItem(entry.id);
      remove(entry.id);
    } finally {
      setPendingDelete(null);
    }
  };

  if (entries.length === 0) {
    return <p className="px-3 py-2 text-xs text-stone-400 dark:text-stone-600">No transcripts yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onSelect(entry)}
            className={`group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
              selectedJobId === entry.job_id
                ? "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200"
                : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800/70"
            }`}
          >
            <span className="min-w-0 flex-1 truncate">{entry.title}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => handleDelete(e, entry)}
              className="shrink-0 rounded-md p-1 text-stone-400 opacity-0 transition hover:bg-stone-200 hover:text-stone-600 group-hover:opacity-100 dark:hover:bg-stone-700 dark:hover:text-stone-200"
              aria-label="Delete transcript"
            >
              {pendingDelete === entry.id ? (
                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-500" />
              ) : (
                <TrashIcon className="h-3.5 w-3.5" />
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
