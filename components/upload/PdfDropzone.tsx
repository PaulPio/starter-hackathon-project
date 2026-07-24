"use client";

import { useRef, useState } from "react";
import { FileText, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_RESUME_FILE_BYTES } from "@/lib/config";

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function PdfDropzone({
  onFileSelected,
  onUseSample,
  disabled,
}: {
  onFileSelected: (file: File) => void;
  onUseSample: () => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSelect(file: File) {
    if (!isPdf(file)) {
      setValidationError("Please upload a PDF file.");
      return;
    }
    if (file.size > MAX_RESUME_FILE_BYTES) {
      setValidationError(
        `File is too large (max ${Math.round(MAX_RESUME_FILE_BYTES / 1024 / 1024)}MB).`
      );
      return;
    }
    setValidationError(null);
    onFileSelected(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload your resume PDF"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) validateAndSelect(file);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
        } ${disabled ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
      >
        <Upload className="h-8 w-8 text-zinc-400" />
        <div>
          <p className="font-medium">Drop your resume here, or click to browse</p>
          <p className="text-sm text-zinc-500">PDF only, up to 5MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndSelect(file);
            e.target.value = "";
          }}
        />
      </div>

      {validationError && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {validationError}
        </p>
      )}

      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled={disabled}
        onClick={onUseSample}
      >
        <Sparkles className="h-4 w-4" />
        Try with a sample resume
      </Button>
      <p className="flex items-start gap-1.5 text-xs text-zinc-500">
        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Runs through the exact same pipeline as your own resume — nothing is faked.
      </p>
    </div>
  );
}
