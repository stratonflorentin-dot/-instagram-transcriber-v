import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Copy apps/web/.env.example to apps/web/.env and fill in your project values."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          status: string;
          stage_message: string;
          progress_percent: number;
          error: { code: string; message: string } | null;
          result: import("./types").TranscriptResult | null;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          status?: string;
          stage_message?: string;
          progress_percent?: number;
          source_url?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Row"]>;
      };
      history: {
        Row: {
          id: string;
          job_id: string;
          source_type: "url" | "file";
          source: string;
          title: string;
          duration: number;
          word_count: number;
          language: string;
          created_at: string;
        };
      };
    };
  };
};
