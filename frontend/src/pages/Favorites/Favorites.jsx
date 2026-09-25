import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFavorites, removeFavorite } from "../../api/socialApi";
import { errMessage } from "../../api/axiosClient";
import ListingCard from "../../components/ListingCard";
import ListingGridSkeleton from "../../components/ui/ListingGridSkeleton";
import Pagination from "../../components/Pagination";
import { useToast } from "../../components/ui/Toast";

export default function Favorites() {
    const toast = useToast();
    const [listings, setListings] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Skeleton again per page change - reset during render via
    // prev-comparison instead of a synchronous setState in the effect.
    const [prevPage, setPrevPage] = useState(page);
    if (prevPage !== page) {
        setPrevPage(page);
        setLoading(true);
    }

    useEffect(() => {
        let active = true;
        getFavorites(page)
            .then(({ data, meta }) => {
                if (active) {
                    setListings(data);
                    setMeta(meta);
                }
            })
            .catch((err) => {
                if (active) setError(errMessage(err));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [page]);

    async function unfavorite(listing) {
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
                        <Link to="/rooms" className="btn btn-primary">
                            Tìm phòng ngay
                        </Link>
                    </div>
                )}

                <div className="row g-4">
                    {listings.map((l) => (
                        <div className="col-lg-4 col-md-6" key={l.id}>
                            <ListingCard listing={l} onToggleFavorite={unfavorite} />
                        </div>
                    ))}
                </div>

                <Pagination
                    meta={meta}
                    onPage={(p) => {
                        setPage(p);
                        window.scrollTo(0, 0);
                    }}
                />
            </div>
        </div>
    );
}
