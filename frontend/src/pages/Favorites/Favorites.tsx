import { Link } from "react-router-dom";
import { getFavorites, removeFavorite } from "../../api/socialApi";
import { errMessage } from "../../api/axiosClient";
import ListingCard from "../../components/ListingCard";
import ListingGrid from "../../components/ListingGrid";
import ListingGridSkeleton from "../../components/ui/ListingGridSkeleton";
import Pagination from "../../components/Pagination";
import { useToast } from "../../components/ui/Toast";
import { ROUTES } from "../../constants/routes";
import { useListingPage } from "../../hooks/useListingPage";
import type { Listing } from "../../types/api";

export default function Favorites() {
    const toast = useToast();
    const { listings, setListings, meta, setPage, loading, error } =
        useListingPage<Listing>(async (p) => {
            const res = await getFavorites(p);
            const rows = (res.data || [])
                .map((f) => f.listing)
                .filter((l): l is Listing => !!l);
            return { data: rows, meta: res.meta };
        });

    async function unfavorite(listing: Listing) {
        try {
            await removeFavorite(listing.id);
            setListings((rows) => rows.filter((l) => l.id !== listing.id));
        } catch (err) {
            toast.error(errMessage(err));
        }
    }

    return (
        <div className="py-4">
            <div className="container">
                <h1 className="h3 fw-bold mb-1">Phòng yêu thích</h1>
                <p className="text-secondary small mb-4">
                    <i className="bi bi-heart-fill text-danger me-1" />
                    Danh sách phòng bạn đã lưu
                </p>

                {loading && (
                    <div className="row g-4">
                        <ListingGridSkeleton count={6} />
                    </div>
                )}

                {error && <div className="alert alert-warning">{error}</div>}

                {!loading && !error && listings.length === 0 && (
                    <div className="text-center py-5">
                        <i className="bi bi-heart fs-1 text-secondary" />
                        <h4 className="mt-3">Chưa có phòng yêu thích</h4>
                        <p className="text-secondary">
                            Nhấn biểu tượng trái tim khi xem phòng để lưu lại.
                        </p>
                        <Link to={ROUTES.ROOMS} className="btn btn-primary">
                            Tìm phòng ngay
                        </Link>
                    </div>
                )}

                <ListingGrid
                    listings={listings}
                    renderCard={(l) => (
                        <ListingCard listing={l} onToggleFavorite={unfavorite} />
                    )}
                />

                <Pagination meta={meta} onPage={setPage} />
            </div>
        </div>
    );
}
