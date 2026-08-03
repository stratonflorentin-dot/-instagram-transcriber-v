import { useState } from "react";
import { supabase } from "../api/supabase";
import { useJobContext } from "../context/JobContext";

export function CancelButton() {
  const { state, dispatch } = useJobContext();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!state.jobId) return;
    setCancelling(true);
    try {
      // Mark job as cancelled directly in Supabase
      await supabase
        .from("jobs")
        .update({ status: "cancelled", stage_message: "Cancelled", updated_at: new Date().toISOString() })
        .eq("id", state.jobId);

      dispatch({
        type: "UPDATE_STATUS",
        status: "cancelled",
        stageMessage: "Cancelled",
        progressPercent: 0,
        error: null,
      });
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={cancelling}
      className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
    >
      {cancelling ? "Cancelling…" : "Cancel"}
    </button>
  );
}
