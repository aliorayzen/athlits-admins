"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import L, {
  type LatLngExpression,
  type LeafletMouseEvent,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
} from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Crosshair } from "lucide-react";

type LatLngLiteral = { lat: number; lng: number };

interface VenueLocationMapProps {
  position: LatLngLiteral | null;
  fallbackCenter: LatLngLiteral;
  onChange: (position: LatLngLiteral) => void;
  // GPS accuracy radius (metres) from the last "use current location" fix.
  accuracyMeters?: number | null;
}

// CARTO basemaps match the dark-luxury canvas far better than raw OSM raster
// tiles, and are free with no API key. Swap by resolved theme so the light
// theme stays first-class.
const TILE_URLS = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
} as const;

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const pinIcon = L.divIcon({
  className: "arena-location-pin",
  html: '<span aria-hidden="true"></span>',
  iconAnchor: [14, 32],
  iconSize: [28, 32],
});

function MapEvents({
  position,
  onChange,
}: {
  position: LatLngLiteral | null;
  onChange: (position: LatLngLiteral) => void;
}) {
  const map = useMap();
  const markerRef = useRef<LeafletMarker | null>(null);

  useMapEvents({
    click(event: LeafletMouseEvent) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  useEffect(() => {
    if (!position) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.45,
    });
  }, [map, position]);

  const markerHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;
        const next = marker.getLatLng();
        onChange({ lat: next.lat, lng: next.lng });
      },
    }),
    [onChange],
  );

  if (!position) return null;

  return (
    <Marker
      draggable
      eventHandlers={markerHandlers}
      icon={pinIcon}
      position={[position.lat, position.lng]}
      ref={markerRef}
    />
  );
}

export function VenueLocationMap({
  position,
  fallbackCenter,
  onChange,
  accuracyMeters,
}: VenueLocationMapProps) {
  const { resolvedTheme } = useTheme();
  const [map, setMap] = useState<LeafletMap | null>(null);

  const tileUrl = resolvedTheme === "light" ? TILE_URLS.light : TILE_URLS.dark;

  const center: LatLngExpression = position
    ? [position.lat, position.lng]
    : [fallbackCenter.lat, fallbackCenter.lng];

  function recenter() {
    if (!map || !position) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.45,
    });
  }

  return (
    <div className="relative">
      <MapContainer
        center={center}
        className="h-[300px] w-full bg-[var(--bg-2)] sm:h-[360px]"
        ref={setMap}
        scrollWheelZoom
        zoom={position ? 15 : 11}
      >
        {/* `key` forces a fresh tile layer when the theme flips. */}
        <TileLayer
          key={tileUrl}
          attribution={TILE_ATTRIBUTION}
          detectRetina
          url={tileUrl}
        />
        {position && accuracyMeters ? (
          <Circle
            center={[position.lat, position.lng]}
            radius={accuracyMeters}
            pathOptions={{
              color: "#00d4aa",
              weight: 1,
              fillColor: "#00d4aa",
              fillOpacity: 0.08,
            }}
          />
        ) : null}
        <MapEvents position={position} onChange={onChange} />
      </MapContainer>

      {position ? (
        <button
          type="button"
          onClick={recenter}
          title="Recenter on pin"
          aria-label="Recenter map on the pin"
          className="absolute right-3 top-3 z-[1000] grid h-9 w-9 place-items-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-1)]/90 text-[var(--text-2)] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-all hover:border-[rgba(0,212,170,0.3)] hover:text-[var(--teal-text)]"
        >
          <Crosshair className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
