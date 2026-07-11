"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlertTriangle,
  Crop,
  ImageIcon,
  Loader2,
  Move,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_RECOMMENDED_WIDTH = 1280;
const MIN_RECOMMENDED_HEIGHT = 720;
const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1080;
const ACCEPTED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type CropMode = "fill" | "custom";

interface EditableImage {
  blob: Blob;
  name: string;
  url: string;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface VenueCoverImageFieldProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

function isHeic(file: File): boolean {
  const extension = extensionOf(file.name);
  return (
    extension === "heic" ||
    extension === "heif" ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

function imageFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const stem = (dot > 0 ? filename.slice(0, dot) : filename).trim();
  return `${stem || "venue-cover"}-16x9.jpg`;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image export failed.")),
      "image/jpeg",
      quality,
    );
  });
}

async function loadImage(blob: Blob): Promise<EditableImage> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return {
      blob,
      name: "",
      url,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function normalizeForBrowser(file: File): Promise<Blob> {
  if (!isHeic(file)) return file;

  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  return Array.isArray(result) ? result[0] : result;
}

function validateFile(file: File): string | null {
  if (file.size <= 0) return "This image is empty. Choose another file.";
  if (file.size > MAX_IMAGE_BYTES) {
    return "Choose an image smaller than 5 MB.";
  }

  const extension = extensionOf(file.name);
  const acceptedType = !file.type || ACCEPTED_MIME_TYPES.has(file.type);
  if (!ACCEPTED_EXTENSIONS.has(extension) || !acceptedType) {
    return "Choose a JPEG, PNG, WebP, HEIC, or HEIF image.";
  }
  return null;
}

export function VenueCoverImageField({
  value,
  onChange,
  disabled = false,
}: VenueCoverImageFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragPointRef = useRef<Point | null>(null);

  const [editable, setEditable] = useState<EditableImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<CropMode>("fill");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFrameSize({ width, height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [editable]);

  useEffect(() => {
    return () => {
      if (editable) URL.revokeObjectURL(editable.url);
    };
  }, [editable]);

  function resetCrop(nextMode: CropMode = mode) {
    setMode(nextMode);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function displayMetrics(nextZoom = zoom) {
    if (!editable || !frameSize.width || !frameSize.height) {
      return { width: 0, height: 0, maxX: 0, maxY: 0, scale: 1 };
    }
    const coverScale = Math.max(
      frameSize.width / editable.width,
      frameSize.height / editable.height,
    );
    const scale = coverScale * nextZoom;
    const width = editable.width * scale;
    const height = editable.height * scale;
    return {
      width,
      height,
      maxX: Math.max(0, (width - frameSize.width) / 2),
      maxY: Math.max(0, (height - frameSize.height) / 2),
      scale,
    };
  }

  function clampPan(point: Point, nextZoom = zoom): Point {
    const { maxX, maxY } = displayMetrics(nextZoom);
    return {
      x: Math.max(-maxX, Math.min(maxX, point.x)),
      y: Math.max(-maxY, Math.min(maxY, point.y)),
    };
  }

  async function prepareFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsPreparing(true);
    try {
      const blob = await normalizeForBrowser(file);
      const loaded = await loadImage(blob);
      setEditable({ ...loaded, name: file.name });
      resetCrop("fill");
    } catch {
      setError(
        "This image could not be opened. Try exporting it as JPEG, PNG, or WebP.",
      );
    } finally {
      setIsPreparing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void prepareFile(file);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (mode !== "custom") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragPointRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = dragPointRef.current;
    if (!previous || mode !== "custom") return;
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    dragPointRef.current = { x: event.clientX, y: event.clientY };
    setPan((current) =>
      clampPan({ x: current.x + deltaX, y: current.y + deltaY }),
    );
  }

  function handlePointerEnd() {
    dragPointRef.current = null;
  }

  function changeZoom(nextZoom: number) {
    setZoom(nextZoom);
    setPan((current) => clampPan(current, nextZoom));
  }

  async function applyCrop() {
    if (!editable || !frameSize.width || !frameSize.height) return;
    setIsExporting(true);
    setError(null);
    try {
      const image = new Image();
      image.src = editable.url;
      await image.decode();

      const { scale } = displayMetrics();
      const sourceWidth = frameSize.width / scale;
      const sourceHeight = frameSize.height / scale;
      const centerX = editable.width / 2 - pan.x / scale;
      const centerY = editable.height / 2 - pan.y / scale;

      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_WIDTH;
      canvas.height = EXPORT_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image export is unavailable.");
      context.drawImage(
        image,
        centerX - sourceWidth / 2,
        centerY - sourceHeight / 2,
        sourceWidth,
        sourceHeight,
        0,
        0,
        EXPORT_WIDTH,
        EXPORT_HEIGHT,
      );

      let blob = await canvasToBlob(canvas, 0.9);
      if (blob.size > MAX_IMAGE_BYTES) blob = await canvasToBlob(canvas, 0.78);
      if (blob.size > MAX_IMAGE_BYTES) {
        throw new Error("The cropped image is still larger than 5 MB.");
      }

      onChange(
        new File([blob], imageFilename(editable.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
      setEditable(null);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "The crop could not be saved.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const metrics = displayMetrics();
  const isLowResolution = Boolean(
    editable &&
      (editable.width < MIN_RECOMMENDED_WIDTH ||
        editable.height < MIN_RECOMMENDED_HEIGHT),
  );

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={handleFileInput}
        disabled={disabled || isPreparing || isExporting}
      />

      {editable ? (
        <div className="space-y-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-hover)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-[var(--text-1)]">
                Crop venue cover
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-4)]">
                The upload will be normalized to 1920×1080.
              </p>
            </div>
            <div className="flex gap-1.5" aria-label="Crop mode">
              <Button
                type="button"
                size="sm"
                variant={mode === "fill" ? "secondary" : "ghost"}
                aria-pressed={mode === "fill"}
                onClick={() => resetCrop("fill")}
              >
                <Crop />
                Fill frame
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "custom" ? "secondary" : "ghost"}
                aria-pressed={mode === "custom"}
                onClick={() => setMode("custom")}
              >
                <Move />
                Custom crop
              </Button>
            </div>
          </div>

          <div
            ref={frameRef}
            className={`relative aspect-video touch-none overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-0)] select-none ${
              mode === "custom"
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-default"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            aria-label="16:9 image crop preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={editable.url}
              alt="Venue cover crop preview"
              draggable={false}
              className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
              style={{
                width: metrics.width || "100%",
                height: metrics.height || "100%",
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
          </div>

          {isLowResolution && (
            <div className="flex gap-2 rounded-md bg-[var(--semantic-amber-subtle)] px-3 py-2 text-xs text-[var(--semantic-amber)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                This image is {editable.width}×{editable.height}. At least
                1280×720 is recommended for a sharper cover.
              </p>
            </div>
          )}

          {mode === "custom" && (
            <div className="flex items-center gap-3">
              <label
                htmlFor={`${inputId}-zoom`}
                className="text-xs font-medium text-[var(--text-3)]"
              >
                Zoom
              </label>
              <input
                id={`${inputId}-zoom`}
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={zoom}
                onChange={(event) => changeZoom(Number(event.target.value))}
                className="h-1.5 min-w-0 flex-1 accent-[var(--teal)]"
              />
              <span className="w-10 text-right font-mono text-xs text-[var(--text-4)]">
                {zoom.toFixed(1)}×
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => resetCrop("custom")}
                aria-label="Reset crop"
              >
                <RotateCcw />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditable(null)}
              disabled={isExporting}
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={() => void applyCrop()}
              disabled={isExporting}
              className="bg-[var(--teal)] text-[#060a0e] hover:bg-[var(--teal)] hover:brightness-110"
            >
              {isExporting ? <Loader2 className="animate-spin" /> : <Crop />}
              {isExporting ? "Preparing..." : "Use image"}
            </Button>
          </div>
        </div>
      ) : value && previewUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-3">
          <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected venue cover"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-1)]">
              {value.name}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-4)]">
              16:9 crop, {(value.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Replace
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={disabled}
              aria-label="Remove selected image"
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
          disabled={disabled || isPreparing}
          className="group flex w-full items-center gap-3 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-hover)] px-4 py-4 text-left transition-colors hover:border-[rgba(0,212,170,0.3)] hover:bg-[var(--teal-subtle)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--teal-subtle)] disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--bg-2)] text-[var(--text-4)] transition-colors group-hover:text-[var(--teal-text)]">
            {isPreparing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[var(--text-1)]">
              {isPreparing ? "Opening image..." : "Choose a cover image"}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-[var(--text-4)]">
              JPEG, PNG, WebP, HEIC, or HEIF. Maximum 5 MB.
            </span>
          </span>
          <ImageIcon className="ml-auto h-4 w-4 shrink-0 text-[var(--text-4)]" />
        </button>
      )}

      {error && (
        <p
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
