import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const COBALT_INSTANCES = [
  "https://rue-cobalt.xenon.zone",
  "https://melon.clxxped.lol",
  "https://grapefruit.clxxped.lol",
  "https://lime.clxxped.lol",
  "https://subito-c.meowing.de",
  "https://nuko-c.meowing.de",
  "https://cobaltapi.cjs.nz",
  "https://api.qwkuns.me",
  "https://cobalt.omega.wolfy.love",
  "https://api.cobalt.liubquanti.click"
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  await supabase.from("jobs").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", jobId);
}

async function downloadAudioFromInstagram(url: string): Promise<{ audioBlob: Blob; title: string }> {
  let lastError: Error | null = null;

  // Try each Cobalt instance until one succeeds
  for (const instance of COBALT_INSTANCES) {
    try {
      console.log(`[download] Attempting download via Cobalt instance: ${instance}`);
      const cobaltRes = await fetch(instance, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url,
          downloadMode: "audio",
          audioFormat: "mp3",
          audioBitrate: "128",
        }),
      });

      if (!cobaltRes.ok) {
        const text = await cobaltRes.text().catch(() => "");
        throw new Error(`Instance returned ${cobaltRes.status}: ${text}`);
      }

      const cobaltData = await cobaltRes.json();
      const downloadUrl = cobaltData.url ?? cobaltData.tunnel;

      if (!downloadUrl) {
        throw new Error(`No download URL in response: ${JSON.stringify(cobaltData)}`);
      }

      console.log(`[download] Successfully got download link: ${downloadUrl}`);
      const audioRes = await fetch(downloadUrl);
      if (!audioRes.ok) {
        throw new Error(`Failed to fetch direct audio file: ${audioRes.status}`);
      }

      const audioBlob = await audioRes.blob();
      const title = cobaltData.filename ?? url;
      return { audioBlob, title };
    } catch (err) {
      console.warn(`[download] Instance ${instance} failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(`All community download instances failed. Last error: ${lastError?.message}`);
}

async function transcribeWithGroq(audioBlob: Blob, filename: string): Promise<{
  text: string;
  segments: Array<{ id: number; start: number; end: number; text: string }>;
  language: string;
  duration: number;
}> {
  const formData = new FormData();
  formData.append("file", audioBlob, filename.endsWith(".mp3") ? filename : filename + ".mp3");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!groqRes.ok) {
    const errorText = await groqRes.text().catch(() => "");
    throw new Error(`Groq Whisper API error ${groqRes.status}: ${errorText}`);
  }

  const result = await groqRes.json();
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { url?: string; job_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { url, job_id } = body;
  if (!url || !job_id) {
    return json({ error: "url and job_id are required" }, 400);
  }

  // Stage 1: downloading
  try {
    await updateJob(supabase, job_id, {
      status: "downloading",
      stage_message: "Downloading Instagram audio…",
      progress_percent: 10,
    });

    const { audioBlob, title } = await downloadAudioFromInstagram(url);
    const audioDurationApprox = audioBlob.size / (128 * 1024 / 8); // rough estimate from 128kbps

    // Stage 2: transcribing
    await updateJob(supabase, job_id, {
      status: "transcribing",
      stage_message: "Transcribing with Groq Whisper…",
      progress_percent: 50,
    });

    const transcription = await transcribeWithGroq(audioBlob, "audio.mp3");

    // Build segments in our schema format
    const segments = (transcription.segments ?? []).map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      words: [],
    }));

    const text = transcription.text?.trim() ?? segments.map((s) => s.text).join(" ");
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const duration = transcription.duration ?? audioDurationApprox;
    const language = transcription.language ?? "unknown";

    // Stage 3: completed — store result
    await updateJob(supabase, job_id, {
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

    // Also insert into history
    await supabase.from("history").insert({
      job_id,
      source_type: "url",
      source: url,
      title: typeof title === "string" ? title.substring(0, 200) : url,
      duration,
      word_count: wordCount,
      language,
    });

    return json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateJob(supabase, job_id, {
      status: "failed",
      stage_message: "Failed",
      progress_percent: 0,
      error: { code: "transcription_failed", message },
    });
    return json({ error: message }, 500);
  }
});
