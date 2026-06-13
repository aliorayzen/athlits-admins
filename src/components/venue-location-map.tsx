"use client";

import { useEffect, useMemo, useRef } from "react";
import L, {
  type LatLngExpression,
  type LeafletMouseEvent,
  type Marker as LeafletMarker,
} from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type LatLngLiteral = { lat: number; lng: number };

interface VenueLocationMapProps {
  position: LatLngLiteral | null;
  fallbackCenter: LatLngLiteral;
  onChange: (position: LatLngLiteral) => void;
}

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
}: VenueLocationMapProps) {
  const center: LatLngExpression = position
    ? [position.lat, position.lng]
    : [fallbackCenter.lat, fallbackCenter.lng];

  return (
    <MapContainer
      center={center}
      className="h-[300px] w-full bg-[var(--bg-2)] sm:h-[360px]"
      scrollWheelZoom
      zoom={position ? 15 : 11}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents position={position} onChange={onChange} />
    </MapContainer>
  );
}
