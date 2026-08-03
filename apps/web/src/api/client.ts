import { supabase } from "./supabase";
import type { TranscriptResult, HistoryItem } from "./types";

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

/** Create a new job row in Supabase and trigger the transcribe edge function. */
export async function createJobFromUrl(url: string): Promise<{ id: string; status: string }> {
  // 1. Insert job row
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({ source_url: url, status: "queued", stage_message: "Queued…", progress_percent: 0 })
    .select()
    .single();

  if (error || !job) {
    throw new ApiError("create_job_failed", error?.message ?? "Failed to create job");
  }

  // 2. Fire-and-forget: invoke the transcribe edge function (don't await result)
  supabase.functions
    .invoke("transcribe", { body: { url, job_id: job.id } })
    .catch((err) => {
      console.error("[transcribe] edge function error:", err);
    });

  return { id: job.id, status: job.status };
}

/** Create a job from a local uploaded file, sending audio directly to Groq. */
export async function createJobFromFile(file: File): Promise<{ id: string; status: string }> {
  // 1. Insert job row
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      source_url: null,
      status: "transcribing",
      stage_message: "Uploading and transcribing…",
      progress_percent: 10,
    })
    .select()
    .single();

  if (error || !job) {
    throw new ApiError("create_job_failed", error?.message ?? "Failed to create job");
  }

  // 2. Call transcribe-file edge function with the raw file bytes
  const arrayBuffer = await file.arrayBuffer();
  supabase.functions
    .invoke("transcribe-file", {
      body: new Blob([arrayBuffer], { type: file.type }),
      headers: {
        "x-job-id": job.id,
        "x-filename": file.name,
        "x-content-type": file.type,
      },
    })
    .catch((err) => {
      console.error("[transcribe-file] edge function error:", err);
    });

  return { id: job.id, status: job.status };
}

/** Get the current status of a job. */
export async function getJobStatus(jobId: string) {
  const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (error || !data) throw new ApiError("not_found", "Job not found");
  return data;
}

/** Get the completed result of a job. */
export async function getJobResult(jobId: string): Promise<TranscriptResult> {
  const { data, error } = await supabase
    .from("jobs")
    .select("result, status")
    .eq("id", jobId)
    .single();

  if (error || !data) throw new ApiError("not_found", "Job not found");
  if (data.status !== "completed" || !data.result) {
    throw new ApiError("not_completed", "Job not completed yet");
  }
  return data.result as TranscriptResult;
}

/** Subscribe to real-time job status updates. Returns an unsubscribe function. */
export function subscribeToJob(
  jobId: string,
  onUpdate: (row: {
    status: string;
    stage_message: string;
    progress_percent: number;
    error: { code: string; message: string } | null;
    result: TranscriptResult | null;
  }) => void
): () => void {
  const channel = supabase
    .channel(`job-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        onUpdate(payload.new as Parameters<typeof onUpdate>[0]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory(): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new ApiError("history_failed", error.message);
  return (data ?? []) as HistoryItem[];
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await supabase.from("history").delete().eq("id", id);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

/** Generate TXT, SRT, or JSON export from a TranscriptResult client-side. */
export function exportTranscript(
  result: TranscriptResult,
  format: "txt" | "srt" | "json"
): { content: string; mimeType: string; filename: string } {
  if (format === "txt") {
    return {
      content: result.text,
      mimeType: "text/plain",
      filename: "transcript.txt",
    };
  }

  if (format === "json") {
    return {
      content: JSON.stringify(result, null, 2),
      mimeType: "application/json",
      filename: "transcript.json",
    };
  }

  // SRT
  const srtLines = result.segments.map((seg, i) => {
    const toSrtTime = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.round((s % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };
    return `${i + 1}\n${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}\n${seg.text}\n`;
  });

  return {
    content: srtLines.join("\n"),
    mimeType: "text/srt",
    filename: "subtitles.srt",
  };
}

export function downloadExport(result: TranscriptResult, format: "txt" | "srt" | "json") {
  const { content, mimeType, filename } = exportTranscript(result, format);
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
