import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    getListings,
    getSchools,
    getWards,
    getAmenities,
    getCities,
} from "../../api/listingApi";
import { TYPE_LABELS } from "../../api/format";
import { useAuth } from "../../context/AuthContext";
import * as socialApi from "../../api/socialApi";
import { errMessage } from "../../api/axiosClient";
import ListingCard from "../../components/ListingCard";
import Pagination from "../../components/Pagination";

const TYPE_OPTIONS = [
    ["", "Tất cả loại"],
    ["room", "Phòng trọ"],
    ["apartment", "Căn hộ"],
    ["house", "Nhà nguyên căn"],
];

const SORT_OPTIONS = [
    ["newest", "Mới nhất"],
    ["price_asc", "Giá thấp → cao"],
    ["price_desc", "Giá cao → thấp"],
    ["distance", "Gần trường nhất"],
    ["rating", "Đánh giá tốt nhất"],
];

export default function Rooms() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [schools, setSchools] = useState([]);
    const [wards, setWards] = useState([]);
    const [amenities, setAmenities] = useState([]);
    const [cities, setCities] = useState([]);

    const [filters, setFilters] = useState({
        q: searchParams.get("q") || "",
        type: searchParams.get("type") || "",
        city_id: "",
        ward_id: "",
        school_id: "",
        max_km: "",
        price_min: "",
        price_max: "",
        amenity_ids: [],
        sort: "newest",
    });
    const [page, setPage] = useState(1);
    const [listings, setListings] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showFilters, setShowFilters] = useState(true);
    const firstRender = useRef(true);

    useEffect(() => {
        getCities().then(setCities).catch(() => {});
        getSchools().then(setSchools).catch(() => {});
        getWards().then(setWards).catch(() => {});
        getAmenities().then(setAmenities).catch(() => {});
    }, []);

    // Build query from filters and fetch.
    const fetchListings = useCallback(
        async (currentPage) => {
            setLoading(true);
            setError("");
            const params = {
                page: currentPage,
                per_page: 12,
                sort: filters.sort,
            };
            if (filters.q.trim()) params.q = filters.q.trim();
            if (filters.type) params.type = filters.type;
            if (filters.city_id) params.city_id = filters.city_id;
            if (filters.ward_id) params.ward_id = filters.ward_id;
            if (filters.school_id) params.school_id = filters.school_id;
            if (filters.max_km) params.max_km = filters.max_km;
            if (filters.price_min) params.price_min = filters.price_min;
            if (filters.price_max) params.price_max = filters.price_max;
            if (filters.amenity_ids.length)
                params["amenity_ids[]"] = filters.amenity_ids;

            try {
                const { data, meta } = await getListings(params);
                setListings(data);
                setMeta(meta);
            } catch (err) {
                setError(errMessage(err));
                setListings([]);
            } finally {
                setLoading(false);
            }
        },
        [filters]
    );

    // Refetch whenever filters change (debounced) or page changes.
    useEffect(() => {
        const t = setTimeout(() => {
            fetchListings(page);
            if (!firstRender.current) {
                const next = {};
                if (filters.q) next.q = filters.q;
                if (filters.type) next.type = filters.type;
                setSearchParams(next, { replace: true });
            }
            firstRender.current = false;
        }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, page]);

    const setFilter = (key, value) => {
        setPage(1);
        setFilters((f) => ({ ...f, [key]: value }));
    };

    // Đổi Tỉnh/TP: reset ward/school để cascade hợp lệ.
    const setCity = (cityId) => {
        setPage(1);
        setFilters((f) => ({
            ...f,
            city_id: cityId,
            ward_id: "",
            school_id: "",
            max_km: "",
        }));
    };

    const toggleAmenity = (id) => {
        setPage(1);
        setFilters((f) => ({
            ...f,
            amenity_ids: f.amenity_ids.includes(id)
                ? f.amenity_ids.filter((a) => a !== id)
                : [...f.amenity_ids, id],
        }));
    };

    async function toggleFavorite(listing) {
        if (!user || user.role !== "student") return;
        try {
            if (listing.is_favorited) {
                await socialApi.removeFavorite(listing.id);
            } else {
                await socialApi.addFavorite(listing.id);
            }
            setListings((rows) =>
                rows.map((l) =>
                    l.id === listing.id
                        ? { ...l, is_favorited: !l.is_favorited }
                        : l
                )
            );
        } catch (err) {
            alert(errMessage(err));
        }
    }

    const resetFilters = () => {
        setPage(1);
        setFilters({
            q: "",
            type: "",
            city_id: "",
            ward_id: "",
            school_id: "",
            max_km: "",
            price_min: "",
            price_max: "",
            amenity_ids: [],
            sort: "newest",
        });
    };

    return (
        <div className="py-4">
            <div className="container">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div>
                        <h1 className="h3 fw-bold mb-0">Tìm phòng trọ</h1>
                        <span className="text-secondary small">
                            {meta ? `${meta.total} phòng trọ` : "Đang tải..."}
                        </span>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-secondary btn-sm d-lg-none"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <i className="bi bi-funnel me-1" /> Bộ lọc
                        </button>
                        <select
                            className="form-select form-select-sm w-auto"
                            value={filters.sort}
                            onChange={(e) => setFilter("sort", e.target.value)}
                        >
                            {SORT_OPTIONS.map(([v, l]) => (
                                <option key={v} value={v}>
                                    {l}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="row g-4">
                    {/* FILTER SIDEBAR */}
                    <div
                        className={`col-lg-3 ${
                            showFilters ? "" : "d-none d-lg-block"
                        }`}
                    >
                        <div className="card">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <strong>Bộ lọc</strong>
                                    <button
                                        className="btn btn-link btn-sm p-0"
                                        onClick={resetFilters}
                                    >
                                        Đặt lại
                                    </button>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">
                                        Từ khóa
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Tiêu đề, địa chỉ..."
                                        value={filters.q}
                                        onChange={(e) =>
                                            setFilter("q", e.target.value)
                                        }
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">
                                        Loại tin
                                    </label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={filters.type}
                                        onChange={(e) =>
                                            setFilter("type", e.target.value)
                                        }
                                    >
                                        {TYPE_OPTIONS.map(([v, l]) => (
                                            <option key={v} value={v}>
                                                {l}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">
                                        Tỉnh/Thành phố
                                    </label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={filters.city_id}
                                        onChange={(e) => setCity(e.target.value)}
                                    >
                                        <option value="">Toàn quốc</option>
                                        {cities.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">
                                        Khu vực
                                    </label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={filters.ward_id}
                                        onChange={(e) =>
                                            setFilter("ward_id", e.target.value)
                                        }
                                        disabled={!filters.city_id}
                                    >
                                        <option value="">
                                            {filters.city_id
                                                ? "Tất cả phường/xã"
                                                : "Chọn Tỉnh/TP trước"}
                                        </option>
                                        {wards
                                            .filter(
                                                (w) =>
                                                    !filters.city_id ||
                                                    String(w.city?.id) ===
                                                    String(filters.city_id)
                                            )
                                            .map((w) => (
                                                <option key={w.id} value={w.id}>
                                                    {w.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">
                                        Giá (VND/tháng)
                                    </label>
                                    <div className="d-flex gap-2">
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            placeholder="Tối thiểu"
                                            min={0}
                                            value={filters.price_min}
                                            onChange={(e) =>
                                                setFilter("price_min", e.target.value)
                                            }
                                        />
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            placeholder="Tối đa"
                                            min={0}
                                            value={filters.price_max}
                                            onChange={(e) =>
                                                setFilter("price_max", e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">
                                        Gần trường
                                    </label>
                                    <select
                                        className="form-select form-select-sm mb-2"
                                        value={filters.school_id}
                                        onChange={(e) => {
                                            setFilter("school_id", e.target.value);
                                            if (!e.target.value)
                                                setFilters((f) => ({ ...f, max_km: "" }));
                                        }}
                                    >
                                        <option value="">Chọn trường</option>
                                        {schools
                                            .filter(
                                                (s) =>
                                                    !filters.city_id ||
                                                    String(s.city?.id) ===
                                                    String(filters.city_id)
                                            )
                                            .map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                    </select>
                                    {filters.school_id && (
                                        <select
                                            className="form-select form-select-sm"
                                            value={filters.max_km}
                                            onChange={(e) =>
                                                setFilter("max_km", e.target.value)
                                            }
                                        >
                                            <option value="">Mọi khoảng cách</option>
                                            {[1, 2, 3, 5, 10].map((km) => (
                                                <option key={km} value={km}>
                                                    Trong bán kính {km} km
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="form-label small fw-semibold">
                                        Tiện ích
                                    </label>
                                    {amenities.map((a) => (
                                        <div className="form-check" key={a.id}>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`am-${a.id}`}
                                                checked={filters.amenity_ids.includes(
                                                    a.id
                                                )}
                                                onChange={() => toggleAmenity(a.id)}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={`am-${a.id}`}
                                            >
                                                {a.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RESULTS */}
                    <div className="col-lg-9">
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border" role="status" />
                            </div>
                        ) : error ? (
                            <div className="alert alert-warning">{error}</div>
                        ) : listings.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="bi bi-search fs-1 text-secondary" />
                                <h4 className="mt-3">Không tìm thấy phòng phù hợp</h4>
                                <p className="text-secondary">
                                    Hãy thử thay đổi bộ lọc hoặc từ khóa.
                                </p>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={resetFilters}
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="row g-4">
                                    {listings.map((l) => (
                                        <div
                                            className="col-xl-4 col-md-6"
                                            key={l.id}
                                        >
                                            <ListingCard
                                                listing={l}
                                                onToggleFavorite={
                                                    user?.role === "student"
                                                        ? toggleFavorite
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Pagination
                                    meta={meta}
                                    onPage={(p) => {
                                        setPage(p);
                                        window.scrollTo(0, 0);
                                    }}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
