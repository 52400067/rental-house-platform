import { TYPE_OPTIONS } from "./options";

/**
 * Filter sidebar for /rooms. Controlled entirely by useListingSearch -
 * renders filters, cascaded ward/school options (filtered by the chosen
 * city), the price range and amenity checkboxes. "Đặt lại" resets.
 */
export default function FilterSidebar({
    filters,
    setFilter,
    setCity,
    toggleAmenity,
    resetFilters,
    cities,
    wards,
    schools,
    amenities,
}) {
    return (
        <div className="card">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <strong>Bộ lọc</strong>
                    <button className="btn btn-link btn-sm p-0" onClick={resetFilters}>
                        Đặt lại
                    </button>
                </div>

                <div className="mb-3">
                    <label className="form-label small fw-semibold">Từ khóa</label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Tiêu đề, địa chỉ..."
                        value={filters.q}
                        onChange={(e) => setFilter("q", e.target.value)}
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label small fw-semibold">Loại tin</label>
                    <select
                        className="form-select form-select-sm"
                        value={filters.type}
                        onChange={(e) => setFilter("type", e.target.value)}
                    >
                        {TYPE_OPTIONS.map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label small fw-semibold">Tỉnh/Thành phố</label>
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
                    <label className="form-label small fw-semibold">Khu vực</label>
                    <select
                        className="form-select form-select-sm"
                        value={filters.ward_id}
                        onChange={(e) => setFilter("ward_id", e.target.value)}
                        disabled={!filters.city_id}
                    >
                        <option value="">
                            {filters.city_id ? "Tất cả phường/xã" : "Chọn Tỉnh/TP trước"}
                        </option>
                        {wards
                            .filter(
                                (w) =>
                                    !filters.city_id ||
                                    String(w.city?.id) === String(filters.city_id)
                            )
                            .map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label small fw-semibold">Giá (VND/tháng)</label>
                    <div className="d-flex gap-2">
                        <input
                            type="number"
                            className="form-control form-control-sm"
                            placeholder="Tối thiểu"
                            min={0}
                            value={filters.price_min}
                            onChange={(e) => setFilter("price_min", e.target.value)}
                        />
                        <input
                            type="number"
                            className="form-control form-control-sm"
                            placeholder="Tối đa"
                            min={0}
                            value={filters.price_max}
                            onChange={(e) => setFilter("price_max", e.target.value)}
                        />
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label small fw-semibold">Gần trường</label>
                    <select
                        className="form-select form-select-sm mb-2"
                        value={filters.school_id}
                        onChange={(e) => {
                            setFilter("school_id", e.target.value);
                            if (!e.target.value)
                                setFilter("max_km", "");
                        }}
                    >
                        <option value="">Chọn trường</option>
                        {schools
                            .filter(
                                (s) =>
                                    !filters.city_id ||
                                    String(s.city?.id) === String(filters.city_id)
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
                            onChange={(e) => setFilter("max_km", e.target.value)}
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
                    <label className="form-label small fw-semibold">Tiện ích</label>
                    {amenities.map((a) => (
                        <div className="form-check" key={a.id}>
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id={`am-${a.id}`}
                                checked={filters.amenity_ids.includes(a.id)}
                                onChange={() => toggleAmenity(a.id)}
                            />
                            <label className="form-check-label" htmlFor={`am-${a.id}`}>
                                {a.name}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
