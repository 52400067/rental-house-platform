import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getListings, getSchools } from "../../api/listingApi";
import { TYPE_LABELS, formatPriceTrieu } from "../../api/format";
import "../../styles/map.css";

// Markers as inline divIcons - no external image assets needed.
const roomIcon = L.divIcon({
    html: '<i class="bi bi-geo-alt-fill" style="color:#0f766e;font-size:26px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))"></i>',
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
});

// Trọng tâm địa lý cả nước - dữ liệu mẫu phủ khắp Việt Nam.
const VIETNAM_CENTER = [14.5, 106.5];

const schoolIcon = L.divIcon({
    html: '<i class="bi bi-mortarboard-fill" style="color:#b45309;font-size:22px"></i>',
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
});

/** Moves the map when the selected school changes (react-leaflet
    only uses `center` on first render). */
function Recenter({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export default function Map() {
    const [schools, setSchools] = useState([]);
    const [schoolId, setSchoolId] = useState("");
    const [type, setType] = useState("");
    const [maxKm, setMaxKm] = useState("");
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSchools().then(setSchools).catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = { per_page: 50 };
        if (type) params.type = type;
        if (schoolId) params.school_id = schoolId;
        if (schoolId && maxKm) params.max_km = maxKm;
        getListings(params)
            .then(({ data }) => setListings(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [type, schoolId, maxKm]);

    const school = useMemo(
        () => schools.find((s) => String(s.id) === String(schoolId)),
        [schools, schoolId]
    );

    // Toàn quốc khi chưa chọn trường; zoom sát trường khi đã chọn.
    const view = useMemo(
        () =>
            school
                ? {
                      center: [Number(school.latitude), Number(school.longitude)],
                      zoom: 12,
                  }
                : { center: VIETNAM_CENTER, zoom: 5 },
        [school]
    );

    return (
        <div className="py-4">
            <div className="container">
                <h1 className="h3 fw-bold mb-3">Bản đồ tìm phòng</h1>

                <div className="row g-3 mb-3">
                    <div className="col-md-4">
                        <select
                            className="form-select"
                            value={schoolId}
                            onChange={(e) => setSchoolId(e.target.value)}
                        >
                            <option value="">Tất cả khu vực</option>
                            {schools.map((s) => (
                                <option key={s.id} value={s.id}>
                                    Gần {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select
                            className="form-select"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="">Tất cả loại</option>
                            {Object.entries(TYPE_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>
                                    {l}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select
                            className="form-select"
                            value={maxKm}
                            onChange={(e) => setMaxKm(e.target.value)}
                            disabled={!schoolId}
                        >
                            <option value="">Mọi khoảng cách</option>
                            {[1, 2, 3, 5, 10].map((km) => (
                                <option key={km} value={km}>
                                    Trong bán kính {km} km
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="row g-3">
                    <div className="col-lg-8">
                        <div className="rounded-3 overflow-hidden border" style={{ height: 480 }}>
                            <MapContainer
                                center={view.center}
                                zoom={view.zoom}
                                style={{ height: "100%", width: "100%" }}
                            >
                                <Recenter center={view.center} zoom={view.zoom} />
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {school && (
                                    <Marker
                                        position={[Number(school.latitude), Number(school.longitude)]}
                                        icon={schoolIcon}
                                    >
                                        <Popup>{school.name}</Popup>
                                    </Marker>
                                )}
                                {listings.map(
                                    (l) =>
                                        l.latitude != null && (
                                            <Marker
                                                key={l.id}
                                                position={[
                                                    Number(l.latitude),
                                                    Number(l.longitude),
                                                ]}
                                                icon={roomIcon}
                                            >
                                                <Popup>
                                                    <Link to={`/rooms/${l.id}`}>
                                                        <strong>{l.title}</strong>
                                                    </Link>
                                                    <br />
                                                    {formatPriceTrieu(l.price)}/tháng ·{" "}
                                                    {l.area_m2} m²
                                                    {l.distance_km != null && (
                                                        <>
                                                            <br />
                                                            {l.distance_km} km tới trường
                                                        </>
                                                    )}
                                                </Popup>
                                            </Marker>
                                        )
                                )}
                            </MapContainer>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="border rounded-3 h-100 overflow-auto" style={{ maxHeight: 480 }}>
                            <div className="p-2 border-bottom d-flex justify-content-between align-items-center">
                                <strong className="small">
                                    {loading ? "Đang tải..." : `${listings.length} phòng`}
                                </strong>
                                {schoolId && maxKm && (
                                    <span className="badge text-bg-light">≤ {maxKm} km</span>
                                )}
                            </div>
                            {!loading && listings.length === 0 && (
                                <p className="text-secondary small p-3 mb-0">
                                    Không có phòng phù hợp.
                                </p>
                            )}
                            {listings.map((l) => (
                                <Link
                                    key={l.id}
                                    to={`/rooms/${l.id}`}
                                    className="d-flex gap-2 p-2 border-bottom text-decoration-none text-body"
                                >
                                    {l.cover_image ? (
                                        <img
                                            src={l.cover_image}
                                            alt=""
                                            className="rounded-2"
                                            style={{
                                                width: 64,
                                                height: 48,
                                                objectFit: "cover",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="rounded-2 bg-light d-flex align-items-center justify-content-center"
                                            style={{ width: 64, height: 48 }}
                                        >
                                            <i className="bi bi-house-door text-secondary" />
                                        </div>
                                    )}
                                    <div className="small overflow-hidden">
                                        <div className="text-truncate fw-semibold">{l.title}</div>
                                        <div style={{ color: "var(--brand)" }}>
                                            {formatPriceTrieu(l.price)}/tháng
                                        </div>
                                        {l.distance_km != null && (
                                            <div className="text-secondary">
                                                {l.distance_km} km tới trường
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
