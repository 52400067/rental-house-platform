/**
 * Lưới card tin đăng dùng chung (Favorites, Home - cùng pattern `row g-4`
 * + cột bootstrap). `renderCard(listing, index)` để từng page truyền props
 * riêng cho ListingCard (onToggleFavorite, isNew, ...).
 */
export default function ListingGrid({ listings, renderCard }) {
    return (
        <div className="row g-4">
            {listings.map((l, i) => (
                <div className="col-lg-4 col-md-6" key={l.id}>
                    {renderCard(l, i)}
                </div>
            ))}
        </div>
    );
}
