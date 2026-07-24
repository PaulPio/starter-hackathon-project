"use client";

import { useEffect, useState } from "react";

// Cycles through pipeline-specific status copy so a multi-second LLM call
// reads as "doing something specific" rather than a stuck spinner.
export function LoadingState({
  messages,
  intervalMs = 1600,
}: {
  messages: string[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  return (
    <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
      <span>{messages[index]}</span>
    </div>
  );
}
