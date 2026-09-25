import { useCallback, useEffect, useState } from "react";
import { getListing, getListingReviews, createReview } from "../api/listingApi";
import { errMessage } from "../api/axiosClient";

/**
 * Data + actions for the /rooms/:id page: listing detail, review list
 * (paginated) and load/error state. setListing is exposed so actions on
 * the page (favorite toggle, review submit) can update the cached listing.
 * Favorite/chat toasts stay in the page (they need the toast context).
 */
export function useRoomDetail(id, toast) {
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Reviews
    const [reviews, setReviews] = useState([]);
    const [reviewMeta, setReviewMeta] = useState(null);

    const loadReviews = useCallback(
        (page = 1) => {
            getListingReviews(id, page)
                .then(({ data, meta }) => {
                    setReviews(data);
                    setReviewMeta(meta);
                })
                .catch(() => {});
        },
        [id]
    );

    useEffect(() => {
        setLoading(true);
        setError("");
        getListing(id)
            .then((data) => {
                setListing(data);
                loadReviews(1);
            })
            .catch((err) =>
                setError(
                    err.response?.status === 404
                        ? "Phòng trọ không tồn tại hoặc đã bị ẩn."
                        : errMessage(err)
                )
            )
            .finally(() => setLoading(false));
    }, [id, loadReviews]);

    return {
        listing,
        setListing,
        loading,
        error,
        reviews,
        reviewMeta,
        loadReviews,
    };
}
