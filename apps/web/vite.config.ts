import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseOrigin = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).origin : undefined;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png"],
        manifest: {
          name: "Instagram Transcriber",
          short_name: "Transcriber",
          description: "Turn Instagram Reels and Posts into clean, searchable transcripts.",
          theme_color: "#f97316",
          background_color: "#1c1917",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // App shell is precached; Supabase calls always go to the network —
          // transcription needs a live connection, so we never serve stale API data.
          navigateFallbackDenylist: [/^\/functions\//, /^\/rest\//],
          runtimeCaching: supabaseOrigin
            ? [
                {
                  urlPattern: ({ url }: { url: URL }) => url.origin === supabaseOrigin,
                  handler: "NetworkOnly" as const,
                },
              ]
            : [],
        },
      }),
    ],
    server: {
      port: 5173,
    },
  };
});
