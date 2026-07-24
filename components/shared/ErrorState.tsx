import { AlertCircle } from "lucide-react";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-2 border-ink bg-card p-4 shadow-hard">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div>
          <p className="m-0 text-sm font-extrabold">Something went wrong</p>
          <p className="mt-1 m-0 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start border-2 border-ink bg-card px-3 py-1.5 text-sm font-bold"
        >
          Try again
        </button>
      )}
    </div>
  );
}
