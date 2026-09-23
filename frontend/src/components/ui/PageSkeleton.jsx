/** Neutral full-page skeleton shown while auth state is resolving. */
export default function PageSkeleton() {
    return (
        <div className="py-4" aria-hidden="true">
            <div className="container" style={{ maxWidth: 760 }}>
                <div className="skeleton mb-2" style={{ height: 26, width: 200 }} />
                <div className="skeleton mb-4" style={{ height: 14, width: 280 }} />
                <div className="card">
                    <div className="card-body">
                        <div
                            className="skeleton mb-3"
                            style={{ height: 16, width: "35%" }}
                        />
                        <div className="skeleton mb-2" style={{ height: 13, width: "90%" }} />
                        <div className="skeleton mb-2" style={{ height: 13, width: "80%" }} />
                        <div className="skeleton" style={{ height: 13, width: "60%" }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
