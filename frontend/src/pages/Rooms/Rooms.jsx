import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import * as socialApi from "../../api/socialApi";
import { errMessage } from "../../api/axiosClient";
import ListingCard from "../../components/ListingCard";
import ListingGridSkeleton from "../../components/ui/ListingGridSkeleton";
import Pagination from "../../components/Pagination";
import { useToast } from "../../components/ui/Toast";
import FilterSidebar from "../../components/rooms/FilterSidebar";
import { SORT_OPTIONS } from "../../components/rooms/options";
import { useListingSearch } from "../../hooks/useListingSearch";

export default function Rooms() {
    const { user } = useAuth();
    const toast = useToast();

    const {
        cities,
        wards,
        schools,
        amenities,
        filters,
        setFilter,
        setCity,
        toggleAmenity,
        resetFilters,
        listings,
        setListings,
        meta,
        loading,
        error,
        setPage,
    } = useListingSearch();

    // Filters start hidden on mobile (they take the whole column there)
    // and visible from lg up where they sit as a sidebar.
    const [showFilters, setShowFilters] = useState(
        typeof window !== "undefined" && window.innerWidth >= 992
    );

    async function toggleFavorite(listing) {
        if (!user || user.role !== "student") return;
        try {
            if (listing.is_favorited) {
                await socialApi.removeFavorite(listing.id);
                toast.info("Đã bỏ phòng khỏi danh sách yêu thích.");
            } else {
                await socialApi.addFavorite(listing.id);
                toast.success("Đã thêm phòng vào danh sách yêu thích.");
            }
            setListings((rows) =>
                rows.map((l) =>
                    l.id === listing.id ? { ...l, is_favorited: !l.is_favorited } : l
                )
            );
        } catch (err) {
            toast.error(errMessage(err));
        }
    }

    return (
        <div className="py-4">
            <div className="container">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div>
                        <h1 className="h3 fw-bold mb-0">Tìm phòng trọ</h1>
                        <span className="text-secondary small">
                            {meta ? `${meta.total} phòng trọ` : "Đang tải..."}
                        </span>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-secondary btn-sm d-lg-none"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <i className="bi bi-funnel me-1" /> Bộ lọc
                        </button>
                        <select
                            className="form-select form-select-sm w-auto"
                            value={filters.sort}
                            onChange={(e) => setFilter("sort", e.target.value)}
                        >
                            {SORT_OPTIONS.map(([v, l]) => (
                                <option key={v} value={v}>
                                    {l}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="row g-4">
                    {/* FILTER SIDEBAR */}
                    <div
                        className={`col-lg-3 ${
                            showFilters ? "" : "d-none d-lg-block"
                        }`}
                    >
                        {/* Mobile: full-width collapsible panel right under
                            the toolbar; the toggle button lives next to sort */}
                        <FilterSidebar
                            filters={filters}
                            setFilter={setFilter}
                            setCity={setCity}
                            toggleAmenity={toggleAmenity}
                            resetFilters={resetFilters}
                            cities={cities}
                            wards={wards}
                            schools={schools}
                            amenities={amenities}
                        />
                    </div>

                    {/* RESULTS */}
                    <div className="col-lg-9">
                        {loading ? (
                            <div className="row g-4">
                                <ListingGridSkeleton count={6} />
                            </div>
                        ) : error ? (
                            <div className="alert alert-warning">{error}</div>
                        ) : listings.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="bi bi-search fs-1 text-secondary" />
                                <h4 className="mt-3">Không tìm thấy phòng phù hợp</h4>
                                <p className="text-secondary">
                                    Hãy thử thay đổi bộ lọc hoặc từ khóa.
                                </p>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={resetFilters}
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="row g-4">
                                    {listings.map((l) => (
                                        <div
                                            className="col-xl-4 col-md-6"
                                            key={l.id}
                                        >
                                            <ListingCard
                                                listing={l}
                                                onToggleFavorite={
                                                    user?.role === "student"
                                                        ? toggleFavorite
                                                        : undefined
                                                }
                                            />
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
