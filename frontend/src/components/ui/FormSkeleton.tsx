/** Skeleton matching the Profile form layout while user data loads. */
function Field({ width = "100%" }) {
    return (
        <div>
            <div className="skeleton mb-2" style={{ height: 12, width: 90 }} />
            <div className="skeleton" style={{ height: 38, width }} />
        </div>
    );
}

export default function FormSkeleton() {
    return (
        <div className="card" aria-hidden="true">
            <div className="card-body">
                <div className="skeleton mb-4" style={{ height: 18, width: 160 }} />
                <div className="row g-3">
                    <div className="col-md-6">
                        <Field />
                    </div>
                    <div className="col-md-6">
                        <Field />
                    </div>
                    <div className="col-12">
                        <div className="skeleton mb-2" style={{ height: 12, width: 120 }} />
                        <div className="skeleton" style={{ height: 76 }} />
                    </div>
                </div>
            </div>
            <div className="card-footer bg-white d-flex justify-content-end">
                <div className="skeleton rounded" style={{ width: 130, height: 38 }} />
            </div>
        </div>
    );
}
