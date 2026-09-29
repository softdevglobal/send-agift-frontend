import { useEffect, useMemo, useRef } from 'react'
import {
  circle,
  circleMarker,
  latLng,
  layerGroup,
  map as createMap,
  tileLayer,
  tooltip,
  type LayerGroup,
  type Map as LeafletMap,
} from 'leaflet'
import 'leaflet/dist/leaflet.css'

type DeliveryRangeMapProps = {
  latitude: number
  longitude: number
  /** Address line shown with the pin, so a new selection is obvious. */
  label?: string
  /** Distances in kilometres, drawn as circles around the pin. */
  rangesKm: number[]
}

/**
 * Movable map centred on the selected address, with a blue circle per delivery range.
 * Drag and scroll to look around; the circles stay on the pin.
 */
export function DeliveryRangeMap({
  latitude,
  longitude,
  label,
  rangesKm,
}: DeliveryRangeMapProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)

  const rangeKey = rangesKm
    .filter((km) => Number.isFinite(km) && km > 0)
    .sort((a, b) => b - a)
    .join(',')
  const ranges = useMemo(
    () => (rangeKey ? rangeKey.split(',').map(Number) : []),
    [rangeKey],
  )

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const map = createMap(frame, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([latitude, longitude], 12)
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = layerGroup().addTo(map)
    mapRef.current = map
    const timer = window.setTimeout(() => map.invalidateSize(), 0)
    return () => {
      window.clearTimeout(timer)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // The map is created once. Centre and circles update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layers = layerRef.current
    if (!map || !layers) return
    layers.clearLayers()

    const center = latLng(latitude, longitude)
    ranges.forEach((km, index) => {
      circle(center, {
        radius: km * 1000,
        color: '#1d4ed8',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: Math.max(0.1, 0.22 - index * 0.04),
        interactive: false,
      }).addTo(layers)

      const north = center.toBounds(km * 2000).getNorth()
      tooltip({
        permanent: true,
        direction: 'center',
        opacity: 1,
        className: 'delivery-range-tip',
      })
        .setLatLng([north, longitude])
        .setContent(`${km} km`)
        .addTo(layers)
    })

    circleMarker(center, {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#dc2626',
      fillOpacity: 1,
      interactive: false,
    }).addTo(layers)

    if (ranges.length > 0) {
      map.fitBounds(center.toBounds(ranges[0] * 2000), {
        padding: [36, 36],
        animate: false,
      })
    } else {
      map.setView(center, 14, { animate: false })
    }
    map.invalidateSize()
  }, [latitude, longitude, ranges])

  const rangeText = ranges
    .slice()
    .reverse()
    .map((km) => `${km} km`)
    .join(', ')

  return (
    <div className="space-y-1.5">
      <div
        ref={frameRef}
        className="relative z-0 h-[280px] w-full overflow-hidden rounded-xl border border-border/60"
        role="img"
        aria-label={label ? `Map of ${label}` : 'Shop location'}
      />
      <p className="text-[11px] text-muted-foreground">
        {label ? `Showing ${label}. ` : ''}
        {rangeText ? `Blue circle: ${rangeText}. ` : ''}
        Drag inside the map to move around.
      </p>
    </div>
  )
}
