<?php

namespace Database\Factories;

use App\Models\District;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Listing>
 */
class ListingFactory extends Factory
{
    public function definition(): array
    {
        // Coordinates roughly around Ho Chi Minh City.
        return [
            'user_id' => User::factory()->landlord(),
            'district_id' => District::factory(),
            'title' => 'Phòng trọ '.fake()->unique()->numberBetween(1, 999).' gần trường',
            'description' => fake()->sentence(),
            'type' => fake()->randomElement(['room', 'apartment', 'house']),
            'price' => fake()->numberBetween(1_500_000, 6_000_000),
            'area_m2' => fake()->numberBetween(15, 60),
            'address' => fake()->streetAddress(),
            'latitude' => fake()->latitude(10.70, 10.90),
            'longitude' => fake()->longitude(106.60, 106.85),
            'status' => Listing::STATUS_AVAILABLE,
        ];
    }
}
