import { TYPE_OPTIONS } from "./options";
import type { Amenity, City, ListingFilters, School, Ward } from "../../types/hooks";

/**
 * Filter sidebar for /rooms. Controlled entirely by useListingSearch.
 *
 * Cascade (the smart direction): Tỉnh/TP -> phường -> trường. Danh sách
 * "Gần trường" CHỈ hiện các trường thuộc phường đã chọn ở "Khu vực"
 * (mỗi trường được gán 1 phường, xem schools.ward_id). Đổi phường thì
 * reset trường + bán kính - giống cascade đổi Tỉnh/TP.
 */
export default function FilterSidebar({
    filters,
    setFilter,
    setCity,
    setWard,
    toggleAmenity,
    resetFilters,
    cities,
    wards,
    schools,
    amenities,
}: {
    filters: ListingFilters;
    setFilter: (key: keyof ListingFilters, value: string) => void;
    setCity: (cityId: string) => void;
    setWard: (wardId: string) => void;
    toggleAmenity: (id: number) => void;
    resetFilters: () => void;
    cities: City[];
    wards: Ward[];
    schools: School[];
    amenities: Amenity[];
}) {
    // Trường khả dụng: đúng Tỉnh/TP (nếu đã chọn) VÀ đúng phường (nếu đã
    // chọn). Trường chưa gán phường chỉ mất đi khi người dùng lọc theo
    // phường cụ thể.
    const visibleSchools = schools.filter((s) => {
        if (filters.city_id && String(s.city?.id) !== String(filters.city_id)) {
            return false;
        }
        if (filters.ward_id && String(s.ward?.id ?? "") !== String(filters.ward_id)) {
            return false;
        }
        return true;
    });

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
                        {TYPE_OPTIONS.map(([v, l]: [string, string]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label small fw-semibold" htmlFor="filter-city">
                        Tỉnh/Thành phố
                    </label>
                    <select
                        id="filter-city"
                        className="form-select form-select-sm"
                        value={filters.city_id}
                        onChange={(e) => setCity(e.target.value)}
                    >
                        <option value="">Toàn quốc</option>
                        {cities.map((c: City) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label small fw-semibold" htmlFor="filter-ward">
                        Khu vực
                    </label>
                    <select
                        id="filter-ward"
                        className="form-select form-select-sm"
                        value={filters.ward_id}
                        onChange={(e) => setWard(e.target.value)}
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
                            .map((w: Ward) => (
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
                    <label className="form-label small fw-semibold" htmlFor="filter-school">
                        Gần trường
                    </label>
                    <select
                        id="filter-school"
                        className="form-select form-select-sm mb-2"
                        value={filters.school_id}
                        onChange={(e) => {
                            setFilter("school_id", e.target.value);
                            if (!e.target.value) setFilter("max_km", "");
                        }}
                    >
                        <option value="">
                            {filters.ward_id
                                ? "Chọn trường trong phường này"
                                : "Chọn trường"}
                        </option>
                        {visibleSchools.map((s: School) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    {filters.ward_id && (
                        <div className="form-text">
                            Chỉ hiện trường thuộc phường đã chọn.
                        </div>
                    )}
                    {filters.school_id && (
                        <select
                            id="filter-radius"
                            className="form-select form-select-sm"
                            value={filters.max_km}
                            onChange={(e) => setFilter("max_km", e.target.value)}
                        >
                            <option value="">Mọi khoảng cách</option>
                            {[1, 2, 3, 5, 10].map((km: number) => (
                                <option key={km} value={km}>
                                    Trong bán kính {km} km
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div>
                    <label className="form-label small fw-semibold">Tiện ích</label>
                    {amenities.map((a: Amenity) => (
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
