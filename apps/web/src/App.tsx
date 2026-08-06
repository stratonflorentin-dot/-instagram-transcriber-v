import { useEffect, useState } from "react";

import { getJobResult } from "./api/client";
import type { HistoryItem, TranscriptResult } from "./api/types";
import { FileDropZone } from "./components/FileDropZone";
import { MenuIcon } from "./components/Icons";
import { ProgressIndicator } from "./components/ProgressIndicator";
import { Sidebar } from "./components/Sidebar";
import { TranscriptView } from "./components/TranscriptView";
import { UrlInputForm } from "./components/UrlInputForm";
import { JobProvider, useJobContext } from "./context/JobContext";
import { useJobPolling } from "./hooks/useJobPolling";

type InputMode = "url" | "file";

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return { dark, toggle };
}

function NewTranscriptionFlow() {
  const { state } = useJobContext();
  const [mode, setMode] = useState<InputMode>("url");
  useJobPolling();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {(["url", "file"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === m
                ? "bg-brand-500 text-white shadow-soft"
                : "text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            }`}
          >
            {m === "url" ? "Paste URL" : "Upload file"}
          </button>
        ))}
      </div>

      {mode === "url" ? <UrlInputForm /> : <FileDropZone />}

      <ProgressIndicator />

      {state.result && state.jobId && <TranscriptView jobId={state.jobId} result={state.result} />}
    </div>
  );
}

function HistoryTranscriptView({ entry }: { entry: HistoryItem }) {
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setError(null);
    getJobResult(entry.job_id)
      .then((r) => !cancelled && setResult(r))
      .catch(() => !cancelled && setError("Couldn't load this transcript."));
    return () => {
      cancelled = true;
    };
  }, [entry.job_id]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{entry.title}</h2>
        <p className="truncate text-xs text-stone-400">{entry.source}</p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!error && !result && <p className="text-sm text-stone-400">Loading transcript…</p>}
      {result && <TranscriptView jobId={entry.job_id} result={result} />}
    </div>
  );
}

function MainPanel({
  sidebarOpen,
  onOpenSidebar,
  selectedHistory,
  onNewTranscription,
}: {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  selectedHistory: HistoryItem | null;
  onNewTranscription: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 py-4 md:px-8">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            aria-label="Open sidebar"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">
            {selectedHistory ? "Transcript" : "Instagram Transcriber"}
          </h1>
          {!selectedHistory && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Paste a Reel or Post link, or upload audio/video.
            </p>
          )}
        </div>
        {selectedHistory && (
          <button
            type="button"
            onClick={onNewTranscription}
            className="ml-auto rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 shadow-soft transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            New transcription
          </button>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 md:px-8">
        {selectedHistory ? <HistoryTranscriptView entry={selectedHistory} /> : <NewTranscriptionFlow />}
      </main>
    </div>
  );
}

function AppShell() {
  const { state, dispatch } = useJobContext();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (window.innerWidth < 768) return false;
    return localStorage.getItem("sidebarOpen") !== "false";
  });
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);

  // Starting a new job (URL/file submit) should switch the main panel back to the live view.
  useEffect(() => {
    if (state.jobId) setSelectedHistory(null);
  }, [state.jobId]);

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    localStorage.setItem("sidebarOpen", String(next));
  };

  const handleNewTranscription = () => {
    dispatch({ type: "RESET" });
    setSelectedHistory(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSelectHistory = (entry: HistoryItem) => {
    setSelectedHistory(entry);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-surface-light dark:bg-surface-dark">
      <Sidebar
        open={sidebarOpen}
        onToggle={toggleSidebar}
        selectedJobId={selectedHistory?.job_id ?? null}
        onSelectHistory={handleSelectHistory}
        onNewTranscription={handleNewTranscription}
        dark={dark}
        onToggleDark={toggleDark}
      />
      <MainPanel
        sidebarOpen={sidebarOpen}
        onOpenSidebar={toggleSidebar}
        selectedHistory={selectedHistory}
        onNewTranscription={handleNewTranscription}
      />
    </div>
  );
}

export default function App() {
  return (
    <JobProvider>
      <AppShell />
    </JobProvider>
  );
}
