import { useEffect, useMemo } from "react";
import {
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Reverse geocode a coordinate via Nominatim (OpenStreetMap's free service,
 * usage policy: max 1 req/s, low volume — fine for a form, not for polling).
 * Returns a short street address or null on failure.
 */
export async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=vi`,
            { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const a = data?.address || {};
        // Prefer street + number; fall back to suburb / town (no city:
        // landlords already pick the ward in the form).
        const street = [a.house_number, a.road].filter(Boolean).join(" ");
        return (
            street ||
            a.suburb ||
            a.neighbourhood ||
            a.quarter ||
            a.town ||
            null
        );
    } catch {
        return null;
    }
}

const brandIcon = L.divIcon({
    html: '<i class="bi bi-geo-alt-fill" style="color:#0f766e;font-size:30px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"></i>',
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
});

function ClickHandler({ onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/** Keeps the map centered on the marker when lat/lng change externally. */
function Recenter({ lat, lng, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (lat != null && lng != null) {
            map.setView([lat, lng], zoom ?? map.getZoom());
        }
    }, [lat, lng, zoom, map]);
    return null;
}

/**
 * Click-to-pick location map. Fully controlled by the parent form:
 * pass lat/lng (numbers or "" for none) + onPick(lat, lng).
 * `center` can recentre the view (e.g. when a ward is chosen).
 * `readOnly` turns it into a display-only map (no click/drag/zoom-hijack).
 * `onAddress` (optional): called with a reverse-geocoded street guess
 * shortly after each pick or drag-end — NOT on initial render, so edit
 * forms don't prompt on load.
 */
export default function CoordinatePicker({
    lat,
    lng,
    onPick,
    height = 320,
    center,
    centerZoom = 14,
    readOnly = false,
    onAddress,
}) {
    const position = useMemo(
        () =>
            lat !== "" && lat != null && lng !== "" && lng != null
                ? [Number(lat), Number(lng)]
                : null,
        [lat, lng]
    );

    const initialCenter = position || center || [10.8231, 106.6297];

    /** Geocode after interaction (600ms debounce) and report the guess. */
    const notifyAddress = (newLat, newLng) => {
        if (!onAddress) return;
        setTimeout(() => {
            reverseGeocode(newLat, newLng).then((addr) => {
                if (addr) onAddress(addr);
            });
        }, 600);
    };

    /** onPick + address guess, shared by click and drag-end. */
    const handlePicked = (newLat, newLng) => {
        onPick?.(newLat, newLng);
        notifyAddress(newLat, newLng);
    };

    return (
        <div
            className="rounded-3 overflow-hidden border position-relative"
            style={{ height }}
        >
            <MapContainer
                center={initialCenter}
                zoom={position ? 16 : centerZoom}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={!readOnly}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {!readOnly && <ClickHandler onPick={handlePicked} />}
                <Recenter lat={center?.[0]} lng={center?.[1]} zoom={centerZoom} />
                {position && (
                    <Marker
                        position={position}
                        icon={brandIcon}
                        draggable={!readOnly}
                        eventHandlers={{
                            dragend: (e) => {
                                const { lat: newLat, lng: newLng } =
                                    e.target.getLatLng();
                                handlePicked(newLat, newLng);
                            },
                        }}
                    />
                )}
            </MapContainer>

            {!readOnly && !position && (
                <div
                    className="position-absolute top-50 start-50 translate-middle text-center px-3 py-2 bg-white bg-opacity-75 rounded-3 small"
                    style={{ pointerEvents: "none" }}
                >
                    <i className="bi bi-cursor me-1" />
                    Bấm vào bản đồ để đặt vị trí nhà
                </div>
            )}
        </div>
    );
}
