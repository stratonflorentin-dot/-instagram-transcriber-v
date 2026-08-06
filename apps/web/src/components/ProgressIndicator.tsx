import { useJobContext } from "../context/JobContext";
import type { JobStatus } from "../api/types";
import { CancelButton } from "./CancelButton";
import { CheckIcon, ClockIcon, DownloadIcon, WaveformIcon, XIcon } from "./Icons";

const STEPS: { status: JobStatus; label: string; icon: typeof ClockIcon }[] = [
  { status: "queued", label: "Queued", icon: ClockIcon },
  { status: "downloading", label: "Downloading", icon: DownloadIcon },
  { status: "transcribing", label: "Transcribing", icon: WaveformIcon },
  { status: "completed", label: "Done", icon: CheckIcon },
];

export function ProgressIndicator() {
  const { state } = useJobContext();
  if (!state.jobId || !state.status) return null;

  if (state.status === "failed") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/50 dark:bg-red-950/30">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <XIcon className="h-4 w-4" />
        </span>
        <span className="text-red-700 dark:text-red-300">{state.error?.message ?? "Something went wrong."}</span>
      </div>
    );
  }

  if (state.status === "cancelled") {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
        Cancelled.
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === state.status);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{state.stageMessage}</span>
        <CancelButton />
      </div>

      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = currentIndex > i;
          const active = currentIndex === i;
          const Icon = step.icon;
          return (
            <div key={step.status} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? "border-brand-500 bg-brand-500 text-white"
                      : active
                        ? "animate-pulse border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300"
                        : "border-stone-200 bg-stone-50 text-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-600"
                  }`}
                >
                  {done ? <CheckIcon className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    done || active ? "text-stone-600 dark:text-stone-300" : "text-stone-300 dark:text-stone-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 rounded-full transition-colors ${
                    done ? "bg-brand-500" : "bg-stone-200 dark:bg-stone-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
