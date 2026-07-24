"use client";

import { useEffect, useState } from "react";

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
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="size-4 shrink-0 animate-spin border-2 border-ink border-t-brand" />
      <span className="font-medium">{messages[index]}</span>
    </div>
  );
}
