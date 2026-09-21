<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Listing extends Model
{
    use HasFactory;

    // type values
    public const TYPE_ROOM = 'room';

    public const TYPE_APARTMENT = 'apartment';

    public const TYPE_HOUSE = 'house';

    // status values
    public const STATUS_AVAILABLE = 'available';

    public const STATUS_RENTED = 'rented';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'user_id',
        'district_id',
        'title',
        'description',
        'type',
        'price',
        'area_m2',
        'address',
        'latitude',
        'longitude',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'area_m2' => 'decimal:1',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    /** Amenities of this listing (pivot table amenity_listing). */
    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'amenity_listing');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ListingImage::class);
    }

    /** Cover image = the image with the smallest id (ERD §3). */
    public function coverImage(): HasMany
    {
        return $this->hasMany(ListingImage::class)->orderBy('id')->limit(1);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /** Students who favorited this listing (pivot table favorites). */
    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'favorites')->withTimestamps();
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** Average listing_rating across reviews (null when unrated). */
    public function avgRating(): ?float
    {
        $avg = $this->reviews()->avg('listing_rating');

        return $avg === null ? null : round((float) $avg, 1);
    }

    /** Scope: public listings only. */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', '!=', self::STATUS_HIDDEN);
    }
}
