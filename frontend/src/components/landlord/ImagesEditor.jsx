/**
 * Image editor for the listing form: existing images (delete + cover badge,
 * edit mode only) plus the multi-file picker with count. Limits are
 * enforced by the hook's handleFilePick (max 5, matching the API).
 */
export default function ImagesEditor({ images, isEdit, onDelete, onPick, newFileCount }) {
    return (
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
                                <span
                                    className="badge text-bg-secondary position-absolute top-0 start-0 m-1"
                                    style={{ fontSize: "0.6rem" }}
                                >
                                    Bìa
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 py-0 px-1"
                                style={{ fontSize: "0.6rem" }}
                                onClick={() => onDelete(img.id)}
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
                onChange={onPick}
            />
            {newFileCount > 0 && (
                <div className="small text-secondary mt-1">
                    Đã chọn {newFileCount} ảnh.
                </div>
            )}
        </div>
    );
}
