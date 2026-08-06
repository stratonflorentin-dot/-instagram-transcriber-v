import type { HistoryItem } from "../api/types";
import { HistoryList } from "./HistoryList";
import { ChevronLeftIcon, MoonIcon, PlusIcon, SunIcon, WaveformIcon, XIcon } from "./Icons";

export function Sidebar({
  open,
  onToggle,
  selectedJobId,
  onSelectHistory,
  onNewTranscription,
  dark,
  onToggleDark,
}: {
  open: boolean;
  onToggle: () => void;
  selectedJobId: string | null;
  onSelectHistory: (entry: HistoryItem) => void;
  onNewTranscription: () => void;
  dark: boolean;
  onToggleDark: () => void;
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onToggle}
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 -translate-x-full flex-col overflow-hidden border-r border-stone-200 bg-stone-50 transition-all duration-200 dark:border-stone-800 dark:bg-stone-950 md:static md:translate-x-0 ${
          open ? "translate-x-0" : ""
        } ${open ? "" : "md:w-0 md:border-r-0"}`}
      >
        <div className="flex h-full w-72 shrink-0 flex-col">
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2 px-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 text-white shadow-soft">
                <WaveformIcon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">Transcriber</span>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              aria-label="Collapse sidebar"
            >
              <span className="md:hidden">
                <XIcon className="h-4 w-4" />
              </span>
              <span className="hidden md:block">
                <ChevronLeftIcon className="h-4 w-4" />
              </span>
            </button>
          </div>

          <div className="px-3">
            <button
              type="button"
              onClick={onNewTranscription}
              className="flex w-full items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-700 shadow-soft transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              <PlusIcon className="h-4 w-4" />
              New transcription
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto px-2 pb-3">
            <h2 className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-600">
              Recent
            </h2>
            <HistoryList selectedJobId={selectedJobId} onSelect={onSelectHistory} />
          </div>

          <div className="border-t border-stone-200 p-3 dark:border-stone-800">
            <button
              type="button"
              onClick={onToggleDark}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-200 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              {dark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
