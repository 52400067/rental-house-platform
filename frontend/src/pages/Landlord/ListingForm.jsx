import { Link, useNavigate, useParams } from "react-router-dom";
import CoordinatePicker from "../../components/CoordinatePicker";
import ImagesEditor from "../../components/landlord/ImagesEditor";
import { TYPE_LABELS, formatVnd } from "../../api/format";
import { useToast } from "../../components/ui/Toast";
import { useListingForm } from "../../hooks/useListingForm";

const TYPE_OPTIONS = Object.entries(TYPE_LABELS);

export default function ListingForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const {
        isEdit,
        wards,
        cities,
        amenities,
        form,
        set,
        setForm,
        images,
        newFiles,
        errors,
        busy,
        aiBusy,
        notice,
        wardCenter,
        applyAddressGuess,
        toggleAmenity,
        generateDescription,
        handleSubmit,
        handleDeleteImage,
        handleFilePick,
    } = useListingForm(id, toast);

    const fieldError = (key) =>
        errors[key] && (
            <div className="small text-danger mt-1">{errors[key][0]}</div>
        );

    return (
        <div className="py-4 landlord-scope">
            <div className="container" style={{ maxWidth: 820 }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h3 fw-bold mb-0 landlord-heading">
                        {isEdit ? "Sửa tin đăng" : "Đăng tin mới"}
                    </h1>
                    <Link to="/landlord" className="btn btn-outline-secondary btn-sm">
                        <i className="bi bi-arrow-left me-1" /> Danh sách
                    </Link>
                </div>

                {notice && <div className="alert alert-warning py-2">{notice}</div>}

                <form onSubmit={(e) => handleSubmit(e, navigate)} className="card">
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label">Tiêu đề *</label>
                                <input
                                    className={`form-control ${errors.title ? "is-invalid" : ""}`}
                                    value={form.title}
                                    onChange={set("title")}
                                    minLength={5}
                                    maxLength={200}
                                    required
                                />
                                {fieldError("title")}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label">Loại tin *</label>
                                <select
                                    className="form-select"
                                    value={form.type}
                                    onChange={set("type")}
                                >
                                    {TYPE_OPTIONS.map(([v, l]) => (
                                        <option key={v} value={v}>
                                            {l}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">
                                    Giá/tháng (VND) *
                                </label>
                                <input
                                    type="number"
                                    className={`form-control ${errors.price ? "is-invalid" : ""}`}
                                    value={form.price}
                                    onChange={set("price")}
                                    min={100000}
                                    max={100000000}
                                    required
                                />
                                {form.price !== "" && (
                                    <div className="small text-secondary mt-1">
                                        {formatVnd(Number(form.price))}
                                    </div>
                                )}
                                {fieldError("price")}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Diện tích (m²) *</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className={`form-control ${errors.area_m2 ? "is-invalid" : ""}`}
                                    value={form.area_m2}
                                    onChange={set("area_m2")}
                                    min={5}
                                    max={1000}
                                    required
                                />
                                {fieldError("area_m2")}
                            </div>

                            <div className="col-md-8">
                                <label className="form-label">Địa chỉ *</label>
                                <input
                                    className={`form-control ${errors.address ? "is-invalid" : ""}`}
                                    value={form.address}
                                    onChange={set("address")}
                                    required
                                />
                                {fieldError("address")}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Tỉnh/Thành phố *</label>
                                <select
                                    className={`form-select ${errors.city_id ? "is-invalid" : ""}`}
                                    value={form.city_id}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            city_id: e.target.value,
                                            ward_id: "", // cascade: đổi city thì reset ward
                                        }))
                                    }
                                    required
                                >
                                    <option value="">Chọn Tỉnh/TP</option>
                                    {cities.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.city_id && (
                                    <div className="invalid-feedback">
                                        {errors.city_id[0]}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Khu vực *</label>
                                <select
                                    className={`form-select ${errors.ward_id ? "is-invalid" : ""}`}
                                    value={form.ward_id}
                                    onChange={set("ward_id")}
                                    disabled={!form.city_id}
                                    required
                                >
                                    <option value="">
                                        {form.city_id
                                            ? "Chọn phường/xã"
                                            : "Chọn Tỉnh/TP trước"}
                                    </option>
                                    {wards
                                        .filter(
                                            (w) =>
                                                !form.city_id ||
                                                String(w.city?.id) === String(form.city_id)
                                        )
                                        .map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name}
                                            </option>
                                        ))}
                                </select>
                                {errors.ward_id && (
                                    <div className="invalid-feedback">
                                        {errors.ward_id[0]}
                                    </div>
                                )}
                            </div>

                            {/* Coordinate picker: click the map or fine-tune
                                with the number inputs (kept for manual edit). */}
                            <div className="col-12">
                                <label className="form-label">
                                    Vị trí nhà trên bản đồ *
                                </label>
                                <CoordinatePicker
                                    lat={form.latitude}
                                    lng={form.longitude}
                                    onPick={(newLat, newLng) =>
                                        setForm((f) => ({
                                            ...f,
                                            latitude: newLat.toFixed(7),
                                            longitude: newLng.toFixed(7),
                                        }))
                                    }
                                    center={wardCenter}
                                    onAddress={applyAddressGuess}
                                />
                                <div className="row g-2 mt-1">
                                    <div className="col-md-6">
                                        <input
                                            type="number"
                                            step="any"
                                            className={`form-control form-control-sm ${errors.latitude ? "is-invalid" : ""}`}
                                            value={form.latitude}
                                            onChange={set("latitude")}
                                            min={-90}
                                            max={90}
                                            placeholder="Vĩ độ (latitude)"
                                            required
                                        />
                                        {fieldError("latitude")}
                                    </div>
                                    <div className="col-md-6">
                                        <input
                                            type="number"
                                            step="any"
                                            className={`form-control form-control-sm ${errors.longitude ? "is-invalid" : ""}`}
                                            value={form.longitude}
                                            onChange={set("longitude")}
                                            min={-180}
                                            max={180}
                                            placeholder="Kinh độ (longitude)"
                                            required
                                        />
                                        {fieldError("longitude")}
                                    </div>
                                </div>
                                <div className="form-text small">
                                    Bấm vào bản đồ để đặt vị trí, kéo marker để chỉnh,
                                    hoặc nhập tọa độ thủ công. Địa chỉ được gợi ý tự động
                                    từ vị trí trên bản đồ.
                                </div>
                            </div>

                            <div className="col-12">
                                <label className="form-label">
                                    Tiện ích
                                </label>
                                <div className="d-flex flex-wrap gap-3">
                                    {amenities.map((a) => (
                                        <div className="form-check" key={a.id}>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`am-${a.id}`}
                                                checked={form.amenity_ids.includes(a.id)}
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

                            <div className="col-12">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="form-label mb-0">Mô tả</label>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={generateDescription}
                                        disabled={aiBusy}
                                        title="AI viết mô tả từ các thông tin trên"
                                    >
                                        {aiBusy ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" />
                                                Đang viết...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-stars me-1" />
                                                Viết mô tả giúp tôi
                                            </>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    className="form-control"
                                    rows={5}
                                    maxLength={5000}
                                    value={form.description}
                                    onChange={set("description")}
                                    placeholder="Có thể tự viết hoặc để AI viết giúp rồi chỉnh sửa."
                                />
                            </div>

                            {isEdit && (
                                <div className="col-md-4">
                                    <label className="form-label">Trạng thái</label>
                                    <select
                                        className="form-select"
                                        value={form.status}
                                        onChange={set("status")}
                                    >
                                        <option value="available">Còn trống</option>
                                        <option value="rented">Đã thuê</option>
                                        <option value="hidden">Ẩn</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Images */}
                        <ImagesEditor
                            images={images}
                            isEdit={isEdit}
                            onDelete={handleDeleteImage}
                            onPick={handleFilePick}
                            newFileCount={newFiles.length}
                        />
                    </div>

                    <div className="card-footer bg-white d-flex justify-content-end">
                        <button className="btn btn-primary" disabled={busy}>
                            {busy
                                ? "Đang lưu..."
                                : isEdit
                                  ? "Lưu thay đổi"
                                  : "Đăng tin"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
