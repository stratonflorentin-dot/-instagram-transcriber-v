import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-job-id, x-filename, x-content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function updateJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  fields: Record<string, unknown>
) {
  await supabase
    .from("jobs")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const jobId = req.headers.get("x-job-id");
  const filename = req.headers.get("x-filename") ?? "upload.mp3";
  const contentType = req.headers.get("x-content-type") ?? "audio/mpeg";

  if (!jobId) {
    return json({ error: "x-job-id header is required" }, 400);
  }

  try {
    await updateJob(supabase, jobId, {
      status: "transcribing",
      stage_message: "Transcribing with Groq Whisper…",
      progress_percent: 20,
    });

    const audioBytes = await req.arrayBuffer();
    const audioBlob = new Blob([audioBytes], { type: contentType });

    const formData = new FormData();
    formData.append("file", audioBlob, filename.endsWith(".mp3") ? filename : filename + ".mp3");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text().catch(() => "");
      throw new Error(`Groq Whisper API error ${groqRes.status}: ${errorText}`);
    }

    const transcription = await groqRes.json();

    const segments = (transcription.segments ?? []).map((seg: { start: number; end: number; text: string }) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      words: [],
    }));

    const text = transcription.text?.trim() ?? segments.map((s: { text: string }) => s.text).join(" ");
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const duration = transcription.duration ?? 0;
    const language = transcription.language ?? "unknown";

    await updateJob(supabase, jobId, {
      status: "completed",
      stage_message: "Done",
      progress_percent: 100,
      result: {
        segments,
        language,
        language_probability: 1.0,
        duration,
        word_count: wordCount,
        text,
        model_size: "whisper-large-v3-turbo",
        device: "groq-cloud",
      },
    });

    await supabase.from("history").insert({
      job_id: jobId,
      source_type: "file",
      source: filename,
      title: filename,
      duration,
      word_count: wordCount,
      language,
    });

    return json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateJob(supabase, jobId, {
      status: "failed",
      stage_message: "Failed",
      progress_percent: 0,
      error: { code: "transcription_failed", message },
    });
    return json({ error: message }, 500);
  }
});
