<?php

namespace Database\Factories;

use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<School>
 */
class SchoolFactory extends Factory
{
    public function definition(): array
    {
        // Coordinates roughly around Ho Chi Minh City.
        return [
            'name' => fake()->unique()->company().' University',
            'latitude' => fake()->latitude(10.70, 10.90),
            'longitude' => fake()->longitude(106.60, 106.85),
        ];
    }
}
