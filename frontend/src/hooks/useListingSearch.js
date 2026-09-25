import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    getAmenities,
    getCities,
    getListings,
    getSchools,
    getWards,
} from "../api/listingApi";
import { errMessage } from "../api/axiosClient";

const EMPTY_FILTERS = {
    q: "",
    type: "",
    city_id: "",
    ward_id: "",
    school_id: "",
    max_km: "",
    price_min: "",
    price_max: "",
    amenity_ids: [],
    sort: "newest",
};

/**
 * Listing search for the /rooms page: filter state, reference data
 * (cities/wards/schools/amenities), debounced fetch with URL-sync for
 * q/type, and cascade-aware filter setters (city change resets ward/
 * school/radius). Pagination state rides along so filter changes reset
 * to page 1.
 */
export function useListingSearch() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [cities, setCities] = useState([]);
    const [wards, setWards] = useState([]);
    const [schools, setSchools] = useState([]);
    const [amenities, setAmenities] = useState([]);

    const [filters, setFilters] = useState(() => ({
        ...EMPTY_FILTERS,
        q: searchParams.get("q") || "",
        type: searchParams.get("type") || "",
    }));
    const [page, setPage] = useState(1);
    const [listings, setListings] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const firstRender = useRef(true);

    useEffect(() => {
        getCities().then(setCities).catch(() => {});
        getSchools().then(setSchools).catch(() => {});
        getWards().then(setWards).catch(() => {});
        getAmenities().then(setAmenities).catch(() => {});
    }, []);

    // Build query from filters and fetch.
    const fetchListings = useCallback(
        async (currentPage) => {
            setLoading(true);
            setError("");
            const params = {
                page: currentPage,
                per_page: 12,
                sort: filters.sort,
            };
            if (filters.q.trim()) params.q = filters.q.trim();
            if (filters.type) params.type = filters.type;
            if (filters.city_id) params.city_id = filters.city_id;
            if (filters.ward_id) params.ward_id = filters.ward_id;
            if (filters.school_id) params.school_id = filters.school_id;
            if (filters.max_km) params.max_km = filters.max_km;
            if (filters.price_min) params.price_min = filters.price_min;
            if (filters.price_max) params.price_max = filters.price_max;
            if (filters.amenity_ids.length)
                params["amenity_ids[]"] = filters.amenity_ids;

            try {
                const { data, meta } = await getListings(params);
                setListings(data);
                setMeta(meta);
            } catch (err) {
                setError(errMessage(err));
                setListings([]);
            } finally {
                setLoading(false);
            }
        },
        [filters]
    );

    // Refetch whenever filters change (debounced) or page changes.
    useEffect(() => {
        const t = setTimeout(() => {
            fetchListings(page);
            if (!firstRender.current) {
                const next = {};
                if (filters.q) next.q = filters.q;
                if (filters.type) next.type = filters.type;
                setSearchParams(next, { replace: true });
            }
            firstRender.current = false;
        }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, page]);

    const setFilter = (key, value) => {
        setPage(1);
        setFilters((f) => ({ ...f, [key]: value }));
    };

    // Đổi Tỉnh/TP: reset ward/school để cascade hợp lệ.
    const setCity = (cityId) => {
        setPage(1);
        setFilters((f) => ({
            ...f,
            city_id: cityId,
            ward_id: "",
            school_id: "",
            max_km: "",
        }));
    };

    const toggleAmenity = (id) => {
        setPage(1);
        setFilters((f) => ({
            ...f,
            amenity_ids: f.amenity_ids.includes(id)
                ? f.amenity_ids.filter((a) => a !== id)
                : [...f.amenity_ids, id],
        }));
    };

    const resetFilters = () => {
        setPage(1);
        setFilters({ ...EMPTY_FILTERS });
    };

    return {
        // reference data
        cities,
        wards,
        schools,
        amenities,
        // search state
        filters,
        setFilter,
        setCity,
        toggleAmenity,
        resetFilters,
        // results
        listings,
        setListings,
        meta,
        loading,
        error,
        page,
        setPage,
    };
}
