import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, LocateFixed } from 'lucide-react'
import {
  divIcon,
  map as createMap,
  marker as createMarker,
  tileLayer,
  type Map as LeafletMap,
  type Marker,
} from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { Button } from '@/components/ui/button'

type LocationPinPickerProps = {
  latitude: number | null
  longitude: number | null
  /** Address text used to open the map near the right street. It never sets the pin. */
  searchHint?: string
  countryCode?: string
  onChange: (latitude: number, longitude: number) => void
}

const pinIcon = divIcon({
  className: 'location-pin',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

/**
 * Map where the customer taps or drags a pin onto the exact door.
 * Delivery zones are measured from this point.
 */
export function LocationPinPicker({
  latitude,
  longitude,
  searchHint,
  countryCode,
  onChange,
}: LocationPinPickerProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const hasPin = latitude != null && longitude != null

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const map = createMap(frame, { zoomControl: true, scrollWheelZoom: true })
    if (latitude != null && longitude != null) {
      map.setView([latitude, longitude], 17)
    } else {
      map.setView([20, 0], 2)
    }
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    map.on('click', (event) => onChangeRef.current(event.latlng.lat, event.latlng.lng))
    mapRef.current = map
    const timer = window.setTimeout(() => map.invalidateSize(), 0)
    return () => {
      window.clearTimeout(timer)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // The map is created once. The pin updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (latitude == null || longitude == null) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    if (!markerRef.current) {
      const pin = createMarker([latitude, longitude], { icon: pinIcon, draggable: true }).addTo(map)
      pin.on('dragend', () => {
        const point = pin.getLatLng()
        onChangeRef.current(point.lat, point.lng)
      })
      markerRef.current = pin
      if (map.getZoom() < 15) map.setView([latitude, longitude], 17)
    } else {
      markerRef.current.setLatLng([latitude, longitude])
      if (!map.getBounds().contains([latitude, longitude])) map.setView([latitude, longitude], 17)
    }
  }, [latitude, longitude])

  // With no pin yet, open the map on the typed street so the customer only
  // has to tap their door.
  useEffect(() => {
    if (hasPin) return
    const query = searchHint?.trim()
    if (!query) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ format: 'json', limit: '1', q: query })
      if (countryCode) params.set('countrycodes', countryCode.toLowerCase())
      fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
        .then((response) => (response.ok ? response.json() : []))
        .then((rows: { lat: string; lon: string }[]) => {
          const first = rows[0]
          if (!first || !mapRef.current || markerRef.current) return
          mapRef.current.setView([Number(first.lat), Number(first.lon)], 16)
        })
        .catch(() => undefined)
    }, 400)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchHint, countryCode, hasPin])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocateError('This browser cannot share its location. Tap the map instead.')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        onChangeRef.current(position.coords.latitude, position.coords.longitude)
        mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 17)
      },
      () => {
        setLocating(false)
        setLocateError('Location access was blocked. Tap the map instead.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={frameRef}
        className="relative z-0 h-[280px] w-full overflow-hidden rounded-xl border border-border/60"
        role="application"
        aria-label="Map to pin the delivery location"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {hasPin
            ? 'Pin set. Drag it if the door is somewhere else.'
            : 'Tap the map on the exact delivery spot to drop a pin.'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full"
          disabled={locating}
          onClick={useMyLocation}
        >
          {locating ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <LocateFixed className="size-3.5" />
          )}
          Use my location
        </Button>
      </div>
      {locateError ? <p className="text-xs text-destructive">{locateError}</p> : null}
    </div>
  )
}
