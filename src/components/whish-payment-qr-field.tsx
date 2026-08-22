"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  QrCode,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getOptionalHttpUrlError } from "@/lib/http-url";

const MAX_QR_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SCAN_DIMENSION = 2400;
const ACCEPTED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "jfif",
  "png",
  "webp",
]);
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jfif",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);

interface WhishPaymentQrFieldProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  disabled?: boolean;
  labelClassName?: string;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

function validateQrImage(file: File): string | null {
  if (file.size <= 0) return "This image is empty. Choose another file.";
  if (file.size > MAX_QR_IMAGE_BYTES) {
    return "Choose a QR image smaller than 5 MB.";
  }

  const extension = extensionOf(file.name);
  const acceptedType = !file.type || ACCEPTED_MIME_TYPES.has(file.type);
  if (!ACCEPTED_EXTENSIONS.has(extension) || !acceptedType) {
    return "Choose a JPG, JFIF, PNG, or WebP QR image.";
  }

  return null;
}

async function extractQrData(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, MAX_SCAN_DIMENSION / longestSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("QR scanning is unavailable in this browser.");

    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const { default: jsQR } = await import("jsqr");
    return (
      jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      })?.data ?? null
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function WhishPaymentQrField({
  value,
  onChange,
  error,
  onErrorChange,
  disabled = false,
  labelClassName,
}: WhishPaymentQrFieldProps) {
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [sourceName, setSourceName] = useState<string | null>(null);

  async function scanFile(file: File) {
    const fileError = validateQrImage(file);
    if (fileError) {
      onErrorChange(fileError);
      return;
    }

    onErrorChange(null);
    setIsScanning(true);
    try {
      const qrData = await extractQrData(file);
      if (!qrData) {
        onErrorChange(
          "No QR code was found. Choose a clear image containing the full code.",
        );
        return;
      }

      const urlError = getOptionalHttpUrlError(qrData);
      if (urlError) {
        onErrorChange(
          "The QR code does not contain a valid http:// or https:// payment link.",
        );
        return;
      }

      onChange(qrData.trim());
      setSourceName(file.name);
      onErrorChange(null);
    } catch (scanError) {
      onErrorChange(
        scanError instanceof Error
          ? scanError.message
          : "The QR image could not be read. Choose another file.",
      );
    } finally {
      setIsScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void scanFile(file);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (disabled || isScanning) return;
    const file = event.dataTransfer.files[0];
    if (file) void scanFile(file);
  }

  function clearLink() {
    onChange("");
    setSourceName(null);
    onErrorChange(null);
  }

  const describedBy = error ? `${helpId} ${errorId}` : helpId;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className={labelClassName}>
        Whish Payment QR
      </Label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.jfif,.png,.webp,image/jpeg,image/jfif,image/pjpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileInput}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        disabled={disabled || isScanning}
      />

      {value ? (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${
              error
                ? "bg-[rgba(244,63,94,0.08)] text-[var(--semantic-red)]"
                : "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]"
            }`}
          >
            {error ? (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-sm font-medium text-[var(--text-1)]">
              {error ? "Payment link needs attention" : "Payment link ready"}
            </p>
            <p
              className="mt-0.5 truncate font-mono text-xs text-[var(--text-3)]"
              title={value}
            >
              {value}
            </p>
            {sourceName && (
              <p className="mt-1 truncate text-[11px] text-[var(--text-4)]">
                Extracted from {sourceName}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isScanning}
            >
              {isScanning ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              {isScanning ? "Scanning..." : "Replace"}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={clearLink}
              disabled={disabled || isScanning}
              aria-label="Clear Whish payment link"
              className="text-[var(--text-4)] hover:text-[var(--semantic-red)]"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          disabled={disabled || isScanning}
          aria-describedby={describedBy}
          className={`group flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--teal-subtle)] disabled:pointer-events-none disabled:opacity-50 ${
            error
              ? "border-[var(--semantic-red)] bg-[rgba(244,63,94,0.06)]"
              : "border-[var(--border-strong)] bg-[var(--bg-hover)] hover:border-[rgba(0,212,170,0.3)] hover:bg-[var(--teal-subtle)]"
          }`}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--bg-2)] text-[var(--text-4)] transition-colors group-hover:text-[var(--teal-text)]">
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[var(--text-1)]">
              {isScanning ? "Reading QR code..." : "Upload payment QR"}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-[var(--text-4)]">
              Choose or drop a JPG, JFIF, PNG, or WebP image. Maximum 5 MB.
            </span>
          </span>
          {!isScanning && (
            <Upload className="ml-auto h-4 w-4 shrink-0 text-[var(--text-4)]" />
          )}
        </button>
      )}

      <p id={helpId} className="text-xs leading-5 text-[var(--text-4)]">
        Optional. The QR is read in this browser and is never uploaded.
      </p>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs text-[var(--semantic-red)]"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
