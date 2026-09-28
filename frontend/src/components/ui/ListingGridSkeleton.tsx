/** Placeholder card skeletons matching the ListingCard layout while data loads. */
export default function ListingGridSkeleton({ count = 6 }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div className="col-lg-4 col-md-6" key={i}>
                    <div className="card h-100 overflow-hidden">
                        <div className="skeleton" style={{ height: 180, borderRadius: 0 }} />
                        <div className="card-body">
                            <div className="skeleton mb-2" style={{ height: 16, width: "85%" }} />
                            <div className="skeleton mb-3" style={{ height: 12, width: "60%" }} />
                            <div className="skeleton mb-2" style={{ height: 12, width: "40%" }} />
                            <div className="skeleton" style={{ height: 22, width: "35%" }} />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
