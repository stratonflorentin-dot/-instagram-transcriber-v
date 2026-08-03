import { useEffect } from "react";
import { subscribeToJob, getJobStatus } from "../api/client";
import type { TranscriptResult } from "../api/types";
import { useJobContext } from "../context/JobContext";

export function useJobPolling() {
  const { state, dispatch } = useJobContext();
  const { jobId } = state;

  useEffect(() => {
    if (!jobId) return;

    // Subscribe to real-time Supabase Postgres changes (replaces polling)
    const unsubscribe = subscribeToJob(jobId, (row) => {
      dispatch({
        type: "UPDATE_STATUS",
        status: row.status as import("../api/types").JobStatus,
        stageMessage: row.stage_message,
        progressPercent: row.progress_percent,
        error: row.error,
      });

      if (row.status === "completed" && row.result) {
        dispatch({ type: "SET_RESULT", result: row.result as TranscriptResult });
      }
    });

    // Also immediately fetch current state in case we already missed an update
    getJobStatus(jobId)
      .then((job) => {
        dispatch({
          type: "UPDATE_STATUS",
          status: job.status as import("../api/types").JobStatus,
          stageMessage: job.stage_message,
          progressPercent: job.progress_percent,
          error: job.error,
        });
        if (job.status === "completed" && job.result) {
          dispatch({ type: "SET_RESULT", result: job.result as TranscriptResult });
        }
      })
      .catch(() => undefined);

    return unsubscribe;
  }, [jobId, dispatch]);
}
