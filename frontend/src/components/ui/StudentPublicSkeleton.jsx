/** Skeleton matching the StudentPublic profile card while data loads. */
export default function StudentPublicSkeleton() {
    return (
        <div className="py-4" aria-hidden="true">
            <div className="container" style={{ maxWidth: 720 }}>
                <div className="card">
                    <div className="card-body">
                        {/* Avatar + name */}
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div
                                className="skeleton rounded-circle flex-shrink-0"
                                style={{ width: 64, height: 64 }}
                            />
                            <div className="flex-grow-1">
                                <div
                                    className="skeleton mb-2"
                                    style={{ height: 20, width: "45%" }}
                                />
                                <div
                                    className="skeleton"
                                    style={{ height: 13, width: "30%" }}
                                />
                            </div>
                        </div>

                        {/* Bio lines */}
                        <div className="skeleton mb-2" style={{ height: 13, width: "100%" }} />
                        <div className="skeleton mb-3" style={{ height: 13, width: "75%" }} />

                        {/* Hobby pills */}
                        <div className="d-flex gap-2 mb-3">
                            <div
                                className="skeleton rounded-pill"
                                style={{ width: 80, height: 22 }}
                            />
                            <div
                                className="skeleton rounded-pill"
                                style={{ width: 100, height: 22 }}
                            />
                            <div
                                className="skeleton rounded-pill"
                                style={{ width: 70, height: 22 }}
                            />
                        </div>

                        {/* Lifestyle tiles */}
                        <div className="row g-2">
                            {[0, 1, 2].map((i) => (
                                <div className="col-6 col-md-4" key={i}>
                                    <div className="border rounded p-2">
                                        <div
                                            className="skeleton mb-2"
                                            style={{ height: 12, width: "60%" }}
                                        />
                                        <div
                                            className="skeleton"
                                            style={{ height: 14, width: "80%" }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
