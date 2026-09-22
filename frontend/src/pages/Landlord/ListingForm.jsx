import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    createListing,
    updateListing,
    uploadImages,
    deleteImage,
} from "../../api/landlordApi";
import { getListing, getWards, getAmenities, getCities } from "../../api/listingApi";
import { aiDescription } from "../../api/aiApi";
import { TYPE_LABELS, formatVnd } from "../../api/format";
import { errMessage } from "../../api/axiosClient";
import CoordinatePicker from "../../components/CoordinatePicker";

const TYPE_OPTIONS = Object.entries(TYPE_LABELS);

export default function ListingForm() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();

    const [wards, setWards] = useState([]);
    const [cities, setCities] = useState([]);
    const [amenities, setAmenities] = useState([]);
    const [form, setForm] = useState({
        title: "",
        type: "room",
        price: "",
        area_m2: "",
        address: "",
        latitude: "",
        longitude: "",
        city_id: "",
        ward_id: "",
        description: "",
        amenity_ids: [],
        status: "available",
    });
    const [images, setImages] = useState([]);
    const [newFiles, setNewFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        getCities().then(setCities).catch(() => {});
        getWards().then(setWards).catch(() => {});
        getAmenities().then(setAmenities).catch(() => {});
    }, []);

    useEffect(() => {
        if (!isEdit) return;
        getListing(id)
            .then((l) => {
                setForm({
                    title: l.title || "",
                    type: l.type || "room",
                    price: l.price ?? "",
                    area_m2: l.area_m2 ?? "",
                    address: l.address || "",
                    latitude: l.latitude ?? "",
                    longitude: l.longitude ?? "",
                    city_id: l.ward?.city?.id || "",
                    ward_id: l.ward?.id || "",
                    description: l.description || "",
                    amenity_ids: l.amenities?.map((a) => a.id) || [],
                    status: l.status || "available",
                });
                setImages(l.images || []);
            })
            .catch((err) =>
                setNotice(errMessage(err, "Không tải được tin đăng."))
            );
    }, [id, isEdit]);

    const set = (key) => (e) => {
        setErrors({});
        setForm({ ...form, [key]: e.target.value });
    };

    /**
     * Reverse-geocoded street guess from the map (Nominatim).
     * Autofills the address when empty; asks before overwriting one.
     * (No window.confirm inside the state updater: updaters must stay
     * pure - StrictMode calls them twice, which would double the dialog.)
     */
    function applyAddressGuess(street) {
        const current = form.address.trim();
        if (current === "") {
            setForm((f) => ({ ...f, address: street }));
            return;
        }
        if (current === street) return;

        const wardName =
            wards.find((x) => String(x.id) === String(form.ward_id))?.name || "";
        const withWard =
            wardName && !street.includes(wardName)
                ? `${street}, ${wardName}`
                : street;

        if (
            window.confirm(
                `Địa chỉ trên bản đồ: "${withWard}".\nDùng địa chỉ này thay cho "${current}"?`
            )
        ) {
            setForm((f) => ({ ...f, address: withWard }));
        }
    }

    // Recentre the coordinate picker on the selected ward's centroid.
    const wardCenter = useMemo(() => {
        const w = wards.find((x) => String(x.id) === String(form.ward_id));
        return w?.latitude != null
            ? [Number(w.latitude), Number(w.longitude)]
            : undefined;
    }, [wards, form.ward_id]);

    function toggleAmenity(amenityId) {
        setForm((f) => ({
            ...f,
            amenity_ids: f.amenity_ids.includes(amenityId)
                ? f.amenity_ids.filter((x) => x !== amenityId)
                : [...f.amenity_ids, amenityId],
        }));
    }

    /** "Viết mô tả giúp tôi" - POST /ai/description (Landlord). */
    async function generateDescription() {
        setAiBusy(true);
        setNotice("");
        try {
            const { description } = await aiDescription({
                title: form.title || undefined,
                type: form.type || undefined,
                price: form.price === "" ? undefined : Number(form.price),
                area_m2: form.area_m2 === "" ? undefined : Number(form.area_m2),
                address: form.address || undefined,
                ward_id: form.ward_id || undefined,
                amenity_ids: form.amenity_ids.length ? form.amenity_ids : undefined,
            });
            setForm((f) => ({ ...f, description }));
        } catch (err) {
            setNotice(errMessage(err, "AI không tạo được mô tả lúc này."));
        } finally {
            setAiBusy(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        setBusy(true);
        setNotice("");

        const payload = {
            title: form.title,
            type: form.type,
            price: Number(form.price),
            area_m2: Number(form.area_m2),
            address: form.address,
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            ward_id: Number(form.ward_id),
            description: form.description || null,
            amenity_ids: form.amenity_ids,
        };
        if (isEdit) payload.status = form.status;

        try {
            if (isEdit) {
                const updated = await updateListing(id, payload);
                // Upload newly picked images, if any.
                if (newFiles.length > 0) {
                    await uploadImages(id, newFiles);
                }
                navigate(`/rooms/${updated.id}`);
            } else {
                const created = await createListing(payload);
                // Jump to edit page to upload images for the new listing.
                if (newFiles.length > 0) {
                    await uploadImages(created.id, newFiles);
                }
                navigate("/landlord");
            }
        } catch (err) {
            setErrors(err.response?.data?.errors || {});
            setNotice(errMessage(err));
        } finally {
            setBusy(false);
        }
    }

    async function handleDeleteImage(imageId) {
        if (!window.confirm("Xóa ảnh này?")) return;
        try {
            await deleteImage(id, imageId);
            setImages((rows) => rows.filter((i) => i.id !== imageId));
        } catch (err) {
            alert(errMessage(err));
        }
    }

    function handleFilePick(e) {
        const files = Array.from(e.target.files || []);
        if (isEdit && images.length + files.length > 5) {
            setNotice("Tin đăng chỉ có tối đa 5 ảnh.");
            e.target.value = "";
            return;
        }
        if (!isEdit && files.length > 5) {
            setNotice("Tối đa 5 ảnh mỗi tin.");
            e.target.value = "";
            return;
        }
        setNotice("");
        setNewFiles(files);
    }

    const fieldError = (key) =>
        errors[key] && (
            <div className="small text-danger mt-1">{errors[key][0]}</div>
        );

    return (
        <div className="py-4">
            <div className="container" style={{ maxWidth: 820 }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h3 fw-bold mb-0">
                        {isEdit ? "Sửa tin đăng" : "Đăng tin mới"}
                    </h1>
                    <Link to="/landlord" className="btn btn-outline-secondary btn-sm">
                        <i className="bi bi-arrow-left me-1" /> Danh sách
                    </Link>
                </div>

                {notice && <div className="alert alert-warning py-2">{notice}</div>}

                <form onSubmit={handleSubmit} className="card">
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
                        <div className="mt-4">
                            <label className="form-label">
                                Ảnh (jpg/png/webp, tối đa 2 MB/ảnh, tối đa 5 ảnh)
                            </label>

                            {isEdit && images.length > 0 && (
                                <div className="d-flex flex-wrap gap-2 mb-2">
                                    {images.map((img, i) => (
                                        <div key={img.id} className="position-relative">
                                            <img
                                                src={img.url}
                                                alt=""
                                                className="rounded border"
                                                style={{
                                                    width: 88,
                                                    height: 66,
                                                    objectFit: "cover",
                                                }}
                                            />
                                            {i === 0 && (
                                                <span className="badge text-bg-secondary position-absolute top-0 start-0 m-1" style={{ fontSize: "0.6rem" }}>
                                                    Bìa
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 py-0 px-1"
                                                style={{ fontSize: "0.6rem" }}
                                                onClick={() => handleDeleteImage(img.id)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <input
                                type="file"
                                className="form-control"
                                accept=".jpg,.jpeg,.png,.webp"
                                multiple
                                onChange={handleFilePick}
                            />
                            {newFiles.length > 0 && (
                                <div className="small text-secondary mt-1">
                                    Đã chọn {newFiles.length} ảnh.
                                </div>
                            )}
                        </div>
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
