<?php

namespace Database\Factories;

use App\Models\Ward;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ward>
 */
class WardFactory extends Factory
{
    public function definition(): array
    {
        // Coordinates anywhere in Vietnam (roughly 8.2N..23.4N, 102.1E..109.5E).
        return [
            'name' => fake()->unique()->city().' Ward',
            'latitude' => fake()->latitude(8.20, 23.40),
            'longitude' => fake()->longitude(102.10, 109.50),
        ];
    }
}
