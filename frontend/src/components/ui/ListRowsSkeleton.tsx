/**
 * Skeleton rows for list-style pages (conversations, listings).
 * `actions` adds placeholder buttons on the right (MyListings-style rows).
 */
export default function ListRowsSkeleton({
    count = 5,
    thumbWidth = 56,
    thumbHeight = 56,
    actions = false,
}) {
    return (
        <div className="list-group" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <div
                    className="list-group-item d-flex gap-3 align-items-center"
                    key={i}
                >
                    <div
                        className="skeleton rounded flex-shrink-0"
                        style={{ width: thumbWidth, height: thumbHeight }}
                    />
                    <div className="flex-grow-1 overflow-hidden">
                        <div
                            className="skeleton mb-2"
                            style={{ height: 14, width: "35%" }}
                        />
                        <div
                            className="skeleton mb-2"
                            style={{ height: 12, width: "60%" }}
                        />
                        <div className="skeleton" style={{ height: 12, width: "80%" }} />
                    </div>
                    {actions ? (
                        <div className="d-flex gap-1 align-items-center">
                            <div
                                className="skeleton rounded"
                                style={{ width: 90, height: 31 }}
                            />
                            <div
                                className="skeleton rounded"
                                style={{ width: 38, height: 31 }}
                            />
                            <div
                                className="skeleton rounded"
                                style={{ width: 38, height: 31 }}
                            />
                        </div>
                    ) : (
                        <div
                            className="skeleton rounded-pill"
                            style={{ width: 40, height: 20 }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
