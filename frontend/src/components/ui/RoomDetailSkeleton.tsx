/** Skeleton matching the RoomDetail layout (gallery + info + sidebar) while data loads. */
export default function RoomDetailSkeleton() {
    return (
        <div className="py-4" aria-hidden="true">
            <div className="container">
                {/* Breadcrumb */}
                <div className="skeleton mb-4" style={{ height: 14, width: 230 }} />

                <div className="row g-4">
                    {/* LEFT: gallery + info */}
                    <div className="col-lg-8">
                        <div
                            className="skeleton rounded-3 mb-3"
                            style={{ height: 420 }}
                        />
                        <div className="skeleton mb-2" style={{ height: 22, width: "65%" }} />
                        <div className="skeleton mb-4" style={{ height: 14, width: "40%" }} />

                        {/* Stats row */}
                        <div className="d-flex flex-wrap gap-4 mb-4">
                            <div className="skeleton" style={{ height: 28, width: 130 }} />
                            <div className="skeleton" style={{ height: 28, width: 90 }} />
                            <div className="skeleton" style={{ height: 28, width: 90 }} />
                        </div>

                        {/* Description lines */}
                        <div className="skeleton mb-2" style={{ height: 14, width: "100%" }} />
                        <div className="skeleton mb-2" style={{ height: 14, width: "92%" }} />
                        <div className="skeleton mb-2" style={{ height: 14, width: "96%" }} />
                        <div className="skeleton" style={{ height: 14, width: "55%" }} />
                    </div>

                    {/* RIGHT: sidebar card */}
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-body">
                                <div
                                    className="skeleton mb-3"
                                    style={{ height: 26, width: "60%" }}
                                />
                                <div className="skeleton mb-2" style={{ height: 13, width: "85%" }} />
                                <div className="skeleton mb-2" style={{ height: 13, width: "70%" }} />
                                <div
                                    className="skeleton rounded mt-3"
                                    style={{ height: 40, width: "100%" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
