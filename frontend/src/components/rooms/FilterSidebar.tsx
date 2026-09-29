import { TYPE_OPTIONS } from "./options";
import type { Amenity, City, ListingFilters, School, Ward } from "../../types/hooks";

/**
 * Ward dropdown options cho truong da chon: ward cua truong (moi truong
 * gan dung 1 phuong tu PR #28) + cac phuong cung thanh pho de mo rong
 * vung tim khi phuong truong het phong. Rong neu truong chua gan phuong.
 */
function wardOptionsForSchool(
    school: School | undefined,
    wards: Ward[],
): Array<Pick<Ward, "id" | "name">> {
    if (!school?.ward) return [];
    const cityWards = wards.filter(
        (w) => String(w.city?.id) === String(school.city?.id)
    );
    // Ward cua truong dau tien, sau do cac phuong khac cung tinh/TP.
    return [
        { id: school.ward.id, name: school.ward.name },
        ...cityWards
            .filter((w) => w.id !== school.ward?.id)
            .map((w) => ({ id: w.id, name: w.name })),
    ];
}

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
}: {
    filters: ListingFilters;
    setFilter: (key: keyof ListingFilters, value: string) => void;
    setCity: (cityId: string) => void;
    toggleAmenity: (id: number) => void;
    resetFilters: () => void;
    cities: City[];
    wards: Ward[];
    schools: School[];
    amenities: Amenity[];
}) {
    // Truong dang chon - de hien ward chua truong va dropdown phuong gan.
    const selectedSchool = schools.find(
        (s) => String(s.id) === String(filters.school_id)
    );
    const wardOptions = wardOptionsForSchool(selectedSchool, wards);

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
                    <label className="form-label small fw-semibold">Tỉnh/Thành phố</label>
                    <select
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
                    <label className="form-label small fw-semibold" htmlFor="filter-school">Gần trường</label>
                    <select
                        id="filter-school"
                        className="form-select form-select-sm mb-2"
                        value={filters.school_id}
                        onChange={(e) => {
                            setFilter("school_id", e.target.value);
                            if (!e.target.value) {
                                setFilter("max_km", "");
                                setFilter("ward_id", "");
                            }
                        }}
                    >
                        <option value="">Chọn trường</option>
                        {schools
                            .filter(
                                (s) =>
                                    !filters.city_id ||
                                    String(s.city?.id) === String(filters.city_id)
                            )
                            .map((s: School) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                    </select>
                    {filters.school_id && (
                        <>
                            {/* Phuong chua truong: 1 click loc phong trong
                                phuong do (ward_id -> GET /listings?ward_id=).
                                Voi truong chua gan phuong thi an khoi nay. */}
                            {selectedSchool?.ward && (
                                <div className="form-text mb-2">
                                    <i className="bi bi-geo-alt me-1" />
                                    {selectedSchool.ward.name}{" "}
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm p-0 align-baseline"
                                        onClick={() =>
                                            setFilter("ward_id", String(selectedSchool.ward?.id))
                                        }
                                    >
                                        - loc phong trong phuong nay
                                    </button>
                                </div>
                            )}
                            <select
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
                            {/* Ward dropdown hien ward truong truoc + cac
                                phuong cung TP de mo rong vung tim. */}
                            {selectedSchool?.ward && (
                                <select
                                    className="form-select form-select-sm mt-2"
                                    value={filters.ward_id}
                                    onChange={(e) => setFilter("ward_id", e.target.value)}
                                >
                                    <option value="">Tất cả phường/xã</option>
                                    {wardOptions.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.id === selectedSchool.ward?.id
                                                ? `${w.name} (trường nằm đây)`
                                                : w.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </>
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
