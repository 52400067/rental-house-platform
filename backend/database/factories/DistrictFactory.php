<?php

namespace Database\Factories;

use App\Models\District;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<District>
 */
class DistrictFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->city().' District',
            'latitude' => fake()->latitude(10.70, 10.90),
            'longitude' => fake()->longitude(106.60, 106.85),
        ];
    }
}
