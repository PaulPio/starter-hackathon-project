"use client";

import { useRef, useState } from "react";
import { Sparkles, Upload } from "lucide-react";
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
        className={`flex flex-col items-center justify-center gap-3.5 border-2 border-dashed border-ink px-6 py-14 text-center ${
          isDragging ? "bg-brand/5" : "bg-transparent"
        } ${disabled ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
      >
        <div className="flex size-[52px] items-center justify-center border-2 border-ink text-brand">
          <Upload className="size-6" strokeWidth={2} />
        </div>
        <div>
          <p className="m-0 text-[15.5px] font-bold">Drop your resume here, or click to browse</p>
          <p className="mt-1 m-0 text-[13.5px] text-muted-foreground">PDF only, up to 5MB</p>
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

      <button
        type="button"
        disabled={disabled}
        onClick={onUseSample}
        className="flex items-center justify-center gap-2 border-2 border-ink bg-card px-4 py-3 text-sm font-bold text-foreground disabled:opacity-60"
      >
        <Sparkles className="size-4 text-brand" strokeWidth={2} />
        Try with a sample resume
      </button>
    </div>
  );
}
