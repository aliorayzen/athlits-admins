"use client";

import { useId, useState } from "react";
import { CheckCircle2, Link2, Loader2, MapPinned } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isGoogleMapsUrl,
  parseGoogleMapsUrl,
  type GoogleMapsLocation,
} from "@/lib/google-maps";
import { cn } from "@/lib/utils";

interface GoogleMapsLocationFieldProps {
  onResolved: (location: GoogleMapsLocation) => void;
  inputClassName?: string;
  labelClassName?: string;
  className?: string;
}

export function GoogleMapsLocationField({
  onResolved,
  inputClassName,
  labelClassName,
  className,
}: GoogleMapsLocationFieldProps) {
  const inputId = useId();
  const feedbackId = useId();
  const [link, setLink] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<GoogleMapsLocation | null>(null);

  async function resolveLink() {
    const value = link.trim();
    setError(null);
    setResolved(null);

    if (!isGoogleMapsUrl(value)) {
      setError("Enter a valid Google Maps link.");
      return;
    }

    setIsResolving(true);
    try {
      let location = parseGoogleMapsUrl(value);
      if (!location) {
        const response = await fetch(
          `/api/google-maps/resolve?url=${encodeURIComponent(value)}`,
        );
        const body = (await response.json()) as {
          resolvedUrl?: string;
          message?: string;
        };
        if (!response.ok || !body.resolvedUrl) {
          throw new Error(body.message ?? "Could not open this Google Maps link.");
        }
        location = parseGoogleMapsUrl(body.resolvedUrl);
      }

      if (!location) {
        throw new Error(
          "No coordinates were found. In Google Maps, share the place or a dropped pin and try again.",
        );
      }

      setResolved(location);
      onResolved(location);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not read this Google Maps link.",
      );
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor={inputId} className={labelClassName}>
          Google Maps link
          <span className="ml-1.5 normal-case tracking-normal text-[var(--text-4)]">
            optional
          </span>
        </Label>
        <span className="text-[10.5px] text-[var(--text-4)]">
          Or complete the fields manually
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-4)]" />
          <Input
            id={inputId}
            type="url"
            inputMode="url"
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              setError(null);
              setResolved(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void resolveLink();
              }
            }}
            placeholder="https://maps.app.goo.gl/..."
            aria-describedby={feedbackId}
            aria-invalid={Boolean(error) || undefined}
            className={cn("pl-9", inputClassName)}
          />
        </div>
        <Button
          type="button"
          onClick={() => void resolveLink()}
          disabled={isResolving || !link.trim()}
          className="h-9 bg-[var(--teal)] px-3.5 font-semibold text-[#06100d] hover:brightness-110"
        >
          {isResolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPinned className="h-4 w-4" />
          )}
          {isResolving ? "Reading link" : "Fill from link"}
        </Button>
      </div>
      <div id={feedbackId} aria-live="polite">
        {error ? (
          <p role="alert" className="text-[11.5px] leading-5 text-[var(--semantic-red)]">
            {error}
          </p>
        ) : resolved ? (
          <p className="flex items-center gap-1.5 text-[11.5px] leading-5 text-[var(--semantic-green)]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Coordinates filled ({resolved.latitude.toFixed(6)}, {resolved.longitude.toFixed(6)}). Review the details below.
          </p>
        ) : (
          <p className="text-[11.5px] leading-5 text-[var(--text-4)]">
            Supports full Google Maps URLs and shortened maps.app.goo.gl links.
          </p>
        )}
      </div>
    </div>
  );
}
